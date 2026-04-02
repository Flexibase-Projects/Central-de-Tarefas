import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { buildAdminLoginPath } from '@/lib/admin-routing'
import { PageSyncScreen } from '@/components/system/WorkspaceSyncFeedback'

interface AdminGuardProps {
  children: ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const location = useLocation()
  const { currentUser, isLoading, hasRole } = useAuth()
  const returnTo = `${location.pathname}${location.search}${location.hash}`

  if (isLoading) {
    return (
      <PageSyncScreen
        title="Validando acesso administrativo"
        description="Estamos conferindo sua sessao para abrir o painel global com seguranca."
        minHeight="100vh"
      />
    )
  }

  if (!currentUser) {
    return <Navigate to={buildAdminLoginPath(returnTo)} replace />
  }

  if (!hasRole('admin')) {
    return <Navigate to="/workspaces" replace />
  }

  return <>{children}</>
}
