import { useState, useEffect } from 'react'
import { Box, Typography, Paper, CircularProgress } from '@mui/material'
import { Permission } from '@/types'
import { apiUrl } from '@/lib/api'

export function PermissionsList() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch(apiUrl('/api/permissions'))
        if (response.ok) {
          const data = await response.json()
          setPermissions(data)
        }
      } catch (error) {
        console.error('Error fetching permissions:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPermissions()
  }, [])

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
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight={600}>Permissões</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <Paper key={category} variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5, textTransform: 'capitalize' }}>{category}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {perms.map((perm) => (
                <Box
                  key={perm.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    p: 1.5,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>{perm.display_name}</Typography>
                  {perm.description && (
                    <Typography variant="body2" color="text.secondary">{perm.description}</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" fontFamily="monospace">{perm.name}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  )
}
