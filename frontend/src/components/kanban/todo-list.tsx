import { useState, useCallback, memo, useMemo } from 'react'
import * as React from 'react'
import {
  Box,
  TextField,
  IconButton,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Typography,
  InputAdornment,
  Chip,
  Tooltip,
  Autocomplete,
  ClickAwayListener,
} from '@mui/material'
import { Trash2, GripVertical, Plus, Pencil } from '@/components/ui/icons'
import type { ProjectTodo, User } from '@/types'
import { useTodos, type TodosScope, type SharedProjectTodosApi } from '@/hooks/use-todos'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/contexts/AuthContext'
import { fireTodoCompleteToast } from '@/components/achievements/TodoCompleteToast'
import { useUsersList } from '@/hooks/use-users-list'
import { useAchievements } from '@/hooks/use-achievements'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const API_URL = import.meta.env.VITE_API_URL || ''

// ---------------------------------------------------------------------------
// XP float animation
// ---------------------------------------------------------------------------
function formatXp(value: number): string {
  if (!Number.isFinite(value)) return '0.00'
  return value.toFixed(2)
}

function triggerXpFloat(xp: number, event: React.MouseEvent | null) {
  const el = document.createElement('div')
  el.className = 'xp-float-anim'
  el.textContent = `+${formatXp(xp)} XP`
  el.style.left = event ? `${event.clientX - 20}px` : '50%'
  el.style.top = event ? `${event.clientY - 10}px` : '50%'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1500)
}

function triggerXpDeduction(xp: number, event: React.MouseEvent | null) {
  const el = document.createElement('div')
  el.className = 'xp-float-anim xp-deduction-anim'
  el.textContent = `−${formatXp(xp)} XP`
  el.style.left = event ? `${event.clientX - 20}px` : '50%'
  el.style.top = event ? `${event.clientY - 10}px` : '50%'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1500)
}

// ---------------------------------------------------------------------------
// Notifica admins sobre TO-DO sem XP
// ---------------------------------------------------------------------------
async function notifyAdminsAboutMissingXp(
  todoTitle: string,
  contextName: string,
  headers: Record<string, string>,
) {
  try {
    await fetch(`${API_URL}/api/notifications`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'todo_no_xp',
        title: 'TO-DO sem XP definido',
        message: `O TO-DO "${todoTitle}" (em "${contextName}") foi criado sem XP. Acesse o card para definir o valor.`,
        target_role: 'admin',
      }),
    })
  } catch {
    // silencioso — notificação é secundária
  }
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
type TodoListProps = (
  | { projectId: string; activityId?: never; contextName?: string }
  | { activityId: string; projectId?: never; contextName?: string }
) & {
  highlightedTodoId?: string | null
  sharedTodos?: SharedProjectTodosApi
}

interface TodoItemProps {
  todo: ProjectTodo
  onToggle: (id: string, completed: boolean, event: React.MouseEvent) => void
  onDelete: (id: string) => void
  onAssign: (id: string, userId: string | null) => void
  onUpdateXp: (id: string, xp: number) => void
  users: User[]
  usersLoading: boolean
  isHighlighted?: boolean
  canManage: boolean
}

