import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'

const activityCache = new Map<string, Activity[]>()
const activityInFlight = new Map<string, Promise<Activity[]>>()

type MigrationErrorBody = {
  error?: string
  code?: string
  sql?: string
  quickFixSql?: string
  migrations?: string[]
}

function formatMigrationRequiredMessage(err: MigrationErrorBody): string {
  const lines: string[] = [err.error ?? 'E necessario atualizar o banco de dados no Supabase.']
  if (err.migrations?.length) {
    lines.push(`Migracoes completas (recomendado): ${err.migrations.join(', ')}`)
  }
  if (err.quickFixSql) {
    lines.push('', 'Correcao rapida - cole no Supabase > SQL Editor > Run:', '', err.quickFixSql)
  } else if (err.sql) {
    lines.push('', err.sql)
  }
  return lines.join('\n')
}

async function fetchActivitiesForCacheKey(
  cacheKey: string,
  getAuthHeaders: () => Record<string, string>,
  options?: { force?: boolean },
): Promise<Activity[]> {
  if (!options?.force && activityCache.has(cacheKey)) {
    return activityCache.get(cacheKey) ?? []
  }

  const existingRequest = activityInFlight.get(cacheKey)
  if (existingRequest) {
    return existingRequest
  }

  const request = (async () => {
    const response = await fetch(apiUrl('/api/activities'), { headers: getAuthHeaders() })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch activities: ${response.status} ${response.statusText} - ${errorText}`)
    }
    const data = await response.json()
    const normalized = Array.isArray(data) ? data : []
    activityCache.set(cacheKey, normalized)
    return normalized
  })()

  activityInFlight.set(cacheKey, request)

  try {
    return await request
  } finally {
    if (activityInFlight.get(cacheKey) === request) {
      activityInFlight.delete(cacheKey)
    }
  }
}

export async function prefetchActivities(params: {
  cacheKey: string
  getAuthHeaders: () => Record<string, string>
  force?: boolean
}) {
  return fetchActivitiesForCacheKey(params.cacheKey, params.getAuthHeaders, { force: params.force })
}

export function useActivities(enabled = true) {
  const { currentUser, currentWorkspace, getAuthHeaders } = useAuth()
  const cacheKey = useMemo(
    () => `${currentWorkspace?.slug ?? 'workspace'}:${currentUser?.id ?? 'anonymous'}`,
    [currentUser?.id, currentWorkspace?.slug],
  )
  const cachedActivities = activityCache.get(cacheKey) ?? []
  const [activities, setActivities] = useState<Activity[]>(cachedActivities)
  const [loading, setLoading] = useState(enabled && cachedActivities.length === 0)
  const [error, setError] = useState<string | null>(null)

  const commitActivities = useCallback((nextActivities: Activity[] | ((prev: Activity[]) => Activity[])) => {
    setActivities((previous) => {
      const resolved = typeof nextActivities === 'function'
        ? (nextActivities as (prev: Activity[]) => Activity[])(previous)
        : nextActivities

      activityCache.set(cacheKey, resolved)
      return resolved
    })
  }, [cacheKey])

  const fetchActivities = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return activityCache.get(cacheKey) ?? []
    }

    try {
      setLoading(true)
      const data = await fetchActivitiesForCacheKey(cacheKey, getAuthHeaders, { force: true })
      commitActivities(data)
      setError(null)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching activities:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [cacheKey, commitActivities, enabled, getAuthHeaders])

  useEffect(() => {
    const nextActivities = activityCache.get(cacheKey) ?? []
    setActivities(nextActivities)
    setLoading(enabled && nextActivities.length === 0)
    setError(null)
  }, [cacheKey, enabled])

  useEffect(() => {
    if (!enabled) return
    void fetchActivities()
  }, [enabled, fetchActivities])

  const createActivity = async (activity: Partial<Activity>) => {
    try {
      const response = await fetch(apiUrl('/api/activities'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(activity),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create activity: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const newActivity = await response.json()
      commitActivities((prev) => [newActivity, ...prev])
      return newActivity
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }

  const updateActivity = async (id: string, updates: Partial<Activity>) => {
    try {
      const response = await fetch(apiUrl(`/api/activities/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const err = body as MigrationErrorBody
        if (response.status === 503 && err.code === 'MIGRATION_REQUIRED') {
          throw new Error(formatMigrationRequiredMessage(err))
        }
        throw new Error(err.error ?? 'Falha ao atualizar atividade')
      }
      const updatedActivity = body
      commitActivities((prev) => prev.map((activity) => (activity.id === id ? updatedActivity : activity)))
      return updatedActivity
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }

  const deleteActivity = async (id: string) => {
    try {
      const response = await fetch(apiUrl(`/api/activities/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to delete activity')
      commitActivities((prev) => prev.filter((activity) => activity.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }

  const moveActivity = async (activityId: string, newStatus: Activity['status']) => {
    return updateActivity(activityId, { status: newStatus })
  }

  return {
    activities,
    loading,
    error,
    createActivity,
    updateActivity,
    deleteActivity,
    moveActivity,
    refetch: fetchActivities,
  }
}
