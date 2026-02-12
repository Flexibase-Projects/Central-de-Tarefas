import { useState } from 'react'
import * as React from 'react'
import { ProjectTodo } from '@/types'
import { useTodos } from '@/hooks/use-todos'
import { usePermissions } from '@/hooks/use-permissions'
import { useUsersList } from '@/hooks/use-users-list'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, GripVertical, Plus, Loader2 } from 'lucide-react'
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

interface TodoListProps {
  projectId: string
  highlightedTodoId?: string | null
}

interface TodoItemProps {
  todo: ProjectTodo
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onAssign: (id: string, userId: string | null) => void
  assignedUserName?: string | null
  users: Array<{ id: string; name: string }>
  isHighlighted?: boolean
}

function TodoItem({ todo, onToggle, onDelete, onAssign, users, isHighlighted }: TodoItemProps) {
  // assignedUserName kept in interface for API but not rendered in this view
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id })

  const itemRef = React.useRef<HTMLDivElement>(null)
  const [shouldHighlight, setShouldHighlight] = React.useState(false)

  // Scroll para o item destacado quando ele aparecer e iniciar animação
  React.useEffect(() => {
    if (isHighlighted && itemRef.current) {
      setTimeout(() => {
        itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
      setShouldHighlight(true)
      // Remover destaque após animação (3 piscadas de 0.5s cada = 1.5s)
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

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        if (node) {
          ;(itemRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      }}
      style={style}
      className={`flex items-center gap-2 p-2 rounded group w-full transition-all ${
        shouldHighlight
          ? 'bg-yellow-100 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-500 shadow-md animate-pulse-3'
          : 'hover:bg-muted/50'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
      <span
        className={`flex-1 text-sm min-w-0 ${
          todo.completed
            ? 'line-through text-muted-foreground'
            : 'text-foreground'
        }`}
      >
        {todo.title}
      </span>
      <select
        value={todo.assigned_to || ''}
        onChange={(e) => onAssign(todo.id, e.target.value || null)}
        className="h-7 min-w-[140px] px-2 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
        disabled={todo.completed}
      >
        <option value="">Sem responsável</option>
        {users.length === 0 ? (
          <option disabled>Carregando usuários...</option>
        ) : (
          users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))
        )}
      </select>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(todo.id)}
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

export function TodoList({ projectId, highlightedTodoId }: TodoListProps) {
  const { todos, loading, createTodo, updateTodo, deleteTodo, reorderTodos } =
    useTodos(projectId)
  const { hasPermission } = usePermissions()
  const { users, error: usersError } = useUsersList()
  const canCreateTodo = hasPermission('create_todo')
  const [newTodoTitle, setNewTodoTitle] = useState('')

  // Debug: verificar se usuários estão sendo carregados
  if (usersError) {
    console.error('Erro ao carregar usuários:', usersError)
  }

  // Calculate progress percentage
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

      // Optimistic update
      try {
        await reorderTodos(todoIds)
      } catch (error) {
        console.error('Error reordering todos:', error)
      }
    }
  }

  const handleCreateTodo = async () => {
    if (!newTodoTitle.trim()) return

    try {
      await createTodo({
        project_id: projectId,
        title: newTodoTitle.trim(),
      })
      setNewTodoTitle('')
    } catch (error) {
      console.error('Error creating todo:', error)
    }
  }

  const handleAssign = async (todoId: string, userId: string | null) => {
    try {
      await updateTodo(todoId, { assigned_to: userId })
    } catch (error) {
      console.error('Error assigning todo:', error)
    }
  }

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      await updateTodo(id, { completed })
    } catch (error) {
      console.error('Error updating todo:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo(id)
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground text-center">
            {completedCount} de {totalCount} concluídos
          </div>
        </div>
      )}

      <RequirePermission permission="create_todo">
        <div className="flex gap-2">
          <Input
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleCreateTodo()
              }
            }}
            placeholder="Adicionar novo item..."
            className="flex-1"
            disabled={!canCreateTodo}
          />
          <Button onClick={handleCreateTodo} size="sm" disabled={!canCreateTodo || !newTodoTitle.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </RequirePermission>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : todos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum item na lista. Adicione um novo item acima.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={todos.map((todo) => todo.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {todos.map((todo) => {
                const assignedUser = users.find(u => u.id === todo.assigned_to)
                return (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onAssign={handleAssign}
                    assignedUserName={assignedUser?.name || null}
                    users={users}
                    isHighlighted={highlightedTodoId === todo.id}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
