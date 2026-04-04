import { useState } from 'react'
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
  IconButton,
  Typography,
  CircularProgress,
  Chip,
} from '@/compat/mui/material'
import { Plus, Pencil, Trash2, Settings } from '@/components/ui/icons'
import { RoleWithPermissions, useRoles } from '@/hooks/use-roles'
import { RolePermissionsEditor } from './role-permissions-editor'

export function RolesTable() {
  const { roles, loading, createRole, updateRole, deleteRole, refreshRoles } = useRoles()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null)
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null)
  const [formData, setFormData] = useState({ name: '', display_name: '', description: '' })

  const handleCreate = () => {
    setEditingRole(null)
    setFormData({ name: '', display_name: '', description: '' })
    setIsDialogOpen(true)
  }

  const handleEdit = (role: RoleWithPermissions) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
    })
    setIsDialogOpen(true)
  }

  const handleManagePermissions = (role: RoleWithPermissions) => {
    setSelectedRole(role)
    setIsPermissionsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingRole) {
        await updateRole(editingRole.id, formData)
      } else {
        await createRole(formData)
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error saving role:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este cargo?')) {
      await deleteRole(id)
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600}>Cargos</Typography>
        <Button variant="contained" size="small" onClick={handleCreate} startIcon={<Plus size={20} />}>
          Novo Cargo
        </Button>
      </Box>

      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Descrição</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Permissões</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Nenhum cargo encontrado</Typography>
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{role.display_name}</TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{role.description || '-'}</Typography></TableCell>
                  <TableCell>
                    <Chip label={`${role.permissions?.length || 0} permissões`} size="small" variant="outlined" color="primary" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleManagePermissions(role)} title="Permissões"><Settings fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => handleEdit(role)}><Pencil size={20} /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(role.id)}><Trash2 size={20} /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRole ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Nome (código)" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={!!editingRole} placeholder="ex: developer" fullWidth />
            <TextField label="Nome de Exibição" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} placeholder="ex: Usuário" fullWidth />
            <TextField label="Descrição" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição do cargo" fullWidth />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {selectedRole && (
        <Dialog
          open={isPermissionsDialogOpen}
          onClose={() => setIsPermissionsDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { maxHeight: '90vh' } }}
        >
          <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, py: 1.5, px: 2 }}>
            Permissoes — {selectedRole.display_name}
          </DialogTitle>
          <DialogContent sx={{ px: 2, pb: 2, pt: 0 }}>
            <RolePermissionsEditor
              role={selectedRole}
              onSave={() => {
                setIsPermissionsDialogOpen(false)
                refreshRoles()
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  )
}
