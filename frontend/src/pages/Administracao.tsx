import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Tab, Tabs, Typography } from '@/compat/mui/material'
import { People, Security, Key, Trophy } from '@/components/ui/icons'
import { UsersTable } from '@/components/admin/users-table'
import { RolesTable } from '@/components/admin/roles-table'
import { PermissionsList } from '@/components/admin/permissions-list'
import { AchievementsAdminTable } from '@/components/admin/achievements-table'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'

type AdminTab = 'users' | 'roles' | 'permissions' | 'achievements'

export default function Administracao() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users')
  const { hasRole } = usePermissions()
  const { currentWorkspace } = useAuth()
  const { canManageWorkspace } = useWorkspaceContext(currentWorkspace?.slug ?? null)
  const isGlobalAdmin = hasRole('admin')

  const tabs = useMemo(() => {
    return [
      { value: 'users' as const, label: 'Usuarios', icon: <People />, visible: canManageWorkspace },
      { value: 'roles' as const, label: 'Cargos', icon: <Security />, visible: isGlobalAdmin },
      { value: 'permissions' as const, label: 'Permissoes', icon: <Key />, visible: isGlobalAdmin },
      {
        value: 'achievements' as const,
        label: 'Conquistas',
        icon: <Trophy style={{ color: '#F59E0B' }} />,
        visible: isGlobalAdmin,
      },
    ].filter((tab) => tab.visible)
  }, [canManageWorkspace, isGlobalAdmin])

  useEffect(() => {
    if (tabs.some((tab) => tab.value === activeTab)) return
    setActiveTab((tabs[0]?.value ?? 'users') as AdminTab)
  }, [activeTab, tabs])

  if (!canManageWorkspace) {
    return (
      <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
        <Alert severity="warning">
          Esta area exige perfil gerencial dentro da workspace atual.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Administracao da workspace
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isGlobalAdmin
          ? 'Gerencie membros da workspace e, se necessario, as configuracoes globais de cargos, permissoes e conquistas.'
          : 'Gerencie apenas os membros vinculados a esta workspace. Configuracoes globais continuam restritas ao administrador do sistema.'}
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value as AdminTab)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} icon={tab.icon} iconPosition="start" />
        ))}
      </Tabs>

      <Box sx={{ pt: 2 }}>
        {activeTab === 'users' && <UsersTable />}
        {activeTab === 'roles' && isGlobalAdmin ? <RolesTable /> : null}
        {activeTab === 'permissions' && isGlobalAdmin ? <PermissionsList /> : null}
        {activeTab === 'achievements' && isGlobalAdmin ? <AchievementsAdminTable /> : null}
      </Box>
    </Box>
  )
}
