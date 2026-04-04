import { useState, useRef } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  ClickAwayListener,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Popper,
  TextField,
  Tooltip,
  Typography,
  Avatar,
} from '@/compat/mui/material'
import { Visibility, VisibilityOff, Search, Close } from '@/compat/mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import { isGlobalAdminRoleName } from '@/lib/global-admin'
import { useUsers } from '@/hooks/use-users'
import { UserWithRole } from '@/types'
import AppSurface from '@/components/system/AppSurface'
import { appShellHeaderControlSx } from '@/components/layout/layout-shell'

export function ViewAsUserButton() {
  const { realUserRole, isViewingAs, viewAsUser, startViewingAs, stopViewingAs } = useAuth()
  const { users, loading } = useUsers()

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [starting, setStarting] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  if (!isGlobalAdminRoleName(realUserRole?.name)) return null

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  async function handleSelect(user: UserWithRole) {
    setStarting(true)
    setOpen(false)
    setSearch('')
    await startViewingAs(user)
    setStarting(false)
  }

  if (isViewingAs && viewAsUser) {
    return (
      <Box
        sx={{
          ...appShellHeaderControlSx,
          px: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          maxWidth: 380,
          borderColor: 'divider',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'var(--border-strong)',
          },
        }}
      >
        <Avatar
          src={viewAsUser.avatar_url ?? undefined}
          sx={{ width: 24, height: 24, fontSize: 11 }}
        >
          {viewAsUser.name.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, flexShrink: 0 }}>
            Vendo como
          </Typography>
          <Typography variant="caption" noWrap sx={{ flex: 1, minWidth: 0 }}>
            {viewAsUser.name}
          </Typography>
        </Box>
        <Tooltip title="Sair do modo visualizacao">
          <Button
            size="small"
            color="inherit"
            onClick={stopViewingAs}
            sx={{ minWidth: 0, px: 0.75, py: 0.25, flexShrink: 0 }}
          >
            <Close fontSize="small" />
          </Button>
        </Tooltip>
      </Box>
    )
  }

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative' }}>
        <Tooltip title="Ver como usuario">
          <Button
            ref={anchorRef}
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={starting ? <CircularProgress size={14} color="inherit" /> : <Visibility />}
            onClick={() => setOpen((prev) => !prev)}
            disabled={starting}
            sx={{
              ...appShellHeaderControlSx,
              color: 'text.primary',
              textTransform: 'none',
              fontSize: 12,
              px: 1.25,
              boxShadow: 'none',
              '& .MuiButton-startIcon': { color: 'text.secondary' },
            }}
          >
            Ver como
          </Button>
        </Tooltip>

        <Popper open={open} anchorEl={anchorRef.current} placement="bottom-end" style={{ zIndex: 1400 }}>
          <AppSurface sx={{ width: 280, mt: 0.5, p: 0, overflow: 'hidden' }}>
            <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Visualizar como usuario
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Selecione para simular a visao do sistema
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ px: 1.5, py: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Buscar usuario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                autoFocus
              />
            </Box>
            <List dense disablePadding sx={{ maxHeight: 260, overflowY: 'auto' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : filtered.length === 0 ? (
                <Box sx={{ px: 2, py: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Nenhum usuario encontrado
                  </Typography>
                </Box>
              ) : (
                filtered.map((user) => (
                  <ListItemButton key={user.id} onClick={() => handleSelect(user)} sx={{ px: 2, py: 0.75 }}>
                    <Avatar
                      src={user.avatar_url ?? undefined}
                      sx={{ width: 28, height: 28, mr: 1.5, fontSize: 12 }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <ListItemText
                      primary={user.name}
                      secondary={user.role?.display_name ?? user.email}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItemButton>
                ))
              )}
            </List>
            <Divider />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <VisibilityOff sx={{ fontSize: 12 }} />
                Apenas voce ve esta funcionalidade
              </Typography>
            </Box>
          </AppSurface>
        </Popper>
      </Box>
    </ClickAwayListener>
  )
}
