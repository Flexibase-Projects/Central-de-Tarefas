import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'

export type AdminWorkspaceGroup = {
  key: string
  label: string
  description?: string | null
}

export type AdminWorkspaceModuleDefinition = {
  id: string
  key: string
  category?: string | null
  display_name: string
  description?: string | null
  supports_multiple: boolean
  is_active: boolean
  dependency_keys: string[]
}

export type AdminWorkspaceModuleState = {
  key: string
  category?: string | null
  display_name: string
  description?: string | null
  definition_id: string
  instance_id?: string | null
  slug?: string | null
  title_override?: string | null
  is_enabled: boolean
  available: boolean
  dependency_keys: string[]
  reason?: string | null
}

export type AdminWorkspaceRecord = {
  id: string
  name: string
  slug: string
  description?: string | null
  group_key: string
  group_label: string
  group_description?: string | null
  parent_id?: string | null
  is_active: boolean
  is_hidden: boolean
  created_at?: string
  updated_at?: string
  modules: AdminWorkspaceModuleState[]
}

export type AdminWorkspaceCatalog = {
  groups: AdminWorkspaceGroup[]
  module_definitions: AdminWorkspaceModuleDefinition[]
  workspaces: AdminWorkspaceRecord[]
}

type CatalogResponse = AdminWorkspaceCatalog & { error?: string }
type WorkspaceResponse = { workspace?: AdminWorkspaceRecord; error?: string }

type CreateWorkspacePayload = {
  name: string
  slug: string
  description?: string | null
  group_key?: string | null
  is_active?: boolean
  is_hidden?: boolean
}

type UpdateWorkspacePayload = {
  name?: string
  description?: string | null
  group_key?: string | null
  is_active?: boolean
  is_hidden?: boolean
}

function sortWorkspaces(workspaces: AdminWorkspaceRecord[]): AdminWorkspaceRecord[] {
  return [...workspaces].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
}

function upsertWorkspace(
  catalog: AdminWorkspaceCatalog | null,
  workspace: AdminWorkspaceRecord,
): AdminWorkspaceCatalog | null {
  if (!catalog) return null
  const withoutCurrent = catalog.workspaces.filter((item) => item.id !== workspace.id)
  return {
    ...catalog,
    workspaces: sortWorkspaces([...withoutCurrent, workspace]),
  }
}

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

export function useAdminWorkspaces() {
  const { currentUser, getAuthHeaders } = useAuth()
  const [catalog, setCatalog] = useState<AdminWorkspaceCatalog | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [savingWorkspaceIds, setSavingWorkspaceIds] = useState<Record<string, boolean>>({})
  const [savingModuleIds, setSavingModuleIds] = useState<Record<string, boolean>>({})

  const refresh = useCallback(async () => {
    if (!currentUser?.id) {
      setCatalog(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(apiUrl('/api/admin/workspaces'), {
        headers: getAuthHeaders(),
      })
      const body = await parseJson<CatalogResponse>(response)
      if (!response.ok || !body) {
        throw new Error(body?.error || 'Falha ao carregar workspaces administrativos.')
      }
      setCatalog(body)
    } catch (err) {
      setCatalog(null)
      setError(err instanceof Error ? err.message : 'Falha ao carregar workspaces administrativos.')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id, getAuthHeaders])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createWorkspace = useCallback(
    async (payload: CreateWorkspacePayload) => {
      setCreating(true)
      try {
        const response = await fetch(apiUrl('/api/admin/workspaces'), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        })
        const body = await parseJson<WorkspaceResponse>(response)
        if (!response.ok || !body?.workspace) {
          throw new Error(body?.error || 'Falha ao criar workspace.')
        }
        const workspace = body.workspace

        setCatalog((current) => upsertWorkspace(current, workspace))
        return workspace
      } finally {
        setCreating(false)
      }
    },
    [getAuthHeaders],
  )

  const updateWorkspace = useCallback(
    async (workspaceId: string, payload: UpdateWorkspacePayload) => {
      setSavingWorkspaceIds((current) => ({ ...current, [workspaceId]: true }))
      try {
        const response = await fetch(apiUrl(`/api/admin/workspaces/${workspaceId}`), {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        })
        const body = await parseJson<WorkspaceResponse>(response)
        if (!response.ok || !body?.workspace) {
          throw new Error(body?.error || 'Falha ao atualizar workspace.')
        }
        const workspace = body.workspace

        setCatalog((current) => upsertWorkspace(current, workspace))
        return workspace
      } finally {
        setSavingWorkspaceIds((current) => {
          const next = { ...current }
          delete next[workspaceId]
          return next
        })
      }
    },
    [getAuthHeaders],
  )

  const setModuleState = useCallback(
    async (workspaceId: string, moduleKey: string, isEnabled: boolean) => {
      const savingKey = `${workspaceId}:${moduleKey}`
      setSavingModuleIds((current) => ({ ...current, [savingKey]: true }))
      try {
        const response = await fetch(apiUrl(`/api/admin/workspaces/${workspaceId}/modules/${moduleKey}`), {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ is_enabled: isEnabled }),
        })
        const body = await parseJson<WorkspaceResponse>(response)
        if (!response.ok || !body?.workspace) {
          throw new Error(body?.error || 'Falha ao atualizar modulo do workspace.')
        }
        const workspace = body.workspace

        setCatalog((current) => upsertWorkspace(current, workspace))
        return workspace
      } finally {
        setSavingModuleIds((current) => {
          const next = { ...current }
          delete next[savingKey]
          return next
        })
      }
    },
    [getAuthHeaders],
  )

  const stats = useMemo(() => {
    const workspaces = catalog?.workspaces ?? []
    const activeWorkspaces = workspaces.filter((workspace) => workspace.is_active).length
    const enabledModules = workspaces.reduce((count, workspace) => {
      return count + workspace.modules.filter((module) => module.is_enabled).length
    }, 0)

    return {
      totalWorkspaces: workspaces.length,
      activeWorkspaces,
      enabledModules,
    }
  }, [catalog])

  return {
    catalog,
    workspaces: catalog?.workspaces ?? [],
    groups: catalog?.groups ?? [],
    moduleDefinitions: catalog?.module_definitions ?? [],
    loading,
    error,
    creating,
    savingWorkspaceIds,
    savingModuleIds,
    stats,
    refresh,
    createWorkspace,
    updateWorkspace,
    setModuleState,
  }
}
