import { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react'
import * as React from 'react'
import {
  Box,
  Button,
  TextField,
  IconButton,
  Checkbox,
  MenuItem,
  LinearProgress,
  Typography,
  InputAdornment,
  Chip,
  Tooltip,
  Autocomplete,
  ClickAwayListener,
  FormControlLabel,
  Switch,
  Collapse,
} from '@mui/material'
import { Trash2, GripVertical, Plus, Pencil, Settings } from '@/components/ui/icons'
import type { ProjectTodo, User } from '@/types'
import { useTodos, type TodosScope, type SharedProjectTodosApi } from '@/hooks/use-todos'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/contexts/AuthContext'
import { fireTodoCompleteToast } from '@/components/achievements/TodoCompleteToast'
import { useUsersList } from '@/hooks/use-users-list'
import { useAchievements } from '@/hooks/use-achievements'
import { formatDatePtBr, isOverdueDate } from '@/lib/date-only'
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

type TodoEntity = ProjectTodo & {
  assigned_at?: string | null
}

type TodoMutationResponse = {
  todo: TodoEntity
  xpDelta?: number | null
  xpAction?: string | null
  gamificationWarning?: {
    error?: string
    code?: string
  } | null
}

type TodoDeleteResponse = {
  xpDelta?: number | null
  xpAction?: string | null
}

function isAwardedXpAction(action: string | null | undefined) {
  return action === 'awarded' || action === 'retroactive' || action === 'retro_awarded'
}

function isRevertedXpAction(action: string | null | undefined) {
  return action === 'reversed' || action === 'reverted'
}

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
  el.textContent = `-${formatXp(xp)} XP`
  el.style.left = event ? `${event.clientX - 20}px` : '50%'
  el.style.top = event ? `${event.clientY - 10}px` : '50%'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1500)
}

function isXpPending(todo: TodoEntity): boolean {
  return Number(todo.xp_reward ?? 0) <= 0
}

const TODO_ADMIN_SETTINGS_STORAGE_KEY = 'central-tarefas:todo-admin-settings-open'

const adminTodoFieldSx = {
  width: '100%',
  minWidth: 0,
  '& .MuiInputBase-root': {
    height: 40,
    fontSize: '0.8125rem',
  },
  '& .MuiInputBase-input': {
    boxSizing: 'border-box',
    height: 40,
    padding: '0 12px',
  },
  '& .MuiSelect-select': {
    boxSizing: 'border-box',
    minHeight: '40px !important',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
  },
} as const

const flatIconButtonSx = {
  border: 'none',
  boxShadow: 'none',
  outline: 'none',
  '&:hover': {
    border: 'none',
    boxShadow: 'none',
  },
  '&:focus-visible': {
    outline: 'none',
    boxShadow: 'none',
  },
} as const

function readTodoAdminSettingsOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(TODO_ADMIN_SETTINGS_STORAGE_KEY)
    if (raw === null) return true
    return raw === '1' || raw === 'true'
  } catch {
    return true
  }
}

type TodoListProps = (
  | { projectId: string; activityId?: never; contextName?: string }
  | { activityId: string; projectId?: never; contextName?: string }
) & {
  highlightedTodoId?: string | null
  sharedTodos?: SharedProjectTodosApi
}

