import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'
import type { WorkspaceProfileResponse, WorkspaceProfileData } from '@/types'

type WorkspaceProfileUpdate = {
  display_name?: string
  avatar_url?: string | null
}

export function useWorkspaceProfile(workspaceSlug?: string | null) {
  const { currentUser, getAuthHeaders } = useAuth()
  const [data, setData] = useState<WorkspaceProfileResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const response = await fetch(apiUrl(`/api/workspaces/${workspaceSlug}/my-profile`), {
        headers: getAuthHeaders(),
      })
      const body = (await response.json().catch(() => null)) as WorkspaceProfileResponse | null
      if (!response.ok || !body?.profile) {
        throw new Error('Falha ao carregar perfil do workspace')
      }
      setData(body)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : 'Falha ao carregar perfil do workspace')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id, getAuthHeaders, workspaceSlug])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const update = useCallback(
    async (payload: WorkspaceProfileUpdate) => {
      if (!workspaceSlug) {
        throw new Error('Workspace indisponível')
      }

      try {
        setSaving(true)
        setError(null)
        const response = await fetch(apiUrl(`/api/workspaces/${workspaceSlug}/my-profile`), {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        })
        const body = (await response.json().catch(() => null)) as WorkspaceProfileResponse | null
        if (!response.ok || !body?.profile) {
          throw new Error((body as { error?: string } | null)?.error || 'Falha ao salvar perfil do workspace')
        }
        setData(body)
        return body.profile
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao salvar perfil do workspace'
        setError(message)
        throw err instanceof Error ? err : new Error(message)
      } finally {
        setSaving(false)
      }
    },
    [getAuthHeaders, workspaceSlug],
  )

  const profile: WorkspaceProfileData | null = data?.profile ?? null

  return {
    data,
    profile,
    workspace: data?.workspace ?? null,
    membership: data?.membership ?? null,
    modules: data?.modules ?? [],
    isManagerial: Boolean(data?.workspace_role_flags?.is_managerial),
    canManageWorkspace: Boolean(
      data?.workspace_role_flags?.can_manage_workspace ?? data?.workspace_role_flags?.is_managerial,
    ),
    teamGamificationSummary: data?.team_gamification_summary ?? null,
    loading,
    saving,
    error,
    refresh,
    update,
  }
}
