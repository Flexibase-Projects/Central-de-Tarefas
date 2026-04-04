import { useState, useEffect } from 'react'
import { Box, Typography, Paper, CircularProgress } from '@/compat/mui/material'
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
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ mb: 0.25 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.95rem' }}>
          Permissoes do sistema
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.35 }}>
          Catalogo somente leitura; edicao por cargo na aba Cargos.
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <Paper key={category} variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
              sx={{
                display: 'block',
                mb: 0.75,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontSize: 10.5,
              }}
            >
              {category}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {perms.map((perm) => (
                <Box
                  key={perm.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.125,
                    py: 0.5,
                    px: 0.75,
                    borderRadius: 0.75,
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem', lineHeight: 1.3 }}>
                    {perm.display_name}
                  </Typography>
                  {perm.description ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, lineHeight: 1.35 }}>
                      {perm.description}
                    </Typography>
                  ) : null}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5, opacity: 0.92 }}
                  >
                    {perm.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  )
}
