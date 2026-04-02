import { useState } from 'react'
import { Box, Typography } from '@/compat/mui/material'
import type { Theme } from '@/compat/mui/styles'
import { ProjectCardDialog } from '@/components/kanban/project-card-dialog'
import { EisenhowerCanvas } from '@/components/mapa/eisenhower-canvas'
import { PageSyncScreen, WorkspaceSyncBanner } from '@/components/system/WorkspaceSyncFeedback'
import { useAuth } from '@/contexts/AuthContext'
import { useProjects } from '@/hooks/use-projects'
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

  const handleUpdate = async (projectId: string, updates: Partial<Project>) => {
    const updated = await updateProject(projectId, updates)
    setSelectedProject(updated)
  }

  const handlePositionChange = (projectId: string, position: { quadrant: number; x: number; y: number }) => {
    updateProjectWithOptimisticPosition(projectId, {
      map_quadrant: position.quadrant,
      map_x: position.x,
      map_y: position.y,
    })
  }

  if (error && projects.length === 0) {
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
            ? 'Matriz de Eisenhower - organize projetos por urgencia e importancia.'
            : 'Matriz de Eisenhower - visualize a organizacao dos projetos.'}
        </Typography>
        {error ? (
          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
            {error}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, px: 3, pb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <WorkspaceSyncBanner
          active={loading && projects.length > 0}
          title="Atualizando o mapa"
          description="Os projetos continuam posicionados enquanto sincronizamos a matriz e os dados mais recentes."
        />

        {loading && projects.length === 0 ? (
          <PageSyncScreen
            title="Sincronizando o mapa"
            description="Estamos organizando os projetos na matriz de Eisenhower para voce entrar direto na leitura do workspace."
            minHeight="100%"
          />
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: (theme: Theme) => theme.palette.mode === 'light'
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
        )}
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
