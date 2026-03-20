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
import type { ProjectIndicator, ActivityIndicator } from '@/types'

const cell = dashboardTableCellSx

export default function Dashboard() {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  const { data, loading, error, refresh } = useIndicators()

  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    data?.by_user?.forEach((u) => map.set(u.user_id, u.name))
    return map
  }, [data?.by_user])

  const activitiesOpen = useMemo(
    () => data?.by_activity?.filter((a) => a.status !== 'done').length ?? 0,
    [data?.by_activity]
  )

  const team = data?.team
  const todosPending = team ? Math.max(0, team.total_todos_created - team.total_todos_completed) : 0
  const completionRatePct =
    team && team.total_todos_created > 0
      ? Math.round((team.total_todos_completed / team.total_todos_created) * 100)
      : null

  const topProjects = useMemo(() => {
    const list = data?.by_project ?? []
    return [...list].sort((a, b) => b.todos_count - a.todos_count).slice(0, 5)
  }, [data?.by_project])

  const openActivitiesPreview = useMemo(() => {
    const list = data?.by_activity ?? []
    return list.filter((a) => a.status !== 'done').slice(0, 8)
  }, [data?.by_activity])

  const maxTodoBar = team
    ? Math.max(1, team.total_todos_created, team.total_todos_completed)
    : 1

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
          label: 'Atividades em aberto',
          value: activitiesOpen,
          icon: ClipboardList,
          iconColor: isLight ? '#D97706' : '#FBBF24',
          iconBg: isLight ? 'rgba(217,119,6,0.1)' : 'rgba(251,191,36,0.12)',
          caption: `${team.total_activities} no total`,
        },
        {
          label: 'Comentários',
          value: team.total_comments,
          icon: MessageCircleIcon,
          iconColor: isLight ? '#7C3AED' : '#A78BFA',
          iconBg: isLight ? 'rgba(124,58,237,0.1)' : 'rgba(167,139,250,0.12)',
        },
        {
          label: 'TO-DOs concluídos',
          value: team.total_todos_completed,
          icon: CheckCircle,
          iconColor: isLight ? '#059669' : '#34D399',
          iconBg: isLight ? 'rgba(5,150,105,0.1)' : 'rgba(52,211,153,0.12)',
          caption:
            team.total_todos_created > 0
              ? `${todosPending} pendentes · ${team.total_todos_created} criados${
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
            Indicadores do time em tempo real — mesma base da página Indicadores
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

          {team && (team.total_todos_created > 0 || team.total_todos_completed > 0) ? (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
                TO-DOs do time
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <DashboardBarRow label="Criados" value={team.total_todos_created} max={maxTodoBar} color="primary.main" />
                <DashboardBarRow
                  label="Concluídos"
                  value={team.total_todos_completed}
                  max={maxTodoBar}
                  color="success.main"
                />
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
                  Atividades em aberto
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
                      <TableCell sx={{ ...cell, fontWeight: 600 }}>Responsável</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {openActivitiesPreview.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} sx={cell}>
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
                          <TableCell sx={cell}>
                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 140 }}>
                              {a.assigned_to ? userNameById.get(a.assigned_to) ?? '—' : '—'}
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
