import { useState } from 'react'
import { Box, CircularProgress, Typography, Paper } from '@mui/material'
import { useProjects } from '@/hooks/use-projects'
import { ProjectCardDialog } from '@/components/kanban/project-card-dialog'
import { EisenhowerCanvas } from '@/components/mapa/eisenhower-canvas'
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
      <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, minHeight: 0, p: 1 }}>
        <Paper variant="outlined" sx={{ height: '100%', overflow: 'hidden', borderRadius: 1 }}>
          <EisenhowerCanvas
            projects={projects}
            onProjectClick={handleProjectClick}
            onPositionChange={handlePositionChange}
          />
        </Paper>
      </Box>
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
    </Box>
  )
}
