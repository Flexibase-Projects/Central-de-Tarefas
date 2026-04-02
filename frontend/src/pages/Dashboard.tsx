import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { RefreshCw } from 'lucide-react'
import { useHome } from '@/hooks/use-home'
import { useIndicators, type MonthlyActivitySummary } from '@/hooks/use-indicators'
import { useAuth } from '@/contexts/AuthContext'
import { isGlobalAdminRoleName } from '@/lib/global-admin'
import { buildWorkspacePath } from '@/lib/workspace-routing'
import { formatDatePtBr, isOverdueDate } from '@/lib/date-only'
import { getStatusLabel } from '@/lib/status-labels'
import type { HomeReviewItem, HomeTodoItem } from '@/types'
import AppSurface from '@/components/system/AppSurface'
import FormDialog from '@/components/system/FormDialog'
import SectionHeader from '@/components/system/SectionHeader'
import StatusToken from '@/components/system/StatusToken'
import { PageSyncScreen, WorkspaceSyncBanner } from '@/components/system/WorkspaceSyncFeedback'

type HomeCardItem = HomeTodoItem | HomeReviewItem

function isReviewItem(item: HomeCardItem): item is HomeReviewItem {
  return 'kind' in item
}

function getWaitingStatusLabel(item: HomeReviewItem): string {
  if (item.waitingReason === 'xp') return 'XP pendente'
  return getStatusLabel(item.status)
}

function getWaitingDescription(item: HomeReviewItem): string {
  if (item.waitingReason === 'xp') {
    return 'Aguardando lancamento ou configuracao de XP'
  }
  if (item.kind === 'project') {
    return 'Projeto aguardando decisao'
  }
  if (item.kind === 'todo') {
    return 'To-do aguardando tratativa antes de seguir'
  }
  return 'Atividade aguardando revisao ou retorno'
}

function SummaryCard({
  label,
  value,
  caption,
  tone = 'neutral',
}: {
  label: string
  value: number
  caption: string
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
}) {
  return (
    <AppSurface surface={tone === 'neutral' ? 'default' : 'interactive'} sx={{ minHeight: 136 }}>
      <Stack spacing={1.25}>
        <StatusToken tone={tone}>{label}</StatusToken>
        <Typography variant="h2">{String(value).padStart(2, '0')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          {caption}
        </Typography>
      </Stack>
    </AppSurface>
  )
}

function EmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <Box
      sx={{
        minHeight: compact ? 108 : 180,
        display: 'grid',
        placeItems: 'center',
        borderRadius: '10px',
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 320 }}>
        {message}
      </Typography>
    </Box>
  )
}

function QueueShell({
  title,
  description,
  footerLabel,
  footerHref,
  onFooterClick,
  compact = false,
  headerMinHeight,
  children,
}: {
  title: string
  description: string
  footerLabel: string
  footerHref: string
  onFooterClick?: () => void
  compact?: boolean
  headerMinHeight?: number | string
  children: React.ReactNode
}) {
  return (
    <AppSurface sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ minHeight: headerMinHeight }}>
        <SectionHeader title={title} description={description} sx={{ pb: compact ? 1.5 : 2 }} />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
      <Divider sx={{ mt: 1.5, mb: 1 }} />
      {onFooterClick ? (
        <Button
          onClick={onFooterClick}
          variant="text"
          color="inherit"
          aria-label={footerLabel}
          sx={{
            alignSelf: 'flex-start',
            px: 0,
            py: 0.25,
            minWidth: 0,
            fontWeight: 600,
            color: 'text.primary',
            '&:hover': {
              bgcolor: 'transparent',
              color: 'text.secondary',
            },
          }}
        >
          {footerLabel}
        </Button>
      ) : (
        <Button
          component={RouterLink}
          to={footerHref}
          variant="text"
          color="inherit"
          aria-label={footerLabel}
          sx={{
            alignSelf: 'flex-start',
            px: 0,
            py: 0.25,
            minWidth: 0,
            fontWeight: 600,
            color: 'text.primary',
            '&:hover': {
              bgcolor: 'transparent',
              color: 'text.secondary',
            },
          }}
        >
          {footerLabel}
        </Button>
      )}
    </AppSurface>
  )
}

