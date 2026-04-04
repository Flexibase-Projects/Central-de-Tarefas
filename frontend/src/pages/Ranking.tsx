import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  useTheme,
} from '@/compat/mui/material'
import { alpha } from '@/compat/mui/styles'
import { TierBadge } from '@/components/gamification/TierBadge'
import AppSurface from '@/components/system/AppSurface'
import ProgressIndicator from '@/components/system/ProgressIndicator'
import { Medal, People, Sparkles, Star, TrendingUp, Trophy } from '@/components/ui/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { useWorkspaceRanking } from '@/hooks/use-workspace-ranking'
import type { WorkspaceRankingEntry } from '@/types'
import { getTierForLevel } from '@/utils/tier'

const POSITION_TONES: Record<number, { color: string; label: string }> = {
  1: { color: '#F59E0B', label: 'Campeão' },
  2: { color: '#94A3B8', label: 'Vice-líder' },
  3: { color: '#C27A4A', label: 'Terceiro lugar' },
}

function formatInitials(name: string | null | undefined): string {
  const value = (name ?? '').trim()
  if (!value) return '?'
  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return `${parts[0][0]?.toUpperCase() ?? ''}${parts[1][0]?.toUpperCase() ?? ''}` || '?'
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value))
}

function formatMetric(value: number): string {
  if (Number.isInteger(value)) return formatNumber(value)
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function getUnavailableMessage(reason?: string | null): string {
  switch (reason) {
    case 'not_configured':
      return 'O ranking ainda não foi habilitado neste workspace.'
    default:
      return 'A gamificação deste workspace está indisponível no momento.'
  }
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
}) {
  const theme = useTheme()
  const Icon = icon

  return (
    <AppSurface
      surface="interactive"
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        minHeight: 132,
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.06)',
          color: 'text.secondary',
        }}
      >
        <Icon size={18} />
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.05 }}>
          {value}
        </Typography>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {sub}
        </Typography>
      </Box>
    </AppSurface>
  )
}

