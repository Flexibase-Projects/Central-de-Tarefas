import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Typography,
  CircularProgress,
  Chip,
  Paper,
} from '@mui/material'
import { Add, Edit, Delete, PersonAdd } from '@mui/icons-material'
import { UserWithRole } from '@/types'
import { useUsers } from '@/hooks/use-users'
import { useRoles } from '@/hooks/use-roles'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null)
  const [formData, setFormData] = useState({ email: '', name: '', avatar_url: '' })
  const [givingAccessId, setGivingAccessId] = useState<string | null>(null)

  useEffect(() => {
    fetchAuthList()
  }, [fetchAuthList])

  const handleCreate = () => {
    setEditingUser(null)
    setFormData({ email: '', name: '', avatar_url: '' })
    setIsDialogOpen(true)
  }

  const handleEdit = (user: UserWithRole) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData)
      } else {
        await createUser(formData)
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error saving user:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja desativar este usuário?')) {
      await deleteUser(id)
    }
  }

  const handleRoleChange = async (userId: string, roleId: string) => {
    await assignRole(userId, roleId)
  }

  const handleGiveAccess = async (authUser: { id: string; email: string; name: string }) => {
    setGivingAccessId(authUser.id)
    try {
      await giveAccessFromAuth(authUser)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao dar acesso')
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
      {/* Usuários Supabase Auth — para dar acesso */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          Usuários do Supabase Auth
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Quem já tem conta no login. Use &quot;Dar acesso&quot; para liberar no sistema.
        </Typography>
        {authListLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
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
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Ação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {authList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">Nenhum usuário no Supabase Auth</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  authList.map((authUser) => (
                    <TableRow key={authUser.id} hover>
                      <TableCell>{authUser.email}</TableCell>
                      <TableCell>{authUser.name || '—'}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {authUser.created_at
                            ? formatDistanceToNow(new Date(authUser.created_at), { addSuffix: true, locale: ptBR })
                            : '—'}
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
                          <Typography variant="caption" color="text.secondary">Já no sistema</Typography>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={givingAccessId === authUser.id ? <CircularProgress size={14} /> : <PersonAdd />}
                            disabled={givingAccessId !== null}
                            onClick={() => handleGiveAccess(authUser)}
                          >
                            Dar acesso
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
      </Paper>

      {/* Usuários com acesso no sistema */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600}>Usuários com acesso</Typography>
        <Button variant="contained" size="small" onClick={handleCreate} startIcon={<Add />}>
          Novo Usuário
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
              <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Nenhum usuário encontrado</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{user.name}</TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{user.email}</Typography></TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <Select
                        value={user.role?.id || ''}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">Sem cargo</MenuItem>
                        {roles.map((role) => (
                          <MenuItem key={role.id} value={role.id}>{role.display_name}</MenuItem>
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
                    <IconButton size="small" onClick={() => handleEdit(user)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}><Delete fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@exemplo.com"
              fullWidth
            />
            <TextField
              label="Nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome completo"
              fullWidth
            />
            <TextField
              label="Avatar URL (opcional)"
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              placeholder="https://exemplo.com/avatar.jpg"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
