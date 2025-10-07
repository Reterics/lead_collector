import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { firebaseModel } from '../config.ts';
import {createIssue, getJiraConfig, type IssueSuccessResponse, type JiraConfig} from '../services/jira.ts';
import { loadSubmissions, removeSubmission, saveSubmission, type SubmissionEntry } from '../utils/submissions.ts';
import { DBContext } from './DBContext.ts';

export type SubmissionsContextValue = {
  items: SubmissionEntry[];
  sorted: SubmissionEntry[];
  loading: boolean;
  retrying: Record<string, boolean>;
  refresh: () => void;
  onDelete: (id: string) => Promise<void>;
  onRetry: (s: SubmissionEntry) => Promise<void>;
};

const SubmissionsContext = createContext<SubmissionsContextValue | undefined>(undefined);

export const SubmissionsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [items, setItems] = useState<SubmissionEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const db = useContext(DBContext);
  const jiraCfg: JiraConfig = getJiraConfig(db?.data?.currentUser);
  const fetchFromFirestore = useCallback(async () => {
    try {
      const fsItems = (await firebaseModel.getAll('submissions', true)) as unknown as Array<{
        id: string;
        createdAt?: string;
        questionnaireName?: string;
        summary?: string;
        description?: string;
        status?: string;
        issueKey?: string;
        issueUrl?: string;
      }>;
      const mapped: SubmissionEntry[] = (fsItems || []).map((d) => ({
        id: d.id,
        createdAt: d.createdAt || new Date().toISOString(),
        questionnaireName: d.questionnaireName || 'Unknown',
        summary: d.summary || '',
        description: d.description || '',
        status: (d.status as SubmissionEntry['status']) || 'unknown',
        issueKey: d.issueKey,
        issueUrl: d.issueUrl,
      }));
      const local = loadSubmissions();
      const map = new Map<string, SubmissionEntry>();
      for (const s of local) map.set(s.id, s);
      for (const m of mapped) map.set(m.id, m);
      setItems(Array.from(map.values()));
    } catch (e) {
      console.error('Failed to load submissions from Firestore', e);
      setItems(loadSubmissions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('SubmissionsProvider mounted');
    void fetchFromFirestore();
  }, [fetchFromFirestore]);

  const refresh = useCallback(() => {
    console.log('SubmissionsProvider refresh');
    setLoading(true);
    void fetchFromFirestore();
  }, [fetchFromFirestore]);

  const onDelete = useCallback(async (id: string) => {
    try {
      await firebaseModel.remove(id, 'submissions');
    } catch (e) {
      // ignore remove errors
      void e;
    }
    removeSubmission(id);
    refresh();
  }, [refresh]);

  const onRetry = useCallback(async (s: SubmissionEntry) => {
    setRetrying((r) => ({ ...r, [s.id]: true }));
    let issueKey: string | undefined = s.issueKey;
    let issueUrl: string | undefined = s.issueUrl;
    let nextStatus: SubmissionEntry['status'] = 'firestore';
    try {
      if (!issueKey) {
        const res = await createIssue({ summary: s.summary, description: s.description }, [], jiraCfg);
        if ((res as IssueSuccessResponse)?.id) {
          nextStatus = 'jira';
          issueKey = (res as IssueSuccessResponse).key;
          issueUrl = (res as IssueSuccessResponse).self;
        }
      }
      try {
        await firebaseModel.update({
          id: s.id,
          createdAt: s.createdAt,
          questionnaireName: s.questionnaireName,
          summary: s.summary,
          description: s.description,
          status: nextStatus,
          issueKey,
          issueUrl,
        }, 'submissions');
      } catch (e) { void e; }
      saveSubmission({ ...s, status: nextStatus, issueKey, issueUrl });
      refresh();
    } catch {
      refresh();
    } finally {
      setRetrying((r) => ({ ...r, [s.id]: false }));
    }
  }, [jiraCfg, refresh]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [items]);

  const value = useMemo<SubmissionsContextValue>(() => ({
    items, sorted, loading, retrying, refresh, onDelete, onRetry,
  }), [items, sorted, loading, retrying, refresh, onDelete, onRetry]);

  return (
    <SubmissionsContext.Provider value={value}>
      {children}
    </SubmissionsContext.Provider>
  );
};

export function useSubmissionsContext(): SubmissionsContextValue {
  const ctx = useContext(SubmissionsContext);
  if (!ctx) {
    throw new Error('useSubmissionsContext must be used within a SubmissionsProvider');
  }
  return ctx;
}

export default SubmissionsContext;
