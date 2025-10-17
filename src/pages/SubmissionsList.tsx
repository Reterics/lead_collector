import React, { useEffect, useContext, useMemo, useState } from 'react';
import {
  FiTrash2,
  FiRefreshCcw,
  FiExternalLink,
  FiShare2,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import {normalizeJiraUrl} from "../utils/commons.ts";
import { useSubmissionsContext } from '../context/SubmissionsContext.tsx';
import { DBContext } from '../context/DBContext.ts';
import { firebaseModel } from '../config.ts';

const statusBadge: Record<string, string> = {
  jira: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  firebase: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
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
  const { t } = useTranslation();
  const { sorted, retrying, refresh, onRetry, onDelete } = useSubmissionsContext();
  const db = useContext(DBContext);

  // Share modal state
  const [shareForId, setShareForId] = useState<string | null>(null);
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Record<string, boolean>>({});
  const [loadingTeam, setLoadingTeam] = useState<boolean>(false);

  const currentUser = db?.data?.currentUser;
  const userTeamId = useMemo(() => currentUser?.teamId || currentUser?.id, [currentUser?.teamId, currentUser?.id]);

  const openShare = async (sId: string) => {
    const s = sorted.find((x) => x.id === sId);
    if (!s) return;
    const isAdmin = currentUser?.role === 'admin';
    const isOwner = (currentUser?.id && s.ownerId === currentUser.id) || (currentUser?.email && s.ownerEmail === currentUser.email);
    if (!isAdmin && !isOwner) {
      alert('You do not have permission to share this submission.');
      return;
    }
    setLoadingTeam(true);
    try {
      // Prefer DBContext users if available and contains multiple, else fetch from Firestore
      let users = Array.isArray(db?.data?.users) ? db!.data!.users : [];
      if (!users || users.length <= 1) {
        users = (await firebaseModel.getAll('users', true)) as unknown as Array<{ id: string; email?: string; teamId?: string }>;
      }
      const ownerEmail = s.ownerEmail?.toLowerCase();
      const emails = (users || [])
        .filter((u) => u.email && (userTeamId ? u.teamId === userTeamId : true))
        .map((u) => u.email!.toLowerCase())
        .filter((e) => !!e && e !== ownerEmail);
      const uniq = Array.from(new Set(emails)).sort();
      setTeamEmails(uniq);
      // Preselect existing
      const preset: Record<string, boolean> = {};
      (s.sharedWithEmails || []).forEach((e) => {
        const lower = e.toLowerCase();
        if (uniq.includes(lower)) preset[lower] = true;
      });
      setSelectedEmails(preset);
      setShareForId(s.id);
    } catch (e) {
      console.error('Failed to load team emails', e);
      alert('Failed to load team emails.');
    } finally {
      setLoadingTeam(false);
    }
  };

  const closeShare = () => {
    setShareForId(null);
    setTeamEmails([]);
    setSelectedEmails({});
  };

  const applyShare = async () => {
    if (!shareForId) return;
    const s = sorted.find((x) => x.id === shareForId);
    if (!s) return;
    const picked = Object.keys(selectedEmails).filter((k) => selectedEmails[k]);
    try {
      await firebaseModel.update({ id: s.id, sharedWithEmails: picked }, 'submissions');
      refresh();
      closeShare();
    } catch (e) {
      console.error('Failed to update sharing', e);
      alert('Failed to update sharing list.');
    }
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => ({ ...prev, [email]: !prev[email] }));
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('submissions.confirmDelete'))) {
      await onDelete(id);
    }
  };

  // Trigger refresh when header action is used
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('submissions-refresh', handler as EventListener);
    return () => window.removeEventListener('submissions-refresh', handler as EventListener);
  }, [refresh]);

  return (
    <>
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
                      {s.status === 'firestore' && t('submissions.status.firestore')}
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
                  {Array.isArray(s.sharedWithEmails) && s.sharedWithEmails.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      Shared with: {s.sharedWithEmails.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => openShare(s.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    title={t('submissions.share') || 'Share by email within team'}
                  >
                    <FiShare2 />
                    <span className="hidden sm:inline">
                      {t('submissions.share') || 'Share'}
                    </span>
                  </button>
                  {(s.status === 'local' || s.status === 'created') && (
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
                    onClick={() => handleDelete(s.id)}
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

      {shareForId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeShare} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Select teammates to share with</h3>
            {loadingTeam ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">Loading team emails...</div>
            ) : teamEmails.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">No teammates found for your team.</div>
            ) : (
              <div className="max-h-64 overflow-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-1">
                {teamEmails.map((email) => (
                  <label key={email} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={!!selectedEmails[email]}
                      onChange={() => toggleEmail(email)}
                    />
                    <span>{email}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeShare}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={applyShare}
                disabled={loadingTeam}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubmissionsList;
