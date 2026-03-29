import { useCallback, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { CostManagementGraph } from '@/types/cost-org'
import { apiUrl } from '@/lib/api'

export function useCostGraph() {
  const { getAuthHeaders } = useAuth()
  const [graph, setGraph] = useState<CostManagementGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGraph = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/cost-management/graph'), { headers: getAuthHeaders() })
      const data = (await res.json()) as CostManagementGraph & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar dados de custos')
      setGraph({
        departments: data.departments ?? [],
        departmentCosts: data.departmentCosts ?? [],
        members: data.members ?? [],
        costItems: data.costItems ?? [],
      })
    } catch (e) {
      setError((e as Error).message)
      setGraph(null)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  return { graph, loading, error, fetchGraph }
}

export type CostSummaryResponse = {
  departments: {
    departmentId: string
    departmentName: string
    fixedCostsTotal: number
    peopleCostsTotal: number
    total: number
    costItemCount: number
    memberCount: number
  }[]
  costItemsByStatus: Record<string, { count: number; amount: number }>
  costItemsNarrative: Record<string, unknown>[]
}

export function useCostSummary() {
  const { getAuthHeaders } = useAuth()
  const [summary, setSummary] = useState<CostSummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/cost-management/summary'), { headers: getAuthHeaders() })
      const data = (await res.json()) as CostSummaryResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar resumo')
      setSummary(data)
    } catch {
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  return { summary, loading, fetchSummary }
}
