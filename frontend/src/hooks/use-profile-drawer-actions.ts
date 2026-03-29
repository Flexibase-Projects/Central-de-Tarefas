import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { buildWorkspacePath } from '@/lib/workspace-routing'

interface UseProfileDrawerActionsParams {
  onClose: () => void
}

export function useProfileDrawerActions({ onClose }: UseProfileDrawerActionsParams) {
  const navigate = useNavigate()
  const { logout, currentWorkspace } = useAuth()

  const goWorkspaces = useCallback(() => {
    onClose()
    navigate('/workspaces')
  }, [navigate, onClose])

  const goPerfil = useCallback(() => {
    onClose()
    navigate(buildWorkspacePath(currentWorkspace?.slug, '/perfil'))
  }, [currentWorkspace?.slug, navigate, onClose])

  const goIndicadores = useCallback(() => {
    onClose()
    navigate(buildWorkspacePath(currentWorkspace?.slug, '/indicadores'))
  }, [currentWorkspace?.slug, navigate, onClose])

  const handleLogout = useCallback(async () => {
    onClose()
    await logout()
  }, [logout, onClose])

  return {
    goPerfil,
    goIndicadores,
    goWorkspaces,
    handleLogout,
  }
}
