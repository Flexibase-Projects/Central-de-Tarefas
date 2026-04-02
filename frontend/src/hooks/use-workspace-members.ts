import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'
import type { WorkspaceManagedMember } from '@/types'

type WorkspaceMembersResponse = {
  members?: WorkspaceManagedMember[]
  error?: string
}

type UseWorkspaceMembersOptions = {
  includeInactive?: boolean
}

type RefreshOptions = {
  force?: boolean
}

const workspaceMembersCache = new Map<string, WorkspaceManagedMember[]>()
const workspaceMembersInFlight = new Map<string, Promise<WorkspaceManagedMember[]>>()

function getCacheKey(
  workspaceSlug?: string | null,
  userId?: string | null,
  includeInactive?: boolean,
): string | null {
  if (!workspaceSlug || !userId) return null
  return `${workspaceSlug}:${userId}:${includeInactive ? 'all' : 'active'}`
}

function normalizeMemberRole(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const role = raw as Record<string, unknown>
  if (
    typeof role.id !== 'string' ||
    typeof role.name !== 'string' ||
    typeof role.display_name !== 'string'
  ) {
    return null
  }
  return {
    id: role.id,
    name: role.name,
    display_name: role.display_name,
  }
}

function normalizeWorkspaceMember(raw: unknown): WorkspaceManagedMember | null {
  if (!raw || typeof raw !== 'object') return null
  const member = raw as Record<string, unknown>
  if (typeof member.id !== 'string' || typeof member.name !== 'string') return null

  return {
    id: member.id,
    name: member.name,
    email: typeof member.email === 'string' ? member.email : null,
    avatar_url: typeof member.avatar_url === 'string' ? member.avatar_url : null,
    central_user_id: typeof member.central_user_id === 'string' ? member.central_user_id : null,
    role: normalizeMemberRole(member.role),
    role_key: typeof member.role_key === 'string' ? member.role_key : null,
    role_display_name:
      typeof member.role_display_name === 'string' ? member.role_display_name : null,
    membership_status:
      typeof member.membership_status === 'string' ? member.membership_status : 'active',
    is_active: Boolean(member.is_active),
    is_default: Boolean(member.is_default),
    joined_at: typeof member.joined_at === 'string' ? member.joined_at : '',
  }
}

async function fetchWorkspaceMembersForKey(params: {
  cacheKey: string
  workspaceSlug: string
  includeInactive: boolean
  getAuthHeaders: () => Record<string, string>
  force?: boolean
}): Promise<WorkspaceManagedMember[]> {
  const { cacheKey, workspaceSlug, includeInactive, getAuthHeaders, force } = params

  if (!force && workspaceMembersCache.has(cacheKey)) {
    return workspaceMembersCache.get(cacheKey) ?? []
  }

  const inFlight = workspaceMembersInFlight.get(cacheKey)
  if (inFlight) return inFlight

  const query = includeInactive ? { include_inactive: true } : undefined
  const request = (async () => {
    const response = await fetch(apiUrl(`/api/workspaces/${workspaceSlug}/members`, query), {
      headers: getAuthHeaders(),
    })
    const body = (await response.json().catch(() => null)) as WorkspaceMembersResponse | null
    if (!response.ok) {
      throw new Error(body?.error || 'Falha ao carregar membros do workspace')
    }

    const members = Array.isArray(body?.members)
      ? body?.members.map(normalizeWorkspaceMember).filter((member): member is WorkspaceManagedMember => member !== null)
      : []

    workspaceMembersCache.set(cacheKey, members)
    return members
  })()

  workspaceMembersInFlight.set(cacheKey, request)

  try {
    return await request
  } finally {
    if (workspaceMembersInFlight.get(cacheKey) === request) {
      workspaceMembersInFlight.delete(cacheKey)
    }
  }
}

export function clearWorkspaceMembersCache(workspaceSlug?: string | null) {
  if (!workspaceSlug) return

  for (const key of Array.from(workspaceMembersCache.keys())) {
    if (key.startsWith(`${workspaceSlug}:`)) {
      workspaceMembersCache.delete(key)
    }
  }

  for (const key of Array.from(workspaceMembersInFlight.keys())) {
    if (key.startsWith(`${workspaceSlug}:`)) {
      workspaceMembersInFlight.delete(key)
    }
  }
}

