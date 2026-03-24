import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

type TodoEntity = ProjectTodo & {
  assigned_at?: string | null
}

type TodoMutationResponse = {
  todo: TodoEntity
  xpDelta?: number | null
  xpAction?: string | null
}

const todosCache = new Map<string, TodoEntity[]>()
const todosInFlight = new Map<string, Promise<TodoEntity[]>>()
let activeTodosUserKey: string | null = null

function resetTodoCacheForUser(userKey: string | null) {
  if (activeTodosUserKey === userKey) return
  activeTodosUserKey = userKey
  todosCache.clear()
  todosInFlight.clear()
}

function getScopeKey(scope: TodosScope, userKey: string | null): string {
  if ('projectId' in scope) return `project:${scope.projectId}:${userKey ?? 'anon'}`
  return `activity:${scope.activityId}:${userKey ?? 'anon'}`
}

function getTodosUrl(scope: TodosScope): string {
  if ('projectId' in scope) {
    return API_URL ? `${API_URL}/api/todos/${scope.projectId}` : `/api/todos/${scope.projectId}`
  }
  return API_URL ? `${API_URL}/api/todos/by-activity/${scope.activityId}` : `/api/todos/by-activity/${scope.activityId}`
}

async function getResponseError(response: Response, fallback: string): Promise<Error> {
  try {
    const data = await response.json()
    const message =
      (typeof data?.error === 'string' && data.error) ||
      (typeof data?.message === 'string' && data.message) ||
      fallback
    return new Error(message)
  } catch {
    return new Error(fallback)
  }
}

async function fetchTodosForScope(
  scope: TodosScope,
  getAuthHeaders: () => Record<string, string>,
  userKey: string | null,
  options?: { force?: boolean },
): Promise<TodoEntity[]> {
  const cacheKey = getScopeKey(scope, userKey)

  if (!options?.force && todosCache.has(cacheKey)) {
    return todosCache.get(cacheKey) ?? []
  }

  if (!options?.force && todosInFlight.has(cacheKey)) {
    return todosInFlight.get(cacheKey) ?? Promise.resolve([])
  }

  const promise = (async () => {
    const response = await fetch(getTodosUrl(scope), { headers: getAuthHeaders() })
    if (!response.ok) {
      throw await getResponseError(response, 'Failed to fetch todos')
    }
    const data = await response.json()
    const normalized = Array.isArray(data) ? (data as TodoEntity[]) : []
    todosCache.set(cacheKey, normalized)
    return normalized
  })()

  todosInFlight.set(cacheKey, promise)

  try {
    return await promise
  } finally {
    todosInFlight.delete(cacheKey)
  }
}

