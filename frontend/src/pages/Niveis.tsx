import React from 'react'
import { Box, Card, CardContent, Typography, LinearProgress, Divider, useTheme } from '@/compat/mui/material'
import { useUserProgress } from '@/hooks/use-user-progress'
import { TierBadge } from '@/components/gamification/TierBadge'
import { TIERS, XP_THRESHOLDS, getTierForLevel } from '@/utils/tier'
import type { TierInfo } from '@/types'

const MAX_LEVEL = 20

function xpToReachLevel(lvl: number): number {
  if (lvl <= 1) return 0
  const prev = XP_THRESHOLDS[lvl - 2] ?? 0
  const cur  = XP_THRESHOLDS[lvl - 1] ?? 0
  return cur - prev
}

function xpAtLevel(lvl: number): number {
  return XP_THRESHOLDS[lvl - 1] ?? 0
}

function nextTierBoundaryInfo(
  currentLevel: number,
  totalXp: number
): { name: string; startsAt: number; totalXp: number; xpNeeded: number } | null {
  const curTier = getTierForLevel(currentLevel)
  const nextTierDef = TIERS.find((t) => t.min > curTier.max)
  if (!nextTierDef) return null
  const requiredXp = xpAtLevel(nextTierDef.min)
  return {
    name: nextTierDef.name,
    startsAt: nextTierDef.min,
    totalXp: requiredXp,
    xpNeeded: Math.max(0, requiredXp - totalXp),
  }
}

