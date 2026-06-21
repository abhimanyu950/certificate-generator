import { useEffect, useState } from 'react';

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('cf_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('cf_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant flex items-center justify-center"
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
    >
      <span className="material-symbols-outlined select-none">
        {theme === 'light' ? 'dark_mode' : 'light_mode'}
      </span>
    </button>
  );
}
