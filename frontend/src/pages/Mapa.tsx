import { useState } from 'react'
import { useProjects } from '@/hooks/use-projects'
import { ProjectCardDialog } from '@/components/kanban/project-card-dialog'
import { EisenhowerCanvas } from '@/components/mapa/eisenhower-canvas'
import { PriorityList } from '@/components/mapa/priority-list'
import { Loader2 } from 'lucide-react'
import type { Project } from '@/types'

export default function Mapa() {
  const { projects, loading, error, updateProject, updateProjectWithOptimisticPosition, deleteProject } = useProjects()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setDialogOpen(true)
  }

  const handleUpdate = async (project: Project) => {
    await updateProject(project.id, project)
  }

  const handlePositionChange = (projectId: string, position: { quadrant: number; x: number; y: number }) => {
    updateProjectWithOptimisticPosition(projectId, {
      map_quadrant: position.quadrant,
      map_x: position.x,
      map_y: position.y,
    })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b bg-card px-4 py-3">
        <PriorityList projects={projects} onProjectClick={handleProjectClick} />
      </div>
      <div className="min-h-0 flex-1 p-2">
        <div className="h-full overflow-hidden rounded-lg border bg-card">
          <EisenhowerCanvas
          projects={projects}
          onProjectClick={handleProjectClick}
          onPositionChange={handlePositionChange}
        />
        </div>
      </div>
      <ProjectCardDialog
        project={selectedProject}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setSelectedProject(null)
        }}
        onUpdate={handleUpdate}
        onDelete={deleteProject}
      />
    </div>
  )
}
