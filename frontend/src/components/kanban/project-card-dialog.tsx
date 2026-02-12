import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Project, GitHubCommit, GitHubRepository } from '@/types'
import { ExternalLink, GitBranch, Calendar, Loader2, Lock, Archive, Tag, ChevronDown, ChevronUp, FileText, CheckSquare2, MessageSquare, Settings, Trash2, Pencil } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGitHub } from '@/hooks/use-github'
import { TodoList } from './todo-list'
import { CommentsSection } from './comments-section'

// Simple markdown to HTML converter
const markdownToHtml = (markdown: string): string => {
  let html = markdown
    // Code blocks (must come before inline code)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="p-3 rounded bg-muted border overflow-x-auto my-2"><code class="text-xs">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-primary text-xs font-mono">$1</code>')
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-semibold mt-4 mb-2">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
  
  // Lists - process line by line
  const lines = html.split('\n')
  const processedLines: string[] = []
  let inList = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const listMatch = line.match(/^[\*\-\+] (.+)$/)
    
    if (listMatch) {
      if (!inList) {
        processedLines.push('<ul class="list-disc ml-6 my-2">')
        inList = true
      }
      processedLines.push(`<li>${listMatch[1]}</li>`)
    } else {
      if (inList) {
        processedLines.push('</ul>')
        inList = false
      }
      if (line.trim()) {
        processedLines.push(`<p class="my-2">${line}</p>`)
      } else {
        processedLines.push('<br />')
      }
    }
  }
  
  if (inList) {
    processedLines.push('</ul>')
  }
  
  return processedLines.join('')
}

interface ProjectCardDialogProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (project: Project) => void
  onDelete?: (projectId: string) => Promise<void>
  highlightedTodoId?: string | null
}

