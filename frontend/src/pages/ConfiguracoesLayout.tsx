import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, Tab, Tabs, Typography } from '@/compat/mui/material'
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
  const { currentWorkspace } = useAuth()
  const { canManageWorkspace } = useWorkspaceContext(currentWorkspace?.slug ?? null)
  const normalizedPath = stripWorkspacePrefix(location.pathname)

  const tabs: SubTab[] = [
    { value: 'hub', label: 'Visao geral', path: '.' },
    { value: 'administracao', label: 'Administracao', path: 'administracao', managerialOnly: true },
  ]

  const canSeeAdministration = canManageWorkspace
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
          px: { xs: 2, sm: 2.5 },
          pt: 1.5,
          pb: 0,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="subtitle1" fontWeight={800} letterSpacing="-0.02em" color="text.primary" sx={{ fontSize: '1.05rem' }}>
          Configuracoes
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.15, mb: 1, maxWidth: 720, display: 'block', lineHeight: 1.45 }}>
          Visibilidade do que esta ativo nesta workspace. Em Administracao: membros (perfil gerencial).
        </Typography>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 36,
            '& > button': { minHeight: 36, paddingLeft: 1, paddingRight: 1, fontSize: 13 },
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
