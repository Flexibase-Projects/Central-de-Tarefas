import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Plus, Pencil, Trash2, UserPlus } from '@/components/ui/icons'
import { UserWithRole } from '@/types'
import { useUsers } from '@/hooks/use-users'
import { useRoles } from '@/hooks/use-roles'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type AuthListUser = {
  id: string
  email: string
  name: string
  created_at: string
  in_cdt: boolean
}

function getPreferredRoleId(roles: Array<{ id: string; name: string }>): string {
  if (roles.length === 0) return ''

  const memberLike = roles.find((role) =>
    ['member', 'usuario', 'user', 'colaborador', 'employee'].includes(role.name.toLowerCase()),
  )
  if (memberLike) return memberLike.id

  const firstNonAdmin = roles.find((role) => role.name.toLowerCase() !== 'admin')
  if (firstNonAdmin) return firstNonAdmin.id

  return roles[0]?.id ?? ''
}

export function UsersTable() {
  const {
    users,
    loading,
    createUser,
    updateUser,
    deleteUser,
    assignRole,
    authList,
    authListLoading,
    fetchAuthList,
    giveAccessFromAuth,
  } = useUsers()

  const { roles } = useRoles()

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null)
  const [formData, setFormData] = useState({ email: '', name: '', avatar_url: '' })

  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false)
  const [selectedAuthUser, setSelectedAuthUser] = useState<AuthListUser | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [givingAccessId, setGivingAccessId] = useState<string | null>(null)

  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false)
  const [authSearch, setAuthSearch] = useState('')

  const roleItems = useMemo(
    () => roles.map((role) => ({ id: role.id, name: role.name, display_name: role.display_name })),
    [roles],
  )

  const filteredAuthList = useMemo(() => {
    if (!authSearch.trim()) return authList
    const q = authSearch.trim().toLowerCase()
    return authList.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q)),
    )
  }, [authList, authSearch])

  const handleOpenNewUser = () => {
    setAuthSearch('')
    setIsNewUserDialogOpen(true)
    fetchAuthList()
  }

  const handleCreate = () => {
    setEditingUser(null)
    setFormData({ email: '', name: '', avatar_url: '' })
    setIsUserDialogOpen(true)
  }

  const handleEdit = (user: UserWithRole) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url || '',
    })
    setIsUserDialogOpen(true)
  }

  const handleSubmitUser = async () => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData)
      } else {
        await createUser(formData)
      }
      setIsUserDialogOpen(false)
    } catch (error) {
      console.error('Error saving user:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja desativar este usuario?')) {
      await deleteUser(id)
    }
  }

  const handleRoleChange = async (userId: string, roleId: string) => {
    await assignRole(userId, roleId)
  }

  const handleOpenGiveAccess = (authUser: AuthListUser) => {
    setSelectedAuthUser(authUser)
    setSelectedRoleId(getPreferredRoleId(roleItems))
    setIsAccessDialogOpen(true)
  }

  const handleConfirmGiveAccess = async () => {
    if (!selectedAuthUser) return
    if (!selectedRoleId) {
      alert('Selecione um cargo para liberar acesso.')
      return
    }

    setGivingAccessId(selectedAuthUser.id)
    try {
      await giveAccessFromAuth(
        {
          id: selectedAuthUser.id,
          email: selectedAuthUser.email,
          name: selectedAuthUser.name,
        },
        selectedRoleId,
      )
      setIsAccessDialogOpen(false)
      setSelectedAuthUser(null)
      setSelectedRoleId('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao dar acesso')
    } finally {
      setGivingAccessId(null)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600}>
          Usuarios com acesso
        </Typography>
        <Button variant="contained" size="small" onClick={handleOpenNewUser} startIcon={<Plus size={20} />}>
          Novo Usuario
        </Button>
      </Box>

      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Cargo</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Acoes
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Nenhum usuario encontrado</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{user.name}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 170 }}>
                      <Select
                        value={user.role?.id || ''}
                        onChange={(e) => handleRoleChange(user.id, String(e.target.value))}
                        displayEmpty
                      >
                        <MenuItem value="">Sem cargo</MenuItem>
                        {roles.map((role) => (
                          <MenuItem key={role.id} value={role.id}>
                            {role.display_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_active ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={user.is_active ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEdit(user)}>
                      <Pencil size={20} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}>
                      <Trash2 size={20} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <Dialog
        open={isNewUserDialogOpen}
        onClose={() => setIsNewUserDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { minHeight: '60vh' } }}
      >
        <DialogTitle>Novo usuario — buscar no Supabase Auth</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Usuarios que ja possuem conta de login. Pesquise por email ou nome e libere acesso ou defina acao.
          </Typography>
          <TextField
            size="small"
            placeholder="Pesquisar por email ou nome..."
            value={authSearch}
            onChange={(e) => setAuthSearch(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          {authListLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Cadastro</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Acao
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAuthList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">
                          {authList.length === 0
                            ? 'Nenhum usuario encontrado no Auth.'
                            : 'Nenhum resultado para a pesquisa.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAuthList.map((authUser) => (
                      <TableRow key={authUser.id} hover>
                        <TableCell>{authUser.email}</TableCell>
                        <TableCell>{authUser.name || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {authUser.created_at
                              ? formatDistanceToNow(new Date(authUser.created_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })
                              : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={authUser.in_cdt ? 'Com acesso' : 'Sem acesso'}
                            size="small"
                            color={authUser.in_cdt ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {authUser.in_cdt ? (
                            <Typography variant="caption" color="text.secondary">
                              Ja no sistema
                            </Typography>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<UserPlus size={18} />}
                              disabled={Boolean(givingAccessId)}
                              onClick={() => handleOpenGiveAccess(authUser)}
                            >
                              Liberar acesso
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setIsNewUserDialogOpen(false)
              handleCreate()
            }}
          >
            Criar usuario manualmente
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setIsNewUserDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isUserDialogOpen} onClose={() => setIsUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Editar Usuario' : 'Criar usuario manualmente'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Avatar URL (opcional)"
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsUserDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmitUser}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isAccessDialogOpen}
        onClose={() => setIsAccessDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Liberar acesso</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedAuthUser
                ? `Usuario: ${selectedAuthUser.name || '-'} (${selectedAuthUser.email})`
                : 'Selecione um usuario'}
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Cargo inicial</InputLabel>
              <Select
                label="Cargo inicial"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(String(e.target.value))}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.display_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsAccessDialogOpen(false)} disabled={Boolean(givingAccessId)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmGiveAccess}
            disabled={!selectedAuthUser || !selectedRoleId || Boolean(givingAccessId)}
            startIcon={givingAccessId ? <CircularProgress size={14} /> : <UserPlus size={16} />}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
