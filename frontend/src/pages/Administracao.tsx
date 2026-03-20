import { useState } from 'react'
import { Box, Tabs, Tab, Typography } from '@mui/material'
import { People, Security, Key, Trophy } from '@/components/ui/icons'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { UsersTable } from '@/components/admin/users-table'
import { RolesTable } from '@/components/admin/roles-table'
import { PermissionsList } from '@/components/admin/permissions-list'
import { AchievementsAdminTable } from '@/components/admin/achievements-table'

type AdminTab = 'users' | 'roles' | 'permissions' | 'achievements'

export default function Administracao() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users')

  return (
    <ProtectedRoute role="admin">
      <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
          Administração
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Usuários, cargos, permissões e conquistas — acesso exclusivo do cargo Administrador.
        </Typography>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v as AdminTab)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab value="users" label="Usuários" icon={<People />} iconPosition="start" />
          <Tab value="roles" label="Cargos" icon={<Security />} iconPosition="start" />
          <Tab value="permissions" label="Permissões" icon={<Key />} iconPosition="start" />
          <Tab
            value="achievements"
            label="Conquistas"
            icon={<Trophy style={{ color: '#F59E0B' }} />}
            iconPosition="start"
          />
        </Tabs>

        <Box sx={{ pt: 2 }}>
          {activeTab === 'users' && <UsersTable />}
          {activeTab === 'roles' && <RolesTable />}
          {activeTab === 'permissions' && <PermissionsList />}
          {activeTab === 'achievements' && <AchievementsAdminTable />}
        </Box>
      </Box>
    </ProtectedRoute>
  )
}
