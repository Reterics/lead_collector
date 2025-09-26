import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  loadSubmissions,
  removeSubmission,
  saveSubmission,
  type SubmissionEntry,
} from '../utils/submissions.ts';
import {
  FiTrash2,
  FiRefreshCcw,
  FiArrowLeft,
  FiExternalLink,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { firebaseModel } from '../config.ts';
import {
  createIssue,
  type IssueSuccessResponse,
  type IssueLocalResponse,
  type IssueRedirectResponse,
} from '../services/jira.ts';
import {normalizeJiraUrl} from "../utils/commons.ts";

const statusBadge: Record<string, string> = {
  jira: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  local: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  auth: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const SubmissionsList: React.FC = () => {
  const [items, setItems] = useState<SubmissionEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const { t } = useTranslation();

  const sorted = useMemo(() => {
    return [...items].sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || ''),
    );
  }, [items]);

  const fetchFromFirestore = async () => {
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
      // merge with local legacy/localStorage submissions (keep both, Firestore preferred when id collides)
      const local = loadSubmissions();
      const map = new Map<string, SubmissionEntry>();
      for (const s of local) map.set(s.id, s);
      for (const m of mapped) map.set(m.id, m);
      setItems(Array.from(map.values()));
    } catch (e) {
      console.error('Failed to load submissions from Firestore', e);
      // Fallback to local only
      setItems(loadSubmissions());
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    setLoading(true);
    void fetchFromFirestore();
  };

  useEffect(() => {
    void fetchFromFirestore();
  }, []);

  const onDelete = async (id: string) => {
    if (confirm(t('submissions.confirmDelete'))) {
      await firebaseModel.remove(id, 'submissions');
      // Always remove local copy if exists
      removeSubmission(id);
      refresh();
    }
  };

  const onRetry = async (s: SubmissionEntry) => {
    setRetrying((r) => ({ ...r, [s.id]: true }));
    try {
      const res = await createIssue({ summary: s.summary, description: s.description });

      let nextStatus: SubmissionEntry['status'] = s.status;
      let issueKey: string | undefined = s.issueKey;
      let issueUrl: string | undefined = s.issueUrl;

      if ((res as IssueSuccessResponse)?.id) {
        nextStatus = 'jira';
        issueKey = (res as IssueSuccessResponse).key;
        issueUrl = (res as IssueSuccessResponse).self;
      } else if ((res as IssueRedirectResponse)?.redirectingToAuth) {
        nextStatus = 'auth';
        // Navigation will redirect; we still update local/Firestore best-effort
      } else if ((res as IssueLocalResponse)?.storedLocally) {
        nextStatus = 'local';
      }

      // Update Firestore record if exists
      try {
        await firebaseModel.update(
          {
            id: s.id,
            createdAt: s.createdAt,
            questionnaireName: s.questionnaireName,
            summary: s.summary,
            description: s.description,
            status: nextStatus,
            issueKey,
            issueUrl,
          },
          'submissions',
        );
      } catch (e) {
        // ignore Firestore update errors
        void e;
      }

      // Update local submission storage as well
      saveSubmission({
        ...s,
        status: nextStatus,
        issueKey,
        issueUrl,
      });

      // Refresh list to reflect the updated state
      refresh();
    } catch {
      await firebaseModel.update(
        {
          id: s.id,
          status: 'error',
        },
        'submissions',
      );
      saveSubmission({ ...s, status: 'error' });
      refresh();
    } finally {
      setRetrying((r) => ({ ...r, [s.id]: false }));
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
            title={t('submissions.back')}
          >
            <FiArrowLeft />
            <span>{t('submissions.back')}</span>
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('submissions.title')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
            title={t('submissions.refresh')}
          >
            <FiRefreshCcw />
            <span className="hidden sm:inline">{t('submissions.refresh')}</span>
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-gray-700 dark:text-gray-300">
          {t('submissions.empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((s) => (
            <div
              key={s.id}
              className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded ${statusBadge[s.status] || statusBadge.unknown}`}
                    >
                      {s.status === 'jira' && t('submissions.status.jira')}
                      {s.status === 'local' && t('submissions.status.local')}
                      {s.status === 'auth' && t('submissions.status.auth')}
                      {s.status === 'error' && t('submissions.status.error')}
                      {s.status === 'unknown' &&
                        t('submissions.status.unknown')}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(s.createdAt)}
                    </span>
                  </div>
                  <div className="text-gray-900 dark:text-white font-medium">
                    {s.questionnaireName}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 break-words">
                    {s.summary}
                  </div>
                  {s.issueKey && s.issueUrl && (
                    <div className="mt-1 text-sm">
                      <a
                        href={normalizeJiraUrl(s.issueUrl, s.issueKey)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        title={t('submissions.openInJira')}
                      >
                        <FiExternalLink />
                        <span>{s.issueKey}</span>
                      </a>
                    </div>
                  )}
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">
                      {t('submissions.details')}
                    </summary>
                    <pre className="mt-1 text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {s.description}
                    </pre>
                  </details>
                </div>
                <div className="flex flex-col items-center gap-2">
                  {(s.status === 'local' || s.status === 'error') && (
                    <button
                      onClick={() => onRetry(s)}
                      disabled={!!retrying[s.id]}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                      title={t('submissions.retry')}
                    >
                      <FiRefreshCcw />
                      <span className="hidden sm:inline">
                        {retrying[s.id] ? t('submissions.retrying') : t('submissions.retry')}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(s.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
                    title={t('submissions.delete')}
                  >
                    <FiTrash2 />
                    <span className="hidden sm:inline">
                      {t('submissions.delete')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default SubmissionsList;