function TodoCard({
  item,
  href,
  compact = false,
  showAssignee = true,
  typeLabel,
}: {
  item: HomeTodoItem
  href: string
  compact?: boolean
  showAssignee?: boolean
  typeLabel?: string | null
}) {
  return (
    <Box
      component={RouterLink}
      to={href}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
        px: compact ? 1.25 : 1.5,
        py: compact ? 0.9 : 1.1,
        minHeight: compact ? 84 : 98,
        transition: 'border-color 160ms ease, background-color 160ms ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
        },
      }}
    >
      <Stack spacing={compact ? 0.65 : 0.8}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontWeight: 700, minWidth: 0 }} noWrap={!compact}>
            {item.title}
          </Typography>
          <StatusToken tone={isOverdueDate(item.deadline) ? 'danger' : 'neutral'}>
            {formatDatePtBr(item.deadline, 'Sem prazo')}
          </StatusToken>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
          {[item.projectName, item.activityName].filter(Boolean).join(' / ') || 'Item sem contexto associado'}
        </Typography>

        {typeLabel ? (
          <Typography variant="caption" color="text.secondary">
            {typeLabel}
          </Typography>
        ) : null}

        {showAssignee && item.assigneeName ? (
          <Typography variant="caption" color="text.secondary">
            Responsavel: {item.assigneeName}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  )
}

function TeamCompactCard({
  item,
  href,
}: {
  item: HomeTodoItem
  href: string
}) {
  return (
    <Box
      component={RouterLink}
      to={href}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
        px: 1,
        py: 0.85,
        minHeight: 72,
        transition: 'border-color 140ms ease, background-color 140ms ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
        },
      }}
    >
      <Stack spacing={0.35}>
        <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
          {item.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {item.projectName || item.activityName || 'Sem projeto'}
        </Typography>
        <Stack direction="row" justifyContent="space-between" spacing={0.75} sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0, flex: 1 }}>
            {item.assigneeName || 'Sem responsavel'}
          </Typography>
          <Typography variant="caption" color={isOverdueDate(item.deadline) ? 'error.main' : 'text.secondary'} noWrap>
            {formatDatePtBr(item.deadline, 'Sem prazo')}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  )
}

function WaitingCard({
  item,
  href,
}: {
  item: HomeCardItem
  href: string
}) {
  if (!isReviewItem(item)) {
    return <TodoCard item={item} href={href} compact />
  }

  return (
    <Box
      component={RouterLink}
      to={href}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
        px: 1.5,
        py: 1.1,
        minHeight: 98,
        transition: 'border-color 160ms ease, background-color 160ms ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
        },
      }}
    >
      <Stack spacing={0.55}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontWeight: 700, minWidth: 0 }} noWrap>
            {item.title}
          </Typography>
          <StatusToken tone="warning">{getWaitingStatusLabel(item)}</StatusToken>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {getWaitingDescription(item)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.ownerName ? `Responsavel: ${item.ownerName}` : 'Sem responsavel destacado'}
        </Typography>
      </Stack>
    </Box>
  )
}

