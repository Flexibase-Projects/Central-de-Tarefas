import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
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
import { ProjectCardDialog } from '@/components/kanban/project-card-dialog'
import { CreateProjectDialog } from '@/components/kanban/create-project-dialog'
import { useProjects } from '@/hooks/use-projects'
import { useTodoCardSummary } from '@/hooks/use-todo-card-summary'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/contexts/AuthContext'
import { Project, type ExecutionViewMode } from '@/types'
import { useSearchParams } from 'react-router-dom'
import AppSurface from '@/components/system/AppSurface'
import SectionHeader from '@/components/system/SectionHeader'
import StatusToken from '@/components/system/StatusToken'
import { PageSyncScreen, WorkspaceSyncBanner } from '@/components/system/WorkspaceSyncFeedback'
import { getStatusLabel } from '@/lib/status-labels'
import {
  normalizeExecutionViewMode,
  readExecutionViewPreference,
  writeExecutionViewPreference,
} from '@/lib/execution-views'

function priorityLabel(priorityOrder: number | null | undefined) {
  if (typeof priorityOrder !== 'number') return 'Sem ordem'
  return `Fila #${priorityOrder + 1}`
}

export default function Desenvolvimentos() {
  const { projects, loading, error, createProject, updateProject, moveProject, deleteProject } = useProjects()
  const { rows: summaryRows, error: summaryError } = useTodoCardSummary()
  const { hasRole } = usePermissions()
  const { currentUser, currentWorkspace, session } = useAuth()
  const isAdmin = hasRole('admin')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Project['status']>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'prioritized' | 'unprioritized'>('all')
  const [onlyMine, setOnlyMine] = useState(!isAdmin)
  const [highlightedTodoId, setHighlightedTodoId] = useState<string | null>(null)

  const viewPreference = useMemo(
    () =>
      readExecutionViewPreference({
        pageKey: 'projects',
        workspaceSlug: currentWorkspace?.slug,
        userId: currentUser?.id,
      }) ?? 'list',
    [currentUser?.id, currentWorkspace?.slug],
  )
  const activeView: ExecutionViewMode =
    normalizeExecutionViewMode(searchParams.get('view')) ?? viewPreference ?? 'list'

  const projectSummaryById = useMemo(() => {
    return new Map(
      summaryRows
        .filter((row) => row.entity_type === 'project')
        .map((row) => [row.project_id, row]),
    )
  }, [summaryRows])

  useEffect(() => {
    const projectId = searchParams.get('project')
    const todoId = searchParams.get('todo')
    if (projectId && projects.length > 0 && !isProjectDialogOpen) {
      const project = projects.find((p) => p.id === projectId)
      if (project) {
        setSelectedProject(project)
        setIsProjectDialogOpen(true)
        if (todoId) {
          setHighlightedTodoId(todoId)
          window.setTimeout(() => setHighlightedTodoId(null), 3000)
        }
        const nextParams = new URLSearchParams(searchParams)
        nextParams.delete('project')
        nextParams.delete('todo')
        setSearchParams(nextParams, { replace: true })
      }
    }
  }, [isProjectDialogOpen, projects, searchParams, setSearchParams])

  const handleViewChange = (_event: React.SyntheticEvent, nextView: ExecutionViewMode) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('view', nextView)
    setSearchParams(nextParams, { replace: true })
    writeExecutionViewPreference(
      {
        pageKey: 'projects',
        workspaceSlug: currentWorkspace?.slug,
        userId: currentUser?.id,
      },
      nextView,
    )
  }

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    const authUserId = session?.user?.id

    return [...projects]
      .filter((project) => {
        const metrics = projectSummaryById.get(project.id)
        const matchesSearch =
          !query ||
          project.name.toLowerCase().includes(query) ||
          (project.description ?? '').toLowerCase().includes(query)
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter
        const isPrioritized = typeof project.priority_order === 'number'
        const matchesPriority =
          priorityFilter === 'all' ||
          (priorityFilter === 'prioritized' ? isPrioritized : !isPrioritized)
        const isCurrentResponsible =
          project.responsible_user_id === currentUser?.id || project.responsible_user_id === authUserId
        const isCurrentCreator =
          project.created_by === currentUser?.id || project.created_by === authUserId
        const matchesMine = !onlyMine || isAdmin
          ? !onlyMine || isCurrentResponsible || isCurrentCreator
          : (metrics?.myAssignedOpenCount ?? 0) > 0 || isCurrentResponsible || isCurrentCreator

        return matchesSearch && matchesStatus && matchesPriority && matchesMine
      })
      .sort((a, b) => {
        const aPriority = typeof a.priority_order === 'number' ? a.priority_order : Number.MAX_SAFE_INTEGER
        const bPriority = typeof b.priority_order === 'number' ? b.priority_order : Number.MAX_SAFE_INTEGER
        if (aPriority !== bPriority) return aPriority - bPriority

        const aMine = projectSummaryById.get(a.id)?.myAssignedOpenCount ?? 0
        const bMine = projectSummaryById.get(b.id)?.myAssignedOpenCount ?? 0
        if (aMine !== bMine) return bMine - aMine

        return a.name.localeCompare(b.name, 'pt-BR')
      })
  }, [currentUser?.id, isAdmin, onlyMine, priorityFilter, projectSummaryById, projects, search, session?.user?.id, statusFilter])

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setIsProjectDialogOpen(true)
  }

  const handleProjectMove = async (projectId: string, newStatus: Project['status']) => {
    await moveProject(projectId, newStatus)
  }

  const handleCreateProject = async (project: Partial<Project>) => {
    await createProject(project)
  }

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    const updated = await updateProject(projectId, updates)
    setSelectedProject(updated)
  }

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId)
    setSelectedProject(null)
    setIsProjectDialogOpen(false)
  }

  const showInitialSync = loading && projects.length === 0

  return (
    <ProtectedRoute permission="access_desenvolvimentos">
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', p: { xs: 2, md: 3 }, gap: 2 }}>
        <AppSurface surface="subtle">
          <SectionHeader
            title="Projetos"
            description="Vista principal em lista para leitura rápida, filtros e priorização. O Kanban segue disponível para acompanhamento macro."
            sx={{ pb: 1.5 }}
          />

          <Stack spacing={1.5}>
            <Tabs value={activeView} onChange={handleViewChange}>
              <Tab value="list" label="Lista" />
              <Tab value="kanban" label="Kanban" />
            </Tabs>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25}>
              <TextField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou descrição"
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
                onChange={(event) => setStatusFilter(event.target.value as 'all' | Project['status'])}
                sx={{ minWidth: 180 }}
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
                label="Priorização"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as 'all' | 'prioritized' | 'unprioritized')}
                sx={{ minWidth: 190 }}
              >
                <MenuItem value="all">Todas</MenuItem>
                <MenuItem value="prioritized">Na fila prioritária</MenuItem>
                <MenuItem value="unprioritized">Sem ordem definida</MenuItem>
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={onlyMine}
                    onChange={(event) => setOnlyMine(event.target.checked)}
                  />
                }
                label="Apenas meus"
                sx={{ ml: { lg: 0.5 } }}
              />
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <StatusToken tone="neutral">
                {filteredProjects.length} projeto{filteredProjects.length === 1 ? '' : 's'} na vista
              </StatusToken>
              <StatusToken tone="info">
                {activeView === 'list' ? 'Lista padrão por perfil' : 'Kanban secundário'}
              </StatusToken>
              {summaryError ? <StatusToken tone="warning">Resumo operacional parcial</StatusToken> : null}
            </Stack>
          </Stack>
        </AppSurface>

        <WorkspaceSyncBanner
          active={loading && projects.length > 0}
          title="Atualizando projetos"
          description="Os projetos continuam na tela enquanto sincronizamos cards, filtros e contagens operacionais."
        />

        {error ? <Alert severity="warning">{error}</Alert> : null}
        {summaryError ? <Alert severity="warning">{summaryError}</Alert> : null}

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {showInitialSync ? (
            <PageSyncScreen
              title="Sincronizando projetos"
              description="Estamos preparando a lista, o kanban e os filtros de projetos para voce entrar direto no contexto certo."
              minHeight="100%"
            />
          ) : activeView === 'kanban' ? (
            <Box sx={{ height: '100%', overflow: 'hidden', px: { xs: 0, md: 0 } }}>
              <KanbanBoard
                projects={filteredProjects}
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
                      <TableCell>Projeto</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Prioridade</TableCell>
                      <TableCell align="right">Meus to-dos</TableCell>
                      <TableCell align="right">Abertos</TableCell>
                      <TableCell align="right">XP pendente</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              Nenhum projeto corresponde aos filtros atuais.
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProjects.map((project) => {
                        const summary = projectSummaryById.get(project.id)
                        return (
                          <TableRow
                            key={project.id}
                            hover
                            onClick={() => handleProjectClick(project)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>
                              <Stack spacing={0.35}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {project.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {project.description || 'Sem descrição curta.'}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <StatusToken tone={project.status === 'review' ? 'warning' : project.status === 'done' ? 'success' : 'info'}>
                                {getStatusLabel(project.status)}
                              </StatusToken>
                            </TableCell>
                            <TableCell>{priorityLabel(project.priority_order)}</TableCell>
                            <TableCell align="right">{summary?.myAssignedOpenCount ?? 0}</TableCell>
                            <TableCell align="right">{summary?.totalOpenCount ?? 0}</TableCell>
                            <TableCell align="right">{summary?.xpPendingCount ?? 0}</TableCell>
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

        <RequirePermission permission="move_card">
          <Fab
            color="primary"
            aria-label="Novo projeto"
            onClick={() => setIsCreateDialogOpen(true)}
            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}
          >
            <Plus size={24} />
          </Fab>
        </RequirePermission>

        <CreateProjectDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreate={handleCreateProject}
        />

        <ProjectCardDialog
          project={selectedProject}
          open={isProjectDialogOpen}
          onOpenChange={setIsProjectDialogOpen}
          onUpdate={handleUpdateProject}
          onDelete={isAdmin ? handleDeleteProject : undefined}
          highlightedTodoId={highlightedTodoId}
        />
      </Box>
    </ProtectedRoute>
  )
}
