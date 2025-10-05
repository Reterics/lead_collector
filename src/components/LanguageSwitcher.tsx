import React from 'react';
import i18n, { LANGUAGE_STORAGE_KEY } from '../i18n';

const LanguageSwitcher: React.FC = () => {
  const [lang, setLang] = React.useState<string>(() => i18n.language || 'hu');

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLng = e.target.value;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, newLng);
      }
    } catch { /* */ }
    i18n.changeLanguage(newLng);
    setLang(newLng);
  };

  return (
    <select
      aria-label="Language"
      value={lang}
      onChange={onChange}
      className="ml-2 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
    >
      <option value="en">EN</option>
      <option value="hu">HU</option>
    </select>
  );
};

export default LanguageSwitcher;
