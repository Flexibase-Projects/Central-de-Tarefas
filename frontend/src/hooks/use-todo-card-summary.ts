import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'
import type { ExecutionCardSummaryRow } from '@/types'

function normalizeRow(value: unknown): ExecutionCardSummaryRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const projectId = typeof row.project_id === 'string' ? row.project_id : ''
  if (!projectId) return null

  return {
    entity_type: row.entity_type === 'activity' ? 'activity' : 'project',
    project_id: projectId,
    project_name: typeof row.project_name === 'string' ? row.project_name : 'Item',
    project_status: typeof row.project_status === 'string' ? row.project_status : 'backlog',
    myAssignedOpenCount: typeof row.myAssignedOpenCount === 'number' ? row.myAssignedOpenCount : 0,
    totalOpenCount: typeof row.totalOpenCount === 'number' ? row.totalOpenCount : 0,
    xpPendingCount: typeof row.xpPendingCount === 'number' ? row.xpPendingCount : 0,
  }
}

export function useTodoCardSummary() {
  const { getAuthHeaders } = useAuth()
  const [rows, setRows] = useState<ExecutionCardSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(apiUrl('/api/projects/todo-card-summary'), {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error('Falha ao carregar o resumo operacional')
      }
      const json = await response.json()
      setRows(
        Array.isArray(json)
          ? json.map(normalizeRow).filter((row): row is ExecutionCardSummaryRow => row !== null)
          : [],
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar o resumo operacional')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    void fetchSummary()
  }, [fetchSummary])

  return {
    rows,
    loading,
    error,
    refresh: fetchSummary,
  }
}
