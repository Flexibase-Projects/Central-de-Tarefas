import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'
import type { HomeReviewItem, HomeTodoItem, HomeViewData } from '@/types'

const homeCache = new Map<string, HomeViewData | null>()
const homeInFlight = new Map<string, Promise<HomeViewData | null>>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function normalizeTodoItem(value: unknown): HomeTodoItem | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  return {
    id: value.id,
    title: typeof value.title === 'string' ? value.title : 'Item',
    deadline: typeof value.deadline === 'string' ? value.deadline : null,
    projectId: typeof value.projectId === 'string' ? value.projectId : null,
    projectName: typeof value.projectName === 'string' ? value.projectName : null,
    activityId: typeof value.activityId === 'string' ? value.activityId : null,
    activityName: typeof value.activityName === 'string' ? value.activityName : null,
    assigneeName: typeof value.assigneeName === 'string' ? value.assigneeName : null,
    sourceType: value.sourceType === 'activity' ? 'activity' : 'todo',
  }
}

function normalizeReviewItem(value: unknown): HomeReviewItem | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  return {
    id: value.id,
    kind: value.kind === 'project' ? 'project' : value.kind === 'todo' ? 'todo' : 'activity',
    title: typeof value.title === 'string' ? value.title : 'Item em revisao',
    status: typeof value.status === 'string' ? value.status : 'review',
    dueDate: typeof value.dueDate === 'string' ? value.dueDate : null,
    ownerName: typeof value.ownerName === 'string' ? value.ownerName : null,
    waitingReason: value.waitingReason === 'xp' ? 'xp' : 'review',
  }
}

function normalizeHome(value: unknown): HomeViewData | null {
  if (!isRecord(value)) return null

  const summary = isRecord(value.summary) ? value.summary : {}
  const buckets = isRecord(value.buckets) ? value.buckets : {}
  const quickTargets = isRecord(value.quickTargets) ? value.quickTargets : {}

  return {
    persona: value.persona === 'admin' ? 'admin' : 'member',
    summary: {
      myOpen: typeof summary.myOpen === 'number' ? summary.myOpen : 0,
      myPending: typeof summary.myPending === 'number' ? summary.myPending : undefined,
      overdue: typeof summary.overdue === 'number' ? summary.overdue : 0,
      waiting: typeof summary.waiting === 'number' ? summary.waiting : 0,
      teamOpenActivities:
        typeof summary.teamOpenActivities === 'number' ? summary.teamOpenActivities : undefined,
      teamOpenItems:
        typeof summary.teamOpenItems === 'number' ? summary.teamOpenItems : undefined,
      xpPending: typeof summary.xpPending === 'number' ? summary.xpPending : undefined,
    },
    buckets: {
      now: Array.isArray(buckets.now) ? buckets.now.map(normalizeTodoItem).filter((item): item is HomeTodoItem => item !== null) : [],
      pending: Array.isArray(buckets.pending)
        ? buckets.pending.map(normalizeTodoItem).filter((item): item is HomeTodoItem => item !== null)
        : undefined,
      overdue: Array.isArray(buckets.overdue) ? buckets.overdue.map(normalizeTodoItem).filter((item): item is HomeTodoItem => item !== null) : [],
      waiting: Array.isArray(buckets.waiting) ? buckets.waiting.map(normalizeReviewItem).filter((item): item is HomeReviewItem => item !== null) : [],
      teamOpenActivities:
        Array.isArray(buckets.teamOpenActivities)
          ? buckets.teamOpenActivities.map(normalizeTodoItem).filter((item): item is HomeTodoItem => item !== null)
          : [],
      teamOpenItems: Array.isArray(buckets.teamOpenItems)
        ? buckets.teamOpenItems.map(normalizeTodoItem).filter((item): item is HomeTodoItem => item !== null)
        : undefined,
    },
    quickTargets: {
      projectsOpen:
        typeof quickTargets.projectsOpen === 'string' ? quickTargets.projectsOpen : '/desenvolvimentos?view=list',
      activitiesOpen:
        typeof quickTargets.activitiesOpen === 'string' ? quickTargets.activitiesOpen : '/atividades?view=list',
      indicatorsUrl:
        typeof quickTargets.indicatorsUrl === 'string' ? quickTargets.indicatorsUrl : '/indicadores',
      adminUrl: typeof quickTargets.adminUrl === 'string' ? quickTargets.adminUrl : undefined,
    },
  }
}

async function fetchHomeForCacheKey(
  cacheKey: string,
  getAuthHeaders: () => Record<string, string>,
  options?: { force?: boolean },
): Promise<HomeViewData | null> {
  if (!options?.force && homeCache.has(cacheKey)) {
    return homeCache.get(cacheKey) ?? null
  }

  const existingRequest = homeInFlight.get(cacheKey)
  if (existingRequest) {
    return existingRequest
  }

  const request = (async () => {
    const response = await fetch(apiUrl('/api/home'), { headers: getAuthHeaders() })
    if (!response.ok) {
      if (response.status === 401) {
        homeCache.delete(cacheKey)
        return null
      }
      throw new Error('Falha ao carregar a central de tarefas')
    }
    const json = await response.json()
    const normalized = normalizeHome(json)
    if (normalized) {
      homeCache.set(cacheKey, normalized)
    } else {
      homeCache.delete(cacheKey)
    }
    return normalized
  })()

  homeInFlight.set(cacheKey, request)

  try {
    return await request
  } finally {
    if (homeInFlight.get(cacheKey) === request) {
      homeInFlight.delete(cacheKey)
    }
  }
}

export async function prefetchHome(params: {
  cacheKey: string
  getAuthHeaders: () => Record<string, string>
  force?: boolean
}) {
  return fetchHomeForCacheKey(params.cacheKey, params.getAuthHeaders, { force: params.force })
}

export function useHome(enabled = true) {
  const { currentUser, currentWorkspace, getAuthHeaders } = useAuth()
  const cacheKey = useMemo(
    () => `${currentWorkspace?.slug ?? 'workspace'}:${currentUser?.id ?? 'anonymous'}`,
    [currentUser?.id, currentWorkspace?.slug],
  )
  const cachedHome = homeCache.get(cacheKey) ?? null
  const [data, setData] = useState<HomeViewData | null>(cachedHome)
  const [loading, setLoading] = useState(enabled && !cachedHome)
  const [error, setError] = useState<string | null>(null)

  const commitHome = useCallback((nextData: HomeViewData | null) => {
    if (nextData) {
      homeCache.set(cacheKey, nextData)
    } else {
      homeCache.delete(cacheKey)
    }
    setData(nextData)
  }, [cacheKey])

  const fetchHome = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return homeCache.get(cacheKey) ?? null
    }

    try {
      setLoading(true)
      setError(null)
      const nextData = await fetchHomeForCacheKey(cacheKey, getAuthHeaders, { force: true })
      commitHome(nextData)
      return nextData
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar a central de tarefas')
      return null
    } finally {
      setLoading(false)
    }
  }, [cacheKey, commitHome, enabled, getAuthHeaders])

  useEffect(() => {
    setData(cachedHome)
    setLoading(enabled && !cachedHome)
    setError(null)
  }, [cacheKey, cachedHome, enabled])

  useEffect(() => {
    if (!enabled) return
    void fetchHome()
  }, [enabled, fetchHome])

  return {
    data,
    loading,
    error,
    refresh: fetchHome,
  }
}
