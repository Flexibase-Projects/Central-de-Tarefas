import React, { useState, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  useTheme,
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from '@/compat/mui/material'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useAchievements } from '@/hooks/use-achievements'
import {
  CheckCircle,
  TaskAlt,
  Stars,
  Flag,
  MilitaryTech,
  EmojiEvents,
  AutoAwesome,
  Trophy,
} from '@/components/ui/icons'
import type { UserProgressAchievement, Achievement } from '@/types'

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

// ── Rarity configuration ───────────────────────────────────────────────────────
type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; border: string; bg: string; order: number }> = {
  legendary: { label: 'Lendária', color: '#F59E0B', border: 'rgba(245,158,11,0.5)',   bg: 'rgba(245,158,11,0.06)',  order: 1 },
  epic:      { label: 'Épica',    color: '#7C3AED', border: 'rgba(124,58,237,0.45)',  bg: 'rgba(124,58,237,0.05)', order: 2 },
  rare:      { label: 'Rara',     color: '#2563EB', border: 'rgba(37,99,235,0.4)',    bg: 'rgba(37,99,235,0.04)',  order: 3 },
  common:    { label: 'Comum',    color: '#94A3B8', border: 'rgba(148,163,184,0.3)',  bg: 'transparent',          order: 4 },
}

function rarityOrder(r?: string): number {
  return RARITY_CONFIG[(r ?? 'common') as Rarity]?.order ?? 5
}

