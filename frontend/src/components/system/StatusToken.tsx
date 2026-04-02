import type { ReactNode } from 'react'
import { Box, type BoxProps } from '@/compat/mui/material'

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

interface StatusTokenProps extends Omit<BoxProps, 'color'> {
  tone?: StatusTone
  children: ReactNode
}

export function StatusToken({ tone = 'neutral', children, sx, ...props }: StatusTokenProps) {
  const palette = {
    neutral: {
      bgcolor: 'var(--status-neutral-bg)',
      color: 'var(--status-neutral-fg)',
      borderColor: 'var(--border-default)',
    },
    info: {
      bgcolor: 'var(--status-info-bg)',
      color: 'info.main',
      borderColor: 'transparent',
    },
    success: {
      bgcolor: 'var(--status-success-bg)',
      color: 'success.main',
      borderColor: 'transparent',
    },
    warning: {
      bgcolor: 'var(--status-warning-bg)',
      color: 'warning.main',
      borderColor: 'transparent',
    },
    danger: {
      bgcolor: 'var(--status-danger-bg)',
      color: 'error.main',
      borderColor: 'transparent',
    },
  } satisfies Record<StatusTone, { bgcolor: string; color: string; borderColor: string }>

  return (
    <Box
      component="span"
      {...props}
      sx={[
        {
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: 24,
          px: 1,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid',
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          ...palette[tone],
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  )
}

export default StatusToken
