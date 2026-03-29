import { useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material'
import { RefreshCw } from 'lucide-react'
import {
  BarChart2,
  CheckSquare,
  CheckCircle,
  Folder,
  MessageCircleIcon,
  ClipboardList,
} from '@/components/ui/icons'
import {
  DashboardMetricCard,
  DashboardStatusChip,
  DashboardBarRow,
  dashboardTableCellSx,
  type DashboardMetricCardProps,
} from '@/components/dashboard/indicator-widgets'
import { useIndicators } from '@/hooks/use-indicators'
import { useAuth } from '@/contexts/AuthContext'
import { useMyPendingTodosCount } from '@/hooks/use-my-pending-todos'
import type { ProjectIndicator } from '@/types'
import { formatDatePtBr } from '@/lib/date-only'
import { buildWorkspacePath } from '@/lib/workspace-routing'

const cell = dashboardTableCellSx

export default function Dashboard() {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  const { data, loading, error, refresh } = useIndicators()
  const { hasRole, currentWorkspace } = useAuth()
  const isAdmin = hasRole('admin')
  const { count: pendingCount } = useMyPendingTodosCount()

  // Dados do próprio usuário na lista by_user
  const personal = data?.personal ?? null

  // Atividades abertas: admin vê todas; usuário vê só as suas
  const activitiesOpen = useMemo(() => {
    const list = data?.by_activity?.filter((a) => a.status !== 'done') ?? []
    return isAdmin ? list : list
  }, [data?.by_activity, isAdmin])
  const recentTodos = data?.recentAssignedTodos ?? []
  const pendingTodosOnly = data?.pendingAssignedTodos ?? []

  const team = data?.team

  // Totais para os cards: admin usa totais do time; usuário usa seus próprios
  const todosCreated = isAdmin ? (team?.total_todos_created ?? 0) : (personal?.todosAssignedTotal ?? 0)
  const todosCompleted = isAdmin ? (team?.total_todos_completed ?? 0) : (personal?.todosAssignedCompleted ?? 0)
  const comments = isAdmin ? (team?.total_comments ?? 0) : (personal?.commentsCount ?? 0)
  const activitiesAssigned = isAdmin ? (team?.total_activities ?? 0) : (personal?.activitiesAssigned ?? 0)
  const todosPending = Math.max(0, todosCreated - todosCompleted)
  const completionRatePct =
    todosCreated > 0 ? Math.round((todosCompleted / todosCreated) * 100) : null

  const topProjects = useMemo(() => {
    const list = data?.by_project ?? []
    return [...list].sort((a, b) => b.todos_count - a.todos_count).slice(0, 5)
  }, [data?.by_project])

  const recentTodosPreview = useMemo(
    () =>
      [...recentTodos]
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1
          return 0
        })
        .slice(0, 8),
    [recentTodos],
  )
  const pendingTodosPreview = useMemo(
    () => (isAdmin ? pendingTodosOnly : pendingTodosOnly.slice(0, 8)),
    [isAdmin, pendingTodosOnly],
  )

  const maxTodoBar = Math.max(1, todosCreated, todosCompleted)
  const indicatorsPath = buildWorkspacePath(currentWorkspace?.slug, '/indicadores')
  const projectsPath = buildWorkspacePath(currentWorkspace?.slug, '/desenvolvimentos')
  const activitiesPath = buildWorkspacePath(currentWorkspace?.slug, '/atividades')

  const metrics: DashboardMetricCardProps[] = [
        {
          label: 'Projetos',
          value: isAdmin ? (team?.total_projects ?? 0) : topProjects.length,
          icon: Folder,
          iconColor: theme.palette.primary.main,
          iconBg: isLight ? 'rgba(37,99,235,0.1)' : 'rgba(96,165,250,0.15)',
          caption: isAdmin ? 'Cadastrados no sistema' : 'Com to-dos atribuídos a você',
        },
        {
          label: isAdmin ? 'Atividades em aberto' : 'Minhas atividades',
          value: isAdmin ? activitiesOpen.length : activitiesAssigned,
          icon: ClipboardList,
          iconColor: isLight ? '#D97706' : '#FBBF24',
          iconBg: isLight ? 'rgba(217,119,6,0.1)' : 'rgba(251,191,36,0.12)',
          caption: isAdmin ? `${team?.total_activities ?? 0} no total` : `${activitiesAssigned} atribuídas`,
        },
        {
          label: isAdmin ? 'Comentários' : 'Meus comentários',
          value: comments,
          icon: MessageCircleIcon,
          iconColor: isLight ? '#7C3AED' : '#A78BFA',
          iconBg: isLight ? 'rgba(124,58,237,0.1)' : 'rgba(167,139,250,0.12)',
        },
        {
          label: isAdmin ? 'TO-DOs concluídos' : 'Meus TO-DOs concluídos',
          value: todosCompleted,
          icon: CheckCircle,
          iconColor: isLight ? '#059669' : '#34D399',
          iconBg: isLight ? 'rgba(5,150,105,0.1)' : 'rgba(52,211,153,0.12)',
          caption:
            todosCreated > 0
              ? `${todosPending} pendentes · ${todosCreated} criados${
                  completionRatePct != null ? ` · ${completionRatePct}% concluídos` : ''
                }`
              : undefined,
        },
      ]

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 0.25 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAdmin
              ? 'Indicadores do time em tempo real — mesma base da página Indicadores'
              : 'Seus indicadores em tempo real'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Atualizar dados">
            <span>
              <IconButton
                onClick={() => void refresh()}
                disabled={loading}
                color="primary"
                aria-label="Atualizar indicadores"
              >
                <RefreshCw size={20} style={{ opacity: loading ? 0.5 : 1 }} />
              </IconButton>
            </span>
          </Tooltip>
            <Button
              component={RouterLink}
              to={indicatorsPath}
              variant="outlined"
              size="small"
              startIcon={<BarChart2 size={18} />}
          >
            Ver indicadores completos
          </Button>
        </Box>
      </Box>

      {/* Banner de TO-DOs pendentes */}
      {pendingCount != null && pendingCount > 0 && (
        <Alert
          severity="info"
          icon={<CheckCircle fontSize="inherit" />}
          sx={{ mb: 2.5, borderRadius: 2, fontWeight: 500 }}
        >
          Você tem <strong>{pendingCount} TO-DO{pendingCount > 1 ? 's' : ''}</strong> pendente{pendingCount > 1 ? 's' : ''} atribuído{pendingCount > 1 ? 's' : ''} a você.
        </Alert>
      )}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => void refresh()}>
          {error}
        </Alert>
      ) : null}

      {loading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, mb: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: 2.5,
              mb: 3,
            }}
          >
            {metrics.map((m) => (
              <DashboardMetricCard key={m.label} {...m} />
            ))}
          </Box>

          {(todosCreated > 0 || todosCompleted > 0) ? (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
                {isAdmin ? 'TO-DOs do time' : 'Meus TO-DOs'}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <DashboardBarRow label={isAdmin ? 'Criados' : 'Atribuídos'} value={todosCreated} max={maxTodoBar} color="primary.main" />
                <DashboardBarRow label="Concluídos" value={todosCompleted} max={maxTodoBar} color="success.main" />
              </Box>
            </Paper>
          ) : null}

          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={600}>
                TO-DOs pendentes
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isAdmin ? `Total de ${pendingTodosPreview.length} item(ns)` : 'Em linha, até 8 itens'}
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ ...cell, fontWeight: 600 }}>TO-DO</TableCell>
                    <TableCell sx={{ ...cell, fontWeight: 600 }}>Projeto</TableCell>
                    {isAdmin && <TableCell sx={{ ...cell, fontWeight: 600 }}>Responsável</TableCell>}
                    <TableCell sx={{ ...cell, fontWeight: 600 }}>Prazo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingTodosPreview.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 4 : 3} sx={cell}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhum TO-DO pendente.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingTodosPreview.map((todo) => (
                      <TableRow key={todo.id} hover>
                        <TableCell sx={cell}>
                          <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 320 }}>
                            {todo.title}
                          </Typography>
                        </TableCell>
                        <TableCell sx={cell}>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
                            {todo.projectName ?? '—'}
                          </Typography>
                        </TableCell>
                        {isAdmin && (
                          <TableCell sx={cell}>
                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
                              {todo.assigneeName ?? '—'}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell sx={cell}>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {formatDatePtBr(todo.deadline, 'Sem prazo')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              gap: 2.5,
              mb: 3,
            }}
          >
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Projetos com mais TO-DOs
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Top 5 por quantidade de itens
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ ...cell, fontWeight: 600 }}>Projeto</TableCell>
                      <TableCell sx={{ ...cell, fontWeight: 600 }}>Status</TableCell>
                      <TableCell align="right" sx={{ ...cell, fontWeight: 600 }}>
                        TO-DOs
                      </TableCell>
                      <TableCell align="right" sx={{ ...cell, fontWeight: 600 }}>
                        Ok
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} sx={cell}>
                          <Typography variant="body2" color="text.secondary">
                            Nenhum projeto cadastrado.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      topProjects.map((p: ProjectIndicator) => (
                        <TableRow key={p.project_id} hover>
                          <TableCell sx={cell}>
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 200 }}>
                              {p.project_name}
                            </Typography>
                          </TableCell>
                          <TableCell sx={cell}>
                            <DashboardStatusChip status={p.project_status} />
                          </TableCell>
                          <TableCell align="right" sx={cell}>
                            {p.todos_count}
                          </TableCell>
                          <TableCell align="right" sx={{ ...cell, color: 'success.main', fontWeight: 600 }}>
                            {p.todos_completed}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {isAdmin ? 'Últimos TO-DOs do time' : 'Últimos TO-DOs'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isAdmin ? 'Últimos 8 itens do time' : 'Até 8 itens'}
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ ...cell, fontWeight: 600 }}>TO-DO</TableCell>
                    {isAdmin && <TableCell sx={{ ...cell, fontWeight: 600 }}>Responsável</TableCell>}
                      <TableCell sx={{ ...cell, fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ ...cell, fontWeight: 600 }}>Projeto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTodosPreview.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 4 : 3} sx={cell}>
                          <Typography variant="body2" color="text.secondary">
                            Nenhum TO-DO recente.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentTodosPreview.map((todo) => (
                        <TableRow key={todo.id} hover>
                          <TableCell sx={cell}>
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 180 }}>
                              {todo.title}
                            </Typography>
                          </TableCell>
                          {isAdmin && (
                            <TableCell sx={cell}>
                              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 160 }}>
                                {todo.assigneeName ?? '—'}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell sx={cell}>
                            <DashboardStatusChip status={todo.completed ? 'done' : 'in_progress'} />
                          </TableCell>
                          <TableCell sx={cell}>
                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 140 }}>
                              {todo.projectName ?? '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Button component={RouterLink} to={projectsPath} variant="text" size="small" startIcon={<Folder size={18} />}>
              Desenvolvimentos
            </Button>
            <Button component={RouterLink} to={activitiesPath} variant="text" size="small" startIcon={<CheckSquare size={18} />}>
              Atividades
            </Button>
          </Box>
        </>
      )}
    </Box>
  )
}
