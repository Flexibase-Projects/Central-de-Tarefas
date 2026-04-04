import { Paper, type PaperProps, type SxProps, type Theme } from '@/compat/mui/material'
import { alpha } from '@/compat/mui/styles'

type AppSurfaceVariant = 'default' | 'subtle' | 'interactive'
type ExtendedAppSurfaceVariant = AppSurfaceVariant | 'raised'

interface AppSurfaceProps extends Omit<PaperProps, 'variant'> {
  surface?: ExtendedAppSurfaceVariant
  compact?: boolean
}

function getSurfaceStyles(surface: ExtendedAppSurfaceVariant): SxProps<Theme> {
  return (theme: Theme) => {
    const borderColor = theme.palette.divider
    const palette = {
      default: theme.palette.background.paper,
      subtle: theme.palette.action.hover,
      raised: 'var(--surface-raised)',
      /** No escuro, destaque neutro (evita lavado azul do primário); semântica fica nos StatusToken/badges. */
      interactive: theme.palette.mode === 'light'
        ? alpha(theme.palette.primary.main, 0.035)
        : theme.palette.action.selected,
    }

    return {
      backgroundColor: palette[surface],
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow:
        surface === 'raised'
          ? theme.palette.mode === 'light'
            ? '0 10px 30px rgba(15, 23, 42, 0.08)'
            : '0 14px 28px rgba(0, 0, 0, 0.28)'
          : surface === 'interactive'
            ? theme.palette.mode === 'light'
              ? '0 4px 16px rgba(15, 23, 42, 0.05)'
              : '0 8px 18px rgba(0, 0, 0, 0.2)'
            : 'none',
      transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease',
      ...(surface === 'interactive'
        ? {
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow:
                theme.palette.mode === 'light'
                  ? '0 10px 24px rgba(15, 23, 42, 0.08)'
                  : '0 14px 26px rgba(0, 0, 0, 0.28)',
            },
          }
        : null),
    }
  }
}

export function AppSurface({
  surface = 'default',
  compact = false,
  sx,
  children,
  ...props
}: AppSurfaceProps) {
  return (
    <Paper
      {...props}
      sx={[
        getSurfaceStyles(surface),
        {
          p: compact ? 1.5 : 2,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Paper>
  )
}

export default AppSurface