interface TodoItemProps {
  todo: TodoEntity
  onToggle: (id: string, completed: boolean, event: React.MouseEvent) => void
  onDelete: (id: string) => void
  onAssign: (id: string, userId: string | null) => void
  onUpdateXp: (id: string, xp: number) => void
  users: User[]
  usersLoading: boolean
  isHighlighted?: boolean
  canManage: boolean
  canToggle: boolean
  currentUserId: string | null
  /** Admin: sem alça de arrastar (ex.: lista filtrada sem concluídos) */
  dragDisabled?: boolean
}

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
  canToggle,
  currentUserId,
  dragDisabled = false,
}: TodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, disabled: !canManage || dragDisabled })

  const itemRef = React.useRef<HTMLDivElement>(null)
  const [shouldHighlight, setShouldHighlight] = React.useState(false)
  const [editingXp, setEditingXp] = React.useState(false)
  const [xpInputVal, setXpInputVal] = React.useState<string>('')
  const [expandedTitle, setExpandedTitle] = React.useState(false)
  const [titleOverflowing, setTitleOverflowing] = React.useState(false)
  const titleRef = React.useRef<HTMLParagraphElement | null>(null)

  const mine = Boolean(todo.assigned_to && todo.assigned_to === currentUserId)
  const pendingXp = isXpPending(todo)
  const assigneeName = users.find((u) => u.id === todo.assigned_to)?.name || 'Sem responsável'
  const checkboxDisabled = !canToggle
  const toggleTooltip = !todo.assigned_to && !canManage
    ? 'Defina um responsável para concluir'
    : !canToggle
      ? 'Apenas o responsável pode concluir'
      : ''

  React.useEffect(() => {
    if (isHighlighted && itemRef.current) {
      setTimeout(() => {
        itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
      setShouldHighlight(true)
      const timer = setTimeout(() => setShouldHighlight(false), 1500)
      return () => clearTimeout(timer)
    }
    setShouldHighlight(false)
  }, [isHighlighted])

  React.useEffect(() => {
    const node = titleRef.current
    if (!node) return

    if (expandedTitle) return

    const checkOverflow = () => {
      setTitleOverflowing(node.scrollHeight - node.clientHeight > 1)
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [todo.title, expandedTitle])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const deadlineChip = todo.deadline
    ? (() => {
        const isOverdue = isOverdueDate(todo.deadline) && !todo.completed
        return (
          <Chip
            size="small"
            label={formatDatePtBr(todo.deadline, '—')}
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

  const emphasisSx = shouldHighlight
    ? { bgcolor: 'warning.light', border: 2, borderColor: 'warning.main', boxShadow: 2 }
    : mine
      ? {
          bgcolor: 'rgba(37,99,235,0.07)',
          border: '1px solid rgba(37,99,235,0.22)',
          boxShadow: 'inset 0 0 0 1px rgba(37,99,235,0.06)',
        }
      : canManage && pendingXp
        ? {
            bgcolor: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.22)',
          }
        : {
            border: '1px solid transparent',
            '&:hover': { bgcolor: 'action.hover' },
          }

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
        ...emphasisSx,
      }}
    >
      {canManage && !dragDisabled && (
        <Box {...attributes} {...listeners} sx={{ cursor: 'grab', color: 'text.secondary', '&:active': { cursor: 'grabbing' } }}>
          <GripVertical size={18} />
        </Box>
      )}

      <Tooltip title={toggleTooltip} arrow disableHoverListener={!toggleTooltip}>
        <span>
          <Checkbox
            size="small"
            checked={todo.completed}
            disabled={checkboxDisabled}
            onChange={(e) => {
              const nativeEvent = e.nativeEvent as MouseEvent
              onToggle(todo.id, e.target.checked, {
                clientX: nativeEvent.clientX,
                clientY: nativeEvent.clientY,
              } as React.MouseEvent)
            }}
          />
        </span>
      </Tooltip>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          ref={titleRef}
          variant="body2"
          sx={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: expandedTitle ? 'unset' : 2,
            overflow: 'hidden',
            whiteSpace: expandedTitle ? 'pre-wrap' : 'normal',
            wordBreak: 'break-word',
            ...(todo.completed && { textDecoration: 'line-through', color: 'text.secondary' }),
          }}
        >
          {todo.title}
        </Typography>

        {titleOverflowing && (
          <Button
            size="small"
            variant="text"
            onClick={() => setExpandedTitle((prev) => !prev)}
            sx={{
              mt: 0.25,
              px: 0,
              minWidth: 0,
              alignSelf: 'flex-start',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.2,
              textTransform: 'none',
            }}
          >
            {expandedTitle ? 'Ver menos' : 'Ver mais'}
          </Button>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
          {mine && (
            <Chip
              size="small"
              label="Sua demanda"
              sx={{
                height: 18,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: 'rgba(37,99,235,0.12)',
                color: '#2563EB',
                border: '1px solid rgba(37,99,235,0.18)',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}

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
                  sx={{ width: 96, '& input': { py: 0.25, fontSize: 11 } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="caption">XP</Typography>
                      </InputAdornment>
                    ),
                  }}
                />
              </ClickAwayListener>
            ) : pendingXp ? (
              <Tooltip title="Atribuir XP" arrow>
                <Chip
                  size="small"
                  icon={<Pencil size={10} />}
                  label="Atribuir XP"
                  onClick={startEditXp}
                  sx={{
                    height: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    bgcolor: 'rgba(245,158,11,0.12)',
                    color: '#B45309',
                    border: '1px solid rgba(245,158,11,0.22)',
                    cursor: 'pointer',
                    '& .MuiChip-label': { px: 0.75 },
                    '& .MuiChip-icon': { ml: 0.5 },
                  }}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Editar XP" arrow>
                <Chip
                  size="small"
                  label={`+${formatXp(Number(todo.xp_reward ?? 0))} XP`}
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
            )
          ) : Number(todo.xp_reward ?? 0) > 0 ? (
            <Chip
              size="small"
              label={`+${formatXp(Number(todo.xp_reward ?? 0))} XP`}
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
      </Box>

      {canManage ? (
        <Autocomplete
          size="small"
          sx={{ minWidth: 168, maxWidth: 220, flexShrink: 0 }}
          disabled={todo.completed}
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
      ) : (
        <Box sx={{ minWidth: 156, maxWidth: 200, flexShrink: 0, textAlign: 'right' }}>
          <Typography variant="caption" fontWeight={600} sx={{ display: 'block', color: mine ? 'primary.main' : 'text.secondary' }}>
            {assigneeName}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {mine ? 'Atribuído a você' : 'Responsável'}
          </Typography>
        </Box>
      )}

      {canManage && (
        <IconButton className="delete-btn" size="small" onClick={() => onDelete(todo.id)}>
          <Trash2 size={16} />
        </IconButton>
      )}
    </Box>
  )
})

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
  const { currentUser } = useAuth()
  const { users, loading: usersLoading, error: usersError } = useUsersList()
  const { achievements } = useAchievements()
  const isAdmin = hasRole('admin')

  const visibleTodos = todos as TodoEntity[]
  const orderedVisibleTodos = useMemo(() => {
    if (isAdmin) return visibleTodos
    return [...visibleTodos].sort((a, b) => Number(a.completed) - Number(b.completed))
  }, [visibleTodos, isAdmin])

  const [newTodoTitle, setNewTodoTitle] = useState('')
  const newTodoTitleInputRef = useRef<HTMLInputElement | null>(null)
  const [newTodoXp, setNewTodoXp] = useState(1)
  const [newTodoDeadline, setNewTodoDeadline] = useState('')
  const [newTodoDeadlineBonusPercent, setNewTodoDeadlineBonusPercent] = useState(0)
  const [newTodoAchievementId, setNewTodoAchievementId] = useState<string | null>(null)
  const [newTodoAssignee, setNewTodoAssignee] = useState<User | null>(null)
  /** Com +5 to-dos, ligado por padrão; com ≤5 a opção some e a lista mostra tudo */
  const [hideCompleted, setHideCompleted] = useState(true)
  const [adminTodoSettingsOpen, setAdminTodoSettingsOpen] = useState(() => readTodoAdminSettingsOpen())

  const toggleAdminTodoSettings = useCallback(() => {
    setAdminTodoSettingsOpen((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(TODO_ADMIN_SETTINGS_STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const linkedAchievements = achievements.filter((a) =>
    ['linked_item', 'manual'].includes(a.mode ?? 'global_auto'),
  )

  useEffect(() => {
    const sampleWithDeadline = visibleTodos.find((todo) => Boolean(todo.deadline))
    if (!sampleWithDeadline?.deadline) return
  }, [visibleTodos])

  if (usersError) console.error('Erro ao carregar usuários:', usersError)

  const completedCount = visibleTodos.filter((t) => t.completed).length
  const totalCount = visibleTodos.length
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const effectiveHideCompleted = totalCount > 5 && hideCompleted
  const todosForList = useMemo(() => {
    const base = isAdmin ? visibleTodos : orderedVisibleTodos
    if (!effectiveHideCompleted) return base
    return base.filter((t) => !t.completed || (highlightedTodoId != null && t.id === highlightedTodoId))
  }, [isAdmin, visibleTodos, orderedVisibleTodos, effectiveHideCompleted, highlightedTodoId])
  const adminDragEnabled = isAdmin && !effectiveHideCompleted
  const shouldScrollTodos = todosForList.length > 5
  const todoListContainerSx = {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
    maxHeight: shouldScrollTodos ? 380 : 'none',
    overflowY: shouldScrollTodos ? 'auto' : 'visible',
    pr: shouldScrollTodos ? 0.5 : 0,
    scrollBehavior: 'smooth',
    scrollbarWidth: 'thin',
    '&::-webkit-scrollbar': {
      width: 8,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(148,163,184,0.45)',
      borderRadius: 999,
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
  } as const

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id && adminDragEnabled) {
      const oldIndex = visibleTodos.findIndex((t) => t.id === active.id)
      const newIndex = visibleTodos.findIndex((t) => t.id === over.id)
      const newTodos = arrayMove(visibleTodos, oldIndex, newIndex)
      try {
        await reorderTodos(newTodos.map((t) => t.id))
      } catch (error) {
        console.error('Error reordering todos:', error)
      }
    }
  }

  const canSubmitAdmin = Boolean(newTodoTitle.trim())

  const canSubmitUser =
    Boolean(newTodoTitle.trim()) &&
    Boolean(newTodoDeadline)

  const canSubmitNewTodo = isAdmin ? canSubmitAdmin : canSubmitUser

  const handleCreateTodo = async () => {
    if (!canSubmitNewTodo) return

    const assigneeId = isAdmin ? newTodoAssignee?.id ?? null : currentUser?.id ?? null
    if (!isAdmin && !assigneeId) return

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

      setNewTodoTitle('')
      queueMicrotask(() => newTodoTitleInputRef.current?.focus())
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
        const result = await updateTodo(todoId, { xp_reward: xp }) as TodoMutationResponse
        if (isAwardedXpAction(result.xpAction) && Number(result.xpDelta ?? 0) > 0) {
          triggerXpFloat(Number(result.xpDelta ?? 0), null)
        }
      } catch (error) {
        console.error('Error updating XP:', error)
      }
    },
    [updateTodo],
  )

  const handleToggle = useCallback(
    async (id: string, completed: boolean, event: React.MouseEvent) => {
      try {
        const result = await updateTodo(id, { completed }) as TodoMutationResponse
        const xpDelta = Number(result.xpDelta ?? 0)
        const action = result.xpAction ?? 'none'
        const todoTitle = result.todo?.title ?? visibleTodos.find((t) => t.id === id)?.title ?? 'TO-DO'

        if (completed) {
          if (isAwardedXpAction(action) && xpDelta > 0) {
            triggerXpFloat(xpDelta, event)
            fireTodoCompleteToast({ title: todoTitle, xp: xpDelta })
          } else {
            fireTodoCompleteToast({ title: todoTitle, xp: 0 })
          }
        } else if (isRevertedXpAction(action) && xpDelta !== 0) {
          triggerXpDeduction(Math.abs(xpDelta), event)
        }

        if (result.gamificationWarning?.code === 'MIGRATION_REQUIRED') {
          console.warn('Gamificação indisponível para este to-do:', result.gamificationWarning.error)
        }
      } catch (error) {
        console.error('Error updating todo:', error)
      }
    },
    [visibleTodos, updateTodo],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const result = await deleteTodo(id) as TodoDeleteResponse
        const xpDelta = Number(result?.xpDelta ?? 0)
        if (isRevertedXpAction(result?.xpAction) && xpDelta !== 0) {
          triggerXpDeduction(Math.abs(xpDelta), null)
        }
        window.dispatchEvent(new CustomEvent('cdt-activities-invalidated'))
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
          {totalCount > 5 && (
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={hideCompleted}
                  onChange={(_, v) => setHideCompleted(v)}
                  color="primary"
                />
              }
              label={
                <Typography component="span" variant="caption" fontWeight={600} sx={{ fontSize: 12 }}>
                  Ocultar to-dos concluídos
                </Typography>
              }
              sx={{
                mt: 0.75,
                mx: 0,
                mb: 0,
                alignItems: 'center',
                '& .MuiFormControlLabel-label': { ml: 0.5 },
              }}
            />
          )}
        </Box>
      )}

      {isAdmin ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              size="small"
              fullWidth
              margin="none"
              inputRef={newTodoTitleInputRef}
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
                startAdornment: (
                  <InputAdornment
                    position="start"
                    sx={{
                      ml: -0.5,
                      mr: 0.25,
                      alignSelf: 'stretch',
                      maxHeight: 'none',
                      '& .MuiIconButton-root': { alignSelf: 'center' },
                    }}
                  >
                    <Tooltip
                      title={
                        adminTodoSettingsOpen
                          ? 'Ocultar configurações (XP, prazo, responsável…)'
                          : 'Mostrar configurações do to-do'
                      }
                      arrow
                    >
                      <IconButton
                        size="small"
                        edge="start"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleAdminTodoSettings()
                        }}
                        aria-expanded={adminTodoSettingsOpen}
                        aria-label={
                          adminTodoSettingsOpen
                            ? 'Ocultar configurações do to-do'
                            : 'Mostrar configurações do to-do'
                        }
                        sx={(theme) => ({
                          p: 0.5,
                          opacity: adminTodoSettingsOpen ? 1 : 0.22,
                          transition: theme.transitions.create('opacity', {
                            duration: theme.transitions.duration.shorter,
                          }),
                          '&:hover': { opacity: 1 },
                          '&:focus-visible': { opacity: 1 },
                        })}
                      >
                        <Settings size={18} />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={canSubmitNewTodo ? 'Adicionar (Enter)' : 'Informe um título para adicionar'} arrow>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => void handleCreateTodo()}
                          disabled={!canSubmitNewTodo}
                          sx={flatIconButtonSx}
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

          <Collapse
            in={adminTodoSettingsOpen}
            timeout="auto"
            unmountOnExit={false}
            sx={{
              overflow: 'visible',
              // Collapse usa overflow:hidden nos wrappers e recorta legendas do OutlinedInput
              '& .MuiCollapse-wrapper': { overflow: 'visible' },
              '& .MuiCollapse-wrapperInner': { overflow: 'visible' },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                p: 1,
                mt: 0.25,
                borderRadius: 1,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'visible',
              }}
            >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              sx={{ letterSpacing: 0.2, lineHeight: 1.2, fontSize: 11, display: 'none' }}
            >
              Configurações do to-do (obrigatórias para lançar)
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              sx={{ letterSpacing: 0.2, lineHeight: 1.2, fontSize: 11 }}
            >
              Configurações adicionais do to-do (opcionais)
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(4, minmax(0, 1fr))',
                },
                alignItems: 'start',
                gap: 1,
                width: '100%',
                minWidth: 0,
                // Não usar overflow-x:auto aqui: no CSS isso força overflow-y a não ser visible e corta os rótulos outlined
                overflow: 'visible',
              }}
            >
              <TextField
                label="XP base"
                type="number"
                size="small"
                margin="none"
                value={newTodoXp}
                onChange={(e) => setNewTodoXp(Math.max(0.01, Math.min(500, Number(e.target.value))))}
                inputProps={{ min: 0.01, max: 500, step: 0.01 }}
                InputLabelProps={{ shrink: true }}
                sx={adminTodoFieldSx}
              />
              <TextField
                label="Prazo"
                type="date"
                size="small"
                margin="none"
                value={newTodoDeadline}
                onChange={(e) => setNewTodoDeadline(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={adminTodoFieldSx}
              />
              <TextField
                label="% bônus"
                title="% bônus por prazo"
                type="number"
                size="small"
                margin="none"
                value={newTodoDeadlineBonusPercent}
                onChange={(e) => setNewTodoDeadlineBonusPercent(Math.max(0, Math.min(500, Number(e.target.value))))}
                inputProps={{ min: 0, max: 500, step: 0.01 }}
                InputLabelProps={{ shrink: true }}
                sx={adminTodoFieldSx}
              />
              <TextField
                select
                label="Conquista (opc.)"
                size="small"
                margin="none"
                value={newTodoAchievementId ?? ''}
                onChange={(e) => setNewTodoAchievementId(e.target.value || null)}
                InputLabelProps={{ shrink: true }}
                sx={adminTodoFieldSx}
              >
                <MenuItem value="">Nenhuma</MenuItem>
                {linkedAchievements.map((a) => (
                  <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                ))}
              </TextField>
            </Box>
            <Autocomplete
              size="small"
              fullWidth
              sx={{
                '& .MuiFormLabel-asterisk': { display: 'none' },
                '& .MuiAutocomplete-popupIndicator': flatIconButtonSx,
                '& .MuiAutocomplete-clearIndicator': flatIconButtonSx,
              }}
              options={users}
              loading={usersLoading}
              value={newTodoAssignee}
              onChange={(_, v) => setNewTodoAssignee(v)}
              getOptionLabel={(u) => u.name || u.email}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField {...params} margin="none" label="Responsável" required placeholder="Busque por nome…" />
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
            </Box>
          </Collapse>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.25 }}>
            Prazo, responsavel, XP e conquista podem ser definidos agora ou depois, sem bloquear o lancamento.
          </Typography>
          {false && !canSubmitNewTodo && newTodoTitle.trim() && (
            <Typography variant="caption" color="warning.main" sx={{ lineHeight: 1.25 }}>
              {adminTodoSettingsOpen
                ? 'Informe prazo, XP válido e um responsável para adicionar o to-do.'
                : 'Abra a engrenagem e informe prazo, XP e responsável para adicionar o to-do.'}
            </Typography>
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              size="small"
              fullWidth
              inputRef={newTodoTitleInputRef}
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
                    <Tooltip title={canSubmitNewTodo ? 'Adicionar (Enter)' : 'Informe um título e prazo'} arrow>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => void handleCreateTodo()}
                          disabled={!canSubmitNewTodo}
                          sx={flatIconButtonSx}
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
          <Typography variant="caption" color="warning.main" sx={{ mt: -0.5, fontWeight: 600 }}>
            Sem Experiência definida.
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
          Nenhum item na lista.
        </Typography>
      ) : todosForList.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
          Todos os to-dos estão concluídos. Desative &quot;Ocultar to-dos concluídos&quot; para vê-los na lista.
        </Typography>
      ) : isAdmin ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={todosForList.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <Box sx={todoListContainerSx}>
              {loading && (
                <LinearProgress sx={{ mb: 0.5, borderRadius: 1 }} color="primary" variant="indeterminate" />
              )}
              {todosForList.map((todo) => (
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
                  canToggle={true}
                  currentUserId={currentUser?.id ?? null}
                  dragDisabled={!adminDragEnabled}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      ) : (
        <Box sx={todoListContainerSx}>
          {loading && (
            <LinearProgress sx={{ mb: 0.5, borderRadius: 1 }} color="primary" variant="indeterminate" />
          )}
          {todosForList.map((todo) => (
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
              canToggle={Boolean(todo.assigned_to && todo.assigned_to === currentUser?.id)}
              currentUserId={currentUser?.id ?? null}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
