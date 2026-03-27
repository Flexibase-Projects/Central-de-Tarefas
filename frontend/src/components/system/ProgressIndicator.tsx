import { Box, Typography, type BoxProps } from '@mui/material'

interface ProgressIndicatorProps extends BoxProps {
  value: number
  label?: string
  meta?: string
  tone?: 'default' | 'gamification'
  height?: number
}

export function ProgressIndicator({
  value,
  label,
  meta,
  tone = 'default',
  height = 6,
  sx,
  ...props
}: ProgressIndicatorProps) {
  const clampedValue = Math.max(0, Math.min(100, value))
  const fill = tone === 'gamification'
    ? 'linear-gradient(90deg, var(--progress-gamification-start) 0%, var(--progress-gamification-end) 100%)'
    : 'var(--progress-default)'

  return (
    <Box
      {...props}
      sx={[
        {
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {label || meta ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {label ? (
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              {label}
            </Typography>
          ) : <span />}
          {meta ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {meta}
            </Typography>
          ) : null}
        </Box>
      ) : null}

      <Box
        sx={{
          height,
          borderRadius: 'var(--radius-xs)',
          bgcolor: 'action.hover',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${clampedValue}%`,
            height: '100%',
            borderRadius: 'var(--radius-xs)',
            background: fill,
            transition: 'width 180ms ease',
          }}
        />
      </Box>
    </Box>
  )
}

export default ProgressIndicator
