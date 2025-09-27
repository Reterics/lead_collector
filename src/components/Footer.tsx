import React, { useContext } from 'react';
import ThemeToggleButton from './ThemeToggleButton';
import LanguageSwitcher from './LanguageSwitcher';
import { AuthContext } from '../context/AuthContext';
import { useJiraAuth } from '../context/JiraAuthContext.tsx';

const Footer: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { status, message, loading, authUrl } = useJiraAuth();

  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 fixed bottom-0 left-0">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-2 text-sm">
        <div className="min-h-[28px] flex items-center">
          {user ? (
            loading ? (
              <span className="text-gray-500">Checking JIRA connection…</span>
            ) : status === 401 ? (
              <a href={authUrl} className="inline-flex items-center px-2.5 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700">
                Authenticate with JIRA
              </a>
            ) : message ? (
              <span className="text-gray-700 dark:text-gray-300">{message}</span>
            ) : null
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggleButton />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
