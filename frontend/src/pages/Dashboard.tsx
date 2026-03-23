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
import type { ProjectIndicator, ActivityIndicator } from '@/types'

const cell = dashboardTableCellSx

export default function Dashboard() {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  const { data, loading, error, refresh } = useIndicators()
  const { currentUser, hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const { count: pendingCount } = useMyPendingTodosCount()

  // Dados do próprio usuário na lista by_user
  const myIndicators = useMemo(
    () => data?.by_user?.find((u) => u.user_id === currentUser?.id) ?? null,
    [data?.by_user, currentUser?.id],
  )

  // Mapa id -> nome (usado para exibir responsáveis)
  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    data?.by_user?.forEach((u) => map.set(u.user_id, u.name))
    return map
  }, [data?.by_user])

  // Atividades abertas: admin vê todas; usuário vê só as suas
  const activitiesOpen = useMemo(() => {
    const list = data?.by_activity?.filter((a) => a.status !== 'done') ?? []
    return isAdmin ? list : list.filter((a) => a.assigned_to === currentUser?.id)
  }, [data?.by_activity, isAdmin, currentUser?.id])

  const team = data?.team

  // Totais para os cards: admin usa totais do time; usuário usa seus próprios
  const todosCreated = isAdmin ? (team?.total_todos_created ?? 0) : (myIndicators?.todos_created ?? 0)
  const todosCompleted = isAdmin ? (team?.total_todos_completed ?? 0) : (myIndicators?.todos_completed ?? 0)
  const comments = isAdmin ? (team?.total_comments ?? 0) : (myIndicators?.comments_count ?? 0)
  const todosPending = Math.max(0, todosCreated - todosCompleted)
  const completionRatePct =
    todosCreated > 0 ? Math.round((todosCompleted / todosCreated) * 100) : null

  const topProjects = useMemo(() => {
    const list = data?.by_project ?? []
    return [...list].sort((a, b) => b.todos_count - a.todos_count).slice(0, 5)
  }, [data?.by_project])

  const openActivitiesPreview = useMemo(
    () => activitiesOpen.slice(0, 8),
    [activitiesOpen],
  )

  const maxTodoBar = Math.max(1, todosCreated, todosCompleted)

  const metrics: DashboardMetricCardProps[] = team
    ? [
        {
          label: 'Projetos',
          value: team.total_projects,
          icon: Folder,
          iconColor: theme.palette.primary.main,
          iconBg: isLight ? 'rgba(37,99,235,0.1)' : 'rgba(96,165,250,0.15)',
          caption: 'Cadastrados no sistema',
        },
        {
          label: isAdmin ? 'Atividades em aberto' : 'Minhas atividades abertas',
          value: activitiesOpen.length,
          icon: ClipboardList,
          iconColor: isLight ? '#D97706' : '#FBBF24',
          iconBg: isLight ? 'rgba(217,119,6,0.1)' : 'rgba(251,191,36,0.12)',
          caption: isAdmin ? `${team.total_activities} no total` : `${team.total_activities} no sistema`,
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
    : []

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
            to="/indicadores"
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
                <DashboardBarRow label="Criados" value={todosCreated} max={maxTodoBar} color="primary.main" />
                <DashboardBarRow label="Concluídos" value={todosCompleted} max={maxTodoBar} color="success.main" />
              </Box>
            </Paper>
          ) : null}

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
                  {isAdmin ? 'Atividades em aberto' : 'Minhas atividades em aberto'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Até 8 itens — veja todas em Indicadores
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ ...cell, fontWeight: 600 }}>Atividade</TableCell>
                      <TableCell sx={{ ...cell, fontWeight: 600 }}>Status</TableCell>
                      {isAdmin && (
                        <TableCell sx={{ ...cell, fontWeight: 600 }}>Responsável</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {openActivitiesPreview.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 3 : 2} sx={cell}>
                          <Typography variant="body2" color="text.secondary">
                            Nenhuma atividade pendente.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      openActivitiesPreview.map((a: ActivityIndicator) => (
                        <TableRow key={a.activity_id} hover>
                          <TableCell sx={cell}>
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 180 }}>
                              {a.activity_name}
                            </Typography>
                          </TableCell>
                          <TableCell sx={cell}>
                            <DashboardStatusChip status={a.status} />
                          </TableCell>
                          {isAdmin && (
                            <TableCell sx={cell}>
                              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 140 }}>
                                {a.assigned_to ? userNameById.get(a.assigned_to) ?? '—' : '—'}
                              </Typography>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Button component={RouterLink} to="/desenvolvimentos" variant="text" size="small" startIcon={<Folder size={18} />}>
              Desenvolvimentos
            </Button>
            <Button component={RouterLink} to="/atividades" variant="text" size="small" startIcon={<CheckSquare size={18} />}>
              Atividades
            </Button>
          </Box>
        </>
      )}
    </Box>
  )
}
