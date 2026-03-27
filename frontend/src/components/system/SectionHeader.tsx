import type { ReactNode } from 'react'
import { Box, Stack, Typography, type BoxProps } from '@mui/material'

interface SectionHeaderProps extends BoxProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function SectionHeader({ title, description, actions, sx, ...props }: SectionHeaderProps) {
  return (
    <Box
      {...props}
      sx={[
        {
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          pb: 1.5,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
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
