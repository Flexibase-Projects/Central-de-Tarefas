import { Tooltip } from '@/compat/mui/material'
import { getTierForLevel } from '@/utils/tier'
import StatusToken from '@/components/system/StatusToken'

const TIER_TONE: Record<string, 'neutral' | 'info' | 'success'> = {
  'tier-cobalt': 'neutral',
  'tier-uranium': 'success',
  'tier-platinum': 'neutral',
  'tier-flexibase': 'info',
}

const SIZE_SX = {
  xs: { minHeight: 20, fontSize: 10, px: 0.75 },
  sm: { minHeight: 22, fontSize: 11, px: 0.9 },
  md: { minHeight: 24, fontSize: 12, px: 1 },
  lg: { minHeight: 26, fontSize: 13, px: 1.2 },
} as const

interface TierBadgeProps {
  level: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showTierName?: boolean
  showLevel?: boolean
}

export function TierBadge({
  level,
  size = 'sm',
  showTierName = false,
  showLevel = true,
}: TierBadgeProps) {
  const tier = getTierForLevel(level)
  const tone = TIER_TONE[tier.cssClass] ?? 'neutral'
  const label = showTierName ? tier.name : showLevel ? `Lv. ${level}` : tier.name

  return (
    <Tooltip title={`${tier.name} - Nivel ${level}`} arrow placement="top">
      <span>
        <StatusToken
          tone={tone}
          sx={{
            ...SIZE_SX[size],
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </StatusToken>
      </span>
    </Tooltip>
  )
}
