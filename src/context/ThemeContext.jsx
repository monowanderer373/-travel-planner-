import { createContext, useContext, useState, useEffect } from 'react';

const THEME_KEY = 'trip-planner-theme';
const THEMES = [
  { id: 'pastel', label: 'Pastel (default)' },
  { id: 'doodle', label: 'Google Doodle' },
  { id: 'nier', label: 'Nier Automata' },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'pastel';
    } catch {
      return 'pastel';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeId);
    try {
      localStorage.setItem(THEME_KEY, themeId);
    } catch {}
  }, [themeId]);

  const setThemeId = (id) => {
    if (THEMES.some((t) => t.id === id)) setThemeIdState(id);
  };

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
