import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, Tab, Tabs, Typography } from '@mui/material'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { stripWorkspacePrefix } from '@/lib/workspace-routing'

type SubTab = { value: string; label: string; path: string; managerialOnly?: boolean }

function tabValueFromPath(pathname: string): string {
  if (pathname.startsWith('/configuracoes/administracao')) return 'administracao'
  return 'hub'
}

export default function ConfiguracoesLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasRole } = usePermissions()
  const { currentWorkspace } = useAuth()
  const { isManagerial } = useWorkspaceContext(currentWorkspace?.slug ?? null)
  const normalizedPath = stripWorkspacePrefix(location.pathname)

  const tabs: SubTab[] = [
    { value: 'hub', label: 'Visao geral', path: '.' },
    { value: 'administracao', label: 'Administracao', path: 'administracao', managerialOnly: true },
  ]

  const canSeeAdministration = isManagerial || hasRole('admin')
  const visibleTabs = tabs.filter((tab) => !tab.managerialOnly || canSeeAdministration)
  const current = tabValueFromPath(normalizedPath)
  const tabValue = visibleTabs.some((tab) => tab.value === current)
    ? current
    : visibleTabs[0]?.value ?? 'hub'

  const handleTabChange = (_: React.SyntheticEvent, value: string) => {
    const tab = tabs.find((entry) => entry.value === value)
    if (tab) navigate(tab.path)
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box
        sx={{
          flexShrink: 0,
          px: 3,
          pt: 2.5,
          pb: 0,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em" color="text.primary">
          Configuracoes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, mb: 1.5, maxWidth: 760 }}>
          Visibilidade completa do que esta ativo nesta workspace. A aba Administracao libera a gestao de membros para administradores e gerentes do workspace.
        </Typography>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' },
          }}
        >
          {visibleTabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Outlet />
      </Box>
    </Box>
  )
}
