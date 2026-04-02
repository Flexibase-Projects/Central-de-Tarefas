import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@/compat/mui/material'
import { useAuth } from '@/contexts/AuthContext'
import { useAchievements } from '@/hooks/use-achievements'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { useWorkspaceProfile } from '@/hooks/use-workspace-profile'
import { TierBadge } from '@/components/gamification/TierBadge'
import { getTierForLevel } from '@/utils/tier'
import {
  Trophy,
  CheckCircle,
  TaskAlt,
  Stars,
  Flag,
  MilitaryTech,
  EmojiEvents,
  AutoAwesome,
  BarChart2,
} from '@/components/ui/icons'
import type { Achievement, UserProgressAchievement } from '@/types'

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

type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; border: string; bg: string; order: number }> = {
  legendary: { label: 'Lendaria', color: '#F59E0B', border: 'rgba(245,158,11,0.5)', bg: 'rgba(245,158,11,0.08)', order: 1 },
  epic: { label: 'Epica', color: '#7C3AED', border: 'rgba(124,58,237,0.45)', bg: 'rgba(124,58,237,0.06)', order: 2 },
  rare: { label: 'Rara', color: '#2563EB', border: 'rgba(37,99,235,0.4)', bg: 'rgba(37,99,235,0.05)', order: 3 },
  common: { label: 'Comum', color: '#94A3B8', border: 'rgba(148,163,184,0.3)', bg: 'transparent', order: 4 },
}

interface MergedAchievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: Rarity
  xpBonus?: number
  unlocked: boolean
  unlockedAt?: string | null
}

function mergeAchievements(dbList: Achievement[], progressList: UserProgressAchievement[]): MergedAchievement[] {
  if (dbList.length > 0) {
    const progressMap = new Map(progressList.map((item) => [item.id, item]))
    return dbList.map((achievement) => {
      const progress = progressMap.get(achievement.id)
      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarity: (achievement.rarity ?? 'common') as Rarity,
        xpBonus: achievement.xpBonus,
        unlocked: progress?.unlocked ?? achievement.unlocked ?? false,
        unlockedAt: progress?.unlockedAt ?? achievement.unlockedAt ?? null,
      }
    })
  }

  return progressList.map((progress) => ({
    id: progress.id,
    name: progress.name,
    description: progress.description,
    icon: progress.icon,
    rarity: ((progress.rarity as Rarity) ?? 'common'),
    xpBonus: progress.xpBonus,
    unlocked: progress.unlocked,
    unlockedAt: progress.unlockedAt ?? null,
  }))
}

function formatInitials(name: string | null | undefined): string {
  const value = (name ?? '').trim()
  if (!value) return '?'
  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return `${parts[0][0]?.toUpperCase() ?? ''}${parts[1][0]?.toUpperCase() ?? ''}` || '?'
}

function ProfileStatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string
  value: string | number
  accent?: string
  sub?: string
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="h5" fontWeight={800} sx={{ color: accent ?? 'text.primary', lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
        {label}
      </Typography>
      {sub ? (
        <Typography variant="caption" color="text.disabled">
          {sub}
        </Typography>
      ) : null}
    </Box>
  )
}