// ---------------------------------------------------------------------------
// TodoItem
// ---------------------------------------------------------------------------
const TodoItem = memo(function TodoItem({
  todo,
  onToggle,
  onDelete,
  onAssign,
  onUpdateXp,
  users,
  usersLoading,
  isHighlighted,
  canManage,
}: TodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, disabled: !canManage })

  const itemRef = React.useRef<HTMLDivElement>(null)
  const [shouldHighlight, setShouldHighlight] = React.useState(false)
  const [editingXp, setEditingXp] = React.useState(false)
  const [xpInputVal, setXpInputVal] = React.useState<string>('')

  React.useEffect(() => {
    if (isHighlighted && itemRef.current) {
      setTimeout(() => {
        itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
      setShouldHighlight(true)
      const timer = setTimeout(() => setShouldHighlight(false), 1500)
      return () => clearTimeout(timer)
    } else {
      setShouldHighlight(false)
    }
  }, [isHighlighted])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const deadlineChip = todo.deadline
    ? (() => {
        const isOverdue = new Date(todo.deadline) < new Date() && !todo.completed
        return (
          <Chip
            size="small"
            label={new Date(todo.deadline).toLocaleDateString('pt-BR')}
            sx={{
              height: 18,
              fontSize: 10,
              fontWeight: 600,
              bgcolor: isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              color: isOverdue ? '#EF4444' : '#F59E0B',
              border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        )
      })()
    : null

  function startEditXp() {
    setXpInputVal(todo.xp_reward ? String(todo.xp_reward) : '')
    setEditingXp(true)
  }

  function commitXp() {
    const val = parseFloat(xpInputVal)
    if (!isNaN(val) && val > 0) onUpdateXp(todo.id, val)
    setEditingXp(false)
  }

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        setNodeRef(node as HTMLElement | null)
        ;(itemRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      component="div"
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        borderRadius: 1,
        width: '100%',
        transition: 'all 0.2s',
        ...(shouldHighlight
          ? { bgcolor: 'warning.light', border: 2, borderColor: 'warning.main', boxShadow: 2 }
          : { '&:hover': { bgcolor: 'action.hover' }, '&:hover .delete-btn': { opacity: 1 }, '&:hover .xp-edit-btn': { opacity: 1 } }),
      }}
    >
      {canManage && (
        <Box {...attributes} {...listeners} sx={{ cursor: 'grab', color: 'text.secondary', '&:active': { cursor: 'grabbing' } }}>
          <GripVertical size={18} />
        </Box>
      )}

      <Checkbox
        size="small"
        checked={todo.completed}
        onChange={(e) => {
          const nativeEvent = e.nativeEvent as MouseEvent
          onToggle(todo.id, e.target.checked, {
            clientX: nativeEvent.clientX,
            clientY: nativeEvent.clientY,
          } as React.MouseEvent)
        }}
      />

      {/* Title + chips */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ ...(todo.completed && { textDecoration: 'line-through', color: 'text.secondary' }) }}
        >
          {todo.title}
        </Typography>

        {(todo.xp_reward || todo.deadline || todo.achievement_id || canManage) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
            {/* XP chip + edit inline */}
            {canManage ? (
              editingXp ? (
                <ClickAwayListener onClickAway={commitXp}>
                  <TextField
                    size="small"
                    autoFocus
                    type="number"
                    value={xpInputVal}
                    onChange={(e) => setXpInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitXp()
                      if (e.key === 'Escape') setEditingXp(false)
                    }}
                    inputProps={{ min: 0.01, max: 500, step: 0.01 }}
                    placeholder="XP"
                    sx={{ width: 90, '& input': { py: 0.25, fontSize: 11 } }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end"><Typography variant="caption">XP</Typography></InputAdornment>,
                    }}
                  />
                </ClickAwayListener>
              ) : todo.xp_reward && todo.xp_reward > 0 ? (
                <Tooltip title="Editar XP" arrow>
                  <Chip
                    size="small"
                    label={`+${formatXp(todo.xp_reward)} XP`}
                    onClick={startEditXp}
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: 'rgba(124,58,237,0.1)',
                      color: '#7C3AED',
                      border: '1px solid rgba(124,58,237,0.2)',
                      cursor: 'pointer',
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="Definir XP" arrow>
                  <Chip
                    size="small"
                    icon={<Pencil size={10} />}
                    label="Definir XP"
                    onClick={startEditXp}
                    className="xp-edit-btn"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 600,
                      opacity: 0,
                      bgcolor: 'rgba(124,58,237,0.06)',
                      color: '#7C3AED',
                      border: '1px dashed rgba(124,58,237,0.3)',
                      cursor: 'pointer',
                      transition: 'opacity 0.15s',
                      '& .MuiChip-label': { px: 0.75 },
                      '& .MuiChip-icon': { fontSize: 10, ml: 0.5 },
                    }}
                  />
                </Tooltip>
              )
            ) : todo.xp_reward && todo.xp_reward > 0 ? (
              <Chip
                size="small"
                label={`+${formatXp(todo.xp_reward)} XP`}
                sx={{
                  height: 18,
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: 'rgba(124,58,237,0.1)',
                  color: '#7C3AED',
                  border: '1px solid rgba(124,58,237,0.2)',
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ) : null}

            {deadlineChip}

            {todo.achievement_id && (
              <Tooltip title="Tem conquista vinculada" arrow>
                <Chip
                  size="small"
                  label="🏆"
                  sx={{
                    height: 18,
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: 'rgba(245,158,11,0.1)',
                    color: '#F59E0B',
                    border: '1px solid rgba(245,158,11,0.3)',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      <Autocomplete
        size="small"
        sx={{ minWidth: 168, maxWidth: 220, flexShrink: 0 }}
        disabled={todo.completed || !canManage}
        loading={usersLoading}
        options={users}
        getOptionLabel={(u) => u.name || u.email || u.id}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        value={users.find((u) => u.id === todo.assigned_to) ?? null}
        onChange={(_, v) => onAssign(todo.id, v?.id ?? null)}
        renderInput={(params) => (
          <TextField {...params} placeholder="Responsável" size="small" />
        )}
        slotProps={{
          popper: {
            disablePortal: true,
            placement: 'bottom-start',
            sx: { zIndex: (t) => t.zIndex.modal + 2 },
          },
        }}
        noOptionsText={usersLoading ? 'Carregando usuários…' : 'Nenhum usuário'}
      />

      {canManage && (
        <IconButton className="delete-btn" size="small" onClick={() => onDelete(todo.id)} sx={{ opacity: 0 }}>
          <Trash2 size={16} />
        </IconButton>
      )}
    </Box>
  )
})

// ---------------------------------------------------------------------------
// TodoList
// ---------------------------------------------------------------------------
export function TodoList(props: TodoListProps) {
  const { highlightedTodoId, sharedTodos, contextName = '' } = props
  const activityIdKey = 'activityId' in props ? props.activityId : undefined
  const projectIdKey = 'projectId' in props ? props.projectId : undefined
  const scope: TodosScope | null = useMemo(() => {
    if (activityIdKey) return { activityId: activityIdKey }
    if (projectIdKey) return { projectId: projectIdKey }
    return null
  }, [activityIdKey, projectIdKey])

  const projectId = 'projectId' in props ? props.projectId : undefined
  const activityId = 'activityId' in props ? props.activityId : undefined

  const internal = useTodos(sharedTodos ? null : scope)
  const { todos, loading, createTodo, updateTodo, deleteTodo, reorderTodos } = sharedTodos ?? internal
  const { hasRole } = usePermissions()
  const { currentUser, getAuthHeaders } = useAuth()
  const { users, loading: usersLoading, error: usersError } = useUsersList()
  const { achievements } = useAchievements()
  const isAdmin = hasRole('admin')

  // Todos visíveis: admin vê todos; usuário vê apenas os atribuídos a si
  const visibleTodos = useMemo(
    () => isAdmin ? todos : todos.filter((t) => t.assigned_to === currentUser?.id),
    [todos, isAdmin, currentUser?.id],
  )

  // Estados de criação
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [newTodoXp, setNewTodoXp] = useState(1)
  const [newTodoDeadline, setNewTodoDeadline] = useState('')
  const [newTodoDeadlineBonusPercent, setNewTodoDeadlineBonusPercent] = useState(0)
  const [newTodoAchievementId, setNewTodoAchievementId] = useState<string | null>(null)
  const [newTodoAssignee, setNewTodoAssignee] = useState<User | null>(null)

  const linkedAchievements = achievements.filter(
    (a) => (a.mode ?? 'global_auto') === 'linked_item'
  )

  if (usersError) console.error('Erro ao carregar usuários:', usersError)

  const completedCount = visibleTodos.filter((t) => t.completed).length
  const totalCount = visibleTodos.length
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = todos.findIndex((t) => t.id === active.id)
      const newIndex = todos.findIndex((t) => t.id === over.id)
      const newTodos = arrayMove(todos, oldIndex, newIndex)
      try {
        await reorderTodos(newTodos.map((t) => t.id))
      } catch (error) {
        console.error('Error reordering todos:', error)
      }
    }
  }

  // Admin precisa de: título + prazo + XP + responsável
  const canSubmitAdmin =
    Boolean(newTodoTitle.trim()) &&
    Boolean(newTodoDeadline) &&
    newTodoXp >= 0.01 &&
    newTodoAssignee != null

  // Usuário precisa de: título + prazo (sem XP)
  const canSubmitUser =
    Boolean(newTodoTitle.trim()) &&
    Boolean(newTodoDeadline)

  const canSubmitNewTodo = isAdmin ? canSubmitAdmin : canSubmitUser

  const handleCreateTodo = async () => {
    if (!canSubmitNewTodo) return
    // Usuário: assignee é o próprio; admin: usa o que selecionou
    const assigneeId = isAdmin ? newTodoAssignee?.id ?? null : (currentUser?.id ?? null)
    if (!assigneeId) return

    const deadlineIso = newTodoDeadline
      ? new Date(`${newTodoDeadline}T12:00:00`).toISOString()
      : undefined

    try {
      await createTodo({
        ...(projectId ? { project_id: projectId } : { activity_id: activityId as string }),
        title: newTodoTitle.trim(),
        assigned_to: assigneeId,
        xp_reward: isAdmin ? newTodoXp : 0,
        deadline: deadlineIso,
        deadline_bonus_percent: isAdmin ? newTodoDeadlineBonusPercent : 0,
        achievement_id: isAdmin ? (newTodoAchievementId || undefined) : undefined,
      })

      // Se criado sem XP, notifica admins
      if (!isAdmin) {
        void notifyAdminsAboutMissingXp(newTodoTitle.trim(), contextName, getAuthHeaders())
      }

      setNewTodoTitle('')
      setNewTodoXp(1)
      setNewTodoDeadline('')
      setNewTodoDeadlineBonusPercent(0)
      setNewTodoAchievementId(null)
      setNewTodoAssignee(null)
    } catch (error) {
      console.error('Error creating todo:', error)
    }
  }

  const handleAssign = useCallback(
    async (todoId: string, userId: string | null) => {
      try {
        await updateTodo(todoId, { assigned_to: userId })
      } catch (error) {
        console.error('Error assigning todo:', error)
      }
    },
    [updateTodo],
  )

  const handleUpdateXp = useCallback(
    async (todoId: string, xp: number) => {
      try {
        await updateTodo(todoId, { xp_reward: xp })
      } catch (error) {
        console.error('Error updating XP:', error)
      }
    },
    [updateTodo],
  )

  const handleToggle = useCallback(
    async (id: string, completed: boolean, event: React.MouseEvent) => {
      try {
        if (completed) {
          const todo = todos.find((t) => t.id === id)
          const xp = todo?.xp_reward ?? 0
          if (xp > 0) triggerXpFloat(xp, event)
          fireTodoCompleteToast({ title: todo?.title ?? 'TO-DO', xp })
        }
        await updateTodo(id, { completed })
      } catch (error) {
        console.error('Error updating todo:', error)
      }
    },
    [todos, updateTodo],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteTodo(id)
      } catch (error) {
        console.error('Error deleting todo:', error)
      }
    },
    [deleteTodo],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {totalCount > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Progresso</Typography>
            <Typography variant="caption" fontWeight={500}>{progressPercentage}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={progressPercentage} sx={{ height: 8, borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 0.5 }}>
            {completedCount} de {totalCount} concluídos
          </Typography>
        </Box>
      )}

      {/* Formulário de criação — admin (completo) */}
      {isAdmin ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              size="small"
              fullWidth
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (canSubmitNewTodo) void handleCreateTodo()
                }
              }}
              placeholder="Título do to-do…"
              label="Título"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={canSubmitNewTodo ? 'Adicionar' : 'Preencha prazo, XP e responsável'} arrow>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => void handleCreateTodo()}
                          disabled={!canSubmitNewTodo}
                        >
                          <Plus size={24} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.4 }}>
              Configurações do to-do (obrigatórias para lançar)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <TextField
                label="XP base"
                type="number"
                size="small"
                required
                value={newTodoXp}
                onChange={(e) => setNewTodoXp(Math.max(0.01, Math.min(500, Number(e.target.value))))}
                inputProps={{ min: 0.01, max: 500, step: 0.01 }}
                sx={{ width: 110 }}
              />
              <TextField
                label="Prazo"
                type="date"
                size="small"
                required
                value={newTodoDeadline}
                onChange={(e) => setNewTodoDeadline(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 158 }}
              />
              <TextField
                label="% bônus prazo"
                type="number"
                size="small"
                value={newTodoDeadlineBonusPercent}
                onChange={(e) => setNewTodoDeadlineBonusPercent(Math.max(0, Math.min(500, Number(e.target.value))))}
                inputProps={{ min: 0, max: 500, step: 0.01 }}
                sx={{ width: 130 }}
              />
              <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel id="new-todo-achievement-label">Conquista (opcional)</InputLabel>
                <Select
                  labelId="new-todo-achievement-label"
                  label="Conquista (opcional)"
                  value={newTodoAchievementId ?? ''}
                  onChange={(e) => setNewTodoAchievementId(e.target.value || null)}
                >
                  <MenuItem value="">Nenhuma</MenuItem>
                  {linkedAchievements.map((a) => (
                    <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Autocomplete
              size="small"
              fullWidth
              options={users}
              loading={usersLoading}
              value={newTodoAssignee}
              onChange={(_, v) => setNewTodoAssignee(v)}
              getOptionLabel={(u) => u.name || u.email}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField {...params} label="Responsável" required placeholder="Busque por nome…" />
              )}
              slotProps={{
                popper: {
                  disablePortal: true,
                  placement: 'bottom-start',
                  sx: { zIndex: (t) => t.zIndex.modal + 2 },
                },
              }}
              noOptionsText={usersLoading ? 'Carregando usuários…' : 'Nenhum usuário'}
            />
            {!canSubmitNewTodo && newTodoTitle.trim() && (
              <Typography variant="caption" color="warning.main">
                Informe prazo, XP válido e um responsável para adicionar o to-do.
              </Typography>
            )}
          </Box>
        </Box>
      ) : (
        /* Formulário simplificado para usuário comum */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              size="small"
              fullWidth
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (canSubmitNewTodo) void handleCreateTodo()
                }
              }}
              placeholder="Título do to-do…"
              label="Título"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={canSubmitNewTodo ? 'Adicionar' : 'Informe um título e prazo'} arrow>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => void handleCreateTodo()}
                          disabled={!canSubmitNewTodo}
                        >
                          <Plus size={24} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Prazo"
              type="date"
              size="small"
              required
              value={newTodoDeadline}
              onChange={(e) => setNewTodoDeadline(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 158, flexShrink: 0 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>
            O to-do será atribuído a você. Um administrador definirá o XP.
          </Typography>
        </Box>
      )}

      {loading && visibleTodos.length === 0 ? (
        <Box sx={{ py: 2 }}>
          <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Carregando to-dos…
          </Typography>
        </Box>
      ) : visibleTodos.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
          {isAdmin ? 'Nenhum item na lista.' : 'Nenhum to-do atribuído a você neste item.'}
        </Typography>
      ) : isAdmin ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {loading && (
                <LinearProgress sx={{ mb: 0.5, borderRadius: 1 }} color="primary" variant="indeterminate" />
              )}
              {visibleTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onAssign={handleAssign}
                  onUpdateXp={handleUpdateXp}
                  users={users}
                  usersLoading={usersLoading}
                  isHighlighted={highlightedTodoId === todo.id}
                  canManage={true}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {loading && (
            <LinearProgress sx={{ mb: 0.5, borderRadius: 1 }} color="primary" variant="indeterminate" />
          )}
          {visibleTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onAssign={handleAssign}
              onUpdateXp={handleUpdateXp}
              users={users}
              usersLoading={usersLoading}
              isHighlighted={highlightedTodoId === todo.id}
              canManage={false}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
