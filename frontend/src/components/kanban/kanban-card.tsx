import { useState, useEffect } from 'react'
import { Project } from '@/types'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useGitHub } from '@/hooks/use-github'
import { useTodos } from '@/hooks/use-todos'
import { useUsersList } from '@/hooks/use-users-list'
import { CheckSquare2, User, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

interface KanbanCardProps {
  project: Project
  onClick?: () => void
}

export function KanbanCard({ project, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })

  const { getCommitsCount } = useGitHub()
  const { todos } = useTodos(project.id)
  const { users } = useUsersList()
  const [commitsCount, setCommitsCount] = useState<number | null>(null)
  const [online, setOnline] = useState<boolean | null>(null)
  const [versionCheck, setVersionCheck] = useState<{ upToDate: boolean | null; loading: boolean; reason?: string }>({ upToDate: null, loading: false })

  useEffect(() => {
    if (project.github_url) {
      getCommitsCount(project.github_url)
        .then(setCommitsCount)
        .catch(() => setCommitsCount(0))
    } else {
      setCommitsCount(0)
    }
  }, [project.github_url, getCommitsCount])

  useEffect(() => {
    if (!project.project_url) {
      setOnline(null)
      return
    }
    const url = API_URL ? `${API_URL}/api/projects/health-check?url=${encodeURIComponent(project.project_url)}` : `/api/projects/health-check?url=${encodeURIComponent(project.project_url)}`
    fetch(url)
      .then((r) => r.json())
      .then((d) => setOnline(d.ok === true))
      .catch(() => setOnline(false))
  }, [project.project_url])

  useEffect(() => {
    if (!project.project_url || !project.github_url) {
      setVersionCheck({ upToDate: null, loading: false })
      return
    }
    setVersionCheck((v) => ({ ...v, loading: true }))
    const url = API_URL
      ? `${API_URL}/api/projects/version-check?projectUrl=${encodeURIComponent(project.project_url)}&githubUrl=${encodeURIComponent(project.github_url)}`
      : `/api/projects/version-check?projectUrl=${encodeURIComponent(project.project_url)}&githubUrl=${encodeURIComponent(project.github_url)}`
    fetch(url)
      .then((r) => r.json())
      .then((d) => setVersionCheck({ upToDate: d.upToDate ?? null, loading: false, reason: d.reason }))
      .catch(() => setVersionCheck({ upToDate: null, loading: false, reason: 'fetch_error' }))
  }, [project.project_url, project.github_url])

  // Filtrar TODOs pendentes e agrupar por responsável
  const pendingTodos = todos.filter(todo => !todo.completed)
  const todosByAssignee = pendingTodos.reduce((acc, todo) => {
    const assigneeId = todo.assigned_to || 'unassigned'
    if (!acc[assigneeId]) {
      acc[assigneeId] = []
    }
    acc[assigneeId].push(todo)
    return acc
  }, {} as Record<string, typeof pendingTodos>)

  // Criar lista de responsáveis com suas contagens
  const assigneesWithCounts = Object.entries(todosByAssignee)
    .map(([assigneeId, todos]) => {
      const user = assigneeId !== 'unassigned' ? users.find(u => u.id === assigneeId) : null
      return {
        assigneeId,
        count: todos.length,
        userName: user?.name || 'Sem responsável',
      }
    })
    .sort((a, b) => b.count - a.count) // Ordenar por quantidade (maior primeiro)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const statusColors = {
    backlog: 'bg-muted/50 border-border',
    todo: 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800',
    in_progress: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-800',
    review: 'bg-purple-50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800',
    done: 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800',
  }

  const priorityBadgeColors = {
    backlog: 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30',
    todo: 'bg-blue-500 text-white border-blue-600',
    in_progress: 'bg-yellow-500 text-white border-yellow-600',
    review: 'bg-purple-500 text-white border-purple-600',
    done: 'bg-green-500 text-white border-green-600',
  }

  // Usar total de commits ou 0 se não houver GitHub URL
  const displayNumber = commitsCount !== null ? commitsCount : 0

  // Bolinha à esquerda: verde = online, vermelho = offline, cinza = sem link (cor fixa)
  const statusDotClass =
    !project.project_url
      ? 'bg-muted-foreground/30 border-muted-foreground/40'
      : online === true
        ? 'bg-green-500 border-green-600'
        : online === false
          ? 'bg-red-500 border-red-600'
          : 'bg-muted-foreground/40 border-muted-foreground/50'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group cursor-grab active:cursor-grabbing rounded-lg border-2 p-4 shadow-sm transition-all hover:shadow-md relative',
        statusColors[project.status],
        isDragging && 'opacity-0'
      )}
    >
      {/* Bolinha: verde = online, vermelho = offline */}
      <div
        className={cn(
          'absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full border border-background z-10',
          statusDotClass
        )}
        title={project.project_url ? (online === true ? 'Online' : online === false ? 'Offline' : 'Verificando...') : 'Link não configurado'}
      />
      {/* Badge com total de commits */}
      {project.github_url && (
        <div className={cn(
          'absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md border-2 border-background z-10',
          priorityBadgeColors[project.status]
        )}>
          {commitsCount !== null ? String(displayNumber).padStart(2, '0') : '--'}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{project.name}</h3>
          <div className="h-px bg-border mt-2 mb-2" />
          {project.project_url && project.github_url && (
            <div className="flex items-center gap-1.5 text-xs mt-1.5">
              {versionCheck.loading ? (
                <span className="text-muted-foreground">Verificando versão...</span>
              ) : versionCheck.upToDate === true ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500 shrink-0" />
                  <span className="text-green-700 dark:text-green-400 font-medium">Atualizado — Última versão</span>
                </>
              ) : versionCheck.upToDate === false ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400 font-medium">Desatualizado — Atualize o deploy</span>
                </>
              ) : (
                <>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span
                    className="text-muted-foreground font-medium"
                    title={
                      versionCheck.reason === 'timeout'
                        ? 'Timeout ao acessar o site. O sistema em produção não expõe a versão. Para habilitar a verificação, adicione um endpoint ou meta tag — veja docs/VERSIONAMENTO_DEPLOY.md'
                        : versionCheck.reason === 'no_version_found'
                          ? 'Nenhuma versão encontrada na página. Para habilitar a verificação, adicione um endpoint ou meta tag — veja docs/VERSIONAMENTO_DEPLOY.md'
                          : versionCheck.reason === 'fetch_error'
                            ? 'Erro ao acessar o site. Para habilitar a verificação, adicione um endpoint ou meta tag — veja docs/VERSIONAMENTO_DEPLOY.md'
                            : 'O sistema em produção não expõe a versão. Para habilitar a verificação, adicione um endpoint ou meta tag — veja docs/VERSIONAMENTO_DEPLOY.md'
                    }
                  >
                    Não foi possível validar a versão
                  </span>
                </>
              )}
            </div>
          )}
          {project.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
           {pendingTodos.length > 0 && (
             <div className="flex flex-col gap-1.5 mt-2">
               {assigneesWithCounts.map((assignee, index) => (
                 <div
                   key={assignee.assigneeId}
                   className="relative flex items-center gap-2 px-2 py-1 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
                 >
                   <div className="flex items-center gap-2 min-w-0 flex-1">
                     <CheckSquare2 className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                     <span className="text-xs font-medium text-orange-700 dark:text-orange-300 whitespace-nowrap">
                       {assignee.count} pendente{assignee.count !== 1 ? 's' : ''}
                     </span>
                   </div>
                   <span className="absolute left-1/2 -translate-x-1/2 text-xs text-orange-600 dark:text-orange-400 pointer-events-none px-3 opacity-20">
                     •
                   </span>
                   <div className="flex items-center gap-1 min-w-0 flex-1 justify-start">
                     <User className="h-3 w-3 text-orange-600 dark:text-orange-400 shrink-0" />
                     <span className="text-xs font-medium text-orange-700 dark:text-orange-300 truncate">
                       {assignee.userName}
                     </span>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  )
}
