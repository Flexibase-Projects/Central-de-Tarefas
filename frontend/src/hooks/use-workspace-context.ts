import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'
import type {
  WorkspaceContextData,
  WorkspaceModuleState,
} from '@/types'

const MANAGERIAL_ROLES = new Set(['admin', 'gerente', 'gestor'])
const workspaceContextCache = new Map<string, WorkspaceContextData>()
const workspaceContextInFlight = new Map<string, Promise<WorkspaceContextData>>()

type WorkspaceContextResponse = Partial<WorkspaceContextData> & {
  error?: string
  status?: string
}

type RawWorkspaceMembership = {
  role_id?: string | null
  role_key?: string | null
  role_display_name?: string | null
  membership_status?: string | null
  is_managerial?: boolean
}

function formatRoleDisplayName(roleKey?: string | null): string | null {
  if (!roleKey) return null

  switch (roleKey.toLowerCase()) {
    case 'admin':
      return 'Administrador'
    case 'gerente':
      return 'Gerente'
    case 'gestor':
      return 'Gestor'
    case 'owner':
      return 'Proprietario'
    case 'member':
      return 'Membro'
    case 'viewer':
      return 'Visualizador'
    default:
      return roleKey
        .split(/[_-]+/g)
        .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part))
        .join(' ')
    }
}

function normalizeWorkspaceContext(raw: unknown): WorkspaceContextData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as WorkspaceContextResponse
  const workspace = data.workspace
  if (!workspace?.id || !workspace.slug || !workspace.name) return null

  const membershipRaw = (data.membership ?? {}) as RawWorkspaceMembership
  const roleKey = membershipRaw.role_key ?? null
  const modules = Array.isArray(data.modules)
    ? data.modules
        .filter((module): module is WorkspaceModuleState => Boolean(module && typeof module === 'object' && typeof module.key === 'string'))
        .map((module) => ({
          ...module,
          display_name: module.display_name || module.key,
          available: Boolean(module.available),
          is_enabled: Boolean(module.is_enabled),
          reason: typeof module.reason === 'string' ? module.reason : null,
        }))
    : []

  return {
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
      description: workspace.description ?? null,
    },
    membership: {
      role_id: membershipRaw.role_id ?? null,
      role_key: roleKey,
      role_display_name: membershipRaw.role_display_name ?? formatRoleDisplayName(roleKey),
      membership_status: membershipRaw.membership_status ?? null,
      is_managerial: Boolean(membershipRaw.is_managerial ?? (roleKey ? MANAGERIAL_ROLES.has(roleKey) : false)),
    },
    modules,
  }
}

function readCachedWorkspaceContext(workspaceSlug?: string | null): WorkspaceContextData | null {
  if (!workspaceSlug) return null
  return workspaceContextCache.get(workspaceSlug) ?? null
}

async function fetchWorkspaceContext(
  workspaceSlug: string,
  getAuthHeaders: () => Record<string, string>,
  options?: { force?: boolean },
): Promise<WorkspaceContextData> {
  if (!options?.force) {
    const cached = readCachedWorkspaceContext(workspaceSlug)
    if (cached) {
      return cached
    }
  }

  const existingRequest = workspaceContextInFlight.get(workspaceSlug)
  if (existingRequest) {
    return existingRequest
  }

  const request = (async () => {
    const response = await fetch(apiUrl(`/api/workspaces/${workspaceSlug}/context`), {
      headers: getAuthHeaders(),
    })
    const body = (await response.json().catch(() => null)) as WorkspaceContextResponse | null
    if (!response.ok || !body) {
      throw new Error(body?.error || 'Falha ao carregar contexto do workspace')
    }
    const normalized = normalizeWorkspaceContext(body)
    if (!normalized) {
      throw new Error('Contexto do workspace indisponivel')
    }
    workspaceContextCache.set(workspaceSlug, normalized)
    return normalized
  })()

  workspaceContextInFlight.set(workspaceSlug, request)

  try {
    return await request
  } finally {
    if (workspaceContextInFlight.get(workspaceSlug) === request) {
      workspaceContextInFlight.delete(workspaceSlug)
    }
  }
}

export function useWorkspaceContext(workspaceSlug?: string | null) {
  const { currentUser, getAuthHeaders } = useAuth()
  const [data, setData] = useState<WorkspaceContextData | null>(() => readCachedWorkspaceContext(workspaceSlug))
  const [loading, setLoading] = useState(() => Boolean(workspaceSlug && currentUser?.id && !readCachedWorkspaceContext(workspaceSlug)))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    if (!workspaceSlug || !currentUser?.id) {
      requestIdRef.current += 1
      setData(null)
      setLoading(false)
      setRefreshing(false)
      setError(null)
      return null
    }

    const requestId = ++requestIdRef.current
    const cached = readCachedWorkspaceContext(workspaceSlug)

    try {
      if (cached) {
        setData(cached)
        setLoading(false)
        setRefreshing(true)
      } else {
        setLoading(true)
        setRefreshing(false)
      }

      setError(null)

      const normalized = await fetchWorkspaceContext(workspaceSlug, getAuthHeaders, {
        force: options?.force ?? Boolean(cached),
      })

      if (requestId !== requestIdRef.current) {
        return normalized
      }

      setData(normalized)
      return normalized
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return null
      }

      if (!cached) {
        setData(null)
      }
      setError(err instanceof Error ? err.message : 'Falha ao carregar contexto do workspace')
      return null
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [currentUser?.id, getAuthHeaders, workspaceSlug])

  useEffect(() => {
    if (!workspaceSlug || !currentUser?.id) {
      requestIdRef.current += 1
      setData(null)
      setLoading(false)
      setRefreshing(false)
      setError(null)
      return
    }

    const cached = readCachedWorkspaceContext(workspaceSlug)
    setData(cached)
    setLoading(!cached)
    setRefreshing(false)
    setError(null)

    void refresh({ force: Boolean(cached) })
  }, [currentUser?.id, refresh, workspaceSlug])

  const modulesByKey = useMemo(() => {
    return new Map((data?.modules ?? []).map((module) => [module.key, module]))
  }, [data?.modules])

  const gamificationModule = modulesByKey.get('gamification') ?? null
  const rankingModule = modulesByKey.get('ranking') ?? null

  return {
    data,
    workspace: data?.workspace ?? null,
    membership: data?.membership ?? null,
    modules: data?.modules ?? [],
    modulesByKey,
    gamificationModule,
    rankingModule,
    gamificationEnabled: Boolean(gamificationModule?.is_enabled && gamificationModule?.available),
    rankingEnabled: Boolean(rankingModule?.is_enabled && rankingModule?.available),
    isManagerial: Boolean(data?.membership?.is_managerial),
    loading,
    refreshing,
    error,
    refresh,
  }
}
