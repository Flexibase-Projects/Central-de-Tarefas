import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, Tab, Tabs, Typography } from '@mui/material'
import { usePermissions } from '@/hooks/use-permissions'

type SubTab = { value: string; label: string; path: string; adminOnly: boolean }

const SUB_TABS: SubTab[] = [
  { value: 'hub', label: 'Visão geral', path: '/configuracoes', adminOnly: false },
  { value: 'administracao', label: 'Administração', path: '/configuracoes/administracao', adminOnly: true },
]

function tabValueFromPath(pathname: string): string {
  if (pathname.startsWith('/configuracoes/administracao')) return 'administracao'
  return 'hub'
}

export default function ConfiguracoesLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasRole } = usePermissions()
  const isAdmin = hasRole('admin')

  const visibleTabs = SUB_TABS.filter((t) => !t.adminOnly || isAdmin)
  const current = tabValueFromPath(location.pathname)
  const tabValue = visibleTabs.some((t) => t.value === current) ? current : visibleTabs[0]?.value ?? 'hub'

  const handleTabChange = (_: React.SyntheticEvent, value: string) => {
    const tab = SUB_TABS.find((t) => t.value === value)
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
          Configurações
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, mb: 1.5, maxWidth: 640 }}>
          Central de opções da organização. A aba Administração é exclusiva do cargo Administrador.
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
          {visibleTabs.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Outlet />
      </Box>
    </Box>
  )
}
