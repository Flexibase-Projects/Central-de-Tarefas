import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Paper,
  CircularProgress,
  InputAdornment,
  Stack,
  Chip,
} from '@mui/material'
import { alpha, type Theme } from '@mui/material/styles'
import {
  Calendar,
  Trash2,
  Settings,
  CheckSquare,
  MessageCircleIcon,
  Sparkles,
} from '@/components/ui/icons'
import { Activity } from '@/types'
import { useAchievements } from '@/hooks/use-achievements'
import { useTodos } from '@/hooks/use-todos'
import { TodoList } from './todo-list'
import { CommentsSection } from './comments-section'
import { getStatusLabel } from '@/lib/status-labels'

interface ActivityCardDialogProps {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (activity: Activity) => Promise<void>
  onDelete?: (activityId: string) => Promise<void>
  highlightedTodoId?: string | null
}

const statusOptions: { value: Activity['status']; label: string }[] = [
  { value: 'backlog', label: getStatusLabel('backlog') },
  { value: 'todo', label: getStatusLabel('todo') },
  { value: 'in_progress', label: getStatusLabel('in_progress') },
  { value: 'review', label: getStatusLabel('review') },
  { value: 'done', label: getStatusLabel('done') },
]

const priorityOptions: { value: Activity['priority']; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
]

function sectionPaperSx(theme: Theme) {
  return {
    p: 2,
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
    bgcolor: alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.55 : 0.65),
    boxShadow: 'none',
  }
}