// ── Merged achievement shape ──────────────────────────────────────────────────
interface MergedAchievement {
  id: string
  slug?: string
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
    const progressMap = new Map(progressList.map((p) => [p.id, p]))
    return dbList.map((a) => {
      const p = progressMap.get(a.id)
      return {
        id: a.id,
        slug: a.slug,
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
    slug: p.slug,
    name: p.name,
    description: p.description,
    icon: p.icon,
    category: undefined,
    rarity: ((p.rarity as Rarity) ?? 'common'),
    xpBonus: p.xpBonus,
    unlocked: p.unlocked,
    unlockedAt: p.unlockedAt ?? null,
  }))
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

// ── Rarity Legend Row ─────────────────────────────────────────────────────────
function RarityLegend({ achievements }: { achievements: MergedAchievement[] }) {
  const theme = useTheme()
  const counts: Record<Rarity, { total: number; unlocked: number }> = {
    legendary: { total: 0, unlocked: 0 },
    epic:      { total: 0, unlocked: 0 },
    rare:      { total: 0, unlocked: 0 },
    common:    { total: 0, unlocked: 0 },
  }
  achievements.forEach((a) => {
    const r = (a.rarity ?? 'common') as Rarity
    if (counts[r]) {
      counts[r].total++
      if (a.unlocked) counts[r].unlocked++
    }
  })

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
      {(Object.entries(RARITY_CONFIG) as [Rarity, (typeof RARITY_CONFIG)[Rarity]][]).map(([key, cfg]) => (
        <Box
          key={key}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            border: `1px solid ${cfg.border}`,
            bgcolor:
              cfg.bg !== 'transparent'
                ? cfg.bg
                : theme.palette.mode === 'light'
                ? 'rgba(0,0,0,0.02)'
                : 'rgba(255,255,255,0.02)',
          }}
        >
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 700, fontSize: 11 }}>
            {cfg.label}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
            {counts[key].unlocked}/{counts[key].total}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ── Achievement card ───────────────────────────────────────────────────────────
function AchievementCard({ achievement }: { achievement: MergedAchievement }) {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  const unlocked = achievement.unlocked
  const rarity = (achievement.rarity ?? 'common') as Rarity
  const cfg = RARITY_CONFIG[rarity]
  const IconComponent = ICON_MAP[achievement.icon] ?? EmojiEvents

  return (
    <Card
      variant="outlined"
      className={`rarity-${rarity}`}
      sx={{
        border: `1px solid`,
        borderColor: unlocked ? cfg.border : theme.palette.divider,
        borderLeft: unlocked ? `3px solid ${cfg.color}` : `3px solid transparent`,
        bgcolor: unlocked
          ? cfg.bg !== 'transparent'
            ? cfg.bg
            : isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)'
          : 'background.paper',
        opacity: unlocked ? 1 : 0.58,
        transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.2s',
        '&:hover': unlocked
          ? { boxShadow: `0 0 0 1px ${cfg.border}` }
          : {},
      }}
    >
      <CardContent
        sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 2, '&:last-child': { pb: 2 } }}
      >
        {/* Icon box */}
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: unlocked
              ? `${cfg.color}18`
              : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)',
            color: unlocked ? cfg.color : 'text.disabled',
            filter: unlocked ? 'none' : 'grayscale(1)',
            border: `1px solid ${unlocked ? cfg.border : theme.palette.divider}`,
          }}
        >
          <IconComponent size={22} />
        </Box>

        {/* Text */}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {/* Name + rarity chip */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, flexWrap: 'wrap', mb: 0.25 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: unlocked ? 'text.primary' : 'text.secondary',
                fontSize: 13,
                flex: 1,
                minWidth: 0,
              }}
            >
              {achievement.name}
            </Typography>
            <Chip
              label={cfg.label}
              size="small"
              sx={{
                height: 18,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.3,
                color: cfg.color,
                bgcolor: `${cfg.color}18`,
                border: `1px solid ${cfg.border}`,
                '& .MuiChip-label': { px: 0.75 },
                flexShrink: 0,
              }}
            />
          </Box>

          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.4, fontSize: 12, mb: 0.75 }}
          >
            {achievement.description}
          </Typography>

          {/* Status badges */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
            {unlocked && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 999,
                  bgcolor: `${cfg.color}14`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: cfg.color, fontWeight: 700, fontSize: 10, letterSpacing: 0.3 }}
                >
                  ✓ DESBLOQUEADA
                </Typography>
              </Box>
            )}
            {unlocked && achievement.xpBonus != null && achievement.xpBonus > 0 && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 999,
                  bgcolor: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.2)',
                }}
              >
                <Typography variant="caption" sx={{ color: '#7C3AED', fontWeight: 700, fontSize: 10 }}>
                  +{achievement.xpBonus} XP
                </Typography>
              </Box>
            )}
            {unlocked && achievement.unlockedAt && (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                {formatDate(achievement.unlockedAt)}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'unlocked' | 'locked'
type SortBy = 'rarity' | 'date' | 'name'

export default function Conquistas() {
  const { data: progress, loading: progressLoading } = useUserProgress()
  const { achievements: dbAchievements, loading: dbLoading } = useAchievements()
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'

  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortBy>('rarity')

  const loading = progressLoading || dbLoading

  const allAchievements = useMemo<MergedAchievement[]>(
    () => mergeAchievements(dbAchievements, progress?.achievements ?? []),
    [dbAchievements, progress?.achievements]
  )

  const unlockedCount = allAchievements.filter((a) => a.unlocked).length
  const totalCount = allAchievements.length
  const percent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  const categories = useMemo(() => {
    const cats = new Set(allAchievements.map((a) => a.category).filter(Boolean) as string[])
    return ['all', ...Array.from(cats).sort()]
  }, [allAchievements])

  const filtered = useMemo(() => {
    let list = [...allAchievements]

    if (filterTab === 'unlocked') list = list.filter((a) => a.unlocked)
    else if (filterTab === 'locked') list = list.filter((a) => !a.unlocked)

    if (categoryFilter !== 'all') list = list.filter((a) => a.category === categoryFilter)

    if (sortBy === 'rarity') {
      list.sort((a, b) => rarityOrder(a.rarity) - rarityOrder(b.rarity))
    } else if (sortBy === 'date') {
      list.sort((a, b) => {
        if (!a.unlockedAt && !b.unlockedAt) return 0
        if (!a.unlockedAt) return 1
        if (!b.unlockedAt) return -1
        return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
      })
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    }

    return list
  }, [allAchievements, filterTab, categoryFilter, sortBy])

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <Typography color="text.secondary">Carregando conquistas...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        {/* ── Header ── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
            Conquistas
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {unlockedCount} de {totalCount} desbloqueadas — novas conquistas são adicionadas com o tempo.
          </Typography>

          {/* Global progress bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress
              variant="determinate"
              value={percent}
              sx={{
                flex: 1,
                height: 6,
                borderRadius: 999,
                bgcolor: isLight ? '#E2E8F0' : '#334155',
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  borderRadius: 999,
                },
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ flexShrink: 0, fontWeight: 600 }}
            >
              {percent}%
            </Typography>
          </Box>
        </Box>

        {/* ── Rarity legend ── */}
        <RarityLegend achievements={allAchievements} />

        {/* ── Filters row ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 3,
            flexWrap: 'wrap',
            borderBottom: `1px solid ${theme.palette.divider}`,
            pb: 2,
          }}
        >
          <Tabs
            value={filterTab}
            onChange={(_, v) => setFilterTab(v as FilterTab)}
            sx={{
              minHeight: 36,
              '& .MuiTab-root': { minHeight: 36, py: 0, fontSize: 13 },
            }}
          >
            <Tab value="all"      label={`Todas (${totalCount})`} />
            <Tab value="unlocked" label={`Desbloqueadas (${unlockedCount})`} />
            <Tab value="locked"   label={`Bloqueadas (${totalCount - unlockedCount})`} />
          </Tabs>

          <Box sx={{ flex: 1 }} />

          {/* Category dropdown — only show when we have real categories */}
          {categories.length > 2 && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel sx={{ fontSize: 13 }}>Categoria</InputLabel>
              <Select
                value={categoryFilter}
                label="Categoria"
                onChange={(e) => setCategoryFilter(e.target.value)}
                sx={{ fontSize: 13 }}
              >
                <MenuItem value="all" sx={{ fontSize: 13 }}>Todas</MenuItem>
                {categories
                  .filter((c) => c !== 'all')
                  .map((cat) => (
                    <MenuItem key={cat} value={cat} sx={{ fontSize: 13 }}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}

          {/* Sort */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontSize: 13 }}>Ordenar</InputLabel>
            <Select
              value={sortBy}
              label="Ordenar"
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              sx={{ fontSize: 13 }}
            >
              <MenuItem value="rarity" sx={{ fontSize: 13 }}>Por raridade</MenuItem>
              <MenuItem value="date"   sx={{ fontSize: 13 }}>Por data</MenuItem>
              <MenuItem value="name"   sx={{ fontSize: 13 }}>Por nome</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* ── Achievement grid ── */}
        {filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.disabled">Nenhuma conquista encontrada.</Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {filtered.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}
