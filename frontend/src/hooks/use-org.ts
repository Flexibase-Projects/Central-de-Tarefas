import { useCallback, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { OrgPersonSummary, OrgTreeNode } from '@/types/cost-org'
import { apiUrl } from '@/lib/api'

export function useOrgTree() {
  const { getAuthHeaders } = useAuth()
  const [tree, setTree] = useState<OrgTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/org/tree'), { headers: getAuthHeaders() })
      const text = await res.text()
      if (!res.ok) {
        let msg = text || res.statusText
        try {
          const j = JSON.parse(text) as { error?: string }
          if (j.error) msg = j.error
        } catch {
          /* ignore */
        }
        throw new Error(msg)
      }
      const data = JSON.parse(text) as { tree: OrgTreeNode[] }
      const raw = data.tree ?? []
      setTree(
        raw.map(function norm(n: OrgTreeNode): OrgTreeNode {
          return {
            ...n,
            monthlySalary: n.monthlySalary ?? null,
            monthlyCost: n.monthlyCost ?? null,
            children: (n.children ?? []).map(norm),
          }
        })
      )
    } catch (e) {
      setError((e as Error).message)
      setTree([])
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  return { tree, loading, error, fetchTree, setTree }
}

export function useOrgSummary() {
  const { getAuthHeaders } = useAuth()
  const [summary, setSummary] = useState<OrgPersonSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSummary = useCallback(
    async (entryId: string) => {
      setLoading(true)
      try {
        const res = await fetch(apiUrl(`/api/org/entry/${entryId}/summary`), { headers: getAuthHeaders() })
        const data = (await res.json()) as Partial<OrgPersonSummary> & { error?: string }
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar resumo')
        setSummary({
          headcount: data.headcount ?? 0,
          totalMonthlySalary: data.totalMonthlySalary ?? 0,
          totalMonthlyCost: data.totalMonthlyCost ?? 0,
          team: Array.isArray(data.team) ? data.team : [],
        })
      } catch {
        setSummary(null)
      } finally {
        setLoading(false)
      }
    },
    [getAuthHeaders]
  )

  return { summary, loading, fetchSummary, setSummary }
}

export type OrgEntry = {
  id: string
  person_name: string
  reports_to_id: string | null
  job_title: string | null
  display_order: number
  department_id: string | null
  monthly_salary?: number | null
  monthly_cost?: number | null
  created_at: string
  updated_at: string
}

export function useOrgEntries() {
  const { getAuthHeaders } = useAuth()
  const [entries, setEntries] = useState<OrgEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/org/entries'), { headers: getAuthHeaders() })
      const data = (await res.json()) as OrgEntry[]
      if (!res.ok) throw new Error('Falha ao listar')
      setEntries(Array.isArray(data) ? data : [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  const createEntry = useCallback(
    async (body: {
      person_name: string
      reports_to_id?: string | null
      job_title?: string | null
      display_order?: number
      department_id?: string | null
      monthly_salary?: number | null
      monthly_cost?: number | null
    }) => {
      const res = await fetch(apiUrl('/api/org/entries'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || 'Erro ao criar')
      }
      return res.json()
    },
    [getAuthHeaders]
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      const res = await fetch(apiUrl(`/api/org/entries/${id}`), { method: 'DELETE', headers: getAuthHeaders() })
      if (!res.ok) throw new Error('Erro ao remover')
    },
    [getAuthHeaders]
  )

  const deleteSubtree = useCallback(
    async (entryId: string) => {
      const res = await fetch(apiUrl(`/api/org/entry/${entryId}/subtree`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((payload as { error?: string }).error || 'Erro ao remover subárvore')
      }
      return payload as { deletedCount: number; deletedRootId: string; deletedIds: string[] }
    },
    [getAuthHeaders]
  )

  const updateEntry = useCallback(
    async (
      id: string,
      body: {
        person_name?: string
        reports_to_id?: string | null
        job_title?: string | null
        display_order?: number
        department_id?: string | null
        monthly_salary?: number | null
        monthly_cost?: number | null
      }
    ) => {
      const res = await fetch(apiUrl(`/api/org/entries/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || 'Erro ao atualizar')
      }
      return res.json() as Promise<OrgEntry>
    },
    [getAuthHeaders]
  )

  return { entries, loading, fetchEntries, createEntry, deleteEntry, deleteSubtree, updateEntry }
}
