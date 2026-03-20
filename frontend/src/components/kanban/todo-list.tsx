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
} from '@mui/material'
import { Trash2, GripVertical, Plus } from '@/components/ui/icons'
import type { ProjectTodo, User } from '@/types'
import { useTodos, type TodosScope, type SharedProjectTodosApi } from '@/hooks/use-todos'
import { usePermissions } from '@/hooks/use-permissions'
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

// ---------------------------------------------------------------------------
// XP float animation — spawns a floating "+N XP" label at the click position
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

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
type TodoListProps = (
  | { projectId: string; activityId?: never }
  | { activityId: string; projectId?: never }
) & {
  highlightedTodoId?: string | null
  /** Mesmo retorno de useTodos no pai — evita GET duplicado (ex.: diálogo da atividade). */
  sharedTodos?: SharedProjectTodosApi
}

interface TodoItemProps {
  todo: ProjectTodo
  onToggle: (id: string, completed: boolean, event: React.MouseEvent) => void
  onDelete: (id: string) => void
  onAssign: (id: string, userId: string | null) => void
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

  React.useEffect(() => {
    if (isHighlighted && itemRef.current) {
      setTimeout(() => {
        itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
      setShouldHighlight(true)
      const timer = setTimeout(() => {
        setShouldHighlight(false)
      }, 1500)
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

  // Deadline chip logic
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
          : { '&:hover': { bgcolor: 'action.hover' }, '&:hover .delete-btn': { opacity: 1 } }),
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
        onChange={(e, _checked) => {
          // Synthesise a MouseEvent-like object from the native event
          const nativeEvent = e.nativeEvent as MouseEvent
          const syntheticEvent = {
            clientX: nativeEvent.clientX,
            clientY: nativeEvent.clientY,
          } as React.MouseEvent
          onToggle(todo.id, e.target.checked, syntheticEvent)
        }}
      />

      {/* Title + metadata chips */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ ...(todo.completed && { textDecoration: 'line-through', color: 'text.secondary' }) }}
        >
          {todo.title}
        </Typography>

        {/* Metadata chips row */}
        {(todo.xp_reward || todo.deadline || todo.achievement_id) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {/* XP chip */}
            {todo.xp_reward && todo.xp_reward > 0 && (
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
            )}

            {/* Deadline chip */}
            {deadlineChip}

            {/* Achievement chip */}
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
  const { highlightedTodoId, sharedTodos } = props
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
  const { users, loading: usersLoading, error: usersError } = useUsersList()
  const { achievements } = useAchievements()
  const isAdmin = hasRole('admin')
  const canCreateTodo = isAdmin

  // Basic creation state
  const [newTodoTitle, setNewTodoTitle] = useState('')

  const [newTodoXp, setNewTodoXp] = useState(1)
  const [newTodoDeadline, setNewTodoDeadline] = useState('')
  const [newTodoDeadlineBonusPercent, setNewTodoDeadlineBonusPercent] = useState(0)
  const [newTodoAchievementId, setNewTodoAchievementId] = useState<string | null>(null)
  const [newTodoAssignee, setNewTodoAssignee] = useState<User | null>(null)
  const linkedAchievements = achievements.filter(
    (a) => (a.mode ?? 'global_auto') === 'linked_item'
  )

  if (usersError) {
    console.error('Erro ao carregar usuários:', usersError)
  }

  // Progress
  const completedCount = todos.filter((todo) => todo.completed).length
  const totalCount = todos.length
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = todos.findIndex((todo) => todo.id === active.id)
      const newIndex = todos.findIndex((todo) => todo.id === over.id)
      const newTodos = arrayMove(todos, oldIndex, newIndex)
      const todoIds = newTodos.map((todo) => todo.id)
      try {
        await reorderTodos(todoIds)
      } catch (error) {
        console.error('Error reordering todos:', error)
      }
    }
  }

  const canSubmitNewTodo =
    Boolean(newTodoTitle.trim()) &&
    Boolean(newTodoDeadline) &&
    newTodoXp >= 0.01 &&
    newTodoAssignee != null

  const handleCreateTodo = async () => {
    if (!canSubmitNewTodo || !newTodoAssignee) return
    try {
      const deadlineIso = newTodoDeadline
        ? new Date(`${newTodoDeadline}T12:00:00`).toISOString()
        : undefined
      await createTodo({
        ...(projectId
          ? { project_id: projectId }
          : { activity_id: activityId as string }),
        title: newTodoTitle.trim(),
        assigned_to: newTodoAssignee.id,
        xp_reward: newTodoXp,
        deadline: deadlineIso,
        deadline_bonus_percent: newTodoDeadlineBonusPercent,
        achievement_id: newTodoAchievementId || undefined,
      })
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
    [updateTodo]
  )

  const handleToggle = useCallback(
    async (id: string, completed: boolean, event: React.MouseEvent) => {
      try {
        if (completed) {
          const todo = todos.find((t) => t.id === id)
          const xp = todo?.xp_reward
          if (xp && xp > 0) {
            triggerXpFloat(xp, event)
          }
        }
        await updateTodo(id, { completed })
      } catch (error) {
        console.error('Error updating todo:', error)
      }
    },
    [todos, updateTodo]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteTodo(id)
      } catch (error) {
        console.error('Error deleting todo:', error)
      }
    },
    [deleteTodo]
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
              disabled={!canCreateTodo}
              label="Título"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={canSubmitNewTodo ? 'Adicionar' : 'Preencha prazo, XP e responsável'} arrow>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => void handleCreateTodo()}
                          disabled={!canCreateTodo || !canSubmitNewTodo}
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
                onChange={(e) =>
                  setNewTodoXp(Math.max(0.01, Math.min(500, Number(e.target.value))))
                }
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
                onChange={(e) =>
                  setNewTodoDeadlineBonusPercent(Math.max(0, Math.min(500, Number(e.target.value))))
                }
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
                  {linkedAchievements.map((achievement) => (
                    <MenuItem key={achievement.id} value={achievement.id}>
                      {achievement.name}
                    </MenuItem>
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
        <Typography variant="caption" color="text.secondary">
          Apenas administradores podem criar e configurar to-dos.
        </Typography>
      )}

      {loading && todos.length === 0 ? (
        <Box sx={{ py: 2 }}>
          <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Carregando to-dos…
          </Typography>
        </Box>
      ) : todos.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
          Nenhum item na lista. Adicione um novo item acima.
        </Typography>
      ) : isAdmin ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {loading && (
                <LinearProgress sx={{ mb: 0.5, borderRadius: 1 }} color="primary" variant="indeterminate" />
              )}
              {todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onAssign={handleAssign}
                  users={users}
                  usersLoading={usersLoading}
                  isHighlighted={highlightedTodoId === todo.id}
                  canManage={isAdmin}
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
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onAssign={handleAssign}
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

