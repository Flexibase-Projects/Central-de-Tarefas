import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'
import type { HomeReviewItem, HomeTodoItem, HomeViewData } from '@/types'

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
  }
}

function normalizeReviewItem(value: unknown): HomeReviewItem | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  return {
    id: value.id,
    kind: value.kind === 'project' ? 'project' : 'activity',
    title: typeof value.title === 'string' ? value.title : 'Item em revisão',
    status: typeof value.status === 'string' ? value.status : 'review',
    dueDate: typeof value.dueDate === 'string' ? value.dueDate : null,
    ownerName: typeof value.ownerName === 'string' ? value.ownerName : null,
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
      overdue: typeof summary.overdue === 'number' ? summary.overdue : 0,
      waiting: typeof summary.waiting === 'number' ? summary.waiting : 0,
      delegated: typeof summary.delegated === 'number' ? summary.delegated : 0,
      teamOpen: typeof summary.teamOpen === 'number' ? summary.teamOpen : undefined,
      xpPending: typeof summary.xpPending === 'number' ? summary.xpPending : undefined,
    },
    buckets: {
      now: Array.isArray(buckets.now) ? buckets.now.map(normalizeTodoItem).filter((item): item is HomeTodoItem => item !== null) : [],
      overdue: Array.isArray(buckets.overdue) ? buckets.overdue.map(normalizeTodoItem).filter((item): item is HomeTodoItem => item !== null) : [],
      waiting: Array.isArray(buckets.waiting) ? buckets.waiting.map(normalizeReviewItem).filter((item): item is HomeReviewItem => item !== null) : [],
      delegated: Array.isArray(buckets.delegated) ? buckets.delegated.map(normalizeTodoItem).filter((item): item is HomeTodoItem => item !== null) : [],
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

export function useHome() {
  const { getAuthHeaders } = useAuth()
  const [data, setData] = useState<HomeViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHome = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(apiUrl('/api/home'), { headers: getAuthHeaders() })
      if (!response.ok) {
        if (response.status === 401) {
          setData(null)
          return
        }
        throw new Error('Falha ao carregar a central de tarefas')
      }
      const json = await response.json()
      setData(normalizeHome(json))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar a central de tarefas')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    void fetchHome()
  }, [fetchHome])

  return {
    data,
    loading,
    error,
    refresh: fetchHome,
  }
}