function AchievementMiniCard({ achievement }: { achievement: MergedAchievement }) {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  const cfg = RARITY_CONFIG[achievement.rarity]
  const IconComponent = ICON_MAP[achievement.icon] ?? EmojiEvents

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: achievement.unlocked ? cfg.border : theme.palette.divider,
        bgcolor: achievement.unlocked
          ? cfg.bg !== 'transparent'
            ? cfg.bg
            : isLight
              ? 'rgba(0,0,0,0.01)'
              : 'rgba(255,255,255,0.01)'
          : 'background.paper',
        opacity: achievement.unlocked ? 1 : 0.5,
      }}
    >
      <CardContent sx={{ display: 'flex', gap: 1.25, alignItems: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: achievement.unlocked ? cfg.color : 'text.disabled',
            bgcolor: achievement.unlocked ? `${cfg.color}18` : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${achievement.unlocked ? cfg.border : theme.palette.divider}`,
          }}
        >
          <IconComponent size={20} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {achievement.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
            {achievement.description}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function Perfil() {
  const { currentUser, currentWorkspace } = useAuth()
  const theme = useTheme()
  const workspaceSlug = currentWorkspace?.slug ?? null
  const { workspace, membership, gamificationEnabled, isManagerial } = useWorkspaceContext(workspaceSlug)
  const {
    profile,
    loading: profileLoading,
    saving: profileSaving,
    error: profileError,
    update,
    teamGamificationSummary,
  } = useWorkspaceProfile(workspaceSlug)
  const { data: progress, loading: progressLoading } = useUserProgress(currentUser?.id ?? null, gamificationEnabled)
  const { achievements, loading: achievementsLoading } = useAchievements(gamificationEnabled)

  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    setDisplayName(profile?.display_name ?? currentUser?.name ?? '')
    setAvatarUrl(profile?.avatar_url ?? currentUser?.avatar_url ?? '')
  }, [currentUser?.avatar_url, currentUser?.name, profile?.avatar_url, profile?.display_name])

  const canUseGamification = gamificationEnabled
  const currentLevel = progress?.level ?? 1
  const tier = getTierForLevel(currentLevel)
  const progressPercent = progress
    ? Math.min(100, ((progress.xpInCurrentLevel ?? 0) / Math.max(1, progress.xpForNextLevel ?? 1)) * 100)
    : 0

  const mergedAchievements = useMemo(
    () => mergeAchievements(achievements, progress?.achievements ?? []),
    [achievements, progress?.achievements],
  )
  const sortedAchievements = useMemo(
    () =>
      [...mergedAchievements].sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
        return (RARITY_CONFIG[a.rarity]?.order ?? 5) - (RARITY_CONFIG[b.rarity]?.order ?? 5)
      }),
    [mergedAchievements],
  )

  const unlockedCount = mergedAchievements.filter((item) => item.unlocked).length
  const topTeamMembers = teamGamificationSummary?.summary?.top_members ?? []

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Carregando perfil...</Typography>
      </Box>
    )
  }

  const handleSave = async () => {
    await update({
      display_name: displayName.trim(),
      avatar_url: avatarUrl.trim() || null,
    })
  }

  const heroAvatar = profile?.avatar_url ?? currentUser.avatar_url
  const heroName = profile?.display_name ?? currentUser.name

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
        <Stack spacing={0.75} sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800}>
            Perfil
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Seu perfil muda por workspace. Edite aqui o nome e o avatar exibidos neste contexto.
          </Typography>
        </Stack>

        {profileError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {profileError}
          </Alert>
        ) : null}

        <Card variant="outlined" sx={{ mb: 2.5 }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ md: 'center' }}>
              <Avatar
                src={heroAvatar ?? undefined}
                sx={{
                  width: 92,
                  height: 92,
                  fontSize: 34,
                  fontWeight: 800,
                  bgcolor: 'action.hover',
                  flexShrink: 0,
                }}
              >
                {formatInitials(heroName)}
              </Avatar>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography variant="h5" fontWeight={800} noWrap>
                    {heroName}
                  </Typography>
                  {membership?.role_display_name ? (
                    <Chip label={membership.role_display_name} size="small" variant="outlined" />
                  ) : null}
                  {isManagerial ? <Chip label="Perfil gerencial" size="small" color="primary" /> : null}
                </Stack>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 0.75 }}>
                  {currentUser.email}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Chip label={workspace?.name ?? currentWorkspace?.name ?? 'Workspace'} size="small" />
                  <Chip label={profile?.is_overridden ? 'Perfil customizado' : 'Fallback do usuário'} size="small" variant="outlined" />
                </Stack>
              </Box>

              <Box sx={{ minWidth: 150, textAlign: { xs: 'left', md: 'right' } }}>
                <Typography variant="caption" color="text.secondary">
                  Contexto atual
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {workspace?.slug ?? currentWorkspace?.slug ?? '-'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ mb: 2.5 }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                  Editar perfil do workspace
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Este ajuste vale somente para este workspace.
                </Typography>
              </Box>

              <Stack spacing={2}>
                <TextField
                  label="Nome do perfil"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="URL do avatar"
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  fullWidth
                  placeholder="https://..."
                  helperText="Se ficar em branco, o avatar padrão do usuário será usado."
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={profileSaving || profileLoading || !displayName.trim()}
                >
                  {profileSaving ? 'Salvando...' : 'Salvar perfil'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setDisplayName(profile?.display_name ?? currentUser.name)
                    setAvatarUrl(profile?.avatar_url ?? currentUser.avatar_url ?? '')
                  }}
                >
                  Restaurar
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {canUseGamification && !isManagerial ? (
          <>
            <Card variant="outlined" sx={{ mb: 2.5 }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                  <Box
                    sx={{
                      width: 68,
                      height: 68,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: `${tier.color}14`,
                      border: `1px solid ${tier.color}3d`,
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="h4" fontWeight={900} sx={{ color: tier.color, lineHeight: 1 }}>
                      {currentLevel}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography variant="h6" fontWeight={800}>
                        Seu progresso
                      </Typography>
                      <TierBadge level={currentLevel} size="sm" showTierName />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      O resumo abaixo mostra sua progressão pessoal neste workspace.
                    </Typography>
                    {progress ? (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {progress.xpInCurrentLevel} / {progress.xpForNextLevel} XP neste nível
                          </Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: tier.color }}>
                            {Math.round(progressPercent)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progressPercent}
                          sx={{
                            height: 8,
                            borderRadius: 999,
                            bgcolor: theme.palette.mode === 'light' ? '#E2E8F0' : '#334155',
                            '& .MuiLinearProgress-bar': {
                              background: `linear-gradient(90deg, ${tier.color}bb, ${tier.color})`,
                              borderRadius: 999,
                            },
                          }}
                        />
                      </>
                    ) : progressLoading ? (
                      <Typography variant="body2" color="text.secondary">
                        Carregando progresso...
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 1.5,
                mb: 2.5,
              }}
            >
              <ProfileStatCard label="XP total" value={progress?.totalXp ?? 0} accent={tier.color} />
              <ProfileStatCard label="To-dos concluídos" value={progress?.completedTodos ?? 0} />
              <ProfileStatCard label="Atividades concluídas" value={progress?.completedActivities ?? 0} />
              <ProfileStatCard label="Conquistas" value={`${unlockedCount}/${mergedAchievements.length}`} accent="#F59E0B" />
            </Box>

            <Card variant="outlined" sx={{ mb: 2.5 }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <Trophy size={18} style={{ color: '#F59E0B' }} />
                  <Typography variant="h6" fontWeight={800}>
                    Conquistas
                  </Typography>
                  <Chip label={`${unlockedCount}/${mergedAchievements.length}`} size="small" />
                </Stack>
                <Divider sx={{ mb: 2 }} />
                {achievementsLoading ? (
                  <Typography variant="body2" color="text.secondary">
                    Carregando conquistas...
                  </Typography>
                ) : sortedAchievements.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma conquista encontrada.
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                      gap: 1,
                    }}
                  >
                    {sortedAchievements.slice(0, 6).map((achievement) => (
                      <AchievementMiniCard key={achievement.id} achievement={achievement} />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}

        {canUseGamification && isManagerial ? (
          <>
            <Card variant="outlined" sx={{ mb: 2.5 }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <BarChart2 size={18} />
                  <Typography variant="h6" fontWeight={800}>
                    Resumo da gamificação do time
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Para perfis gerenciais, este bloco substitui a gamificação pessoal no próprio Perfil.
                </Typography>

                {profileLoading ? (
                  <Box sx={{ py: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">
                      Carregando resumo do time...
                    </Typography>
                  </Box>
                ) : !teamGamificationSummary?.enabled ? (
                  <Alert severity="info">
                    A gamificação está desativada neste workspace. O resumo do time fica indisponível.
                  </Alert>
                ) : teamGamificationSummary?.summary ? (
                  <>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                        gap: 1.5,
                        mb: 2.5,
                      }}
                    >
                      <ProfileStatCard label="Membros" value={teamGamificationSummary.summary.total_members} />
                      <ProfileStatCard label="Ativos com XP" value={teamGamificationSummary.summary.active_with_xp} />
                      <ProfileStatCard label="Nivel medio" value={teamGamificationSummary.summary.average_level} />
                      <ProfileStatCard label="XP medio" value={teamGamificationSummary.summary.average_xp} />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                            Top membros
                          </Typography>
                          <Divider sx={{ mb: 1.5 }} />
                          <Stack spacing={1.25}>
                            {topTeamMembers.length > 0 ? (
                              topTeamMembers.map((member, index) => (
                                <Box key={member.user_id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                  <Avatar
                                    src={member.avatar_url ?? undefined}
                                    sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700 }}
                                  >
                                    {formatInitials(member.name)}
                                  </Avatar>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                      {member.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Nivel {member.level} · {member.total_xp} XP · {member.unlocked_achievements} conquistas
                                    </Typography>
                                  </Box>
                                  <Chip label={`#${index + 1}`} size="small" variant="outlined" />
                                </Box>
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Sem ranking de membros ainda.
                              </Typography>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>

                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                            Visao geral
                          </Typography>
                          <Divider sx={{ mb: 1.5 }} />
                          <Stack spacing={1.5}>
                            <ProfileStatCard
                              label="Conquistas desbloqueadas"
                              value={teamGamificationSummary.summary.total_unlocked_achievements}
                            />
                            <ProfileStatCard
                              label="XP medio"
                              value={teamGamificationSummary.summary.average_xp}
                            />
                            <ProfileStatCard
                              label="Nivel medio"
                              value={teamGamificationSummary.summary.average_level}
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Box>
                  </>
                ) : (
                  <Alert severity="info">Nenhum resumo disponível para este workspace no momento.</Alert>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </Box>
    </Box>
  )
}
