import { useState, useEffect } from 'react'
import { Box, CircularProgress, Fab, Typography } from '@mui/material'
import { Plus } from '@/components/ui/icons'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { ActivityCardDialog } from '@/components/kanban/activity-card-dialog'
import { CreateActivityDialog } from '@/components/kanban/create-activity-dialog'
import { useActivities } from '@/hooks/use-activities'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/contexts/AuthContext'
import { Activity, Project } from '@/types'
import { useSearchParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || ''

async function findActivityIdByTodo(params: {
  activityIds: string[]
  todoId: string
  getAuthHeaders: () => Record<string, string>
}): Promise<string | null> {
  const { activityIds, todoId, getAuthHeaders } = params
  const results = await Promise.all(
    activityIds.map(async (activityId) => {
      const url = API_URL ? `${API_URL}/api/todos/by-activity/${activityId}` : `/api/todos/by-activity/${activityId}`
      const response = await fetch(url, { headers: getAuthHeaders() })
      if (!response.ok) return null
      const todos = await response.json()
      return Array.isArray(todos) && todos.some((todo) => todo?.id === todoId) ? activityId : null
    }),
  )

  return results.find(Boolean) ?? null
}

export default function Atividades() {
  const { activities, loading, createActivity, updateActivity, moveActivity, deleteActivity } = useActivities()
  const { hasRole } = usePermissions()
  const { getAuthHeaders } = useAuth()
  const isAdmin = hasRole('admin')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false)
  const [highlightedTodoId, setHighlightedTodoId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const projectsAsActivities: Project[] = activities.map((activity) => ({
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
  }))

  useEffect(() => {
    const activityId = searchParams.get('activity')
    const todoId = searchParams.get('todo')

    if (activities.length === 0 || isActivityDialogOpen || (!activityId && !todoId)) {
      return
    }

    let cancelled = false

    const openActivity = (targetActivityId: string | null) => {
      if (!targetActivityId || cancelled) {
        setSearchParams({}, { replace: true })
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
      setSearchParams({}, { replace: true })
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
        setSearchParams({}, { replace: true })
      })
    }

    return () => {
      cancelled = true
    }
  }, [activities, getAuthHeaders, isActivityDialogOpen, searchParams, setSearchParams])

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
    try {
      await moveActivity(projectId, newStatus)
    } catch (error) {
      console.error('Error moving activity:', error)
      throw error
    }
  }

  const handleCreateActivity = async (activity: Partial<Activity>) => {
    try {
      await createActivity(activity)
    } catch (error) {
      console.error('Error creating activity:', error)
      throw error
    }
  }

  const handleUpdateActivity = async (activity: Activity) => {
    try {
      const updated = await updateActivity(activity.id, activity)
      setSelectedActivity({
        ...updated,
        cover_image_url: updated.cover_image_url ?? activity.cover_image_url ?? null,
      })
    } catch (error) {
      console.error('Error updating activity:', error)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography color="text.secondary">Carregando atividades...</Typography>
        </Box>
      </Box>
    )
  }

  return (
    <ProtectedRoute permission="access_atividades">
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ flexShrink: 0, px: 3, pt: 2.5, pb: 1.5 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              letterSpacing: '-0.01em',
            }}
          >
            Atividades
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Kanban de atividades da equipe - arraste os cards entre as colunas e abra um card para ver detalhes, to-dos e comentarios.
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', px: 3, pt: 0.5, pb: 3 }}>
          <KanbanBoard
            projects={projectsAsActivities}
            onProjectMove={handleProjectMove}
            onProjectClick={handleProjectClick}
          />
        </Box>

        {isAdmin && (
          <Fab
            color="primary"
            aria-label="Nova Atividade"
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