function PodiumCard({
  entry,
  currentUserId,
}: {
  entry: WorkspaceRankingEntry
  currentUserId?: string | null
}) {
  const theme = useTheme()
  const tone = POSITION_TONES[entry.position] ?? { color: theme.palette.primary.main, label: 'Destaque' }
  const isChampion = entry.position === 1
  const isCurrentUser = currentUserId === entry.user_id

  return (
    <AppSurface
      surface={isChampion ? 'raised' : 'interactive'}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: isChampion ? 2.5 : 2.25,
        minHeight: isChampion ? 280 : 244,
        background:
          theme.palette.mode === 'light'
            ? `linear-gradient(180deg, ${alpha(tone.color, isChampion ? 0.18 : 0.12)} 0%, rgba(255,255,255,0.96) 100%)`
            : `linear-gradient(180deg, ${alpha(tone.color, isChampion ? 0.26 : 0.18)} 0%, rgba(15,23,42,0.9) 100%)`,
        borderColor: alpha(tone.color, theme.palette.mode === 'light' ? 0.32 : 0.4),
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          right: -18,
          top: -18,
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(tone.color, 0.34)} 0%, ${alpha(tone.color, 0)} 72%)`,
          pointerEvents: 'none',
        }}
      />

      <Stack spacing={1.75} sx={{ position: 'relative', zIndex: 1, height: '100%' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1 }}>
          <Chip
            label={`#${entry.position}`}
            size="small"
            sx={{
              bgcolor: alpha(tone.color, 0.16),
              color: tone.color,
              fontWeight: 800,
              border: `1px solid ${alpha(tone.color, 0.28)}`,
            }}
          />
          {isCurrentUser ? <Chip label="Você" size="small" variant="outlined" /> : null}
        </Stack>

        <Stack spacing={1.25} alignItems="center" textAlign="center" sx={{ flex: 1, justifyContent: 'center' }}>
          <Avatar
            src={entry.avatar_url ?? undefined}
            sx={{
              width: isChampion ? 82 : 68,
              height: isChampion ? 82 : 68,
              fontSize: isChampion ? 28 : 22,
              fontWeight: 900,
              bgcolor: alpha(tone.color, 0.2),
              color: tone.color,
              border: `1px solid ${alpha(tone.color, 0.28)}`,
            }}
          >
            {formatInitials(entry.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant={isChampion ? 'h6' : 'subtitle1'} fontWeight={900} noWrap>
              {entry.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {tone.label}
            </Typography>
          </Box>
          <TierBadge level={entry.level} size={isChampion ? 'md' : 'sm'} showTierName />
          <Typography variant={isChampion ? 'h4' : 'h5'} fontWeight={900} sx={{ color: tone.color, lineHeight: 1 }}>
            {formatNumber(entry.total_xp)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            XP total · {formatNumber(entry.unlocked_achievements)} conquistas
          </Typography>
        </Stack>
      </Stack>
    </AppSurface>
  )
}

function LeaderboardRow({
  entry,
  currentUserId,
  leaderXp,
}: {
  entry: WorkspaceRankingEntry
  currentUserId?: string | null
  leaderXp: number
}) {
  const theme = useTheme()
  const isCurrentUser = currentUserId === entry.user_id
  const tone = POSITION_TONES[entry.position] ?? { color: theme.palette.primary.main, label: 'Ranking' }
  const fill = leaderXp > 0 ? (entry.total_xp / leaderXp) * 100 : 0

  return (
    <AppSurface
      surface={isCurrentUser ? 'interactive' : 'default'}
      compact
      sx={{
        p: 1.5,
        borderColor: isCurrentUser ? alpha(theme.palette.primary.main, 0.25) : undefined,
        bgcolor: isCurrentUser ? alpha(theme.palette.primary.main, 0.05) : undefined,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            fontWeight: 900,
            color: tone.color,
            bgcolor: alpha(tone.color, 0.12),
            border: `1px solid ${alpha(tone.color, 0.24)}`,
            flexShrink: 0,
          }}
        >
          #{entry.position}
        </Box>

        <Avatar
          src={entry.avatar_url ?? undefined}
          sx={{ width: 42, height: 42, fontSize: 15, fontWeight: 800, flexShrink: 0 }}
        >
          {formatInitials(entry.name)}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={800} noWrap>
              {entry.name}
            </Typography>
            <TierBadge level={entry.level} size="xs" />
            {isCurrentUser ? <Chip label="Você" size="small" variant="outlined" /> : null}
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
            {formatNumber(entry.total_xp)} XP · {formatNumber(entry.unlocked_achievements)} conquistas
          </Typography>

          <ProgressIndicator
            value={fill}
            tone="gamification"
            height={6}
            meta={`${Math.round(fill)}% do líder`}
          />
        </Box>
      </Stack>
    </AppSurface>
  )
}

export default function Ranking() {
  const { currentUser, currentWorkspace } = useAuth()
  const theme = useTheme()
  const workspaceSlug = currentWorkspace?.slug ?? null
  const { gamificationEnabled, rankingEnabled } = useWorkspaceContext(workspaceSlug)
  const { ranking, loading, error, refresh, reason } = useWorkspaceRanking(workspaceSlug)
  const { data: progress, loading: progressLoading } = useUserProgress(currentUser?.id ?? null, gamificationEnabled)

  const available = gamificationEnabled && rankingEnabled
  const leaderboard = ranking?.leaderboard ?? []
  const currentEntry = ranking?.current_user ?? null
  const currentLevel = progress?.level ?? currentEntry?.level ?? 1
  const currentTier = getTierForLevel(currentLevel)
  const progressPercent = progress
    ? Math.min(100, ((progress.xpInCurrentLevel ?? 0) / Math.max(1, progress.xpForNextLevel ?? 1)) * 100)
    : 0
  const activePlayersPercent =
    ranking && ranking.total_members > 0 ? Math.round((ranking.active_with_xp / ranking.total_members) * 100) : 0
  const heroMessage = currentEntry
    ? currentEntry.position === 1
      ? 'Você está puxando o ritmo do workspace agora.'
      : ranking?.gap_to_next
        ? ranking.gap_to_next.xp_difference > 0
          ? `Faltam ${formatNumber(ranking.gap_to_next.xp_difference)} XP para alcançar ${ranking.gap_to_next.name}.`
          : `Mais uma pontuação consistente e você ultrapassa ${ranking.gap_to_next.name}.`
        : 'Você já entrou na corrida. Mantenha a consistência.'
    : 'Conclua atividades e to-dos para aparecer no ranking do workspace.'
  const leaderboardLeadXp = leaderboard[0]?.total_xp ?? 0
  const podium = [2, 1, 3]
    .map((position) => leaderboard.find((entry) => entry.position === position))
    .filter((entry): entry is WorkspaceRankingEntry => entry !== undefined)

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Box sx={{ maxWidth: 1240, mx: 'auto' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ md: 'center' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
              <Chip label={currentWorkspace?.name ?? 'Workspace'} size="small" />
              <Chip
                label="Corrida de XP"
                size="small"
                sx={{
                  bgcolor: theme.palette.mode === 'light' ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.18)',
                  color: '#B45309',
                }}
              />
            </Stack>
            <Typography variant="h4" fontWeight={900}>
              Ranking
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Uma leitura gamificada da disputa por XP, nível e conquistas dentro do workspace.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            color="inherit"
            onClick={() => void refresh()}
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'text.secondary',
                bgcolor: 'action.hover',
              },
            }}
          >
            {loading ? 'Atualizando...' : 'Atualizar painel'}
          </Button>
        </Stack>

        {!available ? (
          <Alert severity="warning">{getUnavailableMessage(reason)}</Alert>
        ) : loading && !ranking ? (
          <AppSurface
            surface="raised"
            sx={{
              minHeight: 320,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Stack spacing={1.5} alignItems="center">
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                Carregando arena de ranking...
              </Typography>
            </Stack>
          </AppSurface>
        ) : error && !ranking ? (
          <Stack spacing={1.5}>
            <Alert severity="error">{error}</Alert>
            <Box>
              <Button variant="outlined" onClick={() => void refresh()}>
                Tentar novamente
              </Button>
            </Box>
          </Stack>
        ) : ranking ? (
          <Stack spacing={2}>
            {error ? <Alert severity="warning">{error}</Alert> : null}

            <AppSurface
              surface="raised"
              sx={{
                position: 'relative',
                overflow: 'hidden',
                p: { xs: 2.5, md: 3 },
                background:
                  theme.palette.mode === 'light'
                    ? `linear-gradient(135deg, ${alpha('#F59E0B', 0.16)} 0%, ${alpha(currentTier.color, 0.12)} 50%, rgba(255,255,255,0.96) 100%)`
                    : `linear-gradient(135deg, ${alpha('#F59E0B', 0.24)} 0%, ${alpha(currentTier.color, 0.18)} 50%, rgba(15,23,42,0.94) 100%)`,
                borderColor: alpha(currentTier.color, theme.palette.mode === 'light' ? 0.18 : 0.28),
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 'auto -100px -120px auto',
                  width: 280,
                  height: 280,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${alpha('#F59E0B', 0.32)} 0%, ${alpha('#F59E0B', 0)} 72%)`,
                  pointerEvents: 'none',
                }}
              />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.45fr) minmax(280px, 0.9fr)' },
                  gap: 2,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <Stack spacing={2}>
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{ color: alpha(theme.palette.text.primary, 0.7), letterSpacing: '0.16em' }}
                    >
                      WORKSPACE ARENA
                    </Typography>
                    <Typography variant="h4" fontWeight={900} sx={{ mb: 1 }}>
                      {currentEntry ? `Você está em #${currentEntry.position}` : 'Entre na corrida'}
                    </Typography>
                    <Typography variant="body1" sx={{ maxWidth: 620, color: 'text.secondary' }}>
                      {heroMessage}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Chip label={`${formatNumber(ranking.total_members)} membros ativos`} size="small" />
                    <Chip label={`${formatNumber(ranking.active_with_xp)} já pontuaram`} size="small" variant="outlined" />
                    <Chip label={`Nível ${currentLevel}`} size="small" variant="outlined" />
                    <TierBadge level={currentLevel} size="sm" showTierName />
                  </Stack>

                  {progress ? (
                    <ProgressIndicator
                      value={progressPercent}
                      tone="gamification"
                      height={8}
                      label={`${formatNumber(progress.xpInCurrentLevel ?? 0)} / ${formatNumber(progress.xpForNextLevel ?? 0)} XP no nível`}
                      meta={`${Math.round(progressPercent)}%`}
                    />
                  ) : progressLoading ? (
                    <Typography variant="body2" color="text.secondary">
                      Sincronizando seu progresso...
                    </Typography>
                  ) : null}
                </Stack>

                <AppSurface
                  surface="interactive"
                  sx={{
                    p: 2.25,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    bgcolor:
                      theme.palette.mode === 'light'
                        ? 'rgba(255,255,255,0.78)'
                        : 'rgba(15,23,42,0.52)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight={800}>
                      Sua leitura agora
                    </Typography>
                    {currentEntry ? (
                      <Chip
                        label={`#${currentEntry.position}`}
                        size="small"
                        sx={{
                          bgcolor: alpha(currentTier.color, 0.14),
                          color: currentTier.color,
                          fontWeight: 800,
                        }}
                      />
                    ) : null}
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 1.25,
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        XP total
                      </Typography>
                      <Typography variant="h5" fontWeight={900} sx={{ mt: 0.25 }}>
                        {formatNumber(progress?.totalXp ?? currentEntry?.total_xp ?? 0)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Streak
                      </Typography>
                      <Typography variant="h5" fontWeight={900} sx={{ mt: 0.25 }}>
                        {formatNumber(progress?.streakDays ?? 0)}d
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        To-dos concluídos
                      </Typography>
                      <Typography variant="h6" fontWeight={800} sx={{ mt: 0.25 }}>
                        {formatNumber(progress?.completedTodos ?? 0)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Atividades concluídas
                      </Typography>
                      <Typography variant="h6" fontWeight={800} sx={{ mt: 0.25 }}>
                        {formatNumber(progress?.completedActivities ?? 0)}
                      </Typography>
                    </Box>
                  </Box>
                </AppSurface>
              </Box>
            </AppSurface>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
                gap: 1.5,
              }}
            >
              <MetricCard
                icon={People}
                label="Membros na arena"
                value={formatNumber(ranking.total_members)}
                sub={`${activePlayersPercent}% já pontuaram no ranking`}
              />
              <MetricCard
                icon={TrendingUp}
                label="Ativos com XP"
                value={formatNumber(ranking.active_with_xp)}
                sub={`XP médio do time: ${formatMetric(ranking.average_xp)}`}
              />
              <MetricCard
                icon={Star}
                label="Nível médio"
                value={formatMetric(ranking.average_level)}
                sub="Mostra o ritmo coletivo de evolução"
              />
              <MetricCard
                icon={Sparkles}
                label="Conquistas liberadas"
                value={formatNumber(ranking.total_unlocked_achievements)}
                sub="Desbloqueios somados de todo o workspace"
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.45fr) minmax(320px, 0.9fr)' },
                gap: 2,
                alignItems: 'start',
              }}
            >
              <Stack spacing={2}>
                <AppSurface surface="raised" sx={{ p: { xs: 2, md: 2.5 } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <Trophy size={18} color="#F59E0B" />
                    <Typography variant="h6" fontWeight={900}>
                      Pódio do workspace
                    </Typography>
                  </Stack>

                  {podium.length > 0 ? (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                        gap: 1.5,
                        alignItems: 'end',
                      }}
                    >
                      {podium.map((entry) => (
                        <PodiumCard key={entry.user_id} entry={entry} currentUserId={currentUser?.id ?? null} />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Ainda não há usuários suficientes com progresso para montar o pódio.
                    </Typography>
                  )}
                </AppSurface>

                <AppSurface surface="raised" sx={{ p: { xs: 2, md: 2.5 } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <Medal size={18} color={theme.palette.text.primary} />
                    <Typography variant="h6" fontWeight={900}>
                      Top 5
                    </Typography>
                  </Stack>

                  {leaderboard.length > 0 ? (
                    <Stack spacing={1}>
                      {leaderboard.map((entry) => (
                        <LeaderboardRow
                          key={entry.user_id}
                          entry={entry}
                          currentUserId={currentUser?.id ?? null}
                          leaderXp={leaderboardLeadXp}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma pontuação registrada ainda para compor o ranking.
                    </Typography>
                  )}
                </AppSurface>
              </Stack>

              <Stack spacing={2}>
                <AppSurface surface="raised" sx={{ p: 2.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <Sparkles size={18} color={currentTier.color} />
                    <Typography variant="h6" fontWeight={900}>
                      Seu momento
                    </Typography>
                  </Stack>

                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Colocação atual
                      </Typography>
                      <Typography variant="h3" fontWeight={900} sx={{ lineHeight: 1, mt: 0.35 }}>
                        {currentEntry ? `#${currentEntry.position}` : 'Sem posição'}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      <TierBadge level={currentLevel} size="sm" showTierName />
                      <Chip label={`${formatNumber(progress?.totalXp ?? currentEntry?.total_xp ?? 0)} XP`} size="small" variant="outlined" />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      {currentEntry
                        ? currentEntry.position <= 3
                          ? 'Você está entre os protagonistas da corrida neste momento.'
                          : 'Você já está no ranking. Agora o foco é encurtar a distância para o próximo degrau.'
                        : 'Seu perfil ainda não acumulou XP suficiente para aparecer no painel.'}
                    </Typography>
                  </Stack>
                </AppSurface>

                <AppSurface surface="raised" sx={{ p: 2.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <TrendingUp size={18} color={theme.palette.text.primary} />
                    <Typography variant="h6" fontWeight={900}>
                      Próximo alvo
                    </Typography>
                  </Stack>

                  {currentEntry ? (
                    <Stack spacing={1.25}>
                      <Typography variant="body2" color="text.secondary">
                        {ranking.gap_to_next
                          ? ranking.gap_to_next.xp_difference > 0
                            ? `Você está mirando ${ranking.gap_to_next.name}, que hoje ocupa a posição #${ranking.gap_to_next.position}.`
                            : `${ranking.gap_to_next.name} está em alcance imediato.`
                          : 'Você está no topo. Agora o desafio é sustentar a liderança.'}
                      </Typography>

                      <Box>
                        <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1 }}>
                          {ranking.gap_to_next ? formatNumber(ranking.gap_to_next.xp_difference) : '0'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ranking.gap_to_next ? 'XP para subir uma posição' : 'XP de distância para o próximo rival'}
                        </Typography>
                      </Box>

                      <ProgressIndicator
                        value={leaderboardLeadXp > 0 ? ((currentEntry.total_xp ?? 0) / leaderboardLeadXp) * 100 : 0}
                        tone="gamification"
                        height={7}
                        label="Proximidade do líder"
                        meta={`${leaderboardLeadXp > 0 ? Math.round((currentEntry.total_xp / leaderboardLeadXp) * 100) : 0}%`}
                      />
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Feche seus primeiros itens no workspace para destravar a sua posição e começar a disputa.
                    </Typography>
                  )}
                </AppSurface>
              </Stack>
            </Box>
          </Stack>
        ) : (
          <Alert severity="info">Nenhum dado de ranking disponível para este workspace no momento.</Alert>
        )}
      </Box>
    </Box>
  )
}

