import { createTheme, type PaletteMode } from '@mui/material/styles';

export function createAppTheme(mode: PaletteMode) {
  const light = mode === 'light';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: light ? '#2563EB' : '#60A5FA',
        light: light ? '#60A5FA' : '#93C5FD',
        dark: light ? '#1D4ED8' : '#3B82F6',
        contrastText: light ? '#FFFFFF' : '#0F172A',
      },
      // secondary = acento de gamificação — violet, usado APENAS em XP/Level/Conquistas
      secondary: {
        main: light ? '#7C3AED' : '#A78BFA',
        light: light ? '#A78BFA' : '#C4B5FD',
        dark: light ? '#5B21B6' : '#7C3AED',
        contrastText: '#FFFFFF',
      },
      background: {
        default: light ? '#FFFFFF' : '#0F172A',
        paper: light ? '#FFFFFF' : '#1E293B',
      },
      text: {
        primary: light ? '#0F172A' : '#F1F5F9',
        secondary: light ? '#475569' : '#94A3B8',
        disabled: light ? '#CBD5E1' : '#334155',
      },
      divider: light ? '#E2E8F0' : '#334155',
      success: {
        main: light ? '#059669' : '#34D399',
        light: light ? '#34D399' : '#6EE7B7',
        dark: light ? '#047857' : '#059669',
        contrastText: light ? '#FFFFFF' : '#0F172A',
      },
      warning: {
        main: light ? '#D97706' : '#FBBF24',
        light: light ? '#FBBF24' : '#FDE68A',
        dark: light ? '#B45309' : '#D97706',
        contrastText: light ? '#FFFFFF' : '#0F172A',
      },
      error: {
        main: light ? '#DC2626' : '#F87171',
        light: light ? '#F87171' : '#FCA5A5',
        dark: light ? '#B91C1C' : '#DC2626',
        contrastText: '#FFFFFF',
      },
      info: {
        main: light ? '#0284C7' : '#38BDF8',
        light: light ? '#38BDF8' : '#7DD3FC',
        dark: light ? '#0369A1' : '#0284C7',
        contrastText: light ? '#FFFFFF' : '#0F172A',
      },
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.3 },
      h3: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.35 },
      h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
      h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
      h6: { fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.5 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.55 },
      caption: { fontSize: '0.75rem', letterSpacing: '0.02em', lineHeight: 1.4 },
      overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.5 },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.5 },
      subtitle2: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 },
    },
    shape: { borderRadius: 8 },
    transitions: {
      duration: {
        shortest: 100,
        shorter: 150,
        short: 200,
        standard: 250,
        complex: 350,
        enteringScreen: 225,
        leavingScreen: 175,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: light ? '#FFFFFF' : '#0F172A',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            letterSpacing: '0.01em',
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
              transform: 'translateY(-1px)',
            },
            '&:active': { transform: 'scale(0.97)' },
          },
          outlined: {
            borderColor: light ? '#E2E8F0' : '#334155',
            '&:hover': { borderColor: light ? '#CBD5E1' : '#475569' },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500, fontFamily: '"Inter", sans-serif' },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: light ? '#E2E8F0' : '#334155',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: light ? '#CBD5E1' : '#475569',
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { fontSize: '0.875rem' },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: light ? '#E2E8F0' : '#334155' },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '0.75rem',
            backgroundColor: light ? '#1E293B' : '#F1F5F9',
            color: light ? '#F1F5F9' : '#1E293B',
          },
          arrow: {
            color: light ? '#1E293B' : '#F1F5F9',
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            backgroundColor: light ? '#E2E8F0' : '#334155',
          },
        },
      },
    },
  });
}

/** Compatibilidade legada — exporta tema dark como padrão */
export const masterTheme = createAppTheme('dark');
