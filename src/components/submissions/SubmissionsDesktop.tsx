import React, { useEffect, useState } from 'react';
import {useTranslation} from 'react-i18next';
import {
  FiRefreshCcw,
  FiTrash2,
  FiEye,
  FiX,
  FiExternalLink,
} from 'react-icons/fi';
import {normalizeJiraUrl} from '../../utils/commons.ts';
import type { SubmissionEntry } from '../../utils/submissions.ts';
import { useSubmissionsContext } from '../../context/SubmissionsContext.tsx';

const statusBadge: Record<string, string> = {
  jira: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  firebase: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
  local: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  auth: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const Modal: React.FC<{ open: boolean; onClose: () => void; title?: string } & React.PropsWithChildren> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[min(900px,92vw)] max-h-[90vh] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const SubmissionsDesktop: React.FC = () => {
  const { t } = useTranslation();
  const { sorted, retrying, refresh, onRetry, onDelete } = useSubmissionsContext();
  const [selected, setSelected] = useState<SubmissionEntry | null>(null);

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
        <div className="text-gray-700 dark:text-gray-300">{t('submissions.empty')}</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('submissions.headers.status')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('submissions.headers.summary')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('submissions.headers.questionnaire')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('submissions.headers.date')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('submissions.headers.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {sorted.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded ${statusBadge[s.status] || statusBadge.unknown}`}>
                      {s.status === 'jira' && t('submissions.status.jira')}
                      {s.status === 'local' && t('submissions.status.local')}
                      {s.status === 'auth' && t('submissions.status.auth')}
                      {s.status === 'unknown' && t('submissions.status.unknown')}
                    </span>
                  </td>
                  <td className="px-4 py-2 max-w-[420px]"><div className="truncate" title={s.summary}>{s.summary}</div></td>
                  <td className="px-4 py-2">{s.questionnaireName}</td>
                  <td className="px-4 py-2">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setSelected(s)} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700" title={t('submissions.open') as string}>
                        <FiEye />
                        <span className="hidden lg:inline">{t('submissions.open')}</span>
                      </button>
                      {(s.status === 'local' || s.status === 'created') && (
                        <button onClick={() => onRetry(s)} disabled={!!retrying[s.id]} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60" title={t('submissions.retry')}>
                          <FiRefreshCcw />
                          <span className="hidden lg:inline">{(retrying[s.id] ? t('submissions.retrying') : t('submissions.retry')) as string}</span>
                        </button>
                      )}
                      <button onClick={() => handleDelete(s.id)} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700" title={t('submissions.delete')}>
                        <FiTrash2 />
                        <span className="hidden lg:inline">{t('submissions.delete')}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.summary}>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-block px-2 py-0.5 text-xs rounded ${statusBadge[selected.status] || statusBadge.unknown}`}>
                {selected.status === 'jira' && t('submissions.status.jira')}
                {selected.status === 'local' && t('submissions.status.local')}
                {selected.status === 'auth' && t('submissions.status.auth')}
                {selected.status === 'unknown' && t('submissions.status.unknown')}
              </span>
              <span className="text-sm text-gray-500">{formatDate(selected.createdAt)}</span>
              {selected.issueKey && selected.issueUrl && (
                <a
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline ml-auto"
                  href={normalizeJiraUrl(selected.issueUrl, selected.issueKey)}
                  target="_blank" rel="noreferrer"
                >
                  <FiExternalLink /> {selected.issueKey}
                </a>
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">{selected.questionnaireName}</div>
              <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{selected.description}</pre>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {(selected.status === 'local' || selected.status === 'created') && (
                <button onClick={() => onRetry(selected)} disabled={!!retrying[selected.id]} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60">
                  <FiRefreshCcw /> {(retrying[selected.id] ? t('submissions.retrying') : t('submissions.retry')) as string}
                </button>
              )}
              <button onClick={() => { handleDelete(selected.id); setSelected(null); }} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700">
                <FiTrash2 /> {t('submissions.delete')}
              </button>
              <button onClick={() => setSelected(null)} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
                <FiX /> {t('submissions.close')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default SubmissionsDesktop;
