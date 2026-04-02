import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { apiUrl } from '@/lib/api'

const indicatorsCache = new Map<string, IndicatorsViewData | null>()
const indicatorsInFlight = new Map<string, Promise<IndicatorsViewData | null>>()

export interface IndicatorsTeamTotals {
  total_users: number
  total_projects: number
  total_activities: number
  total_comments: number
  total_todos_created: number
  total_todos_completed: number
}

export interface IndicatorsUserRow {
  user_id: string
  name: string
  email: string
  avatar_url: string | null
  comments_count: number
  todos_created: number
  todos_completed: number
  activities_created: number
  activities_assigned: number
}

export interface IndicatorsProjectRow {
  project_id: string
  project_name: string
  project_status: string
  todos_count: number
  todos_completed: number
  comments_count: number
}

export interface IndicatorsActivityRow {
  activity_id: string
  activity_name: string
  status: string
  assigned_to: string | null
  due_date: string | null
}

export interface RecentActivity {
  id: string
  name: string
  status: string
  dueDate: string | null
  updatedAt: string | null
}

export interface IndicatorsPersonalSummary {
  commentsCount: number
  todosAssignedTotal: number
  todosAssignedCompleted: number
  todosAssignedOpen: number
  activitiesAssigned: number
}

export interface MonthlyActivitySummary {
  completed: number
  pending: number
  overdue: number
  total: number
}

export interface RecentAssignedTodo {
  id: string
  title: string
  completed: boolean
  assignedAt: string | null
  deadline: string | null
  projectName: string | null
  activityName: string | null
  xpReward: number
  projectId?: string | null
  activityId?: string | null
  assigneeName?: string | null
}

export interface IndicatorsViewData {
  scope: 'team' | 'me'
  team: IndicatorsTeamTotals
  personal: IndicatorsPersonalSummary
  monthlyActivitySummary: MonthlyActivitySummary
  recentAssignedTodos: RecentAssignedTodo[]
  pendingAssignedTodos: RecentAssignedTodo[]
  recentActivities: RecentActivity[]
  by_user: IndicatorsUserRow[]
  by_project: IndicatorsProjectRow[]
  by_activity: IndicatorsActivityRow[]
}

type IndicatorsResponse = Partial<IndicatorsViewData> & {
  scope?: 'team' | 'me'
}

type RawPersonalSummary = {
  commentsCount?: number
  todosAssignedTotal?: number
  todosAssignedCompleted?: number
  todosAssignedOpen?: number
  activitiesAssigned?: number
}

type RawMonthlyActivitySummary = Partial<MonthlyActivitySummary>
type RawRecentTodo = Partial<RecentAssignedTodo>
type RawRecentActivity = Partial<RecentActivity>

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function normalizeTeamTotals(raw: Partial<IndicatorsTeamTotals> | undefined): IndicatorsTeamTotals {
  return {
    total_users: toNumber(raw?.total_users, 0),
    total_projects: toNumber(raw?.total_projects, 0),
    total_activities: toNumber(raw?.total_activities, 0),
    total_comments: toNumber(raw?.total_comments, 0),
    total_todos_created: toNumber(raw?.total_todos_created, 0),
    total_todos_completed: toNumber(raw?.total_todos_completed, 0),
  }
}

function normalizePersonalSummary(
  raw: RawPersonalSummary | undefined,
  fallbackUserRow: IndicatorsUserRow | null,
): IndicatorsPersonalSummary {
  if (raw) {
    return {
      commentsCount: toNumber(raw.commentsCount, 0),
      todosAssignedTotal: toNumber(raw.todosAssignedTotal, 0),
      todosAssignedCompleted: toNumber(raw.todosAssignedCompleted, 0),
      todosAssignedOpen: toNumber(raw.todosAssignedOpen, 0),
      activitiesAssigned: toNumber(raw.activitiesAssigned, 0),
    }
  }

  if (fallbackUserRow) {
    const completed = toNumber(fallbackUserRow.todos_completed, 0)
    const created = toNumber(fallbackUserRow.todos_created, 0)
    const total = Math.max(created, completed)
    return {
      commentsCount: toNumber(fallbackUserRow.comments_count, 0),
      todosAssignedTotal: total,
      todosAssignedCompleted: completed,
      todosAssignedOpen: Math.max(0, total - completed),
      activitiesAssigned: toNumber(fallbackUserRow.activities_assigned, 0),
    }
  }

  return {
    commentsCount: 0,
    todosAssignedTotal: 0,
    todosAssignedCompleted: 0,
    todosAssignedOpen: 0,
    activitiesAssigned: 0,
  }
}

