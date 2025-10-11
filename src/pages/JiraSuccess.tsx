import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { normalizeJiraUrl } from "../utils/commons.ts";

export type JiraSuccessState = {
  issueKey?: string;
  issueUrl?: string;
  summary?: string;
};

const JiraSuccess: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const state = (location.state || {}) as JiraSuccessState;

  const issueKey = state.issueKey;
  const issueUrl = normalizeJiraUrl(state.issueUrl, state.issueKey);
  const summary = state.summary;


  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold text-green-700 dark:text-green-400 mb-2">
        {t('success.title')}
      </h2>
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        {summary ? (
          <>
            <span className="font-medium">{t('success.summary')}:</span> {summary}
          </>
        ) : (
          t('success.submitted')
        )}
      </p>
      {issueKey && (
        <p className="text-gray-800 dark:text-gray-200 mb-2">
          <span className="font-medium">{t('success.issue')}:</span> {issueKey}
        </p>
      )}
      {issueUrl && (
        <p className="mb-6">
          <a
            href={issueUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            {t('submissions.openInJira')} ↗
          </a>
        </p>
      )}

      <div className="flex gap-3">
        <Link
          to="/"
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
        >
          {t('app.goHome')}
        </Link>
      </div>
    </div>
  );
};

export default JiraSuccess;
