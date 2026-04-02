import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'
import type { User } from '@/types'

const assignableUsersCache = new Map<string, User[]>()
const assignableUsersInFlight = new Map<string, Promise<User[]>>()

function getCacheKey(userId?: string | null) {
  if (!userId) return null
  return `assignable:${userId}`
}

function normalizeUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null
  const user = raw as Record<string, unknown>
  if (typeof user.id !== 'string' || typeof user.name !== 'string' || typeof user.email !== 'string') {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: typeof user.avatar_url === 'string' ? user.avatar_url : null,
    is_active: user.is_active !== false,
    central_user_id: typeof user.central_user_id === 'string' ? user.central_user_id : null,
    identity_status:
      user.identity_status === 'legacy_only' ||
      user.identity_status === 'linked' ||
      user.identity_status === 'manual_review' ||
      user.identity_status === 'conflict' ||
      user.identity_status === 'disabled'
        ? user.identity_status
        : undefined,
    last_identity_sync_at:
      typeof user.last_identity_sync_at === 'string' ? user.last_identity_sync_at : undefined,
    must_set_password:
      typeof user.must_set_password === 'boolean' ? user.must_set_password : undefined,
    created_at: typeof user.created_at === 'string' ? user.created_at : '',
    updated_at: typeof user.updated_at === 'string' ? user.updated_at : '',
  }
}

async function fetchAssignableUsers(
  cacheKey: string,
  getAuthHeaders: () => Record<string, string>,
  force?: boolean,
) {
  if (!force && assignableUsersCache.has(cacheKey)) {
    return assignableUsersCache.get(cacheKey) ?? []
  }

  const inFlight = assignableUsersInFlight.get(cacheKey)
  if (inFlight) return inFlight

  const request = (async () => {
    const response = await fetch(apiUrl('/api/users', { for_assignment: true }), {
      headers: getAuthHeaders(),
    })
    const body = (await response.json().catch(() => null)) as Array<unknown> | { error?: string } | null
    if (!response.ok) {
      const message = body && !Array.isArray(body) && typeof body.error === 'string'
        ? body.error
        : 'Falha ao carregar diretorio de usuarios'
      throw new Error(message)
    }

    const users = Array.isArray(body)
      ? body.map(normalizeUser).filter((user): user is User => user !== null)
      : []

    assignableUsersCache.set(cacheKey, users)
    return users
  })()

  assignableUsersInFlight.set(cacheKey, request)

  try {
    return await request
  } finally {
    if (assignableUsersInFlight.get(cacheKey) === request) {
      assignableUsersInFlight.delete(cacheKey)
    }
  }
}

export function useAssignableUsersCatalog() {
  const { currentUser, getAuthHeaders } = useAuth()
  const cacheKey = useMemo(() => getCacheKey(currentUser?.id), [currentUser?.id])
  const [users, setUsers] = useState<User[]>(() => (cacheKey ? assignableUsersCache.get(cacheKey) ?? [] : []))
  const [loading, setLoading] = useState(Boolean(cacheKey && (assignableUsersCache.get(cacheKey)?.length ?? 0) === 0))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(
    async (options?: { force?: boolean }) => {
      if (!cacheKey) {
        setUsers([])
        setLoading(false)
        setError(null)
        return []
      }

      try {
        setLoading((assignableUsersCache.get(cacheKey)?.length ?? 0) === 0)
        setError(null)
        const nextUsers = await fetchAssignableUsers(cacheKey, getAuthHeaders, options?.force)
        setUsers(nextUsers)
        return nextUsers
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar diretorio de usuarios')
        return []
      } finally {
        setLoading(false)
      }
    },
    [cacheKey, getAuthHeaders],
  )

  useEffect(() => {
    if (!cacheKey) {
      setUsers([])
      setLoading(false)
      setError(null)
      return
    }

    setUsers(assignableUsersCache.get(cacheKey) ?? [])
    setLoading((assignableUsersCache.get(cacheKey)?.length ?? 0) === 0)
    setError(null)
    void refresh({ force: (assignableUsersCache.get(cacheKey)?.length ?? 0) > 0 })
  }, [cacheKey, refresh])

  return {
    users,
    loading,
    error,
    refresh,
  }
}
