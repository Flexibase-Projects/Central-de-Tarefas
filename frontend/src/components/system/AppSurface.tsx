import { Paper, type PaperProps, type SxProps, type Theme } from '@mui/material'
import { alpha } from '@mui/material/styles'

type AppSurfaceVariant = 'default' | 'subtle' | 'interactive'

interface AppSurfaceProps extends Omit<PaperProps, 'variant'> {
  surface?: AppSurfaceVariant
  compact?: boolean
}

function getSurfaceStyles(surface: AppSurfaceVariant): SxProps<Theme> {
  return (theme) => {
    const borderColor = theme.palette.divider
    const palette = {
      default: theme.palette.background.paper,
      subtle: theme.palette.action.hover,
      interactive: theme.palette.mode === 'light'
        ? alpha(theme.palette.primary.main, 0.035)
        : alpha(theme.palette.primary.main, 0.08),
    }

    return {
      backgroundColor: palette[surface],
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'none',
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
