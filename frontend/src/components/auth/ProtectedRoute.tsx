import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/use-permissions';
import { buildWorkspacePath, getWorkspaceSlugFromPath } from '@/lib/workspace-routing';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  role?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  permission, 
  role, 
  fallback 
}: ProtectedRouteProps) {
  const { hasPermission, hasRole } = usePermissions();
  const { currentWorkspace } = useAuth();
  const location = useLocation();
  const workspaceSlug = currentWorkspace?.slug ?? getWorkspaceSlugFromPath(location.pathname);
  const workspaceRoot = buildWorkspacePath(workspaceSlug);

  // Se não há permissão ou role especificada, permitir acesso
  if (!permission && !role) {
    return <>{children}</>;
  }

  // Verificar permissão se especificada
  if (permission && !hasPermission(permission)) {
    return fallback ? <>{fallback}</> : <Navigate to={workspaceRoot} replace />;
  }

  // Verificar role se especificada
  if (role && !hasRole(role)) {
    return fallback ? <>{fallback}</> : <Navigate to={workspaceRoot} replace />;
  }

  return <>{children}</>;
}