export function ProjectCardDialog({
  project,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  highlightedTodoId,
}: ProjectCardDialogProps) {
  const { getRecentCommits, getRepositoryInfo, getReadme, loading: githubLoading } = useGitHub()
  const [commits, setCommits] = useState<GitHubCommit[]>([])
  const [repoInfo, setRepoInfo] = useState<GitHubRepository | null>(null)
  const [readme, setReadme] = useState<string | null>(null)
  const [commitsError, setCommitsError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [readmeExpanded, setReadmeExpanded] = useState(false)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<0 | 1 | 2>(0)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editProjectUrl, setEditProjectUrl] = useState('')
  const [editUrlLoading, setEditUrlLoading] = useState(false)

  useEffect(() => {
    if (open && project) {
      setEditProjectUrl(project.project_url || '')
    }
  }, [open, project?.project_url])

  useEffect(() => {
    if (open && project?.github_url) {
      const fetchGitHubData = async () => {
        try {
          setCommitsError(null)
          const [commitsData, repoData, readmeData] = await Promise.all([
            getRecentCommits(project.github_url!, 10),
            getRepositoryInfo(project.github_url!),
            getReadme(project.github_url!),
          ])
          setCommits(commitsData)
          setRepoInfo(repoData)
          setReadme(readmeData)
        } catch (error) {
          console.error('Error fetching GitHub data:', error)
          setCommitsError('Erro ao buscar dados do GitHub')
        }
      }
      fetchGitHubData()
    } else {
      setCommits([])
      setRepoInfo(null)
      setReadme(null)
      setCommitsError(null)
      setShowDetails(false)
      setReadmeExpanded(false)
    }
  }, [open, project?.github_url, getRecentCommits, getRepositoryInfo, getReadme])

  const handleDeleteConfirmClose = (open: boolean) => {
    if (!open) setDeleteConfirmStep(0)
  }

  const handleExcluirCard = () => {
    if (deleteConfirmStep === 0) {
      setDeleteConfirmStep(1)
      return
    }
    if (deleteConfirmStep === 1) {
      setDeleteConfirmStep(2)
      return
    }
    if (deleteConfirmStep === 2 && project && onDelete) {
      setDeleteLoading(true)
      onDelete(project.id)
        .then(() => {
          setDeleteConfirmStep(0)
          onOpenChange(false)
        })
        .catch(() => setDeleteLoading(false))
        .finally(() => setDeleteLoading(false))
    }
  }

  if (!project) return null

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o) setDeleteConfirmStep(0); onOpenChange(o); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle>{project.name}</DialogTitle>
          <DialogDescription>
            {project.description || 'Sem descrição'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-12 gap-6 h-[calc(90vh-120px)]">
          {/* Left Column - Main Content (TO-DO, Comments, README and Commits) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* TO-DO Section */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CheckSquare2 className="h-4 w-4" />
                    TO-DO
                  </h3>
                  <div className="rounded-lg border p-4">
                    <TodoList projectId={project.id} highlightedTodoId={highlightedTodoId} />
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comentários
                  </h3>
                  <div className="rounded-lg border p-4">
                    <CommentsSection projectId={project.id} />
                  </div>
                </div>

                {/* README Section */}
                {project.github_url && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        README
                      </h3>
                      {readme && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReadmeExpanded(!readmeExpanded)}
                          className="h-7 px-2"
                        >
                          {readmeExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Ver menos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Ver mais
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="rounded-lg border p-4">
                      {githubLoading && readme === null ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando README...
                        </div>
                      ) : readme ? (
                        <div className="relative">
                          <div 
                            className={`text-sm text-foreground transition-all ${
                              readmeExpanded ? '' : 'max-h-[400px] overflow-hidden'
                            }`}
                            dangerouslySetInnerHTML={{ __html: markdownToHtml(readme) }}
                          />
                          {!readmeExpanded && (
                            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          README não encontrado neste repositório.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Commits Section */}
                {project.github_url && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Commits Recentes</h3>
                    <div className="rounded-lg border p-4">
                      {githubLoading && commits.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando commits...
                        </div>
                      ) : commitsError ? (
                        <p className="text-sm text-destructive">{commitsError}</p>
                      ) : commits.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhum commit encontrado ou erro ao buscar commits.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {commits.map((commit) => (
                            <div key={commit.sha} className="border-b last:border-b-0 pb-3 last:pb-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={commit.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium hover:underline flex items-center gap-1"
                                  >
                                    {commit.commit.message.split('\n')[0]}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    {commit.author && (
                                      <div className="flex items-center gap-1">
                                        <img
                                          src={commit.author.avatar_url}
                                          alt={commit.author.login}
                                          className="h-4 w-4 rounded-full"
                                        />
                                        <span>{commit.author.login}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        {new Date(commit.commit.author.date).toLocaleDateString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <code className="text-xs text-muted-foreground font-mono">
                                  {commit.sha.substring(0, 7)}
                                </code>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Column - Sidebar (Project Info and GitHub Repo) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-6">
                {/* Project Info */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Informações do Projeto</h3>
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium capitalize">{project.status.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Criado em:</span>
                      <span>{new Date(project.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {project.updated_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Atualizado em:</span>
                        <span>{new Date(project.updated_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* GitHub Repository Info */}
                {project.github_url && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        Repositório GitHub
                      </h3>
                      {repoInfo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDetails(!showDetails)}
                          className="h-7 px-2"
                        >
                          {showDetails ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Ver menos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Ver mais
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="rounded-lg border p-4 space-y-3">
                      <a
                        href={project.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <GitBranch className="h-4 w-4" />
                        Acessar no GitHub
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      {repoInfo && (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            {repoInfo.private && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                                <Lock className="h-3 w-3" />
                                Privado
                              </span>
                            )}
                            {repoInfo.archived && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                                <Archive className="h-3 w-3" />
                                Arquivado
                              </span>
                            )}
                            {repoInfo.license && (
                              <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                                {repoInfo.license}
                              </span>
                            )}
                          </div>
                          {showDetails && (
                            <div className="space-y-3 pt-2 border-t">
                              <div className="space-y-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Linguagem:</span>{' '}
                                  <span className="font-medium">{repoInfo.language || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Branch padrão:</span>{' '}
                                  <span className="font-medium font-mono">{repoInfo.default_branch}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Estrelas:</span>{' '}
                                  <span className="font-medium">{repoInfo.stargazers_count}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Watchers:</span>{' '}
                                  <span className="font-medium">{repoInfo.watchers_count}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Forks:</span>{' '}
                                  <span className="font-medium">{repoInfo.forks_count}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Issues:</span>{' '}
                                  <span className="font-medium">{repoInfo.open_issues_count}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Tamanho:</span>{' '}
                                  <span className="font-medium">
                                    {repoInfo.size < 1024 
                                      ? `${repoInfo.size} KB` 
                                      : `${(repoInfo.size / 1024).toFixed(1)} MB`}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Criado em:</span>{' '}
                                  <span className="font-medium">
                                    {new Date(repoInfo.created_at).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                              {repoInfo.topics && repoInfo.topics.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  <Tag className="h-3 w-3 text-muted-foreground mt-0.5" />
                                  {repoInfo.topics.slice(0, 8).map((topic) => (
                                    <span
                                      key={topic}
                                      className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary"
                                    >
                                      {topic}
                                    </span>
                                  ))}
                                  {repoInfo.topics.length > 8 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{repoInfo.topics.length - 8}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                      {githubLoading && !repoInfo && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Carregando informações do repositório...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Configurações */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configurações
                  </h3>
                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="project_url" className="flex items-center gap-2 text-xs font-medium">
                        <Pencil className="h-3.5 w-3.5" />
                        Editar card — Link do projeto
                      </Label>
                      <Input
                        id="project_url"
                        type="url"
                        value={editProjectUrl}
                        onChange={(e) => setEditProjectUrl(e.target.value)}
                        placeholder="https://app.exemplo.com"
                        className="text-sm"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          setEditUrlLoading(true)
                          try {
                            await onUpdate({ ...project, project_url: editProjectUrl || null })
                          } finally {
                            setEditUrlLoading(false)
                          }
                        }}
                        disabled={editUrlLoading}
                      >
                        {editUrlLoading ? 'Salvando...' : 'Salvar link'}
                      </Button>
                    </div>
                    <div className="border-t pt-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => setDeleteConfirmStep(1)}
                        disabled={!onDelete}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir este card
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Diálogo de confirmação dupla para exclusão */}
    <Dialog open={deleteConfirmStep > 0} onOpenChange={handleDeleteConfirmClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {deleteConfirmStep === 1
              ? 'Excluir projeto?'
              : 'Confirmar exclusão'}
          </DialogTitle>
          <DialogDescription>
            {deleteConfirmStep === 1
              ? `Tem certeza que deseja excluir o projeto "${project.name}"? Esta ação não pode ser desfeita.`
              : 'Para confirmar, clique em "Sim, excluir". O projeto será removido permanentemente.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          {deleteConfirmStep === 1 ? (
            <>
              <Button variant="outline" onClick={() => setDeleteConfirmStep(0)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => setDeleteConfirmStep(2)}>
                Excluir
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setDeleteConfirmStep(1)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleExcluirCard}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Sim, excluir'
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