function normalizeRecentAssignedTodos(raw: unknown): RecentAssignedTodo[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): RecentAssignedTodo | null => {
      if (!item || typeof item !== 'object') return null
      const row = item as RawRecentTodo
      const id = typeof row.id === 'string' ? row.id : ''
      if (!id) return null
      return {
        id,
        title: typeof row.title === 'string' ? row.title : 'TO-DO',
        completed: Boolean(row.completed),
        assignedAt: typeof row.assignedAt === 'string' ? row.assignedAt : null,
        deadline: typeof row.deadline === 'string' ? row.deadline : null,
        projectName: typeof row.projectName === 'string' ? row.projectName : null,
        activityName: typeof row.activityName === 'string' ? row.activityName : null,
        xpReward: toNumber(row.xpReward, 0),
        projectId: typeof row.projectId === 'string' ? row.projectId : null,
        activityId: typeof row.activityId === 'string' ? row.activityId : null,
        assigneeName: typeof row.assigneeName === 'string' ? row.assigneeName : null,
      }
    })
    .filter((item): item is RecentAssignedTodo => item !== null)
}

function normalizeRecentActivities(raw: unknown): RecentActivity[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): RecentActivity | null => {
      if (!item || typeof item !== 'object') return null
      const row = item as RawRecentActivity
      const id = typeof row.id === 'string' ? row.id : ''
      if (!id) return null
      return {
        id,
        name: typeof row.name === 'string' ? row.name : 'Atividade',
        status: typeof row.status === 'string' ? row.status : 'backlog',
        dueDate: typeof row.dueDate === 'string' ? row.dueDate : null,
        updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
      }
    })
    .filter((item): item is RecentActivity => item !== null)
}

function normalizeMonthlyActivitySummary(raw: RawMonthlyActivitySummary | undefined): MonthlyActivitySummary {
  const completed = toNumber(raw?.completed, 0)
  const pending = toNumber(raw?.pending, 0)
  const overdue = toNumber(raw?.overdue, 0)

  return {
    completed,
    pending,
    overdue,
    total: toNumber(raw?.total, completed + pending + overdue),
  }
}

function normalizeIndicatorsResponse(
  raw: unknown,
  isTeamScope: boolean,
  currentUserId: string | null,
): IndicatorsViewData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as IndicatorsResponse
  const byUser = Array.isArray(data.by_user) ? data.by_user : []
  const fallbackUserRow =
    currentUserId && byUser.length > 0 ? byUser.find((row) => row.user_id === currentUserId) ?? null : null

  const personal = normalizePersonalSummary(data.personal as RawPersonalSummary | undefined, fallbackUserRow)

  return {
    scope: data.scope ?? (isTeamScope ? 'team' : 'me'),
    team: normalizeTeamTotals(data.team),
    personal,
    monthlyActivitySummary: normalizeMonthlyActivitySummary(
      (data as Record<string, unknown>).monthlyActivitySummary as RawMonthlyActivitySummary | undefined,
    ),
    recentAssignedTodos: normalizeRecentAssignedTodos(data.recentAssignedTodos),
    pendingAssignedTodos: normalizeRecentAssignedTodos((data as Record<string, unknown>).pendingAssignedTodos),
    recentActivities: normalizeRecentActivities((data as Record<string, unknown>).recentActivities),
    by_user: byUser,
    by_project: Array.isArray(data.by_project) ? data.by_project : [],
    by_activity: Array.isArray(data.by_activity) ? data.by_activity : [],
  }
}

