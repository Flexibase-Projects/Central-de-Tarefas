import { useState } from 'react'
import { Box, CircularProgress, Fab, Typography } from '@mui/material'
import { Add } from '@mui/icons-material'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { ActivityCardDialog } from '@/components/kanban/activity-card-dialog'
import { CreateActivityDialog } from '@/components/kanban/create-activity-dialog'
import { useActivities } from '@/hooks/use-activities'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { Activity } from '@/types'
import { Project } from '@/types'

export default function Atividades() {
  const { activities, loading, createActivity, updateActivity, moveActivity } = useActivities()
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
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Box sx={{ flex: 1, overflow: 'hidden', px: 3, pt: 2, pb: 3 }}>
          <KanbanBoard
            projects={projectsAsActivities}
            onProjectMove={handleProjectMove}
            onProjectClick={handleProjectClick}
          />
        </Box>

        <RequirePermission permission="move_card">
          <Fab
            color="primary"
            aria-label="Nova Atividade"
            onClick={() => setIsCreateDialogOpen(true)}
            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}
          >
            <Add />
          </Fab>
        </RequirePermission>

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
        />
      </Box>
    </ProtectedRoute>
  )
}
