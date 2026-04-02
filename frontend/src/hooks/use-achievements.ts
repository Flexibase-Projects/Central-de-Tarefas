import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'
import type { Achievement } from '@/types'

export function useAchievements(enabled = true) {
  const { getAuthHeaders } = useAuth()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setAchievements([])
      setLoading(false)
      setError(null)
      return
    }

    async function fetchAchievements() {
      try {
        const response = await fetch(apiUrl('/api/achievements'), { headers: getAuthHeaders() })
        if (!response.ok) throw new Error('Falha ao carregar conquistas')
        const data = await response.json()
        setAchievements(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro')
      } finally {
        setLoading(false)
      }
    }
    fetchAchievements()
  }, [enabled, getAuthHeaders])

  return { achievements, loading, error }
}
