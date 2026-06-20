import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Theme = 'catppuccin' | 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  logoGlow: boolean;
  toggleLogoGlow: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    return saved ?? 'catppuccin';
  });

  const [logoGlow, setLogoGlow] = useState(() => localStorage.getItem('logoGlow') !== 'off');

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'catppuccin' ? 'dark' : prev === 'dark' ? 'light' : 'catppuccin';
      localStorage.setItem('theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  const toggleLogoGlow = useCallback(() => {
    setLogoGlow(prev => {
      const next = !prev;
      localStorage.setItem('logoGlow', next ? 'on' : 'off');
      return next;
    });
  }, []);

  // Keep the <html> attribute in sync on initial mount
  if (document.documentElement.getAttribute('data-theme') !== theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, logoGlow, toggleLogoGlow }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
