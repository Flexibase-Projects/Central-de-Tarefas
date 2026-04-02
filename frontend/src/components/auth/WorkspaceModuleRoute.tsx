import type { ReactNode } from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { buildWorkspacePath } from '@/lib/workspace-routing'
import { PageSyncScreen } from '@/components/system/WorkspaceSyncFeedback'

interface WorkspaceModuleRouteProps {
  moduleKey: string
  title: string
  children: ReactNode
}

function getReasonMessage(reason?: string | null): string {
  switch (reason) {
    case 'definition_inactive':
      return 'Este modulo esta desativado na configuracao global do sistema.'
    case 'not_configured':
      return 'Este modulo ainda nao foi configurado para o workspace atual.'
    case 'disabled':
      return 'Este modulo foi desativado neste workspace.'
    case 'dependency_disabled':
      return 'Este modulo depende de outro recurso que esta desativado neste workspace.'
    default:
      return 'Este modulo nao esta disponivel no workspace atual.'
  }
}

export function WorkspaceModuleRoute({ moduleKey, title, children }: WorkspaceModuleRouteProps) {
  const { currentWorkspace } = useAuth()
  const workspaceSlug = currentWorkspace?.slug ?? null
  const { loading, modulesByKey } = useWorkspaceContext(workspaceSlug)

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

  const moduleState = modulesByKey.get(moduleKey) ?? null
  if (moduleState?.available && moduleState.is_enabled) {
    return <>{children}</>
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        <Stack spacing={1.5}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Alert severity="warning">
            {getReasonMessage(moduleState?.reason)}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Use o painel administrativo global para ativar este modulo no workspace e liberar a navegacao correspondente.
          </Typography>
          <Box>
            <Button component={RouterLink} to={buildWorkspacePath(workspaceSlug)} variant="contained">
              Voltar ao workspace
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}
