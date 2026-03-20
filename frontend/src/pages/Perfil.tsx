import React, { useMemo } from 'react'
import { Box, Card, CardContent, Typography, Avatar, Divider, LinearProgress, useTheme } from '@mui/material'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useAchievements } from '@/hooks/use-achievements'
import { TierBadge } from '@/components/gamification/TierBadge'
import { getTierForLevel } from '@/utils/tier'
import {
  Person,
  Trophy,
  CheckCircle,
  TaskAlt,
  Stars,
  Flag,
  MilitaryTech,
  EmojiEvents,
  AutoAwesome,
} from '@/components/ui/icons'
import type { UserProgressAchievement, Achievement } from '@/types'
import { Link } from 'react-router-dom'

// ── Icon map ───────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  check_circle: CheckCircle,
  task_alt: TaskAlt,
  stars: Stars,
  flag: Flag,
  military_tech: MilitaryTech,
  emoji_events: EmojiEvents,
  auto_awesome: AutoAwesome,
  trophy: Trophy,
}

// ── Rarity config (same as Conquistas) ────────────────────────────────────────
type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
const RARITY_CONFIG: Record<Rarity, { label: string; color: string; border: string; bg: string; order: number }> = {
  legendary: { label: 'Lendária', color: '#F59E0B', border: 'rgba(245,158,11,0.5)',   bg: 'rgba(245,158,11,0.08)',  order: 1 },
  epic:      { label: 'Épica',    color: '#7C3AED', border: 'rgba(124,58,237,0.45)',  bg: 'rgba(124,58,237,0.06)', order: 2 },
  rare:      { label: 'Rara',     color: '#2563EB', border: 'rgba(37,99,235,0.4)',    bg: 'rgba(37,99,235,0.05)',  order: 3 },
  common:    { label: 'Comum',    color: '#94A3B8', border: 'rgba(148,163,184,0.3)',  bg: 'transparent',          order: 4 },
}

// ── Merge DB + progress achievements ──────────────────────────────────────────
interface MergedAchievement {
  id: string
  name: string
  description: string
  icon: string
  category?: string
  rarity: Rarity
  xpBonus?: number
  unlocked: boolean
  unlockedAt?: string | null
}

function mergeAchievements(
  dbList: Achievement[],
  progressList: UserProgressAchievement[]
): MergedAchievement[] {
  if (dbList.length > 0) {
    const pMap = new Map(progressList.map((p) => [p.id, p]))
    return dbList.map((a) => {
      const p = pMap.get(a.id)
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        rarity: (a.rarity ?? 'common') as Rarity,
        xpBonus: a.xpBonus,
        unlocked: p?.unlocked ?? a.unlocked ?? false,
        unlockedAt: p?.unlockedAt ?? a.unlockedAt ?? null,
      }
    })
  }
  return progressList.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    rarity: ((p.rarity as Rarity) ?? 'common'),
    xpBonus: p.xpBonus,
    unlocked: p.unlocked,
    unlockedAt: p.unlockedAt ?? null,
  }))
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: isLight ? 'background.default' : 'rgba(255,255,255,0.03)',
        textAlign: 'center',
      }}
    >
      <Typography variant="h5" fontWeight={800} sx={{ color: accent ?? 'primary.main', lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mt: 0.25 }}>
        {label}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
          {sub}
        </Typography>
      )}
    </Box>
  )
}

