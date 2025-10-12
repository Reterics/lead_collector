import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-md ${
      isActive
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-gray-600 dark:text-gray-300'
    }`;

  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 fixed bottom-0 left-0">
      <nav aria-label="Bottom navigation" className="max-w-5xl mx-auto">
        <ul className="grid grid-cols-3">
          <li className="col-span-1">
            <NavLink to="/" className={navLinkClass} aria-label={t('app.home')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M12 3.172 2.293 12.88a1 1 0 1 0 1.414 1.414L5 13.001V20a2 2 0 0 0 2 2h3v-6h4v6h3a2 2 0 0 0 2-2v-6.999l1.293 1.293a1 1 0 0 0 1.414-1.414L12 3.172z" />
              </svg>
              <span className="text-xs">{t('app.home')}</span>
            </NavLink>
          </li>
          <li className="col-span-1">
            <NavLink to="/submissions" className={navLinkClass} aria-label={t('submissions.title')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M4 6h16a1 1 0 1 0 0-2H4a1 1 0 1 0 0 2zm0 6h16a1 1 0 1 0 0-2H4a1 1 0 1 0 0 2zm0 6h16a1 1 0 1 0 0-2H4a1 1 0 1 0 0 2z" />
              </svg>
              <span className="text-xs">{t('submissions.title')}</span>
            </NavLink>
          </li>
          <li className="col-span-1">
            <NavLink to="/settings" className={navLinkClass} aria-label={t('app.settings')} >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.12.52-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.6a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.51.41 1.05.73 1.63.94l.36 2.54c.06.24.27.42.5.42h3.84c.24 0 .44-.18.5-.42l.36-2.54c.58-.22 1.12-.52 1.63-.94l2.39.96c.26.12.55.02.69-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
              </svg>
              <span className="text-xs">{t('app.settings')}</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </footer>
  );
};

export default Footer;
