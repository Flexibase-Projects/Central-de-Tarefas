import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { UserProgress } from '@/types'
import { apiUrl } from '@/lib/api'
const POLL_INTERVAL_MS = 60_000 // 60 seconds

export function useUserProgress(targetUserId?: string | null, enabled = true) {
  const { getAuthHeaders } = useAuth()
  const [data, setData] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingXp, setPendingXp] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchProgress = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      setData(null)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const url = apiUrl('/api/me/progress')
      const headers = getAuthHeaders()
      if (targetUserId) {
        headers['x-user-id'] = targetUserId
      }
      const response = await fetch(url, { headers })
      if (!response.ok) {
        if (response.status === 401) {
          setData(null)
          return
        }
        throw new Error('Falha ao carregar progresso')
      }
      const json = await response.json()
      setData(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar progresso'
      setError(message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [enabled, getAuthHeaders, targetUserId])

  // Initial fetch + 60-second polling
  useEffect(() => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      setError(null)
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    fetchProgress()

    intervalRef.current = setInterval(() => {
      fetchProgress()
    }, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, fetchProgress])

  useEffect(() => {
    const handler = () => {
      void fetchProgress()
    }

    window.addEventListener('cdt-todo-completed', handler)
    window.addEventListener('cdt-activities-invalidated', handler)

    return () => {
      window.removeEventListener('cdt-todo-completed', handler)
      window.removeEventListener('cdt-activities-invalidated', handler)
    }
  }, [enabled, fetchProgress])

  const notifyXpAwarded = useCallback((xpAwarded: number) => {
    setPendingXp(xpAwarded)
  }, [])

  const clearPendingXp = useCallback(() => {
    setPendingXp(null)
  }, [])

  return { data, loading, error, refresh: fetchProgress, pendingXp, notifyXpAwarded, clearPendingXp }
}
