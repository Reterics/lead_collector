import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext.tsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiLogOut, FiPlus, FiUpload, FiArrowLeft, FiEdit, FiRefreshCcw, FiMonitor } from 'react-icons/fi';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const { SignOut } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  const qMatch = path.match(/^\/questionnaires\/([^/]+)(?:\/(edit|success))?$/);
  const showBack = path !== '/';

  const onImportFromHeader = () => {
    window.dispatchEvent(new CustomEvent('open-import-dialog'));
  };

  // Determine page title based on route
  let pageTitle: string | null = null;
  if (path.startsWith('/submissions')) pageTitle = t('submissions.title');
  else if (path.startsWith('/settings')) pageTitle = t('settings.title');
  else if (path.startsWith('/terms')) pageTitle = t('terms.title');
  else if (qMatch && qMatch[2] === 'edit') pageTitle = t('editor.headingEdit');
  else if (path === '/questionnaires/new') pageTitle = t('editor.headingCreate');

  // Build dynamic actions based on route
  const actions: React.ReactNode[] = [];

  if (path === '/') {
    actions.push(
      <Link
        key="new"
        to="/questionnaires/new"
        className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
        aria-label={t('home.new')}
        title={t('home.new')}
      >
        <FiPlus className="h-4 w-4" />
        <span className="hidden sm:inline">{t('home.new')}</span>
      </Link>
    );
    actions.push(
      <button
        key="import"
        onClick={onImportFromHeader}
        className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
        aria-label={t('home.importJson')}
        title={t('home.importJson')}
      >
        <FiUpload className="h-4 w-4" />
        <span className="hidden sm:inline">{t('home.importJson')}</span>
      </button>
    );
  }

  if (qMatch) {
    // When viewing questionnaire (not edit/success), show edit shortcut
    if (!qMatch[2]) {
      const id = qMatch[1];
      actions.push(
        <Link
          key="edit"
          to={`/questionnaires/${id}/edit`}
          className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
          aria-label={t('home.edit')}
          title={t('home.edit')}
        >
          <FiEdit className="h-4 w-4" />
          <span className="hidden sm:inline">{t('home.edit')}</span>
        </Link>
      );
    }
  }

  // Submissions page actions
  if (path.startsWith('/submissions')) {
    const desktop = path.startsWith('/submissions/desktop');
    const toggleTo = desktop ? '/submissions' : '/submissions/desktop';
    const toggleLabel = desktop ? t('submissions.mobileView') : t('submissions.desktopView');

    actions.push(
      <Link
        key="toggleView"
        to={toggleTo}
        className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        title={toggleLabel}
      >
        <FiMonitor className="h-4 w-4" />
        <span className="hidden sm:inline">{toggleLabel}</span>
      </Link>
    );

    actions.push(
      <button
        key="refreshSubmissions"
        onClick={() => window.dispatchEvent(new CustomEvent('submissions-refresh'))}
        className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
        title={t('submissions.refresh')}
      >
        <FiRefreshCcw className="h-4 w-4" />
        <span className="hidden sm:inline">{t('submissions.refresh')}</span>
      </button>
    );
  }

  return (
    <header className="w-full border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 fixed top-0 left-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
              aria-label={t('app.back')}
              title={t('app.back')}
            >
              <FiArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('app.back')}</span>
            </button>
          )}
          {pageTitle ? (
            <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
              {pageTitle}
            </span>
          ) : (
            <Link to="/" className="text-base font-semibold tracking-tight text-gray-900 dark:text-white hover:opacity-90">
              {t('app.title')}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            onClick={() => SignOut()}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            title={t('auth.logout')}
            aria-label={t('auth.logout')}
          >
            <FiLogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t('auth.logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
