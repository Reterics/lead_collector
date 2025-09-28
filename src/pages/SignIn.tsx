import logo from '../assets/logo_dark.svg';
import logoLight from '../assets/logo_light.svg';
import { useContext, useState } from 'react';
import AlertBox from '../components/AlertBox.tsx';
import { AuthContext } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { useTranslation } from 'react-i18next';

const SignInComponent = () => {
  const { SignIn, loading, error } = useContext(AuthContext);
  const theme = useTheme()?.theme;
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <section className="bg-gray-50 dark:bg-gray-900 fixed inset-0 z-50 grid place-items-center">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto w-full max-w-md">
        <a
          href="?page=about"
          className="flex flex-col items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white"
        >
          <img
            src={theme === 'dark' ? logo : logoLight}
            className="h-40"
            alt="Reterics logo"
          />
          {t('app.title')}
        </a>
        <div className="w-full bg-white rounded-lg shadow dark:border dark:bg-gray-800 dark:border-gray-700 p-6">
          <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white mb-4">
            {t('auth.signInTitle')}
          </h1>
          {error && (
            <AlertBox title={t('auth.error')} message={error} role="alert" />
          )}

          {loading ? (
            <div role="status" className="text-center place-items-center">
              <svg
                aria-hidden="true"
                className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                viewBox="0 0 100 101"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539..."
                  fill="currentFill"
                />
              </svg>
              <span className="sr-only">{t('auth.loading')}...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  {t('auth.emailLabel')}
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="name@integrint.hu"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  {t('auth.passwordLabel')}
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  SignIn({ email, password });
                }}
                className="w-full text-white bg-gray-600 hover:bg-gray-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
              >
                {t('auth.signIn')}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SignInComponent;
