import { useEffect, useMemo, useState, type MouseEvent } from 'react'
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
  Alert,
  Chip,
  Divider,
  TablePagination,
} from '@/compat/mui/material'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  People,
  MessageCircleIcon,
  CheckCircle,
  List,
  Folder,
  ClipboardList,
} from '@/components/ui/icons'
import { useIndicators, type RecentAssignedTodo } from '@/hooks/use-indicators'
import { useAuth } from '@/contexts/AuthContext'
import { formatDatePtBr } from '@/lib/date-only'
import { PageSyncScreen, WorkspaceSyncBanner } from '@/components/system/WorkspaceSyncFeedback'

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em progresso',
  review: 'Revisão',
  done: 'Concluído',
}

const tableCellCompact = { py: 0.4, px: 1.25, fontSize: '0.8125rem' } as const

/** Chip de status em linhas de tabela (uma linha, altura baixa). */
const todoChipTableSx = {
  height: 22,
  maxHeight: 22,
  '& .MuiChip-label': {
    px: 0.75,
    py: 0,
    lineHeight: '20px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
} as const

const ellipsisOneLine = {
  fontSize: '0.8125rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  display: 'block',
  minWidth: 0,
  maxWidth: '100%',
  lineHeight: 1.25,
} as const

function StatusChip({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const color =
    status === 'done'
      ? 'success'
      : status === 'in_progress' || status === 'review'
        ? 'primary'
        : 'default'
  return (
    <Chip size="small" label={label} color={color} variant="outlined" sx={todoChipTableSx} />
  )
}

function TodoStatusChip({ completed }: { completed: boolean }) {
  return (
    <Chip
      size="small"
      label={completed ? 'Concluído' : 'Pendente'}
      color={completed ? 'success' : 'default'}
      variant={completed ? 'filled' : 'outlined'}
      sx={todoChipTableSx}
    />
  )
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
      <Typography
        variant="caption"
        sx={{ flexShrink: 0, minWidth: 100, maxWidth: 220, color: 'text.secondary', whiteSpace: 'normal', lineHeight: 1.35 }}
      >
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

function formatDate(value: string | null) {
  return formatDatePtBr(value, '—')
}

function getTodoScopeLabel(todo: RecentAssignedTodo) {
  if (todo.activityName) return `Atividade · ${todo.activityName}`
  if (todo.projectName) return `Projeto · ${todo.projectName}`
  return '—'
}

/** Titulos curtos: uma linha com ellipsis, sem botao. Titulos longos: chevron para expandir. */
const TODO_TITLE_EXPAND_THRESHOLD = 56

function TodoTitleCell({
  rowId,
  title,
  expandedRows,
  onToggle,
  expandThreshold = TODO_TITLE_EXPAND_THRESHOLD,
}: {
  rowId: string
  title: string
  expandedRows: Set<string>
  onToggle: (rowId: string) => void
  expandThreshold?: number
}) {
  const expandable = title.length > expandThreshold
  const expanded = expandedRows.has(rowId)

  if (!expandable) {
    return (
      <Typography
        className="todo-link"
        variant="body2"
        fontWeight={500}
        sx={{
          ...ellipsisOneLine,
          fontWeight: 500,
        }}
      >
        {title}
      </Typography>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: expanded ? 'flex-start' : 'center', gap: 0.5, minWidth: 0, width: '100%' }}>
      <Box
        component="button"
        type="button"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation()
          onToggle(rowId)
        }}
        aria-label={expanded ? 'Recolher detalhes do to-do' : 'Expandir detalhes do to-do'}
        sx={{
          border: 'none',
          background: 'transparent',
          p: 0,
          m: 0,
          width: 20,
          height: 20,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </Box>
      <Typography
        className="todo-link"
        variant="body2"
        fontWeight={500}
        sx={{
          fontSize: '0.8125rem',
          overflow: 'hidden',
          textOverflow: expanded ? 'clip' : 'ellipsis',
          whiteSpace: expanded ? 'normal' : 'nowrap',
          display: 'block',
          minWidth: 0,
          width: '100%',
          lineHeight: 1.35,
          wordBreak: expanded ? 'break-word' : 'normal',
        }}
      >
        {title}
      </Typography>
    </Box>
  )
}

export default function Indicadores() {
  const { data, loading, error, refresh } = useIndicators()
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const isAdmin = hasRole('admin')
  const [pendingTodosPage, setPendingTodosPage] = useState(0)
  const [expandedTodoRows, setExpandedTodoRows] = useState<Set<string>>(new Set())
  const pendingTodosRowsPerPage = 10
  const indicatorsData = data ?? {
    scope: (isAdmin ? 'team' : 'me') as 'team' | 'me',
    team: {
      total_users: 0,
      total_projects: 0,
      total_activities: 0,
      total_comments: 0,
      total_todos_created: 0,
      total_todos_completed: 0,
    },
    personal: {
      commentsCount: 0,
      todosAssignedTotal: 0,
      todosAssignedCompleted: 0,
      todosAssignedOpen: 0,
      activitiesAssigned: 0,
    },
    monthlyActivitySummary: {
      completed: 0,
      pending: 0,
      overdue: 0,
      total: 0,
    },
    recentAssignedTodos: [],
    pendingAssignedTodos: [],
    recentActivities: [],
    by_user: [],
    by_project: [],
    by_activity: [],
  }

  const personal = indicatorsData.personal
  const team = indicatorsData.team
  const byUser = indicatorsData.by_user
  const byProject = indicatorsData.by_project
  const byActivity = indicatorsData.by_activity
  const recentTodos = indicatorsData.recentAssignedTodos
  const pendingTodos = indicatorsData.pendingAssignedTodos
  const recentActivities = indicatorsData.recentActivities

  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    byUser.forEach((u) => map.set(u.user_id, u.name))
    return map
  }, [byUser])

  const todosAssignedTotal = personal?.todosAssignedTotal ?? 0
  const todosAssignedCompleted = personal?.todosAssignedCompleted ?? 0
  const todosAssignedOpen = personal?.todosAssignedOpen ?? Math.max(0, todosAssignedTotal - todosAssignedCompleted)
  const personalComments = personal?.commentsCount ?? 0
  const personalActivities = personal?.activitiesAssigned ?? 0

  const cardTodosCreated = isAdmin ? (team?.total_todos_created ?? 0) : todosAssignedTotal
  const cardTodosCompleted = isAdmin ? (team?.total_todos_completed ?? 0) : todosAssignedCompleted
  const cardComments = isAdmin ? (team?.total_comments ?? 0) : personalComments
  const cardActivities = isAdmin ? (team?.total_activities ?? 0) : personalActivities

  const maxTodosProject = Math.max(1, ...byProject.map((p) => p.todos_count))
  const maxTodosAssigned = Math.max(1, todosAssignedTotal, todosAssignedCompleted)
  const sortedPendingTodos = useMemo(() => {
    return [...pendingTodos].sort((a, b) => {
      const aHasDeadline = Boolean(a.deadline)
      const bHasDeadline = Boolean(b.deadline)
      if (aHasDeadline && bHasDeadline) return new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime()
      if (aHasDeadline) return -1
      if (bHasDeadline) return 1
      return new Date(b.assignedAt ?? 0).getTime() - new Date(a.assignedAt ?? 0).getTime()
    })
  }, [pendingTodos])
  const paginatedPendingTodos = sortedPendingTodos.slice(
    pendingTodosPage * pendingTodosRowsPerPage,
    pendingTodosPage * pendingTodosRowsPerPage + pendingTodosRowsPerPage,
  )

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedPendingTodos.length / pendingTodosRowsPerPage) - 1)
    if (pendingTodosPage > maxPage) {
      setPendingTodosPage(maxPage)
    }
  }, [pendingTodosPage, pendingTodosRowsPerPage, sortedPendingTodos.length])

  const handlePendingTodoClick = (todo: RecentAssignedTodo) => {
    if (todo.activityId) {
      navigate(`/atividades?activity=${encodeURIComponent(todo.activityId)}&todo=${encodeURIComponent(todo.id)}`)
      return
    }
    if (todo.projectId) {
      navigate(`/desenvolvimentos?project=${encodeURIComponent(todo.projectId)}&todo=${encodeURIComponent(todo.id)}`)
      return
    }
    navigate(`/atividades?todo=${encodeURIComponent(todo.id)}`)
  }

  const toggleExpandedTodoRow = (rowId: string) => {
    setExpandedTodoRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', p: 2.5, pb: 4, boxSizing: 'border-box' }}>
      <WorkspaceSyncBanner
        active={loading}
        title="Atualizando os indicadores"
        description="Os dados atuais continuam visiveis enquanto sincronizamos os totais, rankings e tabelas desta leitura."
      />

      {!data && loading ? (
        <PageSyncScreen
          title="Sincronizando indicadores"
          description="Estamos consolidando os numeros do workspace para voce analisar time, projetos e atividades com contexto atualizado."
          minHeight={220}
        />
      ) : null}

      {error ? (
        <Alert severity="warning" onClose={() => void refresh()} sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        {isAdmin ? 'Indicadores do time' : 'Meus indicadores'}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr 1fr',
            sm: 'repeat(3, 1fr)',
            md: isAdmin ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)',
          },
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
                {team?.total_users ?? 0}
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
              {isAdmin ? (team?.total_projects ?? 0) : byProject.length}
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

        <Card
          variant="outlined"
          sx={{
            bgcolor: isAdmin ? 'background.paper' : 'rgba(37,99,235,0.06)',
            borderRadius: 2,
            borderColor: isAdmin ? 'divider' : 'primary.light',
          }}
        >
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <List size={18} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {isAdmin ? 'TO-DOs criados' : 'TO-DOs atribuídos'}
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {cardTodosCreated}
            </Typography>
            {!isAdmin && (
              <Typography variant="caption" color="text.secondary">
                {todosAssignedOpen} pendentes
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ bgcolor: 'success.main', color: 'success.contrastText', borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <CheckCircle size={18} />
              <Typography variant="caption" sx={{ opacity: 0.95 }} fontWeight={600}>
                {isAdmin ? 'TO-DOs concluídos' : 'TO-DOs concluídos'}
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {cardTodosCompleted}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {(cardTodosCreated > 0 || cardTodosCompleted > 0) && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
            {isAdmin ? 'TO-DOs do time' : 'Meus TO-DOs'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <BarChartRow
              label={isAdmin ? 'Criados' : 'Atribuídos'}
              value={cardTodosCreated}
              max={maxTodosAssigned}
              color="primary.main"
            />
            <BarChartRow
              label="Concluídos"
              value={cardTodosCompleted}
              max={maxTodosAssigned}
              color="success.main"
            />
          </Box>
        </Paper>
      )}

      {isAdmin && (
        <>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ mb: 1.5 }}>
            TO-DOs pendentes do time
          </Typography>
          <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%', minWidth: 720 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover', '& .MuiTableCell-head': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: '28%', minWidth: 140 }}>TO-DO</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: '22%', minWidth: 100 }}>Origem</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: '18%', minWidth: 88 }}>Responsável</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: 100, whiteSpace: 'nowrap' }}>Status</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: 96, whiteSpace: 'nowrap' }}>Prazo</TableCell>
                    <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600, width: 48 }}>XP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedPendingTodos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ ...tableCellCompact, py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhum to-do pendente no time.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPendingTodos.map((todo: RecentAssignedTodo, idx: number) => {
                      const rowId = `admin-pending-${todo.id}`
                      return (
                        <TableRow
                          key={rowId}
                          hover
                          onClick={() => handlePendingTodoClick(todo)}
                          sx={{
                            bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover',
                            cursor: 'pointer',
                            '&:hover .todo-link': { textDecoration: 'underline' },
                          }}
                        >
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', maxWidth: 0 }}>
                            <TodoTitleCell rowId={rowId} title={todo.title} expandedRows={expandedTodoRows} onToggle={toggleExpandedTodoRow} />
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', maxWidth: 0 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              title={getTodoScopeLabel(todo)}
                              sx={ellipsisOneLine}
                            >
                              {getTodoScopeLabel(todo)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', maxWidth: 0 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              title={todo.assigneeName ?? '—'}
                              sx={ellipsisOneLine}
                            >
                              {todo.assigneeName ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', width: 100 }}>
                            <TodoStatusChip completed={todo.completed} />
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                              {formatDate(todo.deadline)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ ...tableCellCompact, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <Typography component="span" color="primary.main" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                              {todo.xpReward}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {sortedPendingTodos.length > pendingTodosRowsPerPage && (
              <TablePagination
                component="div"
                count={sortedPendingTodos.length}
                page={pendingTodosPage}
                onPageChange={(_, nextPage) => setPendingTodosPage(nextPage)}
                rowsPerPage={pendingTodosRowsPerPage}
                rowsPerPageOptions={[pendingTodosRowsPerPage]}
                labelRowsPerPage=""
              />
            )}
          </Paper>
        </>
      )}

      <Divider sx={{ my: 2 }} />

      {isAdmin ? (
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
                  {byUser.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ ...tableCellCompact, py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhum usuário com acesso ao sistema.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    byUser.map((u, idx) => (
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
            {byUser.length > 0 && (
              <Box sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
                  TO-DOs criados por usuário
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {byUser.slice(0, 8).map((u) => (
                    <BarChartRow
                      key={u.user_id}
                      label={u.name}
                      value={u.todos_created + u.todos_completed}
                      max={Math.max(1, ...byUser.map((item) => item.todos_created + item.todos_completed))}
                      color="primary.main"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
          <Divider sx={{ my: 2 }} />
        </>
      ) : (
        <>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ mb: 1.5 }}>
            TO-DOs pendentes atribuídos
          </Typography>
          <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%', minWidth: 560 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover', '& .MuiTableCell-head': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: '38%', minWidth: 140 }}>TO-DO</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: '32%', minWidth: 100 }}>Origem</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: 100, whiteSpace: 'nowrap' }}>Status</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: 96, whiteSpace: 'nowrap' }}>Prazo</TableCell>
                    <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600, width: 48 }}>XP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedPendingTodos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ ...tableCellCompact, py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhum to-do pendente atribuído a você.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPendingTodos.map((todo: RecentAssignedTodo, idx: number) => {
                      const rowId = `pending-${todo.id}`
                      return (
                        <TableRow
                          key={rowId}
                          hover
                          onClick={() => handlePendingTodoClick(todo)}
                          sx={{
                            bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover',
                            cursor: 'pointer',
                            '&:hover .todo-link': { textDecoration: 'underline' },
                          }}
                        >
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', maxWidth: 0 }}>
                            <TodoTitleCell rowId={rowId} title={todo.title} expandedRows={expandedTodoRows} onToggle={toggleExpandedTodoRow} />
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', maxWidth: 0 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              title={getTodoScopeLabel(todo)}
                              sx={ellipsisOneLine}
                            >
                              {getTodoScopeLabel(todo)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', width: 100 }}>
                            <TodoStatusChip completed={todo.completed} />
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                              {formatDate(todo.deadline)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ ...tableCellCompact, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <Typography component="span" color="primary.main" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                              {todo.xpReward}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {sortedPendingTodos.length > pendingTodosRowsPerPage && (
              <TablePagination
                component="div"
                count={sortedPendingTodos.length}
                page={pendingTodosPage}
                onPageChange={(_, nextPage) => setPendingTodosPage(nextPage)}
                rowsPerPage={pendingTodosRowsPerPage}
                rowsPerPageOptions={[pendingTodosRowsPerPage]}
                labelRowsPerPage=""
              />
            )}
          </Paper>

          <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ mb: 1.5 }}>
            Últimos to-dos atribuídos
          </Typography>
          <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%', minWidth: 520 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover', '& .MuiTableCell-head': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: '40%', minWidth: 140 }}>TO-DO</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: '34%', minWidth: 100 }}>Origem</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: 100, whiteSpace: 'nowrap' }}>Status</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: 96, whiteSpace: 'nowrap' }}>Prazo</TableCell>
                    <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600, width: 48 }}>XP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTodos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ ...tableCellCompact, py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhum to-do foi atribuído a você ainda.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentTodos.map((todo: RecentAssignedTodo, idx: number) => {
                      const rowId = `recent-${todo.id}`
                      return (
                        <TableRow
                          key={todo.id}
                          hover
                          onClick={() => handlePendingTodoClick(todo)}
                          sx={{
                            bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover',
                            cursor: 'pointer',
                            '&:hover .todo-link': { textDecoration: 'underline' },
                          }}
                        >
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', maxWidth: 0 }}>
                            <TodoTitleCell
                              rowId={rowId}
                              title={todo.title}
                              expandedRows={expandedTodoRows}
                              onToggle={toggleExpandedTodoRow}
                            />
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', maxWidth: 0 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              title={getTodoScopeLabel(todo)}
                              sx={ellipsisOneLine}
                            >
                              {getTodoScopeLabel(todo)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', width: 100 }}>
                            <TodoStatusChip completed={todo.completed} />
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                              {formatDate(todo.deadline)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ ...tableCellCompact, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <Typography component="span" color="primary.main" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                              {todo.xpReward}
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
          <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ mb: 1.5 }}>
            Minhas atividades recentes
          </Typography>
          <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader sx={{ tableLayout: 'auto', width: '100%', minWidth: 560 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover', '& .MuiTableCell-head': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, minWidth: 200 }}>Atividade</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, minWidth: 128, whiteSpace: 'nowrap' }}>Status</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, minWidth: 104, whiteSpace: 'nowrap' }}>Prazo</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, minWidth: 112, whiteSpace: 'nowrap' }}>Atualizada em</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ ...tableCellCompact, py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma atividade atribuída a você.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentActivities.map((activity, idx) => (
                      <TableRow key={activity.id} hover sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                        <TableCell sx={tableCellCompact}>
                          <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                            {activity.name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle' }}>
                          <StatusChip status={activity.status} />
                        </TableCell>
                        <TableCell sx={tableCellCompact}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                            {formatDate(activity.dueDate)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={tableCellCompact}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                            {formatDate(activity.updatedAt)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ mb: 1.5 }}>
        Por projeto
      </Typography>
      <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" stickyHeader sx={{ tableLayout: 'auto', width: '100%', minWidth: 520 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover', '& .MuiTableCell-head': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600, minWidth: 180 }}>Projeto</TableCell>
                <TableCell sx={{ ...tableCellCompact, fontWeight: 600, minWidth: 128, whiteSpace: 'nowrap' }}>Status</TableCell>
                <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600 }}>TO-DOs</TableCell>
                <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600 }}>Concluídos</TableCell>
                <TableCell align="right" sx={{ ...tableCellCompact, fontWeight: 600 }}>Coment.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byProject.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ ...tableCellCompact, py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {isAdmin ? 'Nenhum projeto cadastrado.' : 'Nenhum projeto com to-dos atribuídos.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                byProject.map((p, idx) => (
                  <TableRow key={p.project_id} hover sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                    <TableCell sx={tableCellCompact}>
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                        {p.project_name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle' }}>
                      <StatusChip status={p.project_status} />
                    </TableCell>
                    <TableCell align="right" sx={tableCellCompact}>
                      {p.todos_count}
                    </TableCell>
                    <TableCell align="right" sx={tableCellCompact}>
                      <Typography component="span" color="success.main" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                        {p.todos_completed}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={tableCellCompact}>
                      {p.comments_count}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        {byProject.length > 0 && (
          <Box sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
              TO-DOs por projeto
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {byProject.slice(0, 10).map((p) => (
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

      {isAdmin && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ mb: 1.5 }}>
            Atividades
          </Typography>
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%', minWidth: 520 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover', '& .MuiTableCell-head': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: '36%', minWidth: 120 }}>Atividade</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: 120, whiteSpace: 'nowrap' }}>Status</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: '28%', minWidth: 100 }}>Atribuído a</TableCell>
                    <TableCell sx={{ ...tableCellCompact, fontWeight: 600, width: 104, whiteSpace: 'nowrap' }}>Prazo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {byActivity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ ...tableCellCompact, py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma atividade cadastrada.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    byActivity.map((a, idx) => {
                      const assigneeLabel = a.assigned_to ? userNameById.get(a.assigned_to) ?? '—' : '—'
                      return (
                        <TableRow key={a.activity_id} hover sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', maxWidth: 0 }}>
                            <Typography variant="body2" fontWeight={500} title={a.activity_name} sx={ellipsisOneLine}>
                              {a.activity_name}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle' }}>
                            <StatusChip status={a.status} />
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', maxWidth: 0 }}>
                            <Typography variant="body2" color="text.secondary" title={assigneeLabel} sx={ellipsisOneLine}>
                              {assigneeLabel}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ ...tableCellCompact, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                              {formatDatePtBr(a.due_date, '—')}
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
        </>
      )}
    </Box>
  )
}