// ── Achievement showcase card ─────────────────────────────────────────────────
function AchievementShowcaseCard({
  achievement,
  wide,
}: {
  achievement: MergedAchievement
  wide?: boolean
}) {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  const unlocked = achievement.unlocked
  const rarity = achievement.rarity
  const cfg = RARITY_CONFIG[rarity]
  const IconComponent = ICON_MAP[achievement.icon] ?? EmojiEvents

  // Glow effect for epic / legendary
  const glow =
    rarity === 'legendary'
      ? `0 0 12px rgba(245,158,11,0.25)`
      : rarity === 'epic'
      ? `0 0 10px rgba(124,58,237,0.2)`
      : rarity === 'rare'
      ? `0 0 8px rgba(37,99,235,0.15)`
      : 'none'

  return (
    <Card
      variant="outlined"
      className={`rarity-${rarity}`}
      sx={{
        gridColumn: wide ? 'span 2' : 'span 1',
        border: `1px solid ${unlocked ? cfg.border : theme.palette.divider}`,
        borderLeft: unlocked ? `3px solid ${cfg.color}` : `3px solid transparent`,
        bgcolor: unlocked
          ? cfg.bg !== 'transparent'
            ? cfg.bg
            : isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)'
          : 'background.paper',
        opacity: unlocked ? 1 : 0.3,
        filter: unlocked ? 'none' : 'grayscale(1)',
        boxShadow: unlocked ? glow : 'none',
        transition: 'all 0.2s',
      }}
    >
      <CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box
          sx={{
            width: wide ? 48 : 40,
            height: wide ? 48 : 40,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: unlocked ? `${cfg.color}18` : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)',
            color: unlocked ? cfg.color : 'text.disabled',
            border: `1px solid ${unlocked ? cfg.border : theme.palette.divider}`,
          }}
        >
          <IconComponent size={wide ? 24 : 20} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: unlocked ? 'text.primary' : 'text.secondary', fontSize: 12 }}>
              {achievement.name}
            </Typography>
            <Box
              sx={{
                px: 0.625,
                py: 0.125,
                borderRadius: 999,
                bgcolor: `${cfg.color}18`,
                border: `1px solid ${cfg.border}`,
                flexShrink: 0,
              }}
            >
              <Typography variant="caption" sx={{ color: cfg.color, fontSize: 9, fontWeight: 700 }}>
                {cfg.label}
              </Typography>
            </Box>
          </Box>
          {wide && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, lineHeight: 1.3 }}>
              {achievement.description}
            </Typography>
          )}
        </Box>
        {unlocked && achievement.xpBonus != null && achievement.xpBonus > 0 && (
          <Box
            sx={{
              px: 0.75,
              py: 0.25,
              borderRadius: 999,
              bgcolor: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.2)',
              flexShrink: 0,
            }}
          >
            <Typography variant="caption" sx={{ color: '#7C3AED', fontWeight: 700, fontSize: 10 }}>
              +{achievement.xpBonus} XP
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Perfil() {
  const { currentUser } = useAuth()
  const { data: progress, loading: progressLoading } = useUserProgress()
  const { achievements: dbAchievements, loading: dbLoading } = useAchievements()
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'

  const loading = progressLoading || dbLoading

  const currentLevel = progress?.level ?? 1
  const tier = getTierForLevel(currentLevel)
  const xpPercent = progress
    ? Math.min(100, ((progress.xpInCurrentLevel ?? 0) / Math.max(1, progress.xpForNextLevel ?? 1)) * 100)
    : 0

  const heroClass =
    tier.name === 'Uranium'
      ? 'tier-hero-uranium'
      : tier.name === 'Platinum'
      ? 'tier-hero-platinum'
      : tier.name === 'FlexiBase'
      ? 'tier-hero-flexibase'
      : ''

  const allAchievements = useMemo<MergedAchievement[]>(
    () => mergeAchievements(dbAchievements, progress?.achievements ?? []),
    [dbAchievements, progress?.achievements]
  )

  // Sort by rarity (legendary first), unlocked first
  const sortedAchievements = useMemo(() => {
    return [...allAchievements].sort((a, b) => {
      // Unlocked first
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
      // Then by rarity
      const ra = RARITY_CONFIG[(a.rarity ?? 'common') as Rarity]?.order ?? 5
      const rb = RARITY_CONFIG[(b.rarity ?? 'common') as Rarity]?.order ?? 5
      return ra - rb
    })
  }, [allAchievements])

  // "Próximas conquistas" — locked ones that might be close (first 3 locked, sorted by name for determinism)
  const nextAchievements = useMemo(
    () => allAchievements.filter((a) => !a.unlocked).slice(0, 3),
    [allAchievements]
  )

  const unlockedCount = allAchievements.filter((a) => a.unlocked).length

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Carregando...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
          Perfil
        </Typography>

        {/* ══ Hero card ══════════════════════════════════════════════════════════ */}
        <Card
          variant="outlined"
          className={heroClass}
          sx={{
            mb: 2.5,
            border: `1px solid ${tier.color}45`,
            bgcolor: `${tier.color}06`,
          }}
        >
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 2.5 }}>
              {/* Avatar with tier border */}
              <Avatar
                sx={{
                  width: 96,
                  height: 96,
                  bgcolor: isLight ? 'rgba(37,99,235,0.12)' : 'rgba(96,165,250,0.15)',
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: 36,
                  border: `3px solid ${tier.color}`,
                  boxShadow: `0 0 14px ${tier.glowColor}`,
                  flexShrink: 0,
                }}
                src={currentUser.avatar_url ?? undefined}
              >
                {currentUser.name?.[0]?.toUpperCase() ?? <Person size={40} />}
              </Avatar>

              {/* Name / tier / email */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography variant="h5" fontWeight={800} noWrap>
                    {currentUser.name}
                  </Typography>
                  <TierBadge level={currentLevel} size="lg" showTierName />
                </Box>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ color: tier.color, mb: 0.25, fontSize: 14 }}
                >
                  {tier.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {currentUser.email}
                </Typography>
              </Box>

              {/* Level number */}
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  bgcolor: `${tier.color}18`,
                  border: `1px solid ${tier.color}40`,
                }}
              >
                <Typography variant="h4" fontWeight={900} sx={{ color: tier.color, lineHeight: 1 }}>
                  {currentLevel}
                </Typography>
                <Typography variant="caption" sx={{ color: `${tier.color}99`, fontSize: 9, fontWeight: 600 }}>
                  NÍVEL
                </Typography>
              </Box>
            </Box>

            {/* Tier-colored XP bar */}
            {progress && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {progress.xpInCurrentLevel} / {progress.xpForNextLevel} XP neste nível
                  </Typography>
                  <Typography variant="caption" sx={{ color: tier.color, fontWeight: 600 }}>
                    {Math.round(xpPercent)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={xpPercent}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: isLight ? '#E2E8F0' : '#334155',
                    '& .MuiLinearProgress-bar': {
                      background: `linear-gradient(90deg, ${tier.color}bb, ${tier.color})`,
                      borderRadius: 999,
                      boxShadow: `0 0 8px ${tier.glowColor}`,
                    },
                  }}
                />
                {progress.streakDays != null && progress.streakDays > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <Typography sx={{ fontSize: 14 }}>🔥</Typography>
                    <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 700 }}>
                      {progress.streakDays} dias de streak ativo
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ══ Stats grid ══════════════════════════════════════════════════════════ */}
        {progress && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <StatCard label="XP Total" value={progress.totalXp} accent="primary.main" />
            <StatCard label="Nível" value={currentLevel} accent={tier.color} />
            <StatCard label="Tier" value={tier.name} accent={tier.color} />
            <StatCard
              label="Streak"
              value={progress.streakDays != null && progress.streakDays > 0 ? `${progress.streakDays}d 🔥` : '—'}
              accent="#F59E0B"
            />
            <StatCard label="To-dos Concluídos" value={progress.completedTodos} accent="primary.main" />
            <StatCard label="Atividades Concluídas" value={progress.completedActivities} accent="primary.main" />
          </Box>
        )}

        {loading && !progress && (
          <Box sx={{ mb: 2.5 }}>
            <Typography color="text.secondary">Carregando estatísticas...</Typography>
          </Box>
        )}

        {/* ══ Achievement showcase ═════════════════════════════════════════════════ */}
        <Card variant="outlined" sx={{ mb: 2.5 }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Trophy size={18} style={{ color: '#F59E0B' }} />
                <Typography variant="h6" fontWeight={700}>
                  Conquistas
                </Typography>
                <Box
                  sx={{
                    px: 0.875,
                    py: 0.25,
                    borderRadius: 999,
                    bgcolor: isLight ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.12)',
                    border: '1px solid rgba(245,158,11,0.2)',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 700, fontSize: 11 }}>
                    {unlockedCount} / {allAchievements.length}
                  </Typography>
                </Box>
              </Box>
              <Link to="/conquistas" style={{ textDecoration: 'none' }}>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 500, fontSize: 12 }}>
                  Ver todas →
                </Typography>
              </Link>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {sortedAchievements.length === 0 ? (
              <Typography variant="body2" color="text.disabled" textAlign="center" sx={{ py: 2 }}>
                Nenhuma conquista ainda.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 1,
                }}
              >
                {sortedAchievements.map((a) => {
                  const isLegendary = a.rarity === 'legendary'
                  return (
                    <AchievementShowcaseCard
                      key={a.id}
                      achievement={a}
                      wide={isLegendary}
                    />
                  )
                })}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* ══ Próximas conquistas ══════════════════════════════════════════════════ */}
        {nextAchievements.length > 0 && (
          <Card variant="outlined">
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                Próximas Conquistas
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Complete estas para continuar progredindo.
              </Typography>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {nextAchievements.map((a) => {
                  const cfg = RARITY_CONFIG[(a.rarity ?? 'common') as Rarity]
                  const IconComponent = ICON_MAP[a.icon] ?? EmojiEvents
                  return (
                    <Box
                      key={a.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.25,
                        borderRadius: 1.5,
                        border: `1px solid ${theme.palette.divider}`,
                        opacity: 0.7,
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          bgcolor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)',
                          color: 'text.disabled',
                          filter: 'grayscale(1)',
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <IconComponent size={18} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12 }} color="text.secondary">
                            {a.name}
                          </Typography>
                          <Box
                            sx={{
                              px: 0.625,
                              py: 0.125,
                              borderRadius: 999,
                              bgcolor: `${cfg.color}14`,
                              border: `1px solid ${cfg.border}`,
                            }}
                          >
                            <Typography sx={{ color: cfg.color, fontSize: 9, fontWeight: 700 }}>
                              {cfg.label}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                          {a.description}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          border: `1.5px dashed ${theme.palette.divider}`,
                          flexShrink: 0,
                        }}
                      />
                    </Box>
                  )
                })}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  )
}
