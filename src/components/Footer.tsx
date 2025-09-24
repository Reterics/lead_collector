import React from 'react';
import ThemeToggleButton from './ThemeToggleButton';
import LanguageSwitcher from './LanguageSwitcher';

const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 fixed bottom-0 left-0">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-end gap-2">
        <LanguageSwitcher />
        <ThemeToggleButton />
      </div>
    </footer>
  );
};

export default Footer;
