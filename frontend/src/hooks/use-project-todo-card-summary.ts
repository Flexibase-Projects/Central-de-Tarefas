import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'

export type ProjectTodoCardSummary = {
  entity_type?: 'project' | 'activity'
  project_id: string
  project_name: string
  project_status: string
  myAssignedOpenCount: number
  totalOpenCount?: number
  xpPendingCount: number
}

type SummarySnapshot = {
  rows: ProjectTodoCardSummary[]
  loading: boolean
  error: string | null
  userKey: string | null
}

let activeUserKey: string | null = null
let cachedRows: ProjectTodoCardSummary[] = []
let cachedError: string | null = null
let cachedLoading = false
let cachedLoaded = false
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function resetCacheForUser(userKey: string | null) {
  if (activeUserKey === userKey) return
  activeUserKey = userKey
  cachedRows = []
  cachedError = null
  cachedLoading = false
  cachedLoaded = false
  inFlight = null
}

async function fetchSummary(getAuthHeaders: () => HeadersInit, userKey: string | null, force = false) {
  resetCacheForUser(userKey)

  if (!userKey) {
    cachedRows = []
    cachedError = null
    cachedLoading = false
    cachedLoaded = true
    emit()
    return []
  }

  if (!force) {
    if (cachedLoaded || cachedLoading) {
      return cachedRows
    }
  } else {
    cachedRows = []
    cachedLoaded = false
  }

  if (!inFlight) {
    cachedLoading = true
    cachedError = null
    emit()

    inFlight = (async () => {
      const response = await fetch(apiUrl('/api/projects/todo-card-summary'), { headers: getAuthHeaders() })

      if (!response.ok) {
        throw new Error('Falha ao carregar resumo dos cards')
      }

      const data = (await response.json()) as ProjectTodoCardSummary[]
      cachedRows = Array.isArray(data) ? data : []
      cachedError = null
      cachedLoaded = true
    })()
      .catch((error: unknown) => {
        cachedRows = []
        cachedError = error instanceof Error ? error.message : 'Falha ao carregar resumo dos cards'
        cachedLoaded = true
      })
      .finally(() => {
        cachedLoading = false
        inFlight = null
        emit()
      })
  }

  await inFlight
  return cachedRows
}

function getSnapshot(userKey: string | null): SummarySnapshot {
  if (activeUserKey !== userKey) {
    return {
      rows: [],
      loading: userKey != null,
      error: null,
      userKey,
    }
  }

  return {
    rows: cachedRows,
    loading: cachedLoading,
    error: cachedError,
    userKey,
  }
}

export function useProjectTodoCardSummary() {
  const { currentUser, getAuthHeaders } = useAuth()
  const userKey = currentUser?.id ?? null
  const [snapshot, setSnapshot] = useState<SummarySnapshot>(() => getSnapshot(userKey))

  useEffect(() => {
    const sync = () => setSnapshot(getSnapshot(userKey))
    listeners.add(sync)
    sync()

    void fetchSummary(getAuthHeaders, userKey).catch(() => {
      // O estado já é refletido no snapshot; não há ação adicional aqui.
    })

    return () => {
      listeners.delete(sync)
    }
  }, [getAuthHeaders, userKey])

  useEffect(() => {
    if (!userKey) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const handleInvalidated = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void fetchSummary(getAuthHeaders, userKey, true)
      }, 180)
    }

    window.addEventListener('cdt-todos-invalidated', handleInvalidated)
    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('cdt-todos-invalidated', handleInvalidated)
    }
  }, [getAuthHeaders, userKey])

  const summariesByProjectId = useMemo(() => {
    return snapshot.rows.reduce((acc, row) => {
      acc[row.project_id] = row
      return acc
    }, {} as Record<string, ProjectTodoCardSummary>)
  }, [snapshot.rows])

  const refresh = async () => {
    await fetchSummary(getAuthHeaders, userKey, true)
  }

  return {
    summariesByProjectId,
    loading: snapshot.loading,
    error: snapshot.error,
    refresh,
  }
}
