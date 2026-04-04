import type { ReactNode } from 'react'
import { Box, Stack, Typography, type BoxProps } from '@/compat/mui/material'

interface SectionHeaderProps extends BoxProps {
  title: string
  description?: string
  actions?: ReactNode
  /** Título menor e menos respiro — útil em painéis com muitos filtros. */
  compact?: boolean
}

export function SectionHeader({
  title,
  description,
  actions,
  compact = false,
  sx,
  ...props
}: SectionHeaderProps) {
  return (
    <Box
      {...props}
      sx={[
        {
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: compact ? 1.25 : 2,
          pb: compact ? 0.75 : 1.5,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography
          variant={compact ? 'subtitle1' : 'h4'}
          sx={{
            fontWeight: 700,
            ...(compact
              ? {
                  fontSize: '1.3125rem',
                  lineHeight: 1.3,
                  letterSpacing: '-0.02em',
                }
              : null),
          }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={
              compact
                ? {
                    fontSize: 12,
                    lineHeight: 1.5,
                    maxWidth: '48rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }
                : undefined
            }
          >
            {description}
          </Typography>
        ) : null}
      </Stack>

      {actions ? (
        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {actions}
        </Box>
      ) : null}
    </Box>
  )
}

export default SectionHeader
