import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  CircularProgress,
  Fab,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Search } from 'lucide-react'
import { Plus } from '@/components/ui/icons'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { ActivityCardDialog } from '@/components/kanban/activity-card-dialog'
import { CreateActivityDialog } from '@/components/kanban/create-activity-dialog'
import { useActivities } from '@/hooks/use-activities'
import { useTodoCardSummary } from '@/hooks/use-todo-card-summary'
import { useUsersList } from '@/hooks/use-users-list'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/contexts/AuthContext'
import { Activity, Project, type ExecutionViewMode } from '@/types'
import { useSearchParams } from 'react-router-dom'
import AppSurface from '@/components/system/AppSurface'
import SectionHeader from '@/components/system/SectionHeader'
import StatusToken from '@/components/system/StatusToken'
import { apiUrl } from '@/lib/api'
import { formatDatePtBr, isOverdueDate } from '@/lib/date-only'
import { getPriorityLabel, getStatusLabel } from '@/lib/status-labels'
import {
  normalizeExecutionViewMode,
  readExecutionViewPreference,
  writeExecutionViewPreference,
} from '@/lib/execution-views'

async function findActivityIdByTodo(params: {
  activityIds: string[]
  todoId: string
  getAuthHeaders: () => Record<string, string>
}): Promise<string | null> {
  const { activityIds, todoId, getAuthHeaders } = params
  const results = await Promise.all(
    activityIds.map(async (activityId) => {
      const response = await fetch(apiUrl(`/api/todos/by-activity/${activityId}`), { headers: getAuthHeaders() })
      if (!response.ok) return null
      const todos = await response.json()
      return Array.isArray(todos) && todos.some((todo) => todo?.id === todoId) ? activityId : null
    }),
  )

  return results.find(Boolean) ?? null
}

