import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Paper,
} from '@mui/material'
import {
  ExternalLink,
  Code,
  Calendar,
  Lock,
  Archive,
  Tag,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckSquare,
  MessageCircleIcon,
  Settings,
  Trash2,
  Pencil,
} from '@/components/ui/icons'
import { Project, GitHubCommit, GitHubRepository } from '@/types'
import { useGitHub } from '@/hooks/use-github'
import { TodoList } from './todo-list'
import { CommentsSection } from './comments-section'

const markdownToHtml = (markdown: string): string => {
  let html = markdown
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="padding:12px;border-radius:8px;background:#f5f5f5;overflow-x:auto;margin:8px 0"><code style="font-size:12px">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="padding:2px 4px;border-radius:4px;background:#eee;color:#2563eb;font-size:12px">$1</code>')
    .replace(/^### (.*$)/gim, '<h3 style="font-size:1rem;font-weight:600;margin:16px 0 8px">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size:1.125rem;font-weight:600;margin:16px 0 8px">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="font-size:1.25rem;font-weight:600;margin:16px 0 8px">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline">$1</a>')
  const lines = html.split('\n')
  const processedLines: string[] = []
  let inList = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const listMatch = line.match(/^[\*\-\+] (.+)$/)
    if (listMatch) {
      if (!inList) {
        processedLines.push('<ul style="list-style:disc;margin-left:24px;margin:8px 0">')
        inList = true
      }
      processedLines.push(`<li>${listMatch[1]}</li>`)
    } else {
      if (inList) {
        processedLines.push('</ul>')
        inList = false
      }
      if (line.trim()) processedLines.push(`<p style="margin:8px 0">${line}</p>`)
      else processedLines.push('<br />')
    }
  }
  if (inList) processedLines.push('</ul>')
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
      <Dialog
        open={open}
        onClose={() => {
          setDeleteConfirmStep(0)
          onOpenChange(false)
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        <DialogTitle>{project.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {project.description || 'Sem descrição'}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, height: 'calc(90vh - 120px)' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ flex: 1, overflow: 'auto', pr: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckSquare size={18} /> TO-DO
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <TodoList projectId={project.id} highlightedTodoId={highlightedTodoId} contextName={project.name} />
                    </Paper>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <MessageCircleIcon size={18} /> Comentários
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <CommentsSection projectId={project.id} />
                    </Paper>
                  </Box>
                  {project.github_url && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FileText size={18} /> README
                        </Typography>
                        {readme && (
                          <Button size="small" onClick={() => setReadmeExpanded(!readmeExpanded)} startIcon={readmeExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}>
                            {readmeExpanded ? 'Ver menos' : 'Ver mais'}
                          </Button>
                        )}
                      </Box>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        {githubLoading && readme === null ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} /> <Typography variant="body2" color="text.secondary">Carregando README...</Typography>
                          </Box>
                        ) : readme ? (
                          <Box sx={{ position: 'relative' }}>
                            <Box sx={{ fontSize: 14, maxHeight: readmeExpanded ? 'none' : 400, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: markdownToHtml(readme) }} />
                            {!readmeExpanded && <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, background.paper)' }} />}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">README não encontrado neste repositório.</Typography>
                        )}
                      </Paper>
                    </Box>
                  )}
                  {project.github_url && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Commits Recentes</Typography>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        {githubLoading && commits.length === 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} /> <Typography variant="body2" color="text.secondary">Carregando commits...</Typography>
                          </Box>
                        ) : commitsError ? (
                          <Typography variant="body2" color="error">{commitsError}</Typography>
                        ) : commits.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">Nenhum commit encontrado ou erro ao buscar commits.</Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {commits.map((commit) => (
                              <Box key={commit.sha} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1.5, '&:last-child': { borderBottom: 0, pb: 0 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography component="a" href={commit.html_url} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'underline' }}>
                                      {commit.commit.message.split('\n')[0]}
                                      <ExternalLink size={14} />
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                                      {commit.author && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <Box component="img" src={commit.author.avatar_url} alt={commit.author.login} sx={{ width: 16, height: 16, borderRadius: '50%' }} />
                                          <Typography variant="caption" color="text.secondary">{commit.author.login}</Typography>
                                        </Box>
                                      )}
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Calendar size={12} />
                                        <Typography variant="caption" color="text.secondary">
                                          {new Date(commit.commit.author.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                  <Typography component="code" variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{commit.sha.substring(0, 7)}</Typography>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Paper>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Informações do Projeto</Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2"><Typography component="span" color="text.secondary">Status:</Typography> {project.status.replace('_', ' ')}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Calendar size={16} />
                          <Typography variant="body2" color="text.secondary">Criado em:</Typography>
                          <Typography variant="body2">{new Date(project.created_at).toLocaleDateString('pt-BR')}</Typography>
                        </Box>
                        {project.updated_at && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Calendar size={16} />
                            <Typography variant="body2" color="text.secondary">Atualizado em:</Typography>
                            <Typography variant="body2">{new Date(project.updated_at).toLocaleDateString('pt-BR')}</Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                  {project.github_url && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Code size={18} /> Repositório GitHub
                        </Typography>
                        {repoInfo && (
                          <Button size="small" onClick={() => setShowDetails(!showDetails)} startIcon={showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}>
                            {showDetails ? 'Ver menos' : 'Ver mais'}
                          </Button>
                        )}
                      </Box>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography component="a" href={project.github_url} target="_blank" rel="noopener noreferrer" variant="body2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Code /> Acessar no GitHub <ExternalLink size={14} />
                        </Typography>
                        {repoInfo && (
                          <>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                              {repoInfo.private && (
                                <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                  <Lock size={12} /> Privado
                                </Typography>
                              )}
                              {repoInfo.archived && (
                                <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                  <Archive size={12} /> Arquivado
                                </Typography>
                              )}
                              {repoInfo.license && (
                                <Typography variant="caption" sx={{ px: 1, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>{repoInfo.license}</Typography>
                              )}
                            </Box>
                            {showDetails && (
                              <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Typography variant="caption">Linguagem: <strong>{repoInfo.language || 'N/A'}</strong></Typography>
                                  <Typography variant="caption">Branch padrão: <strong style={{ fontFamily: 'monospace' }}>{repoInfo.default_branch}</strong></Typography>
                                  <Typography variant="caption">Estrelas: <strong>{repoInfo.stargazers_count}</strong></Typography>
                                  <Typography variant="caption">Watchers: <strong>{repoInfo.watchers_count}</strong></Typography>
                                  <Typography variant="caption">Forks: <strong>{repoInfo.forks_count}</strong></Typography>
                                  <Typography variant="caption">Issues: <strong>{repoInfo.open_issues_count}</strong></Typography>
                                  <Typography variant="caption">Tamanho: <strong>{repoInfo.size < 1024 ? `${repoInfo.size} KB` : `${(repoInfo.size / 1024).toFixed(1)} MB`}</strong></Typography>
                                  <Typography variant="caption">Criado em: <strong>{new Date(repoInfo.created_at).toLocaleDateString('pt-BR')}</strong></Typography>
                                </Box>
                                {repoInfo.topics && repoInfo.topics.length > 0 && (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                    <Tag size={12} />
                                    {repoInfo.topics.slice(0, 8).map((topic) => (
                                      <Typography key={topic} variant="caption" sx={{ px: 1, py: 0.25, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1 }}>{topic}</Typography>
                                    ))}
                                    {repoInfo.topics.length > 8 && <Typography variant="caption" color="text.secondary">+{repoInfo.topics.length - 8}</Typography>}
                                  </Box>
                                )}
                              </Box>
                            )}
                          </>
                        )}
                        {githubLoading && !repoInfo && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={14} /> <Typography variant="caption" color="text.secondary">Carregando informações do repositório...</Typography>
                          </Box>
                        )}
                      </Paper>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Settings size={18} /> Configurações
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Pencil size={14} /> Editar card — Link do projeto
                        </Typography>
                        <TextField
                          size="small"
                          type="url"
                          value={editProjectUrl}
                          onChange={(e) => setEditProjectUrl(e.target.value)}
                          placeholder="https://app.exemplo.com"
                          fullWidth
                        />
                        <Button variant="contained" size="small" onClick={async () => { setEditUrlLoading(true); try { await onUpdate({ ...project, project_url: editProjectUrl || null }); } finally { setEditUrlLoading(false); } }} disabled={editUrlLoading}>
                          {editUrlLoading ? 'Salvando...' : 'Salvar link'}
                        </Button>
                      </Box>
                      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5, mt: 1.5 }}>
                        <Button variant="outlined" color="error" size="small" onClick={() => setDeleteConfirmStep(1)} disabled={!onDelete} startIcon={<Trash2 size={20} />}>
                          Excluir este card
                        </Button>
                      </Box>
                    </Paper>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmStep > 0} onClose={() => setDeleteConfirmStep(0)} maxWidth="xs" fullWidth>
        <DialogTitle>{deleteConfirmStep === 1 ? 'Excluir projeto?' : 'Confirmar exclusão'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteConfirmStep === 1
              ? `Tem certeza que deseja excluir o projeto "${project.name}"? Esta ação não pode ser desfeita.`
              : 'Para confirmar, clique em "Sim, excluir". O projeto será removido permanentemente.'}
          </Typography>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 3, pb: 2 }}>
          {deleteConfirmStep === 1 ? (
            <>
              <Button onClick={() => setDeleteConfirmStep(0)}>Cancelar</Button>
              <Button variant="contained" color="error" onClick={() => setDeleteConfirmStep(2)}>Excluir</Button>
            </>
          ) : (
            <>
              <Button onClick={() => setDeleteConfirmStep(1)}>Voltar</Button>
              <Button variant="contained" color="error" onClick={handleExcluirCard} disabled={deleteLoading} startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : undefined}>
                {deleteLoading ? 'Excluindo...' : 'Sim, excluir'}
              </Button>
            </>
          )}
        </Box>
      </Dialog>
    </>
  )
}
