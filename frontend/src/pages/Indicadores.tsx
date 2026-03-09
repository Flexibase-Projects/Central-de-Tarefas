import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material'
import {
  People,
  Comment,
  CheckCircle,
  List,
  Folder,
  Assignment,
} from '@mui/icons-material'
import { useIndicators } from '@/hooks/use-indicators'
import type { UserIndicator, ProjectIndicator, ActivityIndicator } from '@/types'
import { useMemo } from 'react'

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em progresso',
  review: 'Revisão',
  done: 'Concluído',
}

const tableCellCompact = { py: 0.6, px: 1.5, fontSize: '0.8125rem' } as const

function StatusChip({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const color =
    status === 'done'
      ? 'success'
      : status === 'in_progress' || status === 'review'
        ? 'primary'
        : 'default'
  return <Chip size="small" label={label} color={color} variant="outlined" sx={{ height: 22 }} />
}

/** Gráfico de barra horizontal (CSS puro). */
function BarChartRow({
  label,
  value,
  max,
  color = 'primary.main',
  showValue = true,
}: {
  label: string
  value: number
  max: number
  color?: string
  showValue?: boolean
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Typography variant="caption" sx={{ flexShrink: 0, width: 100, color: 'text.secondary' }} noWrap>
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0, height: 8, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden' }}>
        <Box
          sx={{
            height: '100%',
            width: `${pct}%`,
            bgcolor: color,
            borderRadius: 1,
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
      {showValue && (
        <Typography variant="caption" fontWeight={600} sx={{ flexShrink: 0, minWidth: 24, textAlign: 'right' }}>
          {value}
        </Typography>
      )}
    </Box>
  )
}

export default function Indicadores() {
  const { data, loading, error } = useIndicators()

  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    data?.by_user?.forEach((u) => map.set(u.user_id, u.name))
    return map
  }, [data?.by_user])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  if (!data) {
    return null
  }

  const { team, by_user, by_project, by_activity } = data
  const maxTodosUser = Math.max(1, ...by_user.map((u) => u.todos_created + u.todos_completed))
  const maxTodosProject = Math.max(1, ...by_project.map((p) => p.todos_count))

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2.5 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Indicadores do time
      </Typography>

      {/* Cards + gráfico resumo */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.5, mb: 3 }}>
        <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <People color="primary" sx={{ fontSize: 18 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Usuários
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {team.total_users}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <Folder color="primary" sx={{ fontSize: 18 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Projetos
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {team.total_projects}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <Assignment color="primary" sx={{ fontSize: 18 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Atividades
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {team.total_activities}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <Comment color="primary" sx={{ fontSize: 18 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Comentários
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {team.total_comments}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <List color="primary" sx={{ fontSize: 18 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                TO-DOs criados
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {team.total_todos_created}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ bgcolor: 'success.main', color: 'success.contrastText', borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <CheckCircle sx={{ fontSize: 18 }} />
              <Typography variant="caption" sx={{ opacity: 0.95 }} fontWeight={600}>
                TO-DOs concluídos
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {team.total_todos_completed}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Gráfico: TO-DOs criados vs concluídos */}
      {(team.total_todos_created > 0 || team.total_todos_completed > 0) && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
            TO-DOs do time
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <BarChartRow
              label="Criados"
              value={team.total_todos_created}
              max={Math.max(team.total_todos_created, team.total_todos_completed, 1)}
              color="primary.main"
            />
            <BarChartRow
              label="Concluídos"
              value={team.total_todos_completed}
              max={Math.max(team.total_todos_created, team.total_todos_completed, 1)}
              color="success.main"
            />
          </Box>
        </Paper>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Por usuário */}
      <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ mb: 1.5 }}>
        Por usuário
      </Typography>
      <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover', '& .MuiTableCell-head': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600 }}>Usuário</TableCell>
                <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600 }}>Coment.</TableCell>
                <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600 }}>TO-DOs criados</TableCell>
                <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600 }}>TO-DOs concl.</TableCell>
                <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600 }}>Ativ. criadas</TableCell>
                <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600 }}>Ativ. atrib.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {by_user.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ ...tableCellCompact, py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhum usuário com acesso ao sistema.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                by_user.map((u: UserIndicator, idx: number) => (
                  <TableRow key={u.user_id} hover sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                    <TableCell sx={tableCellCompact}>
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                        {u.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }} display="block">
                        {u.email}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={tableCellCompact}>{u.comments_count}</TableCell>
                    <TableCell align="right" sx={tableCellCompact}>{u.todos_created}</TableCell>
                    <TableCell align="right" sx={tableCellCompact}>
                      <Typography component="span" color="success.main" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                        {u.todos_completed}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={tableCellCompact}>{u.activities_created}</TableCell>
                    <TableCell align="right" sx={tableCellCompact}>{u.activities_assigned}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        {by_user.length > 0 && (
          <Box sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
              TO-DOs criados por usuário
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {by_user.slice(0, 8).map((u) => (
                <BarChartRow
                  key={u.user_id}
                  label={u.name}
                  value={u.todos_created + u.todos_completed}
                  max={maxTodosUser}
                  color="primary.main"
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* Por projeto */}
      <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ mb: 1.5 }}>
        Por projeto
      </Typography>
      <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover', '& .MuiTableCell-head': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600 }}>Projeto</TableCell>
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600 }}>Status</TableCell>
                <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600 }}>TO-DOs</TableCell>
                <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600 }}>Concluídos</TableCell>
                <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600 }}>Coment.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {by_project.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ ...tableCellCompact, py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhum projeto cadastrado.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                by_project.map((p: ProjectIndicator, idx: number) => (
                  <TableRow key={p.project_id} hover sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                    <TableCell sx={tableCellCompact}>
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                        {p.project_name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={tableCellCompact}><StatusChip status={p.project_status} /></TableCell>
                    <TableCell align="right" sx={tableCellCompact}>{p.todos_count}</TableCell>
                    <TableCell align="right" sx={tableCellCompact}>
                      <Typography component="span" color="success.main" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                        {p.todos_completed}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={tableCellCompact}>{p.comments_count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        {by_project.length > 0 && (
          <Box sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
              TO-DOs por projeto
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {by_project.slice(0, 10).map((p) => (
                <BarChartRow
                  key={p.project_id}
                  label={p.project_name}
                  value={p.todos_count}
                  max={maxTodosProject}
                  color="primary.main"
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* Atividades */}
      <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ mb: 1.5 }}>
        Atividades
      </Typography>
      <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover', '& .MuiTableCell-head': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600 }}>Atividade</TableCell>
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600 }}>Atribuído a</TableCell>
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600 }}>Prazo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {by_activity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ ...tableCellCompact, py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma atividade cadastrada.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                by_activity.map((a: ActivityIndicator, idx: number) => (
                  <TableRow key={a.activity_id} hover sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                    <TableCell sx={tableCellCompact}>
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                        {a.activity_name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={tableCellCompact}><StatusChip status={a.status} /></TableCell>
                    <TableCell sx={tableCellCompact}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                        {a.assigned_to ? userNameById.get(a.assigned_to) ?? '—' : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={tableCellCompact}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                        {a.due_date ? new Date(a.due_date).toLocaleDateString('pt-BR') : '—'}
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
  )
}