async function fetchIndicatorsForCacheKey(params: {
  cacheKey: string
  scope: 'team' | 'me'
  resolvedUserId: string | null
  getAuthHeaders: () => Record<string, string>
  targetUserId?: string | null
  force?: boolean
}): Promise<IndicatorsViewData | null> {
  const { cacheKey, scope, resolvedUserId, getAuthHeaders, targetUserId, force } = params

  if (!force && indicatorsCache.has(cacheKey)) {
    return indicatorsCache.get(cacheKey) ?? null
  }

  const existingRequest = indicatorsInFlight.get(cacheKey)
  if (existingRequest) {
    return existingRequest
  }

  const request = (async () => {
    const url = apiUrl('/api/indicators', { scope })
    const headers = getAuthHeaders()
    if (targetUserId) {
      headers['x-user-id'] = targetUserId
    }
    const response = await fetch(url, { headers })
    if (!response.ok) {
      if (response.status === 401) {
        indicatorsCache.delete(cacheKey)
        return null
      }
      throw new Error('Falha ao carregar indicadores')
    }
    const json = await response.json()
    const normalized = normalizeIndicatorsResponse(json, scope === 'team', resolvedUserId)
    if (normalized) {
      indicatorsCache.set(cacheKey, normalized)
    } else {
      indicatorsCache.delete(cacheKey)
    }
    return normalized
  })()

  indicatorsInFlight.set(cacheKey, request)

  try {
    return await request
  } finally {
    if (indicatorsInFlight.get(cacheKey) === request) {
      indicatorsInFlight.delete(cacheKey)
    }
  }
}

export async function prefetchIndicators(params: {
  cacheKey: string
  scope: 'team' | 'me'
  resolvedUserId: string | null
  getAuthHeaders: () => Record<string, string>
  targetUserId?: string | null
  force?: boolean
}) {
  return fetchIndicatorsForCacheKey(params)
}

export function useIndicators(
  targetUserId?: string | null,
  forcedScope?: 'team' | 'me',
  enabled = true,
) {
  const { currentUser, currentWorkspace, getAuthHeaders } = useAuth()
  const { isManagerial } = useWorkspaceContext(currentWorkspace?.slug ?? null)
  const resolvedUserId = targetUserId ?? currentUser?.id ?? null
  const scope = forcedScope ?? (isManagerial ? 'team' : 'me')
  const cacheKey = useMemo(
    () => `${currentWorkspace?.slug ?? 'workspace'}:${resolvedUserId ?? 'anonymous'}:${scope}`,
    [currentWorkspace?.slug, resolvedUserId, scope],
  )
  const cachedIndicators = indicatorsCache.get(cacheKey) ?? null
  const [data, setData] = useState<IndicatorsViewData | null>(cachedIndicators)
  const [loading, setLoading] = useState(enabled && !cachedIndicators)
  const [error, setError] = useState<string | null>(null)

  const commitIndicators = useCallback(
    (nextData: IndicatorsViewData | null) => {
      if (nextData) {
        indicatorsCache.set(cacheKey, nextData)
      } else {
        indicatorsCache.delete(cacheKey)
      }
      setData(nextData)
    },
    [cacheKey],
  )

  const fetchIndicators = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      return indicatorsCache.get(cacheKey) ?? null
    }

    try {
      setLoading(true)
      setError(null)
      const nextData = await fetchIndicatorsForCacheKey({
        cacheKey,
        scope,
        resolvedUserId,
        getAuthHeaders,
        targetUserId,
        force: true,
      })
      commitIndicators(nextData)
      return nextData
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar indicadores'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [cacheKey, commitIndicators, enabled, getAuthHeaders, resolvedUserId, scope, targetUserId])

  useEffect(() => {
    setData(cachedIndicators)
    setLoading(enabled && !cachedIndicators)
    setError(null)
  }, [cacheKey, cachedIndicators, enabled])

  useEffect(() => {
    if (!enabled) return
    void fetchIndicators()
  }, [enabled, fetchIndicators])

  return { data, loading, error, refresh: fetchIndicators }
}
