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
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          pb: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.9rem', lineHeight: 1.3 }}>
          {role.display_name}
        </Typography>
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          onClick={handleSave}
          sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12, py: 0.35, px: 1, minHeight: 30, flexShrink: 0 }}
        >
          Salvar permissoes
        </Button>
      </Box>
      <Box sx={{ maxHeight: 'min(58vh, 520px)', overflowY: 'auto', pr: 0.5, mr: -0.25 }}>
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <Paper key={category} variant="outlined" sx={{ p: 1, mb: 1, borderRadius: 1, '&:last-of-type': { mb: 0 } }}>
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
              sx={{
                display: 'block',
                mb: 0.5,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontSize: 10.5,
              }}
            >
              {category}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
              {perms.map((perm) => (
                <FormControlLabel
                  key={perm.id}
                  control={
                    <Checkbox
                      checked={selectedPermissions.includes(perm.id)}
                      onChange={() => handleTogglePermission(perm.id)}
                      size="small"
                      sx={{ mt: 0.25 }}
                    />
                  }
                  label={
                    <Box sx={{ py: 0.125 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem', lineHeight: 1.25 }}>
                        {perm.display_name}
                      </Typography>
                      {perm.description ? (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10.5, lineHeight: 1.35, mt: 0.125 }}>
                          {perm.description}
                        </Typography>
                      ) : null}
                    </Box>
                  }
                  sx={{
                    m: 0,
                    alignItems: 'flex-start',
                    py: 0.25,
                    px: 0.5,
                    borderRadius: 0.75,
                    border: 1,
                    borderColor: 'divider',
                    gap: 0.25,
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
