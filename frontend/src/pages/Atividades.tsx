import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  // Converter Activity para Project para usar com KanbanBoard (que espera Project)
  const projectsAsActivities: Project[] = activities.map(activity => ({
    id: activity.id,
    name: activity.name,
    description: activity.description,
    status: activity.status,
    github_url: null,
    github_owner: null,
    github_repo: null,
    project_url: null,
    created_at: activity.created_at,
    updated_at: activity.updated_at,
    created_by: activity.created_by,
  }))

  const handleProjectClick = (project: Project) => {
    // Encontrar a atividade correspondente
    const activity = activities.find(a => a.id === project.id)
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
      await updateActivity(activity.id, activity)
      setSelectedActivity(activity)
    } catch (error) {
      console.error('Error updating activity:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando atividades...</div>
      </div>
    )
  }

  return (
    <ProtectedRoute permission="access_atividades">
      <div className="h-full flex flex-col relative">
        <div className="flex-1 overflow-hidden px-6 pt-4 pb-6">
          <KanbanBoard
            projects={projectsAsActivities}
            onProjectMove={handleProjectMove}
            onProjectClick={handleProjectClick}
          />
        </div>

        {/* Botão flutuante */}
        <RequirePermission permission="move_card">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
            size="icon"
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">Nova Atividade</span>
          </Button>
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
      </div>
    </ProtectedRoute>
  )
}
