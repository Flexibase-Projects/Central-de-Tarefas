import { useState, useEffect, useCallback, useRef } from 'react'
import { ProjectTodo } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || ''
const REALTIME_ENABLED = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED === 'true'

const TODOS_INVALIDATED_EVENT = 'cdt-todos-invalidated'

/** Dispara invalidação para que todos os useTodos do mesmo projeto atualizem (ex.: card do Kanban). */
function invalidateTodosForProject(projectId: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TODOS_INVALIDATED_EVENT, { detail: { projectId } }))
}

export function useTodos(projectId: string | null) {
  const { getAuthHeaders } = useAuth()
  const [todos, setTodos] = useState<ProjectTodo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchTodos = useCallback(async () => {
    if (!projectId) {
      setTodos([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const url = API_URL ? `${API_URL}/api/todos/${projectId}` : `/api/todos/${projectId}`
      const response = await fetch(url, { headers: getAuthHeaders() })
      if (!response.ok) {
        throw new Error('Failed to fetch todos')
      }
      const data = await response.json()
      setTodos(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching todos:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, getAuthHeaders])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  // Invalidação local: qualquer mutação (criar/editar/apagar/reordenar) notifica outros useTodos do mesmo projeto
  useEffect(() => {
    if (!projectId) return
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string }>
      if (customEvent.detail?.projectId === projectId) {
        fetchTodos()
      }
    }
    window.addEventListener(TODOS_INVALIDATED_EVENT, handler)
    return () => window.removeEventListener(TODOS_INVALIDATED_EVENT, handler)
  }, [projectId, fetchTodos])

  // Atualização em tempo real: quando um to-do é apagado/alterado, a lista reflete na hora
  useEffect(() => {
    if (!projectId || !REALTIME_ENABLED) return

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
  }, [projectId])

  const createTodo = useCallback(async (todo: Partial<ProjectTodo>) => {
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
      return newTodo
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }, [getAuthHeaders])

  const updateTodo = useCallback(async (id: string, updates: Partial<ProjectTodo>) => {
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
      return updatedTodo
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }, [getAuthHeaders, projectId])

  const deleteTodo = useCallback(async (id: string) => {
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }, [getAuthHeaders, projectId])

  const reorderTodos = useCallback(async (todoIds: string[]) => {
    if (!projectId) return

    try {
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
      await fetchTodos()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }, [projectId, fetchTodos])

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