function MonthlyActivitySummaryCard({
  summary,
  isAdmin,
  loading,
  error,
}: {
  summary: MonthlyActivitySummary | null
  isAdmin: boolean
  loading: boolean
  error: string | null
}) {
  const theme = useTheme()
  const chartColors = {
    completed: theme.palette.success.main,
    pending: theme.palette.warning.main,
    overdue: theme.palette.error.main,
  } as const
  const chartData = [
    { key: 'completed', label: 'Concluidas', value: summary?.completed ?? 0, color: chartColors.completed },
    { key: 'pending', label: 'Pendentes', value: summary?.pending ?? 0, color: chartColors.pending },
    { key: 'overdue', label: 'Atrasadas', value: summary?.overdue ?? 0, color: chartColors.overdue },
  ] as const

  const total = summary?.total ?? chartData.reduce((acc, item) => acc + item.value, 0)
  const radius = 78
  const strokeWidth = 28
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <AppSurface sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SectionHeader
        title={isAdmin ? 'Resumo mensal do time' : 'Meu resumo do mes'}
        description={
          isAdmin
            ? 'Fechamento do mes atual com a distribuicao geral de to-dos e atividades.'
            : 'Fechamento do mes atual considerando somente os itens atribuidos a voce.'
        }
        sx={{ pb: 1.5 }}
      />

      {loading && !summary ? (
        <EmptyState message="Estamos fechando o retrato do mes atual." compact />
      ) : total === 0 ? (
        <EmptyState message="Nenhum item criado no mes atual entrou neste resumo ainda." compact />
      ) : (
        <Stack spacing={0.8} sx={{ flex: 1, justifyContent: 'space-between' }}>
          <Stack
            sx={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              role="img"
              aria-label={`Resumo do mes atual: ${chartData[0].value} concluidas, ${chartData[1].value} pendentes e ${chartData[2].value} atrasadas.`}
              sx={{ display: 'grid', placeItems: 'center' }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: 248,
                  height: 248,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 34,
                    borderRadius: '999px',
                    bgcolor: alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.02 : 0.35),
                  }}
                />
                <svg width="248" height="248" viewBox="0 0 248 248" aria-hidden="true">
                  <circle
                    cx="124"
                    cy="124"
                    r={radius}
                    fill="none"
                    stroke={alpha(theme.palette.text.secondary, 0.16)}
                    strokeWidth={strokeWidth}
                  />
                  {chartData.map((item) => {
                    if (item.value <= 0 || total <= 0) return null
                    const length = (item.value / total) * circumference
                    const segment = (
                      <circle
                        key={item.key}
                        cx="124"
                        cy="124"
                        r={radius}
                        fill="none"
                        stroke={item.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${length} ${circumference}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                        transform="rotate(-90 124 124)"
                      />
                    )
                    offset += length
                    return segment
                  })}
                </svg>
                <Stack
                  spacing={0.35}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    px: 2.25,
                  }}
                >
                  <Typography variant="h1" sx={{ fontWeight: 800, lineHeight: 0.96 }}>
                    {total}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ letterSpacing: '0.01em', lineHeight: 1.2, textAlign: 'center' }}
                  >
                    entregas
                    <br />
                    no mes
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 1,
            }}
          >
            {chartData.map((item) => (
              <Box
                key={item.key}
                sx={{
                  borderTop: '2px solid',
                  borderTopColor: item.color,
                  pt: 0.8,
                  minWidth: 0,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                  {item.label}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {isAdmin
              ? 'Leitura direta para acompanhar o ritmo do departamento sem sair da home.'
              : 'Leitura direta para acompanhar seu ritmo de entrega sem sair da home.'}
          </Typography>
        </Stack>
      )}

      {error ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pt: 1.5 }}>
          {error}
        </Typography>
      ) : null}
    </AppSurface>
  )
}

