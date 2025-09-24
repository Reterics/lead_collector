import React from 'react';
import { useTheme } from '../context/ThemeContext.tsx';
import { FiMoon, FiSun } from 'react-icons/fi';

const ThemeToggleButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const ctx = useTheme();
  const isDark = ctx?.theme === 'dark';

  const onClick = () => ctx?.toggleTheme();

  return (
    <button
      type="button"
      onClick={onClick}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={
        'inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-primary-600 dark:hover:bg-primary-700 ' +
        className
      }
    >
      {isDark ? <FiSun /> : <FiMoon />}
      <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
};

export default ThemeToggleButton;