export function usePrefetchTodos(scopes: TodosScope[]) {
  const { currentUser, getAuthHeaders } = useAuth()

  const normalizedScopes = useMemo(() => {
    const unique = new Map<string, TodosScope>()
    for (const scope of scopes) {
      unique.set(getScopeKey(scope, currentUser?.id ?? null), scope)
    }
    return Array.from(unique.values())
  }, [scopes, currentUser?.id])

  useEffect(() => {
    resetTodoCacheForUser(currentUser?.id ?? null)
  }, [currentUser?.id])

  useEffect(() => {
    if (!currentUser?.id || normalizedScopes.length === 0) return

    let cancelled = false

    const run = async () => {
      for (const scope of normalizedScopes) {
        if (cancelled) break
        void fetchTodosForScope(scope, getAuthHeaders, currentUser.id).catch(() => {
          // Prefetch falha de forma silenciosa; o carregamento normal do dialog continua como fallback.
        })
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [normalizedScopes, getAuthHeaders, currentUser?.id])
}

function unwrapTodoMutation(payload: unknown): TodoMutationResponse {
  if (payload && typeof payload === 'object' && 'todo' in payload) {
    const mutation = payload as TodoMutationResponse
    return mutation
  }

  return {
    todo: payload as TodoEntity,
    xpDelta: null,
    xpAction: null,
  }
}

function updateCachedTodos(
  scopeKey: string | null,
  updater: (prev: TodoEntity[]) => TodoEntity[],
) {
  if (!scopeKey) return
  const previous = todosCache.get(scopeKey) ?? []
  todosCache.set(scopeKey, updater(previous))
}

export function useTodos(scope: TodosScope | null) {
  const { currentUser, getAuthHeaders } = useAuth()
  const projectId = scope && 'projectId' in scope ? scope.projectId : null
  const activityId = scope && 'activityId' in scope ? scope.activityId : null
  const hasScope = Boolean(projectId || activityId)
  const userKey = currentUser?.id ?? null
  const scopeKey = scope ? getScopeKey(scope, userKey) : null

  const [todos, setTodos] = useState<TodoEntity[]>(() => (scopeKey ? (todosCache.get(scopeKey) ?? []) : []))
  const [loading, setLoading] = useState(() => (scopeKey && todosCache.has(scopeKey) ? false : hasScope))
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  /** Ignora respostas de fetch antigo quando projectId/activityId mudam ou há refetch rápido */
  const fetchGenerationRef = useRef(0)

  useEffect(() => {
    resetTodoCacheForUser(userKey)
  }, [userKey])

  const fetchTodos = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      if (!scope) {
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
        const data = await fetchTodosForScope(scope, getAuthHeaders, userKey, { force: options?.force })
        if (generation !== fetchGenerationRef.current) return
        setTodos(data)
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
    [scope, getAuthHeaders, userKey],
  )

  useEffect(() => {
    if (!scopeKey) return
    const cached = todosCache.get(scopeKey)
    if (cached) {
      setTodos(cached)
      setLoading(false)
    } else {
      setTodos([])
      setLoading(hasScope)
    }
  }, [scopeKey, hasScope])

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
              const row = payload.new as unknown as TodoEntity
              setTodos((prev) => (prev.some((t) => t.id === row.id) ? prev : [...prev, row]))
            }
            if (payload.eventType === 'UPDATE' && payload.new) {
              const row = payload.new as unknown as TodoEntity
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
              const row = payload.new as unknown as TodoEntity
              setTodos((prev) => (prev.some((t) => t.id === row.id) ? prev : [...prev, row]))
            }
            if (payload.eventType === 'UPDATE' && payload.new) {
              const row = payload.new as unknown as TodoEntity
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
          throw await getResponseError(response, 'Failed to create todo')
        }
        const payload = await response.json()
        const newTodo = unwrapTodoMutation(payload).todo
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
      const previousTodos = todos
      const optimisticTimestamp = new Date().toISOString()
      const optimisticTodo = previousTodos.find((todo) => todo.id === id)
      const hasOptimisticUpdate = Boolean(optimisticTodo)

      if (hasOptimisticUpdate) {
        const nextTodos = previousTodos.map((todo) => {
          if (todo.id !== id) return todo

          const mergedAssignedTo = updates.assigned_to !== undefined ? updates.assigned_to ?? null : todo.assigned_to
          const mergedCompleted = updates.completed !== undefined ? Boolean(updates.completed) : todo.completed

          return {
            ...todo,
            ...updates,
            assigned_to: mergedAssignedTo,
            completed: mergedCompleted,
            assigned_at:
              updates.assigned_to !== undefined
                ? mergedAssignedTo
                  ? optimisticTimestamp
                  : null
                : todo.assigned_at ?? null,
            completed_at:
              updates.completed === true
                ? optimisticTimestamp
                : updates.completed === false
                  ? null
                  : todo.completed_at ?? null,
          }
        })

        setTodos(nextTodos)
        updateCachedTodos(scopeKey, () => nextTodos)
      }

      try {
        const url = API_URL ? `${API_URL}/api/todos/${id}` : `/api/todos/${id}`
        const response = await fetch(url, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates),
        })
        if (!response.ok) {
          throw await getResponseError(response, 'Failed to update todo')
        }
        const payload = unwrapTodoMutation(await response.json())
        setTodos((prev) => {
          const next = prev.map((todo) => (todo.id === id ? payload.todo : todo))
          updateCachedTodos(scopeKey, () => next)
          return next
        })
        if (projectId) invalidateTodosForProject(projectId)
        if (activityId) invalidateTodosForActivity(activityId)
        return payload
      } catch (err) {
        if (hasOptimisticUpdate) {
          setTodos(previousTodos)
          updateCachedTodos(scopeKey, () => previousTodos)
        }
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      }
    },
    [getAuthHeaders, projectId, activityId, todos, scopeKey]
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
          throw await getResponseError(response, 'Failed to delete todo')
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
            throw await getResponseError(response, 'Failed to reorder todos')
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
            throw await getResponseError(response, 'Failed to reorder activity todos')
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