export default function Dashboard() {
  const { data, loading, error, refresh } = useHome()
  const { currentWorkspace, hasPermission, realUser, realUserRole } = useAuth()
  const isRealAdmin = isGlobalAdminRoleName(realUserRole?.name)
  const navigate = useNavigate()
  const [isTeamDestinationOpen, setIsTeamDestinationOpen] = useState(false)
  const {
    data: indicatorsData,
    loading: indicatorsLoading,
    error: indicatorsError,
  } = useIndicators(isRealAdmin ? realUser?.id ?? null : undefined, isRealAdmin ? 'team' : 'me')
  const homeData = data ?? {
    persona: (isRealAdmin ? 'admin' : 'member') as 'admin' | 'member',
    summary: {
      myOpen: 0,
      myPending: 0,
      overdue: 0,
      waiting: 0,
      teamOpenActivities: 0,
      teamOpenItems: 0,
      xpPending: 0,
    },
    buckets: {
      now: [],
      pending: [],
      overdue: [],
      waiting: [],
      teamOpenActivities: [],
      teamOpenItems: [],
    },
    quickTargets: {
      projectsOpen: '/desenvolvimentos?view=list',
      activitiesOpen: '/atividades?view=list',
      indicatorsUrl: '/indicadores',
    },
  }

  const homePaths = useMemo(() => {
    const workspaceSlug = currentWorkspace?.slug

    const buildTodoPath = (item: HomeTodoItem) => {
      if (item.sourceType === 'activity' && item.activityId) {
        return buildWorkspacePath(
          workspaceSlug,
          `/atividades?view=list&activity=${encodeURIComponent(item.activityId)}`,
        )
      }

      if (item.activityId) {
        return buildWorkspacePath(
          workspaceSlug,
          `/atividades?view=list&activity=${encodeURIComponent(item.activityId)}&todo=${encodeURIComponent(item.id)}`,
        )
      }

      if (item.projectId) {
        return buildWorkspacePath(
          workspaceSlug,
          `/desenvolvimentos?view=list&project=${encodeURIComponent(item.projectId)}&todo=${encodeURIComponent(item.id)}`,
        )
      }

      return buildWorkspacePath(workspaceSlug, '/atividades?view=list')
    }

    const buildReviewPath = (item: HomeReviewItem) =>
      item.kind === 'project'
        ? buildWorkspacePath(
            workspaceSlug,
            `/desenvolvimentos?view=list&project=${encodeURIComponent(item.id)}`,
          )
        : buildWorkspacePath(
            workspaceSlug,
            `/atividades?view=list&activity=${encodeURIComponent(item.id)}`,
          )

    return {
      buildTodoPath,
      buildReviewPath,
      projects: buildWorkspacePath(workspaceSlug, homeData.quickTargets.projectsOpen),
      activities: buildWorkspacePath(workspaceSlug, homeData.quickTargets.activitiesOpen),
    }
  }, [currentWorkspace?.slug, homeData.quickTargets.activitiesOpen, homeData.quickTargets.projectsOpen])

  const typedBuckets = homeData.buckets as typeof homeData.buckets & {
    pending?: HomeTodoItem[]
    teamOpenItems?: HomeTodoItem[]
    waiting?: HomeCardItem[]
  }
  const nowItems = homeData.buckets.now.slice(0, 3)
  const pendingItems = (typedBuckets.pending ?? homeData.buckets.overdue).slice(0, 5)
  const waitingItems = ((typedBuckets.waiting ?? homeData.buckets.waiting) as HomeCardItem[]).slice(0, 5)
  const teamItems = (typedBuckets.teamOpenItems ?? homeData.buckets.teamOpenActivities).slice(0, 12)
  const teamDestinationOptions = [
    hasPermission('access_desenvolvimentos')
      ? { key: 'projects', title: 'Projetos', description: 'Abrir as listas e kanbans de projetos deste workspace.', href: homePaths.projects }
      : null,
    hasPermission('access_atividades')
      ? { key: 'activities', title: 'Atividades', description: 'Abrir as listas e kanbans de atividades deste workspace.', href: homePaths.activities }
      : null,
  ].filter((option): option is { key: string; title: string; description: string; href: string } => option !== null)

  const handleOpenTeamMore = () => {
    if (teamDestinationOptions.length <= 1) {
      const fallbackHref = teamDestinationOptions[0]?.href ?? homePaths.activities
      navigate(fallbackHref)
      return
    }
    setIsTeamDestinationOpen(true)
  }

  const handleSelectTeamDestination = (href: string) => {
    setIsTeamDestinationOpen(false)
    navigate(href)
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <SectionHeader
        title="Central de Tarefas"
        description={
          homeData.persona === 'admin'
            ? 'Fila de trabalho, pendencias de acompanhamento e leitura mensal do departamento na mesma grade.'
            : 'Fila principal, pendencias e leitura mensal para decidir o proximo passo sem ruido.'
        }
        actions={(
          <Button
            variant="outlined"
            onClick={() => void refresh()}
            startIcon={<RefreshCw size={16} />}
          >
            Atualizar
          </Button>
        )}
      />

      <WorkspaceSyncBanner
        active={loading}
        title="Atualizando a central de tarefas"
        description="Os cards continuam visiveis enquanto sincronizamos prioridades, pendencias e o resumo do mes."
      />

      {!data && loading ? (
        <PageSyncScreen
          title="Sincronizando sua central de tarefas"
          description="Estamos montando sua fila principal, as colunas de trabalho e o resumo visual do mes atual."
          minHeight={220}
        />
      ) : null}

      {error ? (
        <Alert severity="error" onClose={() => void refresh()}>
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            xl: homeData.persona === 'admin' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        <SummaryCard
          label="Minhas agora"
          value={homeData.summary.myOpen}
          caption="Pendencias atribuidas a voce que pedem acao imediata."
          tone="info"
        />
        <SummaryCard
          label="Minhas pendencias"
          value={homeData.summary.myPending ?? pendingItems.length}
          caption="Pendentes e atrasadas em uma fila unica, com leitura pela data."
          tone={homeData.summary.overdue > 0 ? 'warning' : 'neutral'}
        />
        <SummaryCard
          label="Aguardando"
          value={homeData.summary.waiting}
          caption="XP pendente, revisao, retorno ou decisao antes de seguir."
          tone="warning"
        />
        {homeData.persona === 'admin' ? (
          <SummaryCard
            label="Abertas no time"
            value={homeData.summary.teamOpenItems ?? teamItems.length}
            caption="Volume global de atividades e to-dos ainda abertos no time."
            tone="success"
          />
        ) : null}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(320px, 1fr)' },
          gap: 2,
        }}
      >
        <QueueShell
          title="Minhas agora"
          description={`Tres itens priorizados para voce agir agora. ${homeData.summary.myOpen} pendencias abertas na sua fila.`}
          footerLabel="Ver mais em atividades"
          footerHref={homePaths.activities}
          compact
        >
          {nowItems.length === 0 ? (
            <EmptyState message="Nenhuma pendencia prioritaria para agora." compact />
          ) : (
            <Stack spacing={1}>
              {nowItems.map((item) => (
                <TodoCard
                  key={item.id}
                  item={item}
                  href={homePaths.buildTodoPath(item)}
                  compact
                  showAssignee={false}
                />
              ))}
            </Stack>
          )}
        </QueueShell>

        <MonthlyActivitySummaryCard
          summary={indicatorsData?.monthlyActivitySummary ?? null}
          isAdmin={homeData.persona === 'admin'}
          loading={indicatorsLoading}
          error={indicatorsError}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: homeData.persona === 'admin'
            ? { xs: '1fr', xl: 'repeat(3, minmax(0, 1fr))' }
            : { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'stretch',
        }}
      >
        <QueueShell
          title="Minhas pendencias"
          description={`Fila unica com pendentes e atrasadas. ${homeData.summary.myPending ?? pendingItems.length} itens em aberto.`}
          footerLabel="Ver mais em atividades"
          footerHref={homePaths.activities}
          headerMinHeight={88}
        >
          {pendingItems.length === 0 ? (
            <EmptyState message="Nenhuma pendencia aberta por aqui." />
          ) : (
            <Stack spacing={1}>
              {pendingItems.map((item) => (
                <TodoCard
                  key={item.id}
                  item={item}
                  href={homePaths.buildTodoPath(item)}
                />
              ))}
            </Stack>
          )}
        </QueueShell>

        <QueueShell
          title="Aguardando"
          description={`Lancamento de XP, revisao, retorno ou decisao antes de seguir. ${homeData.summary.waiting} itens na fila.`}
          footerLabel="Ver mais na execucao"
          footerHref={homePaths.activities}
          headerMinHeight={88}
        >
          {waitingItems.length === 0 ? (
            <EmptyState message="Nenhum item aguardando agora." />
          ) : (
            <Stack spacing={1}>
              {waitingItems.map((item, index) => (
                <WaitingCard
                  key={isReviewItem(item) ? `${item.kind}-${item.id}` : `${String(item.id)}-${index}`}
                  item={item}
                  href={isReviewItem(item) ? homePaths.buildReviewPath(item) : homePaths.buildTodoPath(item)}
                />
              ))}
            </Stack>
          )}
        </QueueShell>

        {homeData.persona === 'admin' ? (
          <QueueShell
            title="Abertas no time"
            description={`Atividades e to-dos do time inteiro organizados em uma leitura unica. ${homeData.summary.teamOpenItems ?? teamItems.length} itens abertos.`}
            footerLabel="Ver mais no time"
            footerHref={teamDestinationOptions[0]?.href ?? homePaths.activities}
            onFooterClick={handleOpenTeamMore}
            headerMinHeight={88}
          >
            {teamItems.length === 0 ? (
              <EmptyState message="Nenhum item aberto no time agora." />
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                  gap: 0.85,
                }}
              >
                {teamItems.map((item) => (
                  <TeamCompactCard
                    key={item.id}
                    item={item}
                    href={homePaths.buildTodoPath(item)}
                  />
                ))}
              </Box>
            )}
          </QueueShell>
        ) : null}
      </Box>

      <FormDialog
        open={isTeamDestinationOpen}
        onClose={() => setIsTeamDestinationOpen(false)}
        title="Abrir visao do time"
        description="Escolha qual conjunto de listas e kanbans deseja abrir neste workspace."
        maxWidth="xs"
        actions={<Button onClick={() => setIsTeamDestinationOpen(false)}>Fechar</Button>}
      >
        <Stack spacing={1}>
          {teamDestinationOptions.map((option) => (
            <Box
              key={option.key}
              component="button"
              type="button"
              onClick={() => handleSelectTeamDestination(option.href)}
              sx={{
                width: '100%',
                textAlign: 'left',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '10px',
                bgcolor: 'background.paper',
                px: 1.5,
                py: 1.25,
                cursor: 'pointer',
                transition: 'border-color 140ms ease, background-color 140ms ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {option.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                {option.description}
              </Typography>
            </Box>
          ))}
        </Stack>
      </FormDialog>
    </Box>
  )
}
