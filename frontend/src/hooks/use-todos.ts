import { useState, useEffect, useCallback, useRef } from 'react'
import { ProjectTodo } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || ''
const REALTIME_ENABLED = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED === 'true'

const TODOS_INVALIDATED_EVENT = 'cdt-todos-invalidated'

function invalidateTodosForProject(projectId: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(TODOS_INVALIDATED_EVENT, { detail: { kind: 'project', id: projectId } })
  )
}

function invalidateTodosForActivity(activityId: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(TODOS_INVALIDATED_EVENT, { detail: { kind: 'activity', id: activityId } })
  )
}

export type TodosScope = { projectId: string; activityId?: never } | { activityId: string; projectId?: never }

export function useTodos(scope: TodosScope | null) {
  const { getAuthHeaders } = useAuth()
  const projectId = scope && 'projectId' in scope ? scope.projectId : null
  const activityId = scope && 'activityId' in scope ? scope.activityId : null
  const hasScope = Boolean(projectId || activityId)

  const [todos, setTodos] = useState<ProjectTodo[]>([])
  const [loading, setLoading] = useState(() => hasScope)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  /** Ignora respostas de fetch antigo quando projectId/activityId mudam ou há refetch rápido */
  const fetchGenerationRef = useRef(0)

  const fetchTodos = useCallback(
    async (options?: { silent?: boolean }) => {
      if (projectId == null && activityId == null) {
        fetchGenerationRef.current += 1
        setTodos([])
        setLoading(false)
        return
      }

      const generation = ++fetchGenerationRef.current
      const silent = Boolean(options?.silent)

      try {
        if (!silent) setLoading(true)
        setError(null)
        const url = projectId
          ? API_URL
            ? `${API_URL}/api/todos/${projectId}`
            : `/api/todos/${projectId}`
          : API_URL
            ? `${API_URL}/api/todos/by-activity/${activityId}`
            : `/api/todos/by-activity/${activityId}`
        const response = await fetch(url, { headers: getAuthHeaders() })
        if (!response.ok) {
          throw new Error('Failed to fetch todos')
        }
        const data = await response.json()
        if (generation !== fetchGenerationRef.current) return
        setTodos(Array.isArray(data) ? data : [])
      } catch (err) {
        if (generation !== fetchGenerationRef.current) return
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error fetching todos:', err)
      } finally {
        if (generation === fetchGenerationRef.current && !silent) {
          setLoading(false)
        }
      }
    },
    [projectId, activityId, getAuthHeaders],
  )

  useEffect(() => {
    void fetchTodos()
  }, [fetchTodos])

  useEffect(() => {
    if (!hasScope) return
    let debounceTimer: ReturnType<typeof setTimeout> | undefined
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ kind: string; id: string }>
      const d = customEvent.detail
      if (!d) return
      if (projectId && d.kind === 'project' && d.id === projectId) {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          debounceTimer = undefined
          void fetchTodos({ silent: true })
        }, 220)
      }
      if (activityId && d.kind === 'activity' && d.id === activityId) {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          debounceTimer = undefined
          void fetchTodos({ silent: true })
        }, 220)
      }
    }
    window.addEventListener(TODOS_INVALIDATED_EVENT, handler)
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      window.removeEventListener(TODOS_INVALIDATED_EVENT, handler)
    }
  }, [hasScope, projectId, activityId, fetchTodos])

  useEffect(() => {
    if (!REALTIME_ENABLED) return
    if (projectId) {
      const channel = supabase
        .channel(`cdt_todos_${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cdt_project_todos',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const row = payload.new as unknown as ProjectTodo
              setTodos((prev) => (prev.some((t) => t.id === row.id) ? prev : [...prev, row]))
            }
            if (payload.eventType === 'UPDATE' && payload.new) {
              const row = payload.new as unknown as ProjectTodo
              setTodos((prev) => prev.map((t) => (t.id === row.id ? row : t)))
            }
            if (payload.eventType === 'DELETE' && payload.old) {
              const row = payload.old as { id?: string }
              const id = row.id as string
              setTodos((prev) => prev.filter((t) => t.id !== id))
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            supabase.removeChannel(channel)
            channelRef.current = null
          }
        })
      channelRef.current = channel
      return () => {
        supabase.removeChannel(channel)
        channelRef.current = null
      }
    }
    if (activityId) {
      const channel = supabase
        .channel(`cdt_todos_act_${activityId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cdt_project_todos',
            filter: `activity_id=eq.${activityId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const row = payload.new as unknown as ProjectTodo
              setTodos((prev) => (prev.some((t) => t.id === row.id) ? prev : [...prev, row]))
            }
            if (payload.eventType === 'UPDATE' && payload.new) {
              const row = payload.new as unknown as ProjectTodo
              setTodos((prev) => prev.map((t) => (t.id === row.id ? row : t)))
            }
            if (payload.eventType === 'DELETE' && payload.old) {
              const row = payload.old as { id?: string }
              const id = row.id as string
              setTodos((prev) => prev.filter((t) => t.id !== id))
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            supabase.removeChannel(channel)
            channelRef.current = null
          }
        })
      channelRef.current = channel
      return () => {
        supabase.removeChannel(channel)
        channelRef.current = null
      }
    }
    return undefined
  }, [projectId, activityId])

  const createTodo = useCallback(
    async (todo: Partial<ProjectTodo> & { project_id?: string | null; activity_id?: string | null }) => {
      try {
        const url = API_URL ? `${API_URL}/api/todos` : '/api/todos'
        const response = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(todo),
        })
        if (!response.ok) {
          throw new Error('Failed to create todo')
        }
        const newTodo = await response.json()
        setTodos((prev) => [...prev, newTodo])
        if (newTodo.project_id) invalidateTodosForProject(newTodo.project_id)
        if (newTodo.activity_id) invalidateTodosForActivity(newTodo.activity_id)
        return newTodo
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      }
    },
    [getAuthHeaders]
  )

  const updateTodo = useCallback(
    async (id: string, updates: Partial<ProjectTodo>) => {
      try {
        const url = API_URL ? `${API_URL}/api/todos/${id}` : `/api/todos/${id}`
        const response = await fetch(url, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates),
        })
        if (!response.ok) {
          throw new Error('Failed to update todo')
        }
        const updatedTodo = await response.json()
        setTodos((prev) => prev.map((todo) => (todo.id === id ? updatedTodo : todo)))
        if (projectId) invalidateTodosForProject(projectId)
        if (activityId) invalidateTodosForActivity(activityId)
        return updatedTodo
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      }
    },
    [getAuthHeaders, projectId, activityId]
  )

  const deleteTodo = useCallback(
    async (id: string) => {
      try {
        const url = API_URL ? `${API_URL}/api/todos/${id}` : `/api/todos/${id}`
        const response = await fetch(url, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })
        if (!response.ok) {
          throw new Error('Failed to delete todo')
        }
        setTodos((prev) => prev.filter((todo) => todo.id !== id))
        if (projectId) invalidateTodosForProject(projectId)
        if (activityId) invalidateTodosForActivity(activityId)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      }
    },
    [getAuthHeaders, projectId, activityId]
  )

  const reorderTodos = useCallback(
    async (todoIds: string[]) => {
      if (!projectId && !activityId) return

      try {
        if (projectId) {
          const url = API_URL ? `${API_URL}/api/todos/reorder` : '/api/todos/reorder'
          const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              project_id: projectId,
              todo_ids: todoIds,
            }),
          })
          if (!response.ok) {
            throw new Error('Failed to reorder todos')
          }
          invalidateTodosForProject(projectId)
        } else if (activityId) {
          const url = API_URL ? `${API_URL}/api/todos/reorder-activity` : '/api/todos/reorder-activity'
          const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              activity_id: activityId,
              todo_ids: todoIds,
            }),
          })
          if (!response.ok) {
            throw new Error('Failed to reorder activity todos')
          }
          invalidateTodosForActivity(activityId)
        }
        await fetchTodos({ silent: true })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      }
    },
    [projectId, activityId, getAuthHeaders, fetchTodos]
  )

  return {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    deleteTodo,
    reorderTodos,
    refreshTodos: fetchTodos,
  }
}

/** Para compartilhar o mesmo fetch entre painel resumo e lista (evita GET duplicado). */
export type SharedProjectTodosApi = Pick<
  ReturnType<typeof useTodos>,
  'todos' | 'loading' | 'createTodo' | 'updateTodo' | 'deleteTodo' | 'reorderTodos'
>
