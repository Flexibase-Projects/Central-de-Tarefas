import { useState, useEffect } from 'react'
import { Activity } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'

type MigrationErrorBody = {
  error?: string
  code?: string
  sql?: string
  quickFixSql?: string
  migrations?: string[]
}

function formatMigrationRequiredMessage(err: MigrationErrorBody): string {
  const lines: string[] = [err.error ?? 'É necessário atualizar o banco de dados no Supabase.']
  if (err.migrations?.length) {
    lines.push(`Migrações completas (recomendado): ${err.migrations.join(', ')}`)
  }
  if (err.quickFixSql) {
    lines.push('', 'Correção rápida — cole no Supabase → SQL Editor → Run:', '', err.quickFixSql)
  } else if (err.sql) {
    lines.push('', err.sql)
  }
  return lines.join('\n')
}

export function useActivities() {
  const { getAuthHeaders } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = async () => {
      try {
        setLoading(true)
      const response = await fetch(apiUrl('/api/activities'), { headers: getAuthHeaders() })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch activities: ${response.status} ${response.statusText} - ${errorText}`)
      }
      const data = await response.json()
      setActivities(data)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching activities:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

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
      setActivities(prev => [newActivity, ...prev])
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
      setActivities(prev => prev.map(a => a.id === id ? updatedActivity : a))
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
      setActivities(prev => prev.filter(a => a.id !== id))
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
