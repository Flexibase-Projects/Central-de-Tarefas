import React, { useMemo, useEffect, createContext, useContext, useState, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@/compat/mui/material';
import type { PaletteMode } from '@/compat/mui/material';
import { createAppTheme } from './theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeModeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'dark',
  toggleTheme: () => {},
});

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem('cdt-theme') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', mode);
    html.classList.remove('dark', 'light', 'theme-master', 'theme-light', 'theme-dark');
    if (mode === 'dark') html.classList.add('dark');
    try { localStorage.setItem('cdt-theme', mode); } catch {}
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((m) => (m === 'dark' ? 'light' : 'dark'));
  }, []);

  const theme = useMemo(() => createAppTheme(mode as PaletteMode), [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
}