export default function Niveis() {
  const { data: progress, loading } = useUserProgress()
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  const currentLevel = progress?.level ?? 1
  const totalXp = progress?.totalXp ?? 0
  const xpPercent = progress
    ? Math.min(100, ((progress.xpInCurrentLevel ?? 0) / (progress.xpForNextLevel ?? 1)) * 100)
    : 0

  const currentTier = getTierForLevel(currentLevel)
  const nextTierInfo = nextTierBoundaryInfo(currentLevel, totalXp)
  const levels = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1)

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <Typography color="text.secondary">Carregando...</Typography>
      </Box>
    )
  }

  // Group levels by tier for rendering tier separators
  let lastRenderedTierName = ''

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Box sx={{ maxWidth: 680, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
            Progressão de Nível
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete tarefas e projetos para ganhar XP e subir de nível.
          </Typography>
        </Box>

        {/* Card do nível atual */}
        {progress && (
          <Card
            variant="outlined"
            className={
              currentTier.name === 'Uranium' ? 'tier-hero-uranium'
              : currentTier.name === 'Platinum' ? 'tier-hero-platinum'
              : currentTier.name === 'FlexiBase' ? 'tier-hero-flexibase'
              : ''
            }
            sx={{
              mb: 3,
              border: `1px solid ${currentTier.color}40`,
              bgcolor: `${currentTier.color}06`,
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {/* Level number box */}
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    bgcolor: `${currentTier.color}18`,
                    border: `1px solid ${currentTier.color}40`,
                  }}
                >
                  <Typography variant="h5" fontWeight={800} sx={{ color: currentTier.color }}>
                    {currentLevel}
                  </Typography>
                </Box>

                {/* Name + tier */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Nível {currentLevel}
                    </Typography>
                    <TierBadge level={currentLevel} size="md" showTierName />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Você está aqui
                    {progress.streakDays != null && progress.streakDays > 0 && (
                      <Box component="span" sx={{ ml: 1, color: '#F59E0B', fontWeight: 600 }}>
                        · {progress.streakDays}d streak
                      </Box>
                    )}
                  </Typography>
                </Box>

                {/* XP info */}
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    {progress.xpInCurrentLevel} / {progress.xpForNextLevel} XP
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {totalXp} XP total
                  </Typography>
                </Box>
              </Box>

              {/* XP Bar with tier color */}
              <LinearProgress
                variant="determinate"
                value={xpPercent}
                sx={{
                  height: 7,
                  borderRadius: 999,
                  bgcolor: isLight ? '#E2E8F0' : '#334155',
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${currentTier.color}cc, ${currentTier.color})`,
                    borderRadius: 999,
                    boxShadow: `0 0 8px ${currentTier.glowColor}`,
                  },
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* "Próximo tier" info card */}
        {nextTierInfo && (
          <Card
            variant="outlined"
            sx={{
              mb: 3,
              border: `1px solid rgba(245,158,11,0.25)`,
              bgcolor: isLight ? 'rgba(245,158,11,0.04)' : 'rgba(245,158,11,0.07)',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    bgcolor: 'rgba(245,158,11,0.12)',
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                >
                  🎯
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
                    Próximo tier: {nextTierInfo.name} (Nível {nextTierInfo.startsAt})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Faltam{' '}
                    <Box component="span" sx={{ color: '#F59E0B', fontWeight: 700 }}>
                      {nextTierInfo.xpNeeded} XP
                    </Box>
                    {' '}— total necessário:{' '}
                    <Box component="span" sx={{ color: 'text.disabled' }}>
                      {nextTierInfo.totalXp} XP
                    </Box>
                  </Typography>
                </Box>
                <TierBadge level={nextTierInfo.startsAt} size="sm" showTierName />
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Tier overview pills */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          {TIERS.map((tier: TierInfo) => {
            const isCurrentTier = currentTier.name === tier.name
            return (
              <Box
                key={tier.name}
                sx={{
                  px: 1.5,
                  py: 0.625,
                  borderRadius: 999,
                  border: `1px solid ${tier.color}${isCurrentTier ? '60' : '30'}`,
                  bgcolor: `${tier.color}${isCurrentTier ? '14' : '08'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  boxShadow: isCurrentTier ? `0 0 8px ${tier.glowColor}` : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: tier.color,
                    boxShadow: `0 0 5px ${tier.glowColor}`,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption" sx={{ color: tier.color, fontWeight: 700, fontSize: 11 }}>
                  {tier.name}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                  L{tier.min}–L{tier.max}
                </Typography>
                {isCurrentTier && (
                  <Typography variant="caption" sx={{ color: tier.color, fontWeight: 700, fontSize: 9, opacity: 0.85 }}>
                    ← VOCÊ
                  </Typography>
                )}
              </Box>
            )
          })}
        </Box>

        {/* Timeline de níveis com separadores de tier */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {levels.map((lvl) => {
            const isCurrent = lvl === currentLevel
            const isCompleted = lvl < currentLevel
            const tier = getTierForLevel(lvl)
            const xpNeeded = xpToReachLevel(lvl)
            const xpAccum = xpAtLevel(lvl)

            // Render tier separator row when we enter a new tier
            let separatorEl: React.ReactNode = null
            if (tier.name !== lastRenderedTierName) {
              lastRenderedTierName = tier.name
              separatorEl = (
                <Box
                  key={`sep-${tier.name}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: lvl === 1 ? 0 : 1,
                    mb: 0.5,
                  }}
                >
                  <Divider sx={{ flex: 1, borderColor: `${tier.color}30` }} />
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.25,
                      borderRadius: 999,
                      border: `1px solid ${tier.color}40`,
                      bgcolor: `${tier.color}10`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: tier.color, fontWeight: 700, fontSize: 10, letterSpacing: 0.6 }}
                    >
                      {tier.name.toUpperCase()} — L{tier.min}–L{tier.max}
                    </Typography>
                  </Box>
                  <Divider sx={{ flex: 1, borderColor: `${tier.color}30` }} />
                </Box>
              )
            }

            const row = (
              <Box
                key={lvl}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1.5,
                  border: `1px solid ${
                    isCurrent
                      ? `${tier.color}50`
                      : theme.palette.divider
                  }`,
                  bgcolor: isCurrent
                    ? `${tier.color}08`
                    : isCompleted
                      ? isLight ? 'rgba(5,150,105,0.03)' : 'rgba(52,211,153,0.03)'
                      : 'transparent',
                  opacity: lvl > currentLevel + 5 ? 0.45 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Level box */}
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    bgcolor: isCompleted
                      ? isLight ? 'rgba(5,150,105,0.1)' : 'rgba(52,211,153,0.12)'
                      : `${tier.color}18`,
                    border: `1px solid ${isCompleted ? '#05966930' : tier.color + '35'}`,
                  }}
                >
                  {isCompleted ? (
                    <Typography sx={{ color: isLight ? '#059669' : '#34D399', fontWeight: 800, fontSize: 14 }}>
                      ✓
                    </Typography>
                  ) : (
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ color: isCurrent ? tier.color : `${tier.color}cc`, fontSize: 13 }}
                    >
                      {lvl}
                    </Typography>
                  )}
                </Box>

                {/* Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography
                      variant="body2"
                      fontWeight={isCurrent ? 700 : 400}
                      color={isCompleted ? 'text.secondary' : 'text.primary'}
                      sx={{ fontSize: 13 }}
                    >
                      Nível {lvl}
                    </Typography>
                    {isCurrent && (
                      <Box
                        sx={{
                          px: 0.75,
                          py: 0.125,
                          borderRadius: 999,
                          bgcolor: isLight ? 'rgba(37,99,235,0.1)' : 'rgba(96,165,250,0.15)',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: 'primary.main', fontWeight: 700, fontSize: 10, letterSpacing: 0.4 }}
                        >
                          ATUAL
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                    {xpAccum} XP acumulado
                    {lvl > 1 && (
                      <Box component="span" sx={{ color: `${tier.color}99`, ml: 0.5 }}>
                        (+{xpNeeded} XP para chegar aqui)
                      </Box>
                    )}
                  </Typography>
                </Box>

                {/* TierBadge inline */}
                <TierBadge level={lvl} size="xs" />
              </Box>
            )

            return (
              <React.Fragment key={lvl}>
                {separatorEl}
                {row}
              </React.Fragment>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}
