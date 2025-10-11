import React, { useEffect } from 'react';
import {
  FiTrash2,
  FiRefreshCcw,
  FiExternalLink,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import {normalizeJiraUrl} from "../utils/commons.ts";
import { useSubmissionsContext } from '../context/SubmissionsContext.tsx';

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
                </div>
                <div className="flex flex-col items-center gap-2">
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
    </>
  );
};

export default SubmissionsList;
