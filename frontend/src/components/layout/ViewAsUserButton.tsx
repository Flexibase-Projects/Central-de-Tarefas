import { useState, useRef } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  ClickAwayListener,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  TextField,
  Tooltip,
  Typography,
  Avatar,
} from '@mui/material'
import { Visibility, VisibilityOff, Search, Close } from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/hooks/use-users'
import { UserWithRole } from '@/types'

export function ViewAsUserButton() {
  const { realUserRole, isViewingAs, viewAsUser, startViewingAs, stopViewingAs } = useAuth()
  const { users, loading } = useUsers()

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [starting, setStarting] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  // Só renderiza para administradores reais
  if (realUserRole?.name !== 'admin') return null

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
      <Chip
        avatar={
          <Avatar
            src={viewAsUser.avatar_url ?? undefined}
            sx={{ width: 22, height: 22, fontSize: 11 }}
          >
            {viewAsUser.name.charAt(0).toUpperCase()}
          </Avatar>
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Vendo como:
            </Typography>
            <Typography variant="caption">{viewAsUser.name}</Typography>
          </Box>
        }
        deleteIcon={
          <Tooltip title="Sair do modo visualização">
            <Close fontSize="small" />
          </Tooltip>
        }
        onDelete={stopViewingAs}
        color="warning"
        variant="filled"
        size="small"
        sx={{ mr: 1, height: 32, cursor: 'default' }}
      />
    )
  }

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative', mr: 1 }}>
        <Tooltip title="Ver como usuário">
          <Button
            ref={anchorRef}
            size="small"
            variant="outlined"
            startIcon={starting ? <CircularProgress size={14} /> : <Visibility />}
            onClick={() => setOpen((prev) => !prev)}
            disabled={starting}
            sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12 }}
          >
            Ver como
          </Button>
        </Tooltip>

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-end"
          style={{ zIndex: 1400 }}
        >
          <Paper
            elevation={4}
            sx={{ width: 280, mt: 0.5, borderRadius: 2, overflow: 'hidden' }}
          >
            <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Visualizar como usuário
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Selecione para simular a visão do sistema
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ px: 1.5, py: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Buscar usuário..."
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
            <List
              dense
              disablePadding
              sx={{ maxHeight: 260, overflowY: 'auto' }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : filtered.length === 0 ? (
                <Box sx={{ px: 2, py: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Nenhum usuário encontrado
                  </Typography>
                </Box>
              ) : (
                filtered.map((user) => (
                  <ListItemButton
                    key={user.id}
                    onClick={() => handleSelect(user)}
                    sx={{ px: 2, py: 0.75 }}
                  >
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
                Apenas você vê esta funcionalidade
              </Typography>
            </Box>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  )
}
