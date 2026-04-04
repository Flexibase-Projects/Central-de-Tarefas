import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
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
  Tooltip,
  Typography,
} from '@/compat/mui/material'
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
import { PageSyncScreen, WorkspaceSyncBanner } from '@/components/system/WorkspaceSyncFeedback'
import { apiUrl } from '@/lib/api'
import { formatDatePtBr, isOverdueDate } from '@/lib/date-only'
import { getPriorityLabel, getStatusLabel } from '@/lib/status-labels'
import {
  normalizeExecutionViewMode,
  readExecutionViewPreference,
  writeExecutionViewPreference,
} from '@/lib/execution-views'
import {
  compactScopeToggleLabelSx,
  executionSearchFieldWrapperWideSx,
} from '@/components/filters/execution-filters'
import { AppFloatingActionIconButton } from '@/components/system/AppFloatingActionIconButton'
import { denseTableHeadCellSx } from '@/components/system/denseTableHeadCellSx'

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
  const { activities, loading, error, createActivity, updateActivity, moveActivity, deleteActivity } = useActivities()
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

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])

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

  const showInitialSync = loading && activities.length === 0

  return (
    <ProtectedRoute permission="access_atividades">
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 1.5, md: 2 },
          gap: 1.25,
        }}
      >
        <AppSurface surface="subtle" compact>
          <SectionHeader
            compact
            title="Atividades"
            description="Organize por prazo, responsável e status. Use a lista para leitura densa ou o Kanban para visão macro."
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              pb: 1.25,
              mb: 0.5,
            }}
          />

          <Stack spacing={1.125}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: 0.75,
                flexWrap: 'wrap',
              }}
            >
              <Tabs
                value={activeView}
                onChange={handleViewChange}
                sx={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  '& > button': {
                    minHeight: 34,
                    paddingLeft: 1,
                    paddingRight: 1,
                    fontSize: 13,
                  },
                }}
              >
                <Tab value="list" label="Lista" />
                <Tab value="kanban" label="Kanban" />
              </Tabs>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
                <StatusToken tone="neutral">
                  {filteredActivities.length} atividade{filteredActivities.length === 1 ? '' : 's'} na vista
                </StatusToken>
                <StatusToken tone="neutral">
                  {activeView === 'list' ? 'Lista padrão por perfil' : 'Kanban secundário'}
                </StatusToken>
                {summaryError ? <StatusToken tone="warning">Resumo operacional parcial</StatusToken> : null}
              </Stack>
            </Box>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={0.875}
              useFlexGap
              sx={{
                flexWrap: 'wrap',
                alignItems: { xs: 'stretch', md: 'flex-end' },
                alignContent: { md: 'flex-end' },
                rowGap: { md: 0.875 },
              }}
            >
              <Box sx={executionSearchFieldWrapperWideSx}>
                <TextField
                  label="Buscar"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome ou descrição"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <TextField
                select
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | Activity['status'])}
                sx={{ minWidth: { md: 148 }, width: { xs: '100%', md: 'auto' }, flex: { md: '0 1 auto' } }}
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
                sx={{ minWidth: { md: 148 }, width: { xs: '100%', md: 'auto' }, flex: { md: '0 1 auto' } }}
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
                sx={{ minWidth: { md: 158 }, width: { xs: '100%', md: 'auto' }, flex: { md: '0 1 auto' } }}
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
                sx={{ minWidth: { md: 168 }, width: { xs: '100%', md: 'auto' }, flex: { md: '1 1 160px' }, maxWidth: { md: 240 } }}
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
                label="Só minhas"
                title="Apenas atividades atribuídas a você ou criadas por você"
                sx={compactScopeToggleLabelSx('md')}
              />
            </Stack>
          </Stack>
        </AppSurface>

        <WorkspaceSyncBanner
          active={loading && activities.length > 0}
          title="Atualizando atividades"
          description="A lista atual permanece visivel enquanto sincronizamos prazos, responsaveis e estado do fluxo."
        />

        {error ? <Alert severity="warning">{error}</Alert> : null}
        {summaryError ? <Alert severity="warning">{summaryError}</Alert> : null}

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {showInitialSync ? (
            <PageSyncScreen
              title="Sincronizando atividades"
              description="Estamos montando a fila operacional com responsaveis, prazos e atalhos para voce seguir sem perder contexto."
              minHeight="100%"
            />
          ) : activeView === 'kanban' ? (
            <Box sx={{ height: '100%', overflow: 'hidden', px: { xs: 0, md: 0 } }}>
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
                      <TableCell sx={denseTableHeadCellSx}>Atividade</TableCell>
                      <TableCell sx={denseTableHeadCellSx}>Status</TableCell>
                      <TableCell sx={denseTableHeadCellSx}>Prioridade</TableCell>
                      <TableCell sx={denseTableHeadCellSx}>Prazo</TableCell>
                      <TableCell
                        title="Responsável"
                        align="center"
                        sx={[denseTableHeadCellSx, { width: 44, maxWidth: 48, px: 0.75 }]}
                      >
                        Resp.
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              Nenhuma atividade corresponde aos filtros atuais.
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredActivities.map((activity) => {
                        const overdue = isOverdueDate(activity.due_date)
                        const assignee = activity.assigned_to ? userById.get(activity.assigned_to) : null
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
                            <TableCell
                              sx={{
                                color: overdue ? 'error.main' : undefined,
                                fontWeight: overdue ? 600 : undefined,
                              }}
                            >
                              {formatDatePtBr(activity.due_date, 'Sem prazo')}
                            </TableCell>
                            <TableCell align="center" sx={{ width: 44, maxWidth: 48, px: 0.5 }}>
                              {assignee ? (
                                <Tooltip title={assignee.name} placement="left" arrow>
                                  <Avatar
                                    src={assignee.avatar_url ?? undefined}
                                    alt=""
                                    sx={{ width: 28, height: 28, fontSize: 12, mx: 'auto' }}
                                  >
                                    {assignee.name?.[0]?.toUpperCase() ?? '?'}
                                  </Avatar>
                                </Tooltip>
                              ) : (
                                <Typography variant="caption" color="text.disabled" component="span">
                                  —
                                </Typography>
                              )}
                            </TableCell>
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
          <AppFloatingActionIconButton aria-label="Nova atividade" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus size={20} strokeWidth={2.25} />
          </AppFloatingActionIconButton>
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
