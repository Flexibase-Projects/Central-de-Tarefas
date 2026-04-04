import { alpha, createTheme, type PaletteMode } from '@/compat/mui/styles'

const FONT_STACK = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

export function createAppTheme(mode: PaletteMode) {
  const light = mode === 'light'

  const radii = {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 10,
  }

  const neutrals = light
    ? {
        bg: '#eff2f6',
        panel: '#ffffff',
        panelAlt: '#f6f8fb',
        panelInteractive: '#eef2f7',
        text: '#171a1f',
        textMuted: '#5e6672',
        textSubtle: '#8b95a3',
        line: '#d6dde6',
        lineStrong: '#bcc7d4',
      }
    : {
        bg: '#0e0e0e',
        panel: '#141414',
        panelAlt: '#1a1a1a',
        panelInteractive: '#222222',
        text: '#ececec',
        textMuted: '#a8a8a8',
        textSubtle: '#787878',
        line: '#2e2e2e',
        lineStrong: '#404040',
      }

  const primary = {
    main: light ? '#2859c5' : '#7aa2f8',
    dark: light ? '#2148a1' : '#5e87df',
    light: light ? '#dbe6ff' : alpha('#7aa2f8', 0.16),
  }

  const statuses = {
    success: light ? '#1f7a4c' : '#63c58c',
    warning: light ? '#aa6a14' : '#d9a14b',
    error: light ? '#b74638' : '#e0897f',
    info: light ? '#2b6a8d' : '#6ea4c1',
  }

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primary.main,
        dark: primary.dark,
        light: light ? '#5e86d9' : '#9ab9ff',
        contrastText: light ? '#ffffff' : '#0e0e0e',
      },
      secondary: {
        main: light ? '#4f5965' : '#c6c6c6',
        dark: light ? '#313843' : '#9a9a9a',
        light: light ? '#e6ebf1' : '#2a2a2a',
        contrastText: light ? '#ffffff' : '#0e0e0e',
      },
      background: {
        default: neutrals.bg,
        paper: neutrals.panel,
      },
      text: {
        primary: neutrals.text,
        secondary: neutrals.textMuted,
        disabled: neutrals.textSubtle,
      },
      divider: neutrals.line,
      success: {
        main: statuses.success,
        contrastText: light ? '#ffffff' : '#102216',
      },
      warning: {
        main: statuses.warning,
        contrastText: light ? '#ffffff' : '#241808',
      },
      error: {
        main: statuses.error,
        contrastText: light ? '#ffffff' : '#2b1412',
      },
      info: {
        main: statuses.info,
        contrastText: light ? '#ffffff' : '#0f171d',
      },
      action: {
        hover: light ? '#eef2f7' : '#262626',
        selected: light ? '#e7edf7' : '#2c2c2c',
        focus: alpha(primary.main, light ? 0.18 : 0.28),
      },
    },
    shape: {
      borderRadius: radii.md,
    },
    typography: {
      fontFamily: FONT_STACK,
      h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 },
      h2: { fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 },
      h3: { fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h4: { fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.25 },
      h5: { fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 },
      h6: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.35 },
      subtitle1: { fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.45 },
      subtitle2: { fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.45 },
      body1: { fontSize: '0.94rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.55 },
      caption: { fontSize: '0.75rem', lineHeight: 1.45, color: neutrals.textMuted },
      overline: { fontSize: '0.7rem', fontWeight: 600, lineHeight: 1.35, letterSpacing: '0.05em', textTransform: 'none' },
      button: { fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.01em', textTransform: 'none' },
    },
    transitions: {
      duration: {
        shortest: 80,
        shorter: 120,
        short: 160,
        standard: 200,
        complex: 240,
        enteringScreen: 180,
        leavingScreen: 140,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            '--radius-xs': `${radii.xs}px`,
            '--radius-sm': `${radii.sm}px`,
            '--radius-md': `${radii.md}px`,
            '--radius-lg': `${radii.lg}px`,
            '--surface-default': neutrals.panel,
            '--surface-subtle': neutrals.panelAlt,
            '--surface-interactive': neutrals.panelInteractive,
            '--surface-raised': light ? '#ffffff' : '#1c1c1c',
            '--border-default': neutrals.line,
            '--border-strong': neutrals.lineStrong,
            '--text-primary': neutrals.text,
            '--text-secondary': neutrals.textMuted,
            '--text-subtle': neutrals.textSubtle,
            '--status-neutral-bg': light ? '#edf1f6' : '#252525',
            '--status-neutral-fg': light ? '#47515d' : '#c8c8c8',
            '--status-info-bg': light ? '#e2eef5' : alpha(statuses.info, 0.16),
            '--status-success-bg': light ? '#e3f1e8' : alpha(statuses.success, 0.16),
            '--status-warning-bg': light ? '#f7eedf' : alpha(statuses.warning, 0.18),
            '--status-danger-bg': light ? '#f6e5e2' : alpha(statuses.error, 0.18),
            '--progress-default': primary.main,
            '--progress-gamification-start': light ? '#3e63b8' : '#86a5ee',
            '--progress-gamification-end': light ? '#7f6db4' : '#a88dd6',
          },
          html: {
            backgroundColor: neutrals.bg,
          },
          body: {
            backgroundColor: neutrals.bg,
            color: neutrals.text,
            fontFeatureSettings: '"cv02","cv03","cv04","cv11"',
          },
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${light ? '#aab5c2' : '#525252'} transparent`,
          },
          '*::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: light ? '#aab5c2' : '#525252',
            borderRadius: radii.xs,
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: neutrals.panel,
            borderRadius: radii.md,
            border: `1px solid ${neutrals.line}`,
            boxShadow: light
              ? '0 2px 10px rgba(15, 23, 42, 0.04)'
              : '0 8px 18px rgba(0, 0, 0, 0.18)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: neutrals.panel,
            borderRadius: radii.md,
            border: `1px solid ${neutrals.line}`,
            boxShadow: light
              ? '0 2px 10px rgba(15, 23, 42, 0.04)'
              : '0 8px 18px rgba(0, 0, 0, 0.18)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: neutrals.panel,
            borderRadius: 0,
            borderColor: neutrals.line,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            borderRadius: radii.lg,
            border: `1px solid ${neutrals.line}`,
            boxShadow: light
              ? '0 14px 28px rgba(15, 23, 42, 0.12)'
              : '0 18px 36px rgba(0, 0, 0, 0.35)',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            minHeight: 38,
            paddingInline: 14,
            borderRadius: radii.md,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'transparent',
          },
          contained: {
            borderColor: alpha(primary.dark, 0.45),
            boxShadow: light
              ? '0 6px 16px rgba(40, 89, 197, 0.18)'
              : '0 8px 18px rgba(122, 162, 248, 0.18)',
            '&:hover': {
              backgroundColor: primary.dark,
              boxShadow: light
                ? '0 10px 22px rgba(40, 89, 197, 0.22)'
                : '0 12px 24px rgba(122, 162, 248, 0.22)',
            },
          },
          outlined: {
            borderColor: neutrals.lineStrong,
            backgroundColor: 'transparent',
            '&:hover': {
              borderColor: light ? '#98a5b4' : '#6e6e6e',
              backgroundColor: neutrals.panelAlt,
            },
          },
          text: {
            '&:hover': {
              backgroundColor: neutrals.panelAlt,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: radii.sm,
            border: `1px solid ${neutrals.line}`,
            '&:hover': {
              backgroundColor: neutrals.panelAlt,
            },
          },
          sizeSmall: {
            padding: 6,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: radii.sm,
            fontWeight: 600,
            border: `1px solid ${neutrals.line}`,
            backgroundColor: neutrals.panelAlt,
            '& .MuiChip-label': {
              paddingInline: 8,
            },
          },
          filledPrimary: {
            backgroundColor: light ? '#dfe8fb' : alpha(primary.main, 0.18),
            color: primary.dark,
            borderColor: alpha(primary.main, 0.32),
          },
          outlined: {
            backgroundColor: 'transparent',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: light ? '#171a1f' : '#2a2a2a',
            color: light ? '#edf1f5' : '#ececec',
            borderRadius: radii.xs,
            fontSize: '0.75rem',
            padding: '6px 8px',
          },
          arrow: {
            color: light ? '#171a1f' : '#2a2a2a',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: radii.md,
            backgroundColor: light ? '#ffffff' : neutrals.panelAlt,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: neutrals.lineStrong,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: light ? '#aab5c2' : '#6e6e6e',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1,
              borderColor: primary.main,
              boxShadow: `0 0 0 3px ${alpha(primary.main, light ? 0.14 : 0.2)}`,
            },
          },
          input: {
            paddingTop: 11,
            paddingBottom: 11,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.825rem',
            fontWeight: 500,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: radii.md,
            border: `1px solid ${neutrals.line}`,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 2,
            borderRadius: 0,
            backgroundColor: primary.main,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 42,
            paddingInline: 12,
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: neutrals.panelAlt,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'none',
            letterSpacing: '0.03em',
            color: neutrals.textMuted,
            borderBottom: `1px solid ${neutrals.line}`,
          },
          body: {
            borderBottom: `1px solid ${neutrals.line}`,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 6,
            borderRadius: radii.xs,
            backgroundColor: light ? '#dde5ef' : '#333333',
          },
          bar: {
            borderRadius: radii.xs,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: neutrals.line,
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontWeight: 700,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: radii.md,
            border: `1px solid ${neutrals.line}`,
            boxShadow: light
              ? '0 10px 24px rgba(15, 23, 42, 0.12)'
              : '0 12px 28px rgba(0, 0, 0, 0.32)',
          },
        },
      },
    },
  })
}

export const masterTheme = createAppTheme('dark')
