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
  MessageCircleIcon,
  CheckCircle,
  List,
  Folder,
  ClipboardList,
} from '@/components/ui/icons'
import { useIndicators } from '@/hooks/use-indicators'
import { useAuth } from '@/contexts/AuthContext'
import type { ProjectIndicator, ActivityIndicator } from '@/types'
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
  const { currentUser, hasRole } = useAuth()
  const isAdmin = hasRole('admin')

  // Dados do próprio usuário
  const myIndicators = useMemo(
    () => data?.by_user?.find((u) => u.user_id === currentUser?.id) ?? null,
    [data?.by_user, currentUser?.id],
  )

  // Atividades filtradas: admin vê todas; usuário vê só as suas
  const visibleActivities = useMemo(() => {
    const list = data?.by_activity ?? []
    return isAdmin ? list : list.filter((a) => a.assigned_to === currentUser?.id)
  }, [data?.by_activity, isAdmin, currentUser?.id])

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

  const { team, by_user, by_project } = data

  // Totais para os cards: admin usa time; usuário usa os seus
  const myTodosCreated = myIndicators?.todos_created ?? 0
  const myTodosCompleted = myIndicators?.todos_completed ?? 0
  const myComments = myIndicators?.comments_count ?? 0
  const myActivitiesAssigned = myIndicators?.activities_assigned ?? 0

  const cardTodosCreated = isAdmin ? team.total_todos_created : myTodosCreated
  const cardTodosCompleted = isAdmin ? team.total_todos_completed : myTodosCompleted
  const cardComments = isAdmin ? team.total_comments : myComments
  const cardActivities = isAdmin ? team.total_activities : myActivitiesAssigned

  const maxTodosProject = Math.max(1, ...by_project.map((p) => p.todos_count))
  const maxTodosUser = Math.max(1, ...by_user.map((u) => u.todos_created + u.todos_completed))

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2.5 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        {isAdmin ? 'Indicadores do time' : 'Meus indicadores'}
      </Typography>

      {/* Cards resumo */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: isAdmin ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)' },
          gap: 1.5,
          mb: 3,
        }}
      >
        {isAdmin && (
          <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                <People size={18} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Usuários
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700}>
                {team.total_users}
              </Typography>
            </CardContent>
          </Card>
        )}
        <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <Folder size={18} />
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
              <ClipboardList size={18} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {isAdmin ? 'Atividades' : 'Minhas atividades'}
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {cardActivities}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <MessageCircleIcon size={18} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {isAdmin ? 'Comentários' : 'Meus comentários'}
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {cardComments}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <List size={18} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                TO-DOs criados
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {cardTodosCreated}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ bgcolor: 'success.main', color: 'success.contrastText', borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <CheckCircle size={18} />
              <Typography variant="caption" sx={{ opacity: 0.95 }} fontWeight={600}>
                TO-DOs concluídos
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {cardTodosCompleted}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Gráfico: TO-DOs criados vs concluídos */}
      {(cardTodosCreated > 0 || cardTodosCompleted > 0) && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
            {isAdmin ? 'TO-DOs do time' : 'Meus TO-DOs'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <BarChartRow
              label="Criados"
              value={cardTodosCreated}
              max={Math.max(cardTodosCreated, cardTodosCompleted, 1)}
              color="primary.main"
            />
            <BarChartRow
              label="Concluídos"
              value={cardTodosCompleted}
              max={Math.max(cardTodosCreated, cardTodosCompleted, 1)}
              color="success.main"
            />
          </Box>
        </Paper>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Por usuário — apenas admin */}
      {isAdmin && (
        <>
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
                    by_user.map((u, idx) => (
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
        </>
      )}

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
        {isAdmin ? 'Atividades' : 'Minhas atividades'}
      </Typography>
      <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover', '& .MuiTableCell-head': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600 }}>Atividade</TableCell>
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600 }}>Status</TableCell>
                {isAdmin && (
                  <TableCell sx={{ ...tableCellCompact, fontWeight: 600 }}>Atribuído a</TableCell>
                )}
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600 }}>Prazo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} align="center" sx={{ ...tableCellCompact, py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {isAdmin ? 'Nenhuma atividade cadastrada.' : 'Você não tem atividades atribuídas.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visibleActivities.map((a: ActivityIndicator, idx: number) => {
                  const userNameById = new Map(data.by_user.map((u) => [u.user_id, u.name]))
                  return (
                    <TableRow key={a.activity_id} hover sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                      <TableCell sx={tableCellCompact}>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                          {a.activity_name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={tableCellCompact}><StatusChip status={a.status} /></TableCell>
                      {isAdmin && (
                        <TableCell sx={tableCellCompact}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                            {a.assigned_to ? userNameById.get(a.assigned_to) ?? '—' : '—'}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell sx={tableCellCompact}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                          {a.due_date ? new Date(a.due_date).toLocaleDateString('pt-BR') : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}
