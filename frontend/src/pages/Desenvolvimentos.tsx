import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { ProjectCardDialog } from '@/components/kanban/project-card-dialog'
import { CreateProjectDialog } from '@/components/kanban/create-project-dialog'
import { useProjects } from '@/hooks/use-projects'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { Project } from '@/types'
import { useSearchParams } from 'react-router-dom'

export default function Desenvolvimentos() {
  const { projects, loading, createProject, updateProject, moveProject, deleteProject } = useProjects()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const [highlightedTodoId, setHighlightedTodoId] = useState<string | null>(null)

  // Abrir projeto quando houver parâmetro na URL
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
          // Remover o destaque após 3 segundos
          setTimeout(() => setHighlightedTodoId(null), 3000)
        }
        // Remover parâmetro da URL após abrir
        setSearchParams({}, { replace: true })
      }
    }
  }, [searchParams, projects, isProjectDialogOpen, setSearchParams])

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setIsProjectDialogOpen(true)
  }

  const handleProjectMove = async (projectId: string, newStatus: Project['status']) => {
    try {
      await moveProject(projectId, newStatus)
      // O hook useProjects já atualiza o estado automaticamente após o moveProject
    } catch (error) {
      console.error('Error moving project:', error)
      throw error // Re-throw para que o kanban-board possa tratar o erro
    }
  }

  const handleCreateProject = async (project: Partial<Project>) => {
    try {
      await createProject(project)
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  }

  const handleUpdateProject = async (project: Project) => {
    try {
      await updateProject(project.id, project)
      setSelectedProject(project)
    } catch (error) {
      console.error('Error updating project:', error)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId)
      setSelectedProject(null)
      setIsProjectDialogOpen(false)
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando projetos...</div>
      </div>
    )
  }

  return (
    <ProtectedRoute permission="access_desenvolvimentos">
      <div className="h-full flex flex-col relative">
        <div className="flex-1 overflow-hidden px-6 pt-4 pb-6">
          <KanbanBoard
            projects={projects}
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
            <span className="sr-only">Novo Projeto</span>
          </Button>
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
          onDelete={handleDeleteProject}
          highlightedTodoId={highlightedTodoId}
        />
      </div>
    </ProtectedRoute>
  )
}
