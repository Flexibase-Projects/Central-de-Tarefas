import { useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardList,
  FolderOpen,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useHome } from '@/hooks/use-home'
import { useAuth } from '@/contexts/AuthContext'
import { buildWorkspacePath } from '@/lib/workspace-routing'
import { formatDatePtBr, isOverdueDate } from '@/lib/date-only'
import { getStatusLabel } from '@/lib/status-labels'
import type { HomeReviewItem, HomeTodoItem } from '@/types'
import AppSurface from '@/components/system/AppSurface'
import SectionHeader from '@/components/system/SectionHeader'
import StatusToken from '@/components/system/StatusToken'

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
    <AppSurface surface={tone === 'neutral' ? 'default' : 'interactive'} sx={{ minHeight: 140 }}>
      <Stack spacing={1.5}>
        <StatusToken tone={tone}>{label}</StatusToken>
        <Typography variant="h2">{String(value).padStart(2, '0')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {caption}
        </Typography>
      </Stack>
    </AppSurface>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Box
      sx={{
        minHeight: 140,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 'var(--radius-md)',
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

function TodoBucket({
  title,
  description,
  items,
  emptyMessage,
  hrefBuilder,
}: {
  title: string
  description: string
  items: HomeTodoItem[]
  emptyMessage: string
  hrefBuilder: (item: HomeTodoItem) => string
}) {
  return (
    <AppSurface sx={{ height: '100%' }}>
      <SectionHeader title={title} description={description} sx={{ pb: 2 }} />
      {items.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <Stack spacing={1.25}>
          {items.map((item) => (
            <Box
              key={item.id}
              component={RouterLink}
              to={hrefBuilder(item)}
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
                px: 1.5,
                py: 1.25,
                transition: 'transform 160ms ease, border-color 160ms ease, background-color 160ms ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Stack spacing={0.85}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                    {item.title}
                  </Typography>
                  <StatusToken tone={isOverdueDate(item.deadline) ? 'danger' : 'neutral'}>
                    {formatDatePtBr(item.deadline, 'Sem prazo')}
                  </StatusToken>
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                  {[item.projectName, item.activityName].filter(Boolean).join(' · ') || 'Item sem contexto associado'}
                </Typography>

                {item.assigneeName ? (
                  <Typography variant="caption" color="text.secondary">
                    Responsável: {item.assigneeName}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </AppSurface>
  )
}

function ReviewBucket({
  items,
  hrefBuilder,
}: {
  items: HomeReviewItem[]
  hrefBuilder: (item: HomeReviewItem) => string
}) {
  return (
    <AppSurface sx={{ height: '100%' }}>
      <SectionHeader
        title="Aguardando"
        description="Itens que pedem revisão, retorno ou decisão antes de seguir no fluxo."
        sx={{ pb: 2 }}
      />

      {items.length === 0 ? (
        <EmptyState message="Nenhum item aguardando revisão agora. Isso ajuda a manter a fila principal mais limpa." />
      ) : (
        <Stack spacing={1.25}>
          {items.map((item) => (
            <Box
              key={`${item.kind}-${item.id}`}
              component={RouterLink}
              to={hrefBuilder(item)}
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
                px: 1.5,
                py: 1.25,
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Stack spacing={0.85}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                    {item.title}
                  </Typography>
                  <StatusToken tone="warning">{getStatusLabel(item.status)}</StatusToken>
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {item.kind === 'project' ? 'Projeto em revisão' : 'Atividade em revisão'}
                </Typography>

                <Stack direction="row" spacing={1} divider={<Divider orientation="vertical" flexItem />} sx={{ color: 'text.secondary' }}>
                  <Typography variant="caption">
                    Prazo: {formatDatePtBr(item.dueDate, 'Sem prazo')}
                  </Typography>
                  <Typography variant="caption">
                    {item.ownerName ? `Responsável: ${item.ownerName}` : 'Sem responsável destacado'}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </AppSurface>
  )
}

export default function Dashboard() {
  const { data, loading, error, refresh } = useHome()
  const { currentWorkspace } = useAuth()

  const homePaths = useMemo(() => {
    const workspaceSlug = currentWorkspace?.slug
    const buildTodoPath = (item: HomeTodoItem) => {
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
      projects: buildWorkspacePath(workspaceSlug, data?.quickTargets.projectsOpen ?? '/desenvolvimentos?view=list'),
      activities: buildWorkspacePath(workspaceSlug, data?.quickTargets.activitiesOpen ?? '/atividades?view=list'),
      indicators: buildWorkspacePath(workspaceSlug, data?.quickTargets.indicatorsUrl ?? '/indicadores'),
      admin: data?.quickTargets.adminUrl
        ? buildWorkspacePath(workspaceSlug, data.quickTargets.adminUrl)
        : null,
    }
  }, [currentWorkspace?.slug, data?.quickTargets])

  if (loading && !data) {
    return (
      <Box sx={{ minHeight: '100%', display: 'grid', placeItems: 'center', p: 4 }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress size={34} />
          <Typography variant="body2" color="text.secondary">
            Carregando a central de tarefas...
          </Typography>
        </Stack>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <SectionHeader
        title="Central de Tarefas"
        description={
          data?.persona === 'admin'
            ? 'Visão operacional do workspace com fila de execução, itens em revisão e atalhos de gestão.'
            : 'Sua fila principal de trabalho, organizada para reduzir ruído e acelerar a próxima ação.'
        }
        actions={
          <>
            <Button
              variant="outlined"
              onClick={() => void refresh()}
              startIcon={<RefreshCw size={16} />}
            >
              Atualizar
            </Button>
            <Button
              component={RouterLink}
              to={homePaths.indicators}
              variant="contained"
              startIcon={<BarChart3 size={16} />}
            >
              Indicadores
            </Button>
          </>
        }
      />

      {error ? (
        <Alert severity="error" onClose={() => void refresh()}>
          {error}
        </Alert>
      ) : null}

      {data ? (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: data.persona === 'admin' ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
                xl: data.persona === 'admin' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            <SummaryCard
              label="Minhas agora"
              value={data.summary.myOpen}
              caption="Itens atribuídos a você e prontos para execução imediata."
              tone="info"
            />
            <SummaryCard
              label="Atrasadas"
              value={data.summary.overdue}
              caption="Demandas que já passaram do prazo e merecem ação ou renegociação."
              tone={data.summary.overdue > 0 ? 'danger' : 'neutral'}
            />
            <SummaryCard
              label="Aguardando"
              value={data.summary.waiting}
              caption="Projetos e atividades em revisão ou aguardando uma decisão para avançar."
              tone="warning"
            />
            {data.persona === 'admin' ? (
              <SummaryCard
                label="Delegadas"
                value={data.summary.delegated}
                caption={`Acompanhamento de itens passados para o time. ${data.summary.teamOpen ?? 0} itens seguem abertos no workspace.`}
                tone="success"
              />
            ) : null}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', xl: '1.05fr 0.95fr' },
              gap: 2,
            }}
          >
            <TodoBucket
              title="Minhas agora"
              description="A fila mais importante do momento, ordenada para você agir sem precisar caçar contexto."
              items={data.buckets.now}
              emptyMessage="Sua fila imediata está limpa. Este é um bom momento para puxar algo novo de Projetos ou Atividades."
              hrefBuilder={homePaths.buildTodoPath}
            />

            <AppSurface sx={{ height: '100%' }}>
              <SectionHeader
                title="Atalhos operacionais"
                description="Entradas rápidas para continuar o fluxo sem voltar para uma navegação orientada a módulos."
                sx={{ pb: 2 }}
              />

              <Stack spacing={1.25}>
                <Button
                  component={RouterLink}
                  to={homePaths.projects}
                  variant="outlined"
                  startIcon={<FolderOpen size={16} />}
                  endIcon={<ArrowRight size={16} />}
                  sx={{ justifyContent: 'space-between' }}
                >
                  Projetos em lista
                </Button>
                <Button
                  component={RouterLink}
                  to={homePaths.activities}
                  variant="outlined"
                  startIcon={<ClipboardList size={16} />}
                  endIcon={<ArrowRight size={16} />}
                  sx={{ justifyContent: 'space-between' }}
                >
                  Atividades em lista
                </Button>
                <Button
                  component={RouterLink}
                  to={homePaths.indicators}
                  variant="outlined"
                  startIcon={<BarChart3 size={16} />}
                  endIcon={<ArrowRight size={16} />}
                  sx={{ justifyContent: 'space-between' }}
                >
                  Indicadores e leitura analítica
                </Button>
                {homePaths.admin ? (
                  <Button
                    component={RouterLink}
                    to={homePaths.admin}
                    variant="contained"
                    color="secondary"
                    startIcon={<ShieldCheck size={16} />}
                    endIcon={<ArrowRight size={16} />}
                    sx={{ justifyContent: 'space-between' }}
                  >
                    Administração
                  </Button>
                ) : null}

                <Divider sx={{ my: 0.5 }} />

                <Stack spacing={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Leitura rápida
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <StatusToken tone="info">{data.summary.myOpen} em execução</StatusToken>
                    <StatusToken tone={data.summary.overdue > 0 ? 'danger' : 'neutral'}>
                      {data.summary.overdue} com atraso
                    </StatusToken>
                    {typeof data.summary.teamOpen === 'number' ? (
                      <StatusToken tone="success">{data.summary.teamOpen} abertas no time</StatusToken>
                    ) : null}
                    {typeof data.summary.xpPending === 'number' ? (
                      <StatusToken tone="neutral">{data.summary.xpPending} sem XP configurado</StatusToken>
                    ) : null}
                  </Stack>
                </Stack>
              </Stack>
            </AppSurface>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', xl: data.persona === 'admin' ? '1fr 1fr 1fr' : '1fr 1fr' },
              gap: 2,
            }}
          >
            <TodoBucket
              title="Atrasadas"
              description="O que precisa de recuperação de prazo, apoio ou replanejamento."
              items={data.buckets.overdue}
              emptyMessage="Nenhuma demanda atrasada por aqui. Isso ajuda a manter a operação respirando melhor."
              hrefBuilder={homePaths.buildTodoPath}
            />

            <ReviewBucket items={data.buckets.waiting} hrefBuilder={homePaths.buildReviewPath} />

            {data.persona === 'admin' ? (
              <TodoBucket
                title="Delegadas"
                description="Itens que você distribuiu e ainda pedem acompanhamento próximo."
                items={data.buckets.delegated}
                emptyMessage="Nenhuma delegação aberta agora. O acompanhamento está sob controle."
                hrefBuilder={homePaths.buildTodoPath}
              />
            ) : null}
          </Box>
        </>
      ) : (
        <AppSurface>
          <Stack spacing={1.25} alignItems="center" sx={{ py: 5 }}>
            <AlertTriangle size={18} />
            <Typography variant="body2" color="text.secondary">
              Não foi possível montar a central de tarefas neste momento.
            </Typography>
          </Stack>
        </AppSurface>
      )}
    </Box>
  )
}