function matchesDeadlineFilter(
  value: string | null,
  filter: 'all' | 'overdue' | 'next_7d' | 'no_deadline',
) {
  if (filter === 'all') return true
  if (filter === 'no_deadline') return !value
  if (!value) return false

  if (filter === 'overdue') return isOverdueDate(value)

  const today = new Date()
  const dueDate = new Date(value)
  if (Number.isNaN(dueDate.getTime())) return false
  const diff = dueDate.getTime() - today.getTime()
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

export default function Atividades() {
  const { activities, loading, createActivity, updateActivity, moveActivity, deleteActivity } = useActivities()
  const { rows: summaryRows, error: summaryError } = useTodoCardSummary()
  const { users } = useUsersList()
  const { hasRole } = usePermissions()
  const { getAuthHeaders, currentUser, currentWorkspace } = useAuth()
  const isAdmin = hasRole('admin')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false)
  const [highlightedTodoId, setHighlightedTodoId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Activity['status']>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Activity['priority']>('all')
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'overdue' | 'next_7d' | 'no_deadline'>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'unassigned' | string>('all')
  const [onlyMine, setOnlyMine] = useState(!isAdmin)

  const viewPreference = useMemo(
    () =>
      readExecutionViewPreference({
        pageKey: 'activities',
        workspaceSlug: currentWorkspace?.slug,
        userId: currentUser?.id,
      }) ?? 'list',
    [currentUser?.id, currentWorkspace?.slug],
  )
  const activeView: ExecutionViewMode =
    normalizeExecutionViewMode(searchParams.get('view')) ?? viewPreference ?? 'list'

  const summaryByActivityId = useMemo(() => {
    return new Map(
      summaryRows
        .filter((row) => row.entity_type === 'activity')
        .map((row) => [row.project_id, row]),
    )
  }, [summaryRows])

  const userNameById = useMemo(() => {
    return new Map(users.map((user) => [user.id, user.name]))
  }, [users])

  const projectsAsActivities: Project[] = useMemo(
    () =>
      activities.map((activity) => ({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        status: activity.status,
        github_url: null,
        github_owner: null,
        github_repo: null,
        project_url: null,
        cover_image_url: activity.cover_image_url ?? null,
        created_at: activity.created_at,
        updated_at: activity.updated_at,
        created_by: activity.created_by,
      })),
    [activities],
  )

  useEffect(() => {
    const activityId = searchParams.get('activity')
    const todoId = searchParams.get('todo')

    if (activities.length === 0 || isActivityDialogOpen || (!activityId && !todoId)) {
      return
    }

    let cancelled = false

    const cleanDetailParams = () => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('activity')
      nextParams.delete('todo')
      setSearchParams(nextParams, { replace: true })
    }

    const openActivity = (targetActivityId: string | null) => {
      if (!targetActivityId || cancelled) {
        cleanDetailParams()
        return
      }

      const activity = activities.find((item) => item.id === targetActivityId)
      if (activity) {
        setSelectedActivity(activity)
        setIsActivityDialogOpen(true)
        if (todoId) {
          setHighlightedTodoId(todoId)
          window.setTimeout(() => setHighlightedTodoId(null), 3000)
        }
      }
      cleanDetailParams()
    }

    if (activityId) {
      openActivity(activityId)
      return () => {
        cancelled = true
      }
    }

    if (todoId) {
      void findActivityIdByTodo({
        activityIds: activities.map((activity) => activity.id),
        todoId,
        getAuthHeaders,
      }).then((resolvedActivityId) => {
        openActivity(resolvedActivityId)
      }).catch((error) => {
        console.error('Error resolving activity by todo:', error)
        cleanDetailParams()
      })
    }

    return () => {
      cancelled = true
    }
  }, [activities, getAuthHeaders, isActivityDialogOpen, searchParams, setSearchParams])

  const handleViewChange = (_event: React.SyntheticEvent, nextView: ExecutionViewMode) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('view', nextView)
    setSearchParams(nextParams, { replace: true })
    writeExecutionViewPreference(
      {
        pageKey: 'activities',
        workspaceSlug: currentWorkspace?.slug,
        userId: currentUser?.id,
      },
      nextView,
    )
  }

  const filteredActivities = useMemo(() => {
    const query = search.trim().toLowerCase()

    return [...activities]
      .filter((activity) => {
        const summary = summaryByActivityId.get(activity.id)
        const matchesSearch =
          !query ||
          activity.name.toLowerCase().includes(query) ||
          (activity.description ?? '').toLowerCase().includes(query)
        const matchesStatus = statusFilter === 'all' || activity.status === statusFilter
        const matchesPriority = priorityFilter === 'all' || activity.priority === priorityFilter
        const matchesDeadline = matchesDeadlineFilter(activity.due_date, deadlineFilter)
        const matchesAssignee =
          assigneeFilter === 'all' ||
          (assigneeFilter === 'unassigned' ? !activity.assigned_to : activity.assigned_to === assigneeFilter)
        const matchesMine =
          !onlyMine ||
          activity.assigned_to === currentUser?.id ||
          activity.created_by === currentUser?.id ||
          (summary?.myAssignedOpenCount ?? 0) > 0

        return (
          matchesSearch &&
          matchesStatus &&
          matchesPriority &&
          matchesDeadline &&
          matchesAssignee &&
          matchesMine
        )
      })
      .sort((a, b) => {
        const aOverdue = isOverdueDate(a.due_date)
        const bOverdue = isOverdueDate(b.due_date)
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1

        const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
        if (aDue !== bDue) return aDue - bDue

        return a.name.localeCompare(b.name, 'pt-BR')
      })
  }, [activities, currentUser?.id, deadlineFilter, onlyMine, priorityFilter, search, statusFilter, summaryByActivityId, assigneeFilter])

  const filteredProjectsAsActivities = useMemo(
    () => projectsAsActivities.filter((project) => filteredActivities.some((activity) => activity.id === project.id)),
    [filteredActivities, projectsAsActivities],
  )

  const handleProjectClick = (project: Project) => {
    const activity = activities.find((item) => item.id === project.id)
    if (activity) {
      setSelectedActivity(activity)
      setIsActivityDialogOpen(true)
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    await deleteActivity(activityId)
    setSelectedActivity(null)
    setIsActivityDialogOpen(false)
  }

  const handleProjectMove = async (projectId: string, newStatus: Project['status']) => {
    await moveActivity(projectId, newStatus)
  }

  const handleCreateActivity = async (activity: Partial<Activity>) => {
    await createActivity(activity)
  }

  const handleUpdateActivity = async (activity: Activity) => {
    const updated = await updateActivity(activity.id, activity)
    setSelectedActivity({
      ...updated,
      cover_image_url: updated.cover_image_url ?? activity.cover_image_url ?? null,
    })
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">Carregando atividades...</Typography>
        </Stack>
      </Box>
    )
  }

  return (
    <ProtectedRoute permission="access_atividades">
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', p: { xs: 2, md: 3 }, gap: 2 }}>
        <AppSurface surface="subtle">
          <SectionHeader
            title="Atividades"
            description="Fila operacional com foco em prazo, responsável e leitura densa. O Kanban continua disponível para visão macro da equipe."
            sx={{ pb: 1.5 }}
          />

          <Stack spacing={1.5}>
            <Tabs value={activeView} onChange={handleViewChange}>
              <Tab value="list" label="Lista" />
              <Tab value="kanban" label="Kanban" />
            </Tabs>

            <Stack direction={{ xs: 'column', xl: 'row' }} spacing={1.25} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <TextField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou descrição"
                sx={{ minWidth: { xl: 320 } }}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | Activity['status'])}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="backlog">{getStatusLabel('backlog')}</MenuItem>
                <MenuItem value="todo">{getStatusLabel('todo')}</MenuItem>
                <MenuItem value="in_progress">{getStatusLabel('in_progress')}</MenuItem>
                <MenuItem value="review">{getStatusLabel('review')}</MenuItem>
                <MenuItem value="done">{getStatusLabel('done')}</MenuItem>
              </TextField>
              <TextField
                select
                label="Prioridade"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as 'all' | Activity['priority'])}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="all">Todas</MenuItem>
                <MenuItem value="low">Baixa</MenuItem>
                <MenuItem value="medium">Média</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
              </TextField>
              <TextField
                select
                label="Prazo"
                value={deadlineFilter}
                onChange={(event) => setDeadlineFilter(event.target.value as 'all' | 'overdue' | 'next_7d' | 'no_deadline')}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="overdue">Atrasadas</MenuItem>
                <MenuItem value="next_7d">Próximos 7 dias</MenuItem>
                <MenuItem value="no_deadline">Sem prazo</MenuItem>
              </TextField>
              <TextField
                select
                label="Responsável"
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="unassigned">Sem responsável</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={<Switch checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} />}
                label="Apenas minhas"
              />
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <StatusToken tone="neutral">
                {filteredActivities.length} atividade{filteredActivities.length === 1 ? '' : 's'} na vista
              </StatusToken>
              <StatusToken tone="info">
                {activeView === 'list' ? 'Lista padrão por perfil' : 'Kanban secundário'}
              </StatusToken>
              {summaryError ? <StatusToken tone="warning">Resumo operacional parcial</StatusToken> : null}
            </Stack>
          </Stack>
        </AppSurface>

        {summaryError ? <Alert severity="warning">{summaryError}</Alert> : null}

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {activeView === 'kanban' ? (
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <KanbanBoard
                projects={filteredProjectsAsActivities}
                onProjectMove={handleProjectMove}
                onProjectClick={handleProjectClick}
              />
            </Box>
          ) : (
            <AppSurface sx={{ p: 0, overflow: 'hidden', height: '100%' }}>
              <TableContainer sx={{ maxHeight: '100%' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Atividade</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Prioridade</TableCell>
                      <TableCell>Prazo</TableCell>
                      <TableCell>Responsável</TableCell>
                      <TableCell align="right">Meus to-dos</TableCell>
                      <TableCell align="right">Abertos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              Nenhuma atividade corresponde aos filtros atuais.
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredActivities.map((activity) => {
                        const summary = summaryByActivityId.get(activity.id)
                        return (
                          <TableRow
                            key={activity.id}
                            hover
                            onClick={() => {
                              setSelectedActivity(activity)
                              setIsActivityDialogOpen(true)
                            }}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>
                              <Stack spacing={0.35}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {activity.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {activity.description || 'Sem descrição curta.'}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <StatusToken tone={activity.status === 'review' ? 'warning' : activity.status === 'done' ? 'success' : 'info'}>
                                {getStatusLabel(activity.status)}
                              </StatusToken>
                            </TableCell>
                            <TableCell>{getPriorityLabel(activity.priority)}</TableCell>
                            <TableCell>
                              <StatusToken tone={isOverdueDate(activity.due_date) ? 'danger' : 'neutral'}>
                                {formatDatePtBr(activity.due_date, 'Sem prazo')}
                              </StatusToken>
                            </TableCell>
                            <TableCell>{activity.assigned_to ? userNameById.get(activity.assigned_to) ?? 'Usuário' : 'Sem responsável'}</TableCell>
                            <TableCell align="right">{summary?.myAssignedOpenCount ?? 0}</TableCell>
                            <TableCell align="right">{summary?.totalOpenCount ?? 0}</TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </AppSurface>
          )}
        </Box>

        {isAdmin && (
          <Fab
            color="primary"
            aria-label="Nova atividade"
            onClick={() => setIsCreateDialogOpen(true)}
            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}
          >
            <Plus size={24} />
          </Fab>
        )}

        <CreateActivityDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreate={handleCreateActivity}
        />

        <ActivityCardDialog
          activity={selectedActivity}
          open={isActivityDialogOpen}
          onOpenChange={setIsActivityDialogOpen}
          onUpdate={handleUpdateActivity}
          onDelete={isAdmin ? handleDeleteActivity : undefined}
          highlightedTodoId={highlightedTodoId}
        />
      </Box>
    </ProtectedRoute>
  )
}
