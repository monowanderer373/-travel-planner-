import { createContext, useContext, useState, useEffect } from 'react';

const THEME_KEY = 'trip-planner-theme';
const THEMES = [
  { id: 'voyage-light', label: 'Voyage (Light)' },
  { id: 'voyage-dark', label: 'Voyage (Dark)' },
  { id: 'nier', label: 'Nier Automata', disabled: true }, // show but don't allow selection (until you decide)
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored && THEMES.some((t) => t.id === stored)) {
        const entry = THEMES.find((t) => t.id === stored);
        return entry?.disabled ? 'voyage-light' : stored;
      }
      // Default theme is Voyage (Light)
      return 'voyage-light';
    } catch {
      return 'voyage-light';
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
    if (!THEMES.some((t) => t.id === id)) return;
    const entry = THEMES.find((t) => t.id === id);
    if (entry?.disabled) return;
    setThemeIdState(id);
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
