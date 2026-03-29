import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceAccess } from '@/hooks/use-workspace-access';
import { buildWorkspaceLoginPath, getWorkspaceSlugFromPath } from '@/lib/workspace-routing';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const routeWorkspaceSlug = params.workspaceSlug ?? getWorkspaceSlugFromPath(location.pathname);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const workspaceAccess = useWorkspaceAccess(routeWorkspaceSlug);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      navigate(buildWorkspaceLoginPath(routeWorkspaceSlug, returnTo), { replace: true });
    }
  }, [currentUser, isLoading, navigate, returnTo, routeWorkspaceSlug]);

  useEffect(() => {
    if (
      isLoading ||
      !currentUser ||
      !routeWorkspaceSlug ||
      workspaceAccess.loading ||
      workspaceAccess.status === 'idle' ||
      workspaceAccess.status === 'success'
    ) {
      return;
    }

    navigate(buildWorkspaceLoginPath(routeWorkspaceSlug, returnTo), {
      replace: true,
      state: {
        returnTo,
        accessStatus: workspaceAccess.status,
        accessMessage: workspaceAccess.message,
      },
    });
  }, [
    currentUser,
    isLoading,
    navigate,
    returnTo,
    routeWorkspaceSlug,
    workspaceAccess.loading,
    workspaceAccess.message,
    workspaceAccess.status,
  ]);

  if (isLoading || (currentUser && routeWorkspaceSlug && workspaceAccess.loading)) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (routeWorkspaceSlug && workspaceAccess.status !== 'success' && workspaceAccess.status !== 'idle') {
    return null;
  }

  return <>{children}</>;
}
