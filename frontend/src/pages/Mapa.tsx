import { useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useProjects } from '@/hooks/use-projects'
import { ProjectCardDialog } from '@/components/kanban/project-card-dialog'
import { EisenhowerCanvas } from '@/components/mapa/eisenhower-canvas'
import { useAuth } from '@/contexts/AuthContext'
import type { Project } from '@/types'

export default function Mapa() {
  const { projects, loading, error, updateProject, updateProjectWithOptimisticPosition, deleteProject } = useProjects()
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          p: 3,
        }}
      >
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
        <Typography variant="body2" color="text.secondary">
          Carregando mapa...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          gap: 1,
        }}
      >
        <Typography color="error" fontWeight={600}>
          Erro ao carregar o mapa
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0, px: 3, pt: 2.5, pb: 1.5 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            letterSpacing: '-0.01em',
          }}
        >
          Mapa
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {isAdmin
            ? 'Matriz de Eisenhower — organize projetos por urgência e importância.'
            : 'Matriz de Eisenhower — visualize a organização dos projetos.'}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, px: 3, pb: 3 }}>
        <Box
          sx={{
            height: '100%',
            overflow: 'hidden',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.palette.mode === 'light'
              ? '0 4px 12px rgba(15,23,42,0.06)'
              : '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <EisenhowerCanvas
            projects={projects}
            onProjectClick={handleProjectClick}
            onPositionChange={handlePositionChange}
            readOnly={!isAdmin}
          />
        </Box>
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
