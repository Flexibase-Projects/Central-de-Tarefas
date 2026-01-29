import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Project } from '@/types'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (project: Partial<Project>) => Promise<void>
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateProjectDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    github_url: '',
    project_url: '',
    status: 'backlog' as Project['status'],
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      // Parse GitHub URL to extract owner and repo
      let github_owner = null
      let github_repo = null
      if (formData.github_url) {
        const match = formData.github_url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
        if (match) {
          github_owner = match[1]
          github_repo = match[2].replace(/\.git$/, '')
        }
      }

      const projectData = {
        name: formData.name,
        description: formData.description || null,
        github_url: formData.github_url || null,
        project_url: formData.project_url || null,
        github_owner,
        github_repo,
        status: formData.status,
      }

      await onCreate(projectData)
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        github_url: '',
        project_url: '',
        status: 'backlog',
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating project:', error)
      alert(`Erro ao criar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
            <DialogDescription>
              Crie um novo projeto de desenvolvimento para gerenciar no Kanban
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Sistema de Autenticação"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve descrição do projeto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github_url">URL do Repositório GitHub</Label>
              <Input
                id="github_url"
                type="url"
                value={formData.github_url}
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                placeholder="https://github.com/owner/repo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_url">Link do projeto (opcional)</Label>
              <Input
                id="project_url"
                type="url"
                value={formData.project_url}
                onChange={(e) => setFormData({ ...formData, project_url: e.target.value })}
                placeholder="https://app.exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status Inicial</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
