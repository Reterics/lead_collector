import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSubmissions, removeSubmission, type SubmissionEntry } from '../utils/submissions.ts';
import { FiTrash2, FiRefreshCcw, FiArrowLeft, FiExternalLink } from 'react-icons/fi';

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
  const [items, setItems] = useState<SubmissionEntry[]>(() => loadSubmissions());

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [items]);

  const refresh = () => setItems(loadSubmissions());

  const onDelete = (id: string) => {
    if (confirm('Delete this submission record?')) {
      removeSubmission(id);
      refresh();
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:underline" title="Back">
              <FiArrowLeft />
              <span>Back</span>
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Submissions</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white" title="Refresh">
              <FiRefreshCcw />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="text-gray-700 dark:text-gray-300">No submissions recorded yet.</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((s) => (
              <div key={s.id} className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded ${statusBadge[s.status] || statusBadge.unknown}`}>
                        {s.status === 'jira' && 'JIRA created'}
                        {s.status === 'local' && 'Stored locally'}
                        {s.status === 'auth' && 'Auth required'}
                        {s.status === 'error' && 'Error'}
                        {s.status === 'unknown' && 'Unknown'}
                      </span>
                      <span className="text-sm text-gray-500">{formatDate(s.createdAt)}</span>
                    </div>
                    <div className="text-gray-900 dark:text-white font-medium">{s.questionnaireName}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 break-words">{s.summary}</div>
                    {s.issueKey && s.issueUrl && (
                      <div className="mt-1 text-sm">
                        <a href={s.issueUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline" title="Open in JIRA">
                          <FiExternalLink />
                          <span>{s.issueKey}</span>
                        </a>
                      </div>
                    )}
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">Details</summary>
                      <pre className="mt-1 text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300">{s.description}</pre>
                    </details>
                  </div>
                  <div>
                    <button onClick={() => onDelete(s.id)} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700" title="Delete">
                      <FiTrash2 />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SubmissionsList;
