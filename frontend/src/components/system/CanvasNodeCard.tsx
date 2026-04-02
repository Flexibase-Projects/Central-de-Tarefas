import type { ReactNode } from 'react'
import { Box, Typography, type BoxProps } from '@/compat/mui/material'
import type { Theme } from '@/compat/mui/styles'
import { alpha } from '@/compat/mui/styles'

interface CanvasNodeCardProps extends BoxProps {
  title: string
  subtitle?: string
  accent?: string
  children?: ReactNode
}

export function CanvasNodeCard({
  title,
  subtitle,
  accent,
  children,
  sx,
  ...props
}: CanvasNodeCardProps) {
  return (
    <Box
      {...props}
      sx={[
        (theme: Theme) => ({
          minWidth: 220,
          border: '1px solid',
          borderColor: accent ? alpha(accent, 0.36) : theme.palette.divider,
          borderRadius: 'var(--radius-md)',
          bgcolor: 'background.paper',
          boxShadow: 'none',
          overflow: 'hidden',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        sx={(theme: Theme) => ({
          px: 1.5,
          py: 1.25,
          borderBottom: '1px solid',
          borderColor: accent ? alpha(accent, 0.24) : theme.palette.divider,
          bgcolor: accent
            ? alpha(accent, theme.palette.mode === 'light' ? 0.06 : 0.14)
            : 'action.hover',
        })}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      {children ? (
        <Box sx={{ px: 1.5, py: 1.25 }}>
          {children}
        </Box>
      ) : null}
    </Box>
  )
}

export default CanvasNodeCard
