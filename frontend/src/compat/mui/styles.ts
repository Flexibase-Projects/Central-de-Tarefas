import * as React from 'react'

export type PaletteMode = 'light' | 'dark'

export interface Theme {
  [key: string]: any
  palette: {
    mode: PaletteMode
    common: {
      white: string
      black: string
    }
    primary: { main: string; dark: string; light: string; contrastText: string }
    secondary: { main: string; dark: string; light: string; contrastText: string }
    background: { default: string; paper: string }
    text: { primary: string; secondary: string; disabled: string }
    divider: string
    success: { main: string; contrastText: string }
    warning: { main: string; contrastText: string }
    error: { main: string; contrastText: string }
    info: { main: string; contrastText: string }
    action: { hover: string; selected: string; focus: string }
  }
  shape: {
    borderRadius: number
  }
  zIndex: {
    modal: number
    popover: number
    tooltip: number
  }
  shadows: string[]
  typography: Record<string, React.CSSProperties>
  transitions: {
    duration: Record<string, number>
    create: (properties: string | string[], options?: { duration?: number }) => string
  }
  spacing: (value: number) => string
  components?: Record<string, unknown>
}

export type ThemeInput = Record<string, unknown>

export interface SxStyleObject<TTheme = Theme> {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | SxStyleObject<TTheme>
    | Array<string | number | boolean | null | undefined | SxStyleObject<TTheme>>
    | ((theme: TTheme) => string | number | boolean | null | undefined | SxStyleObject<TTheme>)
}

export type SxObject<TTheme = Theme> =
  | SxStyleObject<TTheme>
  | ((theme: TTheme) => SxStyleObject<TTheme>)
export type SxProps<TTheme = Theme> =
  | SxObject<TTheme>
  | Array<SxObject<TTheme> | null | false | undefined>
  | null
  | false
  | undefined

export const DEFAULT_THEME: Theme = {
  palette: {
    mode: 'dark',
    common: {
      white: '#ffffff',
      black: '#000000',
    },
    primary: {
      main: '#7aa2f8',
      dark: '#5e87df',
      light: '#9ab9ff',
      contrastText: '#0f141a',
    },
    secondary: {
      main: '#cad2dc',
      dark: '#a8b2bf',
      light: '#2b333d',
      contrastText: '#0f141a',
    },
    background: {
      default: '#111418',
      paper: '#171c22',
    },
    text: {
      primary: '#edf1f5',
      secondary: '#a4afbb',
      disabled: '#758192',
    },
    divider: '#2a313b',
    success: {
      main: '#63c58c',
      contrastText: '#102216',
    },
    warning: {
      main: '#d9a14b',
      contrastText: '#241808',
    },
    error: {
      main: '#e0897f',
      contrastText: '#2b1412',
    },
    info: {
      main: '#6ea4c1',
      contrastText: '#0f171d',
    },
    action: {
      hover: '#202731',
      selected: '#222d3a',
      focus: 'rgba(122, 162, 248, 0.28)',
    },
  },
  shape: {
    borderRadius: 8,
  },
  zIndex: {
    modal: 1300,
    popover: 1200,
    tooltip: 1500,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(15, 23, 42, 0.06)',
    '0 1px 3px rgba(15, 23, 42, 0.08)',
    '0 4px 10px rgba(15, 23, 42, 0.10)',
    '0 8px 18px rgba(15, 23, 42, 0.12)',
    '0 12px 24px rgba(15, 23, 42, 0.14)',
    '0 16px 30px rgba(15, 23, 42, 0.16)',
    '0 18px 34px rgba(15, 23, 42, 0.18)',
    '0 20px 38px rgba(15, 23, 42, 0.20)',
    '0 22px 42px rgba(15, 23, 42, 0.22)',
    '0 24px 46px rgba(15, 23, 42, 0.24)',
    '0 26px 50px rgba(15, 23, 42, 0.26)',
    '0 28px 54px rgba(15, 23, 42, 0.28)',
  ],
  typography: {},
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
    create: (properties, options) => {
      const propertiesList = Array.isArray(properties) ? properties : [properties]
      const duration = options?.duration ?? 200
      return propertiesList.map((property) => `${property} ${duration}ms ease`).join(', ')
    },
  },
  spacing: (value: number) => `${value * 8}px`,
  components: {},
}

const ThemeContext = React.createContext<Theme>(DEFAULT_THEME)

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge<T extends Record<string, unknown>>(base: T, override?: Record<string, unknown>): T {
  if (!override) return base

  const result: Record<string, unknown> = { ...base }

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value)
      continue
    }
    result[key] = value
  }

  return result as T
}

export function createTheme(input: ThemeInput): Theme {
  const merged = deepMerge(
    DEFAULT_THEME as unknown as Record<string, unknown>,
    input as Record<string, unknown>,
  ) as unknown as Theme
  const transitions = merged.transitions ?? DEFAULT_THEME.transitions

  return {
    ...merged,
    transitions: {
      ...DEFAULT_THEME.transitions,
      ...transitions,
      duration: {
        ...DEFAULT_THEME.transitions.duration,
        ...(transitions.duration ?? {}),
      },
      create: transitions.create ?? DEFAULT_THEME.transitions.create,
    },
    zIndex: {
      ...DEFAULT_THEME.zIndex,
      ...(merged.zIndex ?? {}),
    },
    shadows: merged.shadows ?? DEFAULT_THEME.shadows,
    spacing: merged.spacing ?? DEFAULT_THEME.spacing,
  }
}

export function alpha(value: string, opacity: number): string {
  const normalized = value.trim()

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1)
    const full = hex.length === 3 ? hex.split('').map((part) => `${part}${part}`).join('') : hex
    const red = Number.parseInt(full.slice(0, 2), 16)
    const green = Number.parseInt(full.slice(2, 4), 16)
    const blue = Number.parseInt(full.slice(4, 6), 16)
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`
  }

  const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/i)
  if (rgbMatch) {
    const [red = '0', green = '0', blue = '0'] =
      rgbMatch[1]?.split(',').map((part) => part.trim()) ?? []
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`
  }

  return normalized
}

export function useTheme(): Theme {
  return React.useContext(ThemeContext)
}

export interface ThemeProviderProps {
  theme: Theme
  children: React.ReactNode
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return React.createElement(ThemeContext.Provider, { value: theme }, children)
}

export function CssBaseline() {
  const theme = useTheme()

  React.useEffect(() => {
    const root = document.documentElement
    const rootVars =
      (theme.components?.MuiCssBaseline as { styleOverrides?: Record<string, unknown> } | undefined)
        ?.styleOverrides?.[':root'] as Record<string, string | number> | undefined

    if (rootVars) {
      for (const [key, value] of Object.entries(rootVars)) {
        root.style.setProperty(key, String(value))
      }
    }

    document.body.style.backgroundColor = theme.palette.background.default
    document.body.style.color = theme.palette.text.primary
  }, [theme])

  return null
}
