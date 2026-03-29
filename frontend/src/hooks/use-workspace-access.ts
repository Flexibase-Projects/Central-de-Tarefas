import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'

export type WorkspaceAccessStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'pending'
  | 'blocked'
  | 'not_found'
  | 'error'

type WorkspaceContextBody = {
  status?: 'success' | 'pending' | 'blocked' | 'not_found'
  error?: string
  workspace?: {
    id: string
    slug: string
    name: string
    description?: string | null
  } | null
  membership?: {
    role_key?: string | null
    membership_status?: string | null
  } | null
  request?: {
    status?: string | null
  } | null
}

type WorkspaceSummary = {
  id: string
  slug: string
  name: string
  description?: string | null
  role_display_name?: string | null
}

function formatRoleDisplayName(roleKey?: string | null): string | null {
  if (!roleKey) return null

  switch (roleKey.toLowerCase()) {
    case 'owner':
      return 'Proprietário'
    case 'admin':
      return 'Administrador'
    case 'editor':
      return 'Editor'
    case 'viewer':
      return 'Visualizador'
    case 'member':
      return 'Membro'
    default:
      return roleKey
        .split(/[_-]+/g)
        .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part))
        .join(' ')
    }
}

function mapWorkspaceSummary(body: WorkspaceContextBody | null): WorkspaceSummary | null {
  if (!body?.workspace) return null

  return {
    id: body.workspace.id,
    slug: body.workspace.slug,
    name: body.workspace.name,
    description: body.workspace.description ?? null,
    role_display_name: formatRoleDisplayName(body.membership?.role_key),
  }
}

function mapFailureStatus(response: Response, body: WorkspaceContextBody | null): WorkspaceAccessStatus {
  if (body?.status === 'pending' || body?.status === 'blocked' || body?.status === 'not_found') {
    return body.status
  }
  if (response.status === 404) return 'not_found'
  return 'error'
}

function defaultMessage(status: WorkspaceAccessStatus): string | null {
  switch (status) {
    case 'pending':
      return 'Seu acesso a este workspace ainda está pendente de aprovação.'
    case 'blocked':
      return 'Seu acesso a este workspace está bloqueado.'
    case 'not_found':
      return 'Workspace não encontrado.'
    case 'error':
      return 'Não foi possível validar seu acesso a este workspace.'
    default:
      return null
  }
}

export function useWorkspaceAccess(workspaceSlug?: string | null) {
  const { currentUser, getAuthHeaders } = useAuth()
  const [status, setStatus] = useState<WorkspaceAccessStatus>('idle')
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceSlug) {
      setStatus('idle')
      setWorkspace(null)
      setMessage(null)
      return
    }

    if (!currentUser) {
      setStatus('idle')
      setWorkspace(null)
      setMessage(null)
      return
    }

    let mounted = true

    const run = async () => {
      try {
        setStatus('loading')
        setMessage(null)

        const response = await fetch(apiUrl(`/api/workspaces/${workspaceSlug}/context`), {
          headers: getAuthHeaders(),
        })
        const body = (await response.json().catch(() => null)) as WorkspaceContextBody | null

        if (!mounted) return

        if (response.ok) {
          setWorkspace(mapWorkspaceSummary(body))
          setStatus('success')
          setMessage(null)
          return
        }

        const nextStatus = mapFailureStatus(response, body)
        setWorkspace(mapWorkspaceSummary(body))
        setStatus(nextStatus)
        setMessage(body?.error || defaultMessage(nextStatus))
      } catch {
        if (!mounted) return
        setWorkspace(null)
        setStatus('error')
        setMessage(defaultMessage('error'))
      }
    }

    void run()

    return () => {
      mounted = false
    }
  }, [currentUser, getAuthHeaders, workspaceSlug])

  return {
    status,
    workspace,
    message,
    loading: status === 'loading',
  }
}
