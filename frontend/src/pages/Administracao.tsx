import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Tab, Tabs, Typography } from '@/compat/mui/material'
import { People, Security, Key, Trophy } from '@/components/ui/icons'
import { UsersTable } from '@/components/admin/users-table'
import { RolesTable } from '@/components/admin/roles-table'
import { PermissionsList } from '@/components/admin/permissions-list'
import { AchievementsAdminTable } from '@/components/admin/achievements-table'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'

type AdminTab = 'users' | 'roles' | 'permissions' | 'achievements'

export default function Administracao() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users')
  const { currentWorkspace } = useAuth()
  const { canManageWorkspace, capabilities } = useWorkspaceContext(currentWorkspace?.slug ?? null)
  /** Admin da plataforma (cdt_user_roles), não apenas gestor/admin da workspace. */
  const isPlatformGlobalAdmin = Boolean(capabilities.is_global_admin)

  const tabs = useMemo(() => {
    return [
      { value: 'users' as const, label: 'Usuarios', icon: <People size={16} />, visible: canManageWorkspace },
      { value: 'roles' as const, label: 'Cargos', icon: <Security size={16} />, visible: isPlatformGlobalAdmin },
      { value: 'permissions' as const, label: 'Permissoes', icon: <Key size={16} />, visible: isPlatformGlobalAdmin },
      {
        value: 'achievements' as const,
        label: 'Conquistas',
        icon: (
          <Box component="span" sx={{ display: 'inline-flex', color: 'warning.main', lineHeight: 0 }}>
            <Trophy size={16} />
          </Box>
        ),
        visible: isPlatformGlobalAdmin,
      },
    ].filter((tab) => tab.visible)
  }, [canManageWorkspace, isPlatformGlobalAdmin])

  useEffect(() => {
    if (tabs.some((tab) => tab.value === activeTab)) return
    setActiveTab((tabs[0]?.value ?? 'users') as AdminTab)
  }, [activeTab, tabs])

  if (!canManageWorkspace) {
    return (
      <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
        <Alert severity="warning">
          Esta area exige perfil gerencial dentro da workspace atual.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: { xs: 1.75, sm: 2 } }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.35, fontSize: '1rem' }}>
        Administracao
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, display: 'block', maxWidth: 640, lineHeight: 1.45 }}>
        {isPlatformGlobalAdmin
          ? 'Membros da workspace e configuracoes globais (cargos, permissoes, conquistas).'
          : 'Apenas membros desta workspace; configuracoes globais ficam com o admin da plataforma.'}
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value as AdminTab)}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 1.25,
          gap: 0.25,
          '& > button': {
            minHeight: 34,
            paddingLeft: 1,
            paddingRight: 1,
            fontSize: 12,
            fontWeight: 600,
          },
          '& .inline-flex': { gap: '6px' },
        }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} icon={tab.icon} iconPosition="start" />
        ))}
      </Tabs>

      <Box sx={{ pt: 0.75 }}>
        {activeTab === 'users' && <UsersTable />}
        {activeTab === 'roles' && isPlatformGlobalAdmin ? <RolesTable /> : null}
        {activeTab === 'permissions' && isPlatformGlobalAdmin ? <PermissionsList /> : null}
        {activeTab === 'achievements' && isPlatformGlobalAdmin ? <AchievementsAdminTable /> : null}
      </Box>
    </Box>
  )
}
