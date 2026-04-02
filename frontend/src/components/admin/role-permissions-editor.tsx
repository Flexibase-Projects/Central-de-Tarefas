import { useState, useEffect } from 'react'
import { Box, Button, Typography, FormControlLabel, Checkbox, Paper, CircularProgress } from '@/compat/mui/material'
import { Permission, Role } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'

interface RolePermissionsEditorProps {
  role: Role
  onSave: () => void
}

export function RolePermissionsEditor({ role, onSave }: RolePermissionsEditorProps) {
  const { getAuthHeaders } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = getAuthHeaders();
        const permsResponse = await fetch(apiUrl('/api/permissions'), { headers })
        if (permsResponse.ok) {
          const permsData = await permsResponse.json()
          setPermissions(permsData)
        }
        const roleResponse = await fetch(apiUrl(`/api/roles/${role.id}`), { headers })
        if (roleResponse.ok) {
          const roleData = await roleResponse.json()
          setSelectedPermissions((roleData.permissions || []).map((p: Permission) => p.id))
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [role.id, getAuthHeaders])

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
    )
  }

  const handleSave = async () => {
    try {
      const response = await fetch(apiUrl(`/api/roles/${role.id}/permissions`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ permission_ids: selectedPermissions }),
      })
      if (response.ok) onSave()
    } catch (error) {
      console.error('Error saving permissions:', error)
    }
  }

  const groupedPermissions = permissions.reduce(
    (acc, perm) => {
      const category = perm.category || 'general'
      if (!acc[category]) acc[category] = []
      acc[category].push(perm)
      return acc
    },
    {} as Record<string, Permission[]>
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>Permissões de {role.display_name}</Typography>
        <Button variant="contained" size="small" onClick={handleSave}>Salvar Permissões</Button>
      </Box>
      <Box sx={{ maxHeight: '60vh', overflowY: 'auto', pr: 1 }}>
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <Paper key={category} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, textTransform: 'capitalize' }}>{category}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {perms.map((perm) => (
                <FormControlLabel
                  key={perm.id}
                  control={
                    <Checkbox
                      checked={selectedPermissions.includes(perm.id)}
                      onChange={() => handleTogglePermission(perm.id)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{perm.display_name}</Typography>
                      {perm.description && (
                        <Typography variant="caption" color="text.secondary" display="block">{perm.description}</Typography>
                      )}
                    </Box>
                  }
                  sx={{
                    m: 0,
                    p: 1,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                />
              ))}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  )
}
