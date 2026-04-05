import { useEffect, useMemo, useState } from 'react'
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@/compat/mui/material'
import {
  Calendar,
  CheckSquare,
  MessageCircleIcon,
  Settings,
  Trash2,
  Pencil,
} from '@/components/ui/icons'
import { Project } from '@/types'
import { useTodos } from '@/hooks/use-todos'
import { useProjectResponsibleUsers } from '@/hooks/use-project-responsible-users'
import { DeliveryHeatAssigneeInline } from '@/components/gamification/DeliveryHeatAssigneeInline'
import { TodoList } from './todo-list'
import { CommentsSection } from './comments-section'

const formatCompactValue = (value: number): string => {
  if (!Number.isFinite(value)) return '0'

  const normalized = Number(value.toFixed(1))
  return normalized.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(normalized) ? 0 : 1,
    maximumFractionDigits: 1,
  })
}

const getElapsedDays = (startAt: string, endAt: string): number => {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0

  const msPerDay = 1000 * 60 * 60 * 24
  return Math.max(1, Math.ceil((end - start) / msPerDay))
}

interface ProjectCardDialogProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (projectId: string, updates: Partial<Project>) => Promise<unknown>
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
  const { users } = useProjectResponsibleUsers()
  const { todos, loading: todosLoading } = useTodos(open && project ? { projectId: project.id } : null)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<0 | 1 | 2>(0)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editProjectUrl, setEditProjectUrl] = useState('')
  const [editUrlLoading, setEditUrlLoading] = useState(false)
  const [editResponsibleUserId, setEditResponsibleUserId] = useState('')
  const [editResponsibleLoading, setEditResponsibleLoading] = useState(false)
  const [isEditingResponsible, setIsEditingResponsible] = useState(false)

  useEffect(() => {
    if (open && project) {
      setEditProjectUrl(project.project_url || '')
      setEditResponsibleUserId(project.responsible_user_id || '')
      setIsEditingResponsible(false)
    }
  }, [open, project])

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

  const projectSummary = useMemo(() => {
    if (!project) {
      return {
        totalTodos: 0,
        completedCount: 0,
        completionRate: 0,
        totalDeliveredXp: 0,
        durationDays: 0,
        latestDeliveryAt: null as string | null,
        topDelivererCount: 0,
        topDelivererName: null as string | null,
        isFinished: false,
      }
    }

    const totalTodos = todos.length
    const completedTodos = todos.filter((todo) => todo.completed)
    const completedCount = completedTodos.length
    const completionRate = totalTodos > 0 ? Math.round((completedCount / totalTodos) * 100) : 0
    const totalDeliveredXp = completedTodos.reduce(
      (sum, todo) => sum + Number(todo.xp_reward ?? 1),
      0,
    )
    const latestDeliveryAt = completedTodos.reduce<string | null>((latest, todo) => {
      const current = todo.completed_at ?? todo.updated_at ?? null

      if (!current) return latest
      if (!latest) return current

      return new Date(current).getTime() > new Date(latest).getTime() ? current : latest
    }, null)
    const durationReference =
      latestDeliveryAt ??
      (project.status === 'done' ? project.updated_at : new Date().toISOString())
    const durationDays = getElapsedDays(project.created_at, durationReference)

    const deliveriesByUser = completedTodos.reduce<
      Array<{ userId: string | null; count: number; xp: number }>
    >((acc, todo) => {
      const userId = todo.assigned_to ?? todo.created_by ?? null
      const xp = Number(todo.xp_reward ?? 1)
      const existing = acc.find((entry) => entry.userId === userId)

      if (existing) {
        existing.count += 1
        existing.xp += xp
        return acc
      }

      acc.push({ userId, count: 1, xp })
      return acc
    }, [])

    deliveriesByUser.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      if (b.xp !== a.xp) return b.xp - a.xp
      return (a.userId ?? '').localeCompare(b.userId ?? '')
    })

    const topDeliverer = deliveriesByUser[0]
    const topDelivererName = topDeliverer
      ? users.find((user) => user.id === topDeliverer.userId)?.name ?? 'Sem responsável'
      : null

    return {
      totalTodos,
      completedCount,
      completionRate,
      totalDeliveredXp,
      durationDays,
      latestDeliveryAt,
      topDelivererCount: topDeliverer?.count ?? 0,
      topDelivererName,
      isFinished: project.status === 'done',
    }
  }, [project, todos, users])

  if (!project) return null

  const displayedResponsibleName =
    users.find((user) => user.id === (project.responsible_user_id ?? ''))?.name ??
    (project.responsible_user_id ? 'Responsavel vinculado' : 'Sem responsavel...')

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
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, height: 'calc(90vh - 120px)' }}>
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

                        {!isEditingResponsible ? (
                          <Box
                            sx={{
                              mt: 0.5,
                              px: 1.5,
                              py: 1.1,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                            }}
                          >
                            <DeliveryHeatAssigneeInline userId={project.responsible_user_id}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Responsavel do projeto
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                  {displayedResponsibleName}
                                </Typography>
                              </Box>
                            </DeliveryHeatAssigneeInline>
                            <IconButton
                              size="small"
                              onClick={() => setIsEditingResponsible(true)}
                              aria-label="Editar responsavel do projeto"
                            >
                              <Pencil size={16} />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <FormControl size="small" fullWidth>
                              <InputLabel id="project-responsible-edit-label">Responsavel do projeto</InputLabel>
                              <Select
                                labelId="project-responsible-edit-label"
                                value={editResponsibleUserId}
                                label="Responsavel do projeto"
                                onChange={(event) => setEditResponsibleUserId(String(event.target.value))}
                                inputProps={{ 'aria-label': 'Responsavel do projeto' }}
                              >
                                <MenuItem value="">Sem responsavel...</MenuItem>
                                {users.map((user) => (
                                  <MenuItem key={user.id} value={user.id}>
                                    {user.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                              <Button
                                size="small"
                                onClick={() => {
                                  setEditResponsibleUserId(project.responsible_user_id || '')
                                  setIsEditingResponsible(false)
                                }}
                                disabled={editResponsibleLoading}
                              >
                                Cancelar
                              </Button>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={async () => {
                                  setEditResponsibleLoading(true)
                                  try {
                                    await onUpdate(project.id, { responsible_user_id: editResponsibleUserId || null })
                                    setIsEditingResponsible(false)
                                  } finally {
                                    setEditResponsibleLoading(false)
                                  }
                                }}
                                disabled={editResponsibleLoading || editResponsibleUserId === (project.responsible_user_id || '')}
                              >
                                {editResponsibleLoading ? 'Salvando...' : 'Salvar'}
                              </Button>
                            </Box>
                          </Box>
                        )}
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
                        <Button variant="contained" size="small" onClick={async () => { setEditUrlLoading(true); try { await onUpdate(project.id, { project_url: editProjectUrl || null }); } finally { setEditUrlLoading(false); } }} disabled={editUrlLoading}>
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
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Resumo do Projeto</Typography>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      {todosLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={14} />
                          <Typography variant="caption" color="text.secondary">
                            Calculando resumo...
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                              gap: 1,
                            }}
                          >
                            <Box sx={{ px: 1.25, py: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
                              <Typography variant="caption" color="text.secondary">
                                To-dos
                              </Typography>
                              <Typography variant="subtitle2">
                                {projectSummary.completedCount}/{projectSummary.totalTodos}
                              </Typography>
                            </Box>
                            <Box sx={{ px: 1.25, py: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
                              <Typography variant="caption" color="text.secondary">
                                XP entregue
                              </Typography>
                              <Typography variant="subtitle2">
                                {formatCompactValue(projectSummary.totalDeliveredXp)}
                              </Typography>
                            </Box>
                            <Box sx={{ px: 1.25, py: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
                              <Typography variant="caption" color="text.secondary">
                                Duração
                              </Typography>
                              <Typography variant="subtitle2">
                                {projectSummary.durationDays}d
                              </Typography>
                            </Box>
                            <Box sx={{ px: 1.25, py: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
                              <Typography variant="caption" color="text.secondary">
                                Destaque
                              </Typography>
                              <Typography variant="subtitle2" noWrap>
                                {projectSummary.topDelivererName ?? 'Sem entregas'}
                              </Typography>
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                              flexWrap: 'wrap',
                              pt: 1,
                              borderTop: 1,
                              borderColor: 'divider',
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {projectSummary.totalTodos > 0
                                ? `${projectSummary.completionRate}% concluído`
                                : 'Sem to-dos cadastrados'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {projectSummary.latestDeliveryAt
                                ? `Última entrega ${new Date(projectSummary.latestDeliveryAt).toLocaleDateString('pt-BR')}`
                                : 'Nenhuma entrega concluída'}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {projectSummary.topDelivererName
                              ? `${projectSummary.topDelivererName} lidera com ${projectSummary.topDelivererCount} to-do${projectSummary.topDelivererCount === 1 ? '' : 's'} concluído${projectSummary.topDelivererCount === 1 ? '' : 's'}.`
                              : projectSummary.isFinished
                                ? 'Projeto finalizado sem entregas vinculadas em to-dos.'
                                : 'Projeto ainda sem entregas registradas.'}
                          </Typography>
                        </Box>
                      )}
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
