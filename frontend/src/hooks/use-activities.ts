import { useState, useEffect } from 'react'
import { Activity } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''

export function useActivities() {
  const { getAuthHeaders } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const url = API_URL ? `${API_URL}/api/activities` : '/api/activities'
      const response = await fetch(url, { headers: getAuthHeaders() })
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
      const url = API_URL ? `${API_URL}/api/activities` : '/api/activities'
      const response = await fetch(url, {
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
      const url = API_URL ? `${API_URL}/api/activities/${id}` : `/api/activities/${id}`
      const response = await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const err = body as { error?: string; code?: string; sql?: string }
        if (response.status === 503 && err.code === 'MIGRATION_REQUIRED' && err.sql) {
          throw new Error(`${err.error ?? 'Migração necessária'}\n\n${err.sql}`)
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
      const url = API_URL ? `${API_URL}/api/activities/${id}` : `/api/activities/${id}`
      const response = await fetch(url, {
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
