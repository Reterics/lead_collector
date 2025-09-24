import logo from '../assets/logo_dark.svg';
import logoLight from '../assets/logo_light.svg';
import LoadingIcon from './elements/LoadingIcon.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { useTranslation } from 'react-i18next';

const PageLoading = () => {
  const theme = useTheme()?.theme;
  const { t } = useTranslation();
  return (
    <div className="page-loading fixed top-0 h-svh w-full bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center z-50">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0 mb-8">
        <a
          href="?page=about"
          className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white flex-col"
        >
          <img
            src={theme === 'dark' ? logo : logoLight}
            className="h-40 mr-2"
            alt="Reterics logo"
          />
          {t('app.title')}
        </a>

        <LoadingIcon />
        <div className={'font-normal text-xl mt-2'}>{t('auth.loading')}...</div>
      </div>
    </div>
  );
};

export default PageLoading;
