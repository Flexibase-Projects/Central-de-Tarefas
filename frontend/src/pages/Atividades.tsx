import { useState } from 'react'
import { Box, CircularProgress, Fab, Typography } from '@mui/material'
import { Plus } from '@/components/ui/icons'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { ActivityCardDialog } from '@/components/kanban/activity-card-dialog'
import { CreateActivityDialog } from '@/components/kanban/create-activity-dialog'
import { useActivities } from '@/hooks/use-activities'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { usePermissions } from '@/hooks/use-permissions'
import { Activity } from '@/types'
import { Project } from '@/types'

export default function Atividades() {
  const { activities, loading, createActivity, updateActivity, moveActivity, deleteActivity } = useActivities()
  const { hasRole } = usePermissions()
  const isAdmin = hasRole('admin')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false)

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

  const handleProjectClick = (project: Project) => {
    const activity = activities.find((a) => a.id === project.id)
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
            Kanban de atividades da equipe — arraste os cards entre as colunas e abra um card para ver detalhes, to-dos e comentários.
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
        />
      </Box>
    </ProtectedRoute>
  )
}
