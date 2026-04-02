import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { buildWorkspacePath, getWorkspaceSlugFromPath } from '@/lib/workspace-routing'
import { PageSyncScreen } from '@/components/system/WorkspaceSyncFeedback'
import { resolveWorkspaceDefaultPath } from '@/features/workspace/module-manifest'

interface WorkspaceModuleRouteProps {
  moduleKey: string
  title: string
  children: ReactNode
}

export function WorkspaceModuleRoute({ moduleKey, title, children }: WorkspaceModuleRouteProps) {
  const { currentWorkspace } = useAuth()
  const location = useLocation()
  const workspaceSlug = currentWorkspace?.slug ?? getWorkspaceSlugFromPath(location.pathname)
  const { accessibleModuleKeys, loading, moduleCapabilities } = useWorkspaceContext(workspaceSlug)

  if (!workspaceSlug) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <PageSyncScreen
        title={`Abrindo ${title}`}
        description="Estamos validando os modulos disponiveis para este workspace."
        minHeight="45vh"
      />
    )
  }

  const capability = moduleCapabilities[moduleKey] ?? null
  if (capability?.can_access) {
    return <>{children}</>
  }

  const fallbackPath = buildWorkspacePath(
    workspaceSlug,
    resolveWorkspaceDefaultPath(accessibleModuleKeys),
  )

  return <Navigate to={fallbackPath} replace state={{ redirectedFrom: location.pathname, blockedModule: moduleKey, title }} />
}
