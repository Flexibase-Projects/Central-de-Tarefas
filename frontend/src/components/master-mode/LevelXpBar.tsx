import { Box, Typography } from '@/compat/mui/material'
import type { UserProgress } from '@/types'
import { getTierForLevel } from '@/utils/tier'
import { TierBadge } from '@/components/gamification/TierBadge'
import ProgressIndicator from '@/components/system/ProgressIndicator'

interface LevelXpBarProps {
  progress: UserProgress | null
  loading?: boolean
  compact?: boolean
}

export function LevelXpBar({ progress, loading, compact }: LevelXpBarProps) {
  if (loading || !progress) {
    return (
      <Box sx={{ width: '100%', py: compact ? 0.25 : 0.75 }}>
        <ProgressIndicator value={35} tone="gamification" height={compact ? 4 : 6} />
      </Box>
    )
  }

  const { level, xpInCurrentLevel, xpForNextLevel } = progress
  const percent = xpForNextLevel > 0 ? Math.min(100, (xpInCurrentLevel / xpForNextLevel) * 100) : 0
  const tier = getTierForLevel(level)

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
