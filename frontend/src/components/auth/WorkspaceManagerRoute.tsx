import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { buildWorkspacePath, getWorkspaceSlugFromPath } from '@/lib/workspace-routing'
import { PageSyncScreen } from '@/components/system/WorkspaceSyncFeedback'

type WorkspaceManagerRouteProps = {
  children: ReactNode
  fallback?: ReactNode
}

export function WorkspaceManagerRoute({
  children,
  fallback,
}: WorkspaceManagerRouteProps) {
  const { currentWorkspace } = useAuth()
  const location = useLocation()
  const workspaceSlug = currentWorkspace?.slug ?? getWorkspaceSlugFromPath(location.pathname)
  const workspaceRoot = buildWorkspacePath(workspaceSlug)
  const { loading, canManageWorkspace } = useWorkspaceContext(workspaceSlug)

  if (!workspaceSlug) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <PageSyncScreen
        title="Validando acesso"
        description="Estamos confirmando o seu perfil gerencial neste workspace."
        minHeight="45vh"
      />
    )
  }

  if (!canManageWorkspace) {
    return fallback ? <>{fallback}</> : <Navigate to={workspaceRoot} replace />
  }

  return <>{children}</>
}