function formatXpLabel(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

export function ActivityCardDialog({
  activity,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  highlightedTodoId,
}: ActivityCardDialogProps) {
  const { achievements } = useAchievements()
  const linkedAchievements = achievements.filter(
    (a) => ['linked_item', 'manual'].includes(a.mode ?? 'global_auto')
  )

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'backlog' as Activity['status'],
    priority: 'medium' as Activity['priority'],
    due_date: '' as string,
    xp_reward: 1,
    deadline_bonus_percent: 0,
    achievement_id: '' as string,
  })
  const [loading, setLoading] = useState(false)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<0 | 1 | 2>(0)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (activity) {
      setFormData({
        name: activity.name,
        description: activity.description ?? '',
        status: activity.status,
        priority: activity.priority,
        due_date: activity.due_date ? new Date(activity.due_date).toISOString().slice(0, 10) : '',
        xp_reward: activity.xp_reward ?? 1,
        deadline_bonus_percent: activity.deadline_bonus_percent ?? 0,
        achievement_id: activity.achievement_id ?? '',
      })
    }
  }, [activity])

  const todosScope = useMemo(
    () => (open && activity ? { activityId: activity.id } : null),
    [open, activity?.id],
  )
  const activityTodosApi = useTodos(todosScope)
  const linkedActivityTodos = activityTodosApi.todos

  if (!activity) return null

  const activityBaseXp = Math.max(0, Number(formData.xp_reward ?? 1))
  const todosXpPotential = linkedActivityTodos.reduce(
    (sum, t) => sum + Math.max(0, Number(t.xp_reward ?? 1)),
    0,
  )
  const totalXpPotential = activityBaseXp + todosXpPotential
  const linkedTodoCount = linkedActivityTodos.length

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onUpdate({
        ...activity,
        ...formData,
        description: formData.description || null,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        cover_image_url: activity.cover_image_url ?? null,
        xp_reward: formData.xp_reward,
        deadline_bonus_percent: formData.deadline_bonus_percent,
        achievement_id: formData.achievement_id || null,
      })
    } catch (error) {
      console.error('Error updating activity:', error)
    } finally {
      setLoading(false)
    }
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
    if (deleteConfirmStep === 2 && activity && onDelete) {
      setDeleteLoading(true)
      onDelete(activity.id)
        .then(() => {
          setDeleteConfirmStep(0)
          onOpenChange(false)
        })
        .catch(() => setDeleteLoading(false))
        .finally(() => setDeleteLoading(false))
    }
  }

  const statusLabel =
    statusOptions.find((o) => o.value === activity.status)?.label ?? activity.status.replace('_', ' ')
  const priorityLabel =
    priorityOptions.find((o) => o.value === activity.priority)?.label ?? activity.priority

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
        aria-labelledby="activity-dialog-title"
        scroll="paper"
        PaperProps={{
          sx: {
            maxHeight: '92vh',
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            boxShadow: (t) =>
              t.palette.mode === 'light'
                ? '0 25px 50px -12px rgba(15, 23, 42, 0.2)'
                : '0 24px 48px rgba(0,0,0,0.45)',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            px: 3,
            py: 2.5,
            minHeight: 100,
            background: (t) =>
              t.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.38)} 0%, ${alpha(
                    t.palette.primary.dark,
                    0.92
                  )} 100%)`
                : `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.14)} 0%, ${alpha(
                    t.palette.primary.light,
                    0.06
                  )} 42%, ${t.palette.background.paper} 100%)`,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            id="activity-dialog-title"
            variant="h5"
            component="h2"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              color: 'text.primary',
            }}
          >
            {activity.name}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.25 }}>
            <Chip
              size="small"
              label={statusLabel}
              sx={{
                height: 26,
                fontWeight: 700,
                border: 'none',
                bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.35 : 0.18),
              }}
            />
            <Chip
              size="small"
              label={priorityLabel}
              color={
                activity.priority === 'high'
                  ? 'error'
                  : activity.priority === 'medium'
                    ? 'warning'
                    : 'success'
              }
              sx={{ height: 26, fontWeight: 700 }}
            />
          </Stack>
          <Typography
            variant="body2"
            sx={{
              mt: 1.5,
              color: 'text.secondary',
              width: '100%',
              maxWidth: '100%',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {activity.description?.trim()
              ? activity.description
              : 'Sem descrição — use a seção Configurações para adicionar detalhes.'}
          </Typography>
        </Box>

        <DialogContent
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            p: 0,
            pt: 0,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
              gap: 3,
              height: 'calc(92vh - 220px)',
              minHeight: 280,
              px: 3,
              py: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <Box sx={{ flex: 1, overflow: 'auto', pr: { xs: 0, lg: 1 } }}>
                <Stack spacing={3}>
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, fontWeight: 700 }}
                    >
                      <CheckSquare size={18} /> TO-DO
                    </Typography>
                    <Paper variant="outlined" sx={(t) => ({ ...sectionPaperSx(t) })}>
                      <TodoList
                        activityId={activity.id}
                        sharedTodos={activityTodosApi}
                        contextName={activity.name}
                        highlightedTodoId={highlightedTodoId}
                      />
                    </Paper>
                  </Box>

                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, fontWeight: 700 }}
                    >
                      <MessageCircleIcon size={18} /> Comentários
                    </Typography>
                    <Paper variant="outlined" sx={(t) => ({ ...sectionPaperSx(t) })}>
                      <CommentsSection activityId={activity.id} />
                    </Paper>
                  </Box>
                </Stack>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Stack spacing={3}>
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, fontWeight: 700 }}
                    >
                      <Sparkles size={18} /> Resumo e gamificação
                    </Typography>
                    <Paper variant="outlined" sx={(t) => ({ ...sectionPaperSx(t) })}>
                      <Stack spacing={1.25}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                          <Chip size="small" label={statusLabel} variant="outlined" />
                          <Chip
                            size="small"
                            label={priorityLabel}
                            color={
                              activity.priority === 'high'
                                ? 'error'
                                : activity.priority === 'medium'
                                  ? 'warning'
                                  : 'success'
                            }
                            variant="outlined"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Calendar size={16} style={{ opacity: 0.7 }} />
                          <Typography variant="body2" color="text.secondary">
                            Criado em{' '}
                            <Typography component="span" variant="body2" color="text.primary" fontWeight={600}>
                              {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Typography>
                        </Box>
                        {activity.updated_at && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Calendar size={16} style={{ opacity: 0.7 }} />
                            <Typography variant="body2" color="text.secondary">
                              Atualizado em{' '}
                              <Typography component="span" variant="body2" color="text.primary" fontWeight={600}>
                                {new Date(activity.updated_at).toLocaleDateString('pt-BR')}
                              </Typography>
                            </Typography>
                          </Box>
                        )}
                        {activity.due_date && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Calendar size={16} style={{ opacity: 0.7 }} />
                            <Typography variant="body2" color="text.secondary">
                              Vencimento{' '}
                              <Typography component="span" variant="body2" color="text.primary" fontWeight={600}>
                                {new Date(activity.due_date).toLocaleDateString('pt-BR')}
                              </Typography>
                            </Typography>
                          </Box>
                        )}
                        <Box
                          sx={{
                            mt: 0.5,
                            pt: 1.25,
                            borderTop: 1,
                            borderColor: 'divider',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            Recompensa (gamificação)
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              Conclusão da atividade
                            </Typography>
                            <Chip
                              size="small"
                              label={`+${formatXpLabel(activityBaseXp)} XP`}
                              color="secondary"
                              variant="filled"
                              sx={{ fontWeight: 700 }}
                            />
                            {(formData.deadline_bonus_percent ?? 0) > 0 && (
                              <Chip
                                size="small"
                                label={`+${formData.deadline_bonus_percent}% bônus prazo`}
                                variant="outlined"
                              />
                            )}
                          </Box>
                          {linkedTodoCount > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                TO-DOs vinculados ({linkedTodoCount}) — soma base
                              </Typography>
                              <Chip
                                size="small"
                                label={`+${formatXpLabel(todosXpPotential)} XP`}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              Total possível (atividade + TO-DOs)
                            </Typography>
                            <Chip
                              size="small"
                              label={`+${formatXpLabel(totalXpPotential)} XP`}
                              color="primary"
                              variant="filled"
                              sx={{ fontWeight: 800 }}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                            Cada TO-DO concluído credita XP no perfil (como nos projetos). O valor acima soma a
                            recompensa da atividade ao encerrar com a soma dos <strong>xp_reward</strong> dos
                            TO-DOs vinculados; bônus de prazo e conquista vinculada entram no cálculo real ao
                            concluir.
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Box>

                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, fontWeight: 700 }}
                    >
                      <Settings size={18} /> Configurações
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                      Nome, descrição, prazo, XP e conquista vinculada
                    </Typography>
                    <Paper variant="outlined" sx={(t) => ({ ...sectionPaperSx(t) })}>
                      <form onSubmit={handleSaveSettings}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <TextField
                            label="Nome"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            size="small"
                            fullWidth
                          />
                          <TextField
                            label="Descrição"
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                          />
                          <FormControl size="small" fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                              value={formData.status}
                              label="Status"
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  status: e.target.value as Activity['status'],
                                })
                              }
                            >
                              {statusOptions.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl size="small" fullWidth>
                            <InputLabel>Prioridade</InputLabel>
                            <Select
                              value={formData.priority}
                              label="Prioridade"
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  priority: e.target.value as Activity['priority'],
                                })
                              }
                            >
                              {priorityOptions.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField
                            label="Vencimento"
                            type="date"
                            value={formData.due_date}
                            onChange={(e) =>
                              setFormData({ ...formData, due_date: e.target.value })
                            }
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            fullWidth
                          />
                          <TextField
                            label="XP"
                            type="number"
                            value={formData.xp_reward}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                xp_reward: Math.max(
                                  0.01,
                                  Math.min(1000, Number(e.target.value))
                                ),
                              })
                            }
                            inputProps={{ min: 0.01, max: 1000, step: 0.01 }}
                            size="small"
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Typography
                                    sx={{
                                      fontSize: 11,
                                      color: 'secondary.main',
                                      fontWeight: 700,
                                    }}
                                  >
                                    +
                                  </Typography>
                                </InputAdornment>
                              ),
                            }}
                          />
                          <TextField
                            label="% Bônus prazo"
                            type="number"
                            value={formData.deadline_bonus_percent}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                deadline_bonus_percent: Math.max(
                                  0,
                                  Math.min(500, Number(e.target.value))
                                ),
                              })
                            }
                            inputProps={{ min: 0, max: 500, step: 0.01 }}
                            size="small"
                            fullWidth
                          />
                          <FormControl size="small" fullWidth>
                            <InputLabel>Conquista vinculada</InputLabel>
                            <Select
                              value={formData.achievement_id}
                              label="Conquista vinculada"
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  achievement_id: String(e.target.value),
                                })
                              }
                            >
                              <MenuItem value="">Nenhuma</MenuItem>
                              {linkedAchievements.map((achievement) => (
                                <MenuItem key={achievement.id} value={achievement.id}>
                                  {achievement.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Button
                            type="submit"
                            variant="contained"
                            size="small"
                            disabled={loading}
                          >
                            {loading ? 'Salvando...' : 'Salvar alterações'}
                          </Button>
                        </Box>
                      </form>
                      {onDelete && (
                        <Box
                          sx={{
                            borderTop: 1,
                            borderColor: 'divider',
                            pt: 1.5,
                            mt: 1.5,
                          }}
                        >
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => setDeleteConfirmStep(1)}
                            startIcon={<Trash2 size={20} />}
                          >
                            Excluir esta atividade
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  </Box>
                </Stack>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmStep > 0}
        onClose={() => setDeleteConfirmStep(0)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          {deleteConfirmStep === 1 ? 'Excluir atividade?' : 'Confirmar exclusão'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteConfirmStep === 1
              ? `Tem certeza que deseja excluir a atividade "${activity.name}"? Esta ação não pode ser desfeita.`
              : 'Para confirmar, clique em "Sim, excluir". A atividade será removida permanentemente.'}
          </Typography>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 3, pb: 2 }}>
          {deleteConfirmStep === 1 ? (
            <>
              <Button onClick={() => setDeleteConfirmStep(0)}>Cancelar</Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => setDeleteConfirmStep(2)}
              >
                Excluir
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setDeleteConfirmStep(1)}>Voltar</Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleExcluirCard}
                disabled={deleteLoading}
                startIcon={
                  deleteLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : undefined
                }
              >
                {deleteLoading ? 'Excluindo...' : 'Sim, excluir'}
              </Button>
            </>
          )}
        </Box>
      </Dialog>
    </>
  )
}
