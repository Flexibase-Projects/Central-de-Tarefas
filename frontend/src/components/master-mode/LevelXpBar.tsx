import { Box, Typography } from '@/compat/mui/material'
import type { UserProgress } from '@/types'
import { getTierForLevel } from '@/utils/tier'
import { TierBadge } from '@/components/gamification/TierBadge'
import ProgressIndicator from '@/components/system/ProgressIndicator'

interface LevelXpBarProps {
  progress: UserProgress | null
  loading?: boolean
  compact?: boolean
  /** Omite a linha com Lv./tier (útil quando o nível já aparece ao lado, ex.: perfil rápido). */
  hideTierRow?: boolean
}

export function LevelXpBar({ progress, loading, compact, hideTierRow }: LevelXpBarProps) {
  if (loading || !progress) {
    return (
      <Box sx={{ width: '100%', py: compact ? 0.25 : 0.75 }}>
        {hideTierRow ? <Box sx={{ height: 20, mb: 0.75 }} aria-hidden /> : null}
        <ProgressIndicator value={35} tone="gamification" height={compact ? 4 : 6} />
      </Box>
    )
  }

  const { level, xpInCurrentLevel, xpForNextLevel } = progress
  const percent = xpForNextLevel > 0 ? Math.min(100, (xpInCurrentLevel / xpForNextLevel) * 100) : 0
  const tier = getTierForLevel(level)

  if (hideTierRow) {
    return (
      <Box sx={{ width: '100%', py: compact ? 0.25 : 0.75 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 2,
            mb: 0.85,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            XP até o próximo nível
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textAlign: 'right' }}>
            {xpInCurrentLevel} / {xpForNextLevel} XP · {Math.round(percent)}%
          </Typography>
        </Box>
        <ProgressIndicator value={percent} tone="gamification" height={compact ? 4 : 6} />
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', py: compact ? 0.25 : 0.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: compact ? 0.6 : 0.85, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <TierBadge level={level} size={compact ? 'xs' : 'sm'} showLevel />
          {!compact ? (
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              {tier.name}
            </Typography>
          ) : null}
        </Box>
        {!compact ? (
          <Typography variant="caption" color="text.secondary">
            {xpInCurrentLevel} / {xpForNextLevel} XP
          </Typography>
        ) : null}
      </Box>

      <ProgressIndicator
        value={percent}
        tone="gamification"
        height={compact ? 4 : 6}
        meta={compact ? undefined : `${Math.round(percent)}%`}
      />
    </Box>
  )
}
