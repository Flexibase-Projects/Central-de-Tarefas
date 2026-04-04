import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'
import type { WorkspaceRankingData, WorkspaceRankingResponse } from '@/types'

const POLL_INTERVAL_MS = 60_000

export function useWorkspaceRanking(workspaceSlug?: string | null) {
  const { currentUser, getAuthHeaders } = useAuth()
  const [data, setData] = useState<WorkspaceRankingResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!workspaceSlug || !currentUser?.id) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(apiUrl(`/api/workspaces/${workspaceSlug}/ranking`), {
        headers: getAuthHeaders(),
      })
      const body = (await response.json().catch(() => null)) as WorkspaceRankingResponse | { error?: string } | null
      if (!response.ok) {
        throw new Error((body as { error?: string } | null)?.error || 'Falha ao carregar ranking do workspace')
      }
      setData(body as WorkspaceRankingResponse)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : 'Falha ao carregar ranking do workspace')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id, getAuthHeaders, workspaceSlug])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!workspaceSlug || !currentUser?.id) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [currentUser?.id, refresh, workspaceSlug])

  useEffect(() => {
    const handler = () => {
      void refresh()
    }

    window.addEventListener('cdt-todo-completed', handler)
    window.addEventListener('cdt-activities-invalidated', handler)

    return () => {
      window.removeEventListener('cdt-todo-completed', handler)
      window.removeEventListener('cdt-activities-invalidated', handler)
    }
  }, [refresh])

  const ranking: WorkspaceRankingData | null = data?.ranking ?? null

  return {
    data,
    ranking,
    workspace: data?.workspace ?? null,
    available: Boolean(data?.enabled),
    reason: data?.reason ?? null,
    loading,
    error,
    refresh,
  }
}