export function useWorkspaceMembers(
  workspaceSlug?: string | null,
  options?: UseWorkspaceMembersOptions,
) {
  const includeInactive = Boolean(options?.includeInactive)
  const { currentUser, currentWorkspace, getAuthHeaders } = useAuth()
  const resolvedWorkspaceSlug = workspaceSlug ?? currentWorkspace?.slug ?? null
  const cacheKey = useMemo(
    () => getCacheKey(resolvedWorkspaceSlug, currentUser?.id, includeInactive),
    [currentUser?.id, includeInactive, resolvedWorkspaceSlug],
  )
  const cachedMembers = cacheKey ? workspaceMembersCache.get(cacheKey) ?? [] : []
  const [members, setMembers] = useState<WorkspaceManagedMember[]>(cachedMembers)
  const [loading, setLoading] = useState(Boolean(cacheKey && cachedMembers.length === 0))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const refresh = useCallback(
    async (refreshOptions?: RefreshOptions) => {
      if (!resolvedWorkspaceSlug || !currentUser?.id || !cacheKey) {
        requestIdRef.current += 1
        setMembers([])
        setLoading(false)
        setRefreshing(false)
        setError(null)
        return []
      }

      const requestId = ++requestIdRef.current
      const cached = workspaceMembersCache.get(cacheKey) ?? []

      try {
        if (cached.length > 0) {
          setMembers(cached)
          setLoading(false)
          setRefreshing(true)
        } else {
          setLoading(true)
          setRefreshing(false)
        }
        setError(null)

        const nextMembers = await fetchWorkspaceMembersForKey({
          cacheKey,
          workspaceSlug: resolvedWorkspaceSlug,
          includeInactive,
          getAuthHeaders,
          force: refreshOptions?.force ?? cached.length > 0,
        })

        if (requestId !== requestIdRef.current) {
          return nextMembers
        }

        setMembers(nextMembers)
        return nextMembers
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return []
        }

        if (cached.length === 0) {
          setMembers([])
        }
        setError(err instanceof Error ? err.message : 'Falha ao carregar membros do workspace')
        return []
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [cacheKey, currentUser?.id, getAuthHeaders, includeInactive, resolvedWorkspaceSlug],
  )

  useEffect(() => {
    if (!cacheKey) {
      requestIdRef.current += 1
      setMembers([])
      setLoading(false)
      setRefreshing(false)
      setError(null)
      return
    }

    const cached = workspaceMembersCache.get(cacheKey) ?? []
    setMembers(cached)
    setLoading(cached.length === 0)
    setRefreshing(false)
    setError(null)

    void refresh({ force: cached.length > 0 })
  }, [cacheKey, refresh])

  const mutateMembers = useCallback(
    async (action: () => Promise<void>) => {
      await action()
      clearWorkspaceMembersCache(resolvedWorkspaceSlug)
      return refresh({ force: true })
    },
    [refresh, resolvedWorkspaceSlug],
  )

  const addMember = useCallback(
    async (params: { userId: string; roleId?: string | null }) => {
      if (!resolvedWorkspaceSlug) {
        throw new Error('Workspace indisponivel')
      }

      return mutateMembers(async () => {
        const response = await fetch(apiUrl(`/api/workspaces/${resolvedWorkspaceSlug}/members`), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            user_id: params.userId,
            role_id: params.roleId ?? null,
          }),
        })
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        if (!response.ok) {
          throw new Error(body?.error || 'Falha ao adicionar membro ao workspace')
        }
      })
    },
    [getAuthHeaders, mutateMembers, resolvedWorkspaceSlug],
  )

  const updateMember = useCallback(
    async (userId: string, params: { roleId?: string | null; isActive?: boolean }) => {
      if (!resolvedWorkspaceSlug) {
        throw new Error('Workspace indisponivel')
      }

      return mutateMembers(async () => {
        const response = await fetch(apiUrl(`/api/workspaces/${resolvedWorkspaceSlug}/members/${userId}`), {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...(params.roleId !== undefined ? { role_id: params.roleId } : {}),
            ...(params.isActive !== undefined ? { is_active: params.isActive } : {}),
          }),
        })
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        if (!response.ok) {
          throw new Error(body?.error || 'Falha ao atualizar membro do workspace')
        }
      })
    },
    [getAuthHeaders, mutateMembers, resolvedWorkspaceSlug],
  )

  return {
    members,
    loading,
    refreshing,
    error,
    refresh,
    addMember,
    updateMember,
  }
}
