import { Box, Card, CardContent, Typography, Chip, useTheme } from '@/compat/mui/material'

export interface DashboardMetricCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  iconColor: string
  iconBg: string
  trend?: string
  trendUp?: boolean
  caption?: string
}

export function DashboardMetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  trendUp,
  caption,
}: DashboardMetricCardProps) {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'

  return (
    <Card
      variant="outlined"
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: iconBg,
              flexShrink: 0,
            }}
          >
            <Icon size={20} style={{ color: iconColor }} />
          </Box>
          {trend && (
            <Box
              sx={{
                px: 0.875,
                py: 0.25,
                borderRadius: 999,
                bgcolor: trendUp
                  ? isLight
                    ? 'rgba(5,150,105,0.1)'
                    : 'rgba(52,211,153,0.12)'
                  : isLight
                    ? 'rgba(220,38,38,0.1)'
                    : 'rgba(248,113,113,0.12)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  fontSize: 11,
                  color: trendUp
                    ? isLight
                      ? '#059669'
                      : '#34D399'
                    : isLight
                      ? '#DC2626'
                      : '#F87171',
                }}
              >
                {trendUp ? '↑' : '↓'} {trend}
              </Typography>
            </Box>
          )}
        </Box>

        <Typography variant="h3" fontWeight={700} sx={{ mb: 0.25, letterSpacing: '-0.02em' }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
          {label}
        </Typography>
        {caption ? (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
            {caption}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  )
}

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em progresso',
  review: 'Revisão',
  done: 'Concluído',
}

export function DashboardStatusChip({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const color =
    status === 'done'
      ? 'success'
      : status === 'in_progress' || status === 'review'
        ? 'primary'
        : 'default'
  return <Chip size="small" label={label} color={color} variant="outlined" sx={{ height: 22 }} />
}

export function DashboardBarRow({
  label,
  value,
  max,
  color = 'primary.main',
}: {
  label: string
  value: number
  max: number
  color?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Typography variant="caption" sx={{ flexShrink: 0, width: 88, color: 'text.secondary' }} noWrap>
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0, height: 8, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden' }}>
        <Box
          sx={{
            height: '100%',
            width: `${pct}%`,
            bgcolor: color,
            borderRadius: 1,
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
      <Typography variant="caption" fontWeight={600} sx={{ flexShrink: 0, minWidth: 28, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  )
}

export const dashboardTableCellSx = { py: 0.75, px: 1.5, fontSize: '0.8125rem' } as const
