import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@/compat/mui/material'
import { ToggleOn, ToggleOff } from '@/compat/mui/icons-material'
import { Plus } from '@/components/ui/icons'
import { useAssignableUsersCatalog } from '@/hooks/use-assignable-users-catalog'
import { useRoles } from '@/hooks/use-roles'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'

function getPreferredRoleId(roles: Array<{ id: string; name: string }>): string {
  if (roles.length === 0) return ''

  const memberLike = roles.find((role) =>
    ['member', 'usuario', 'user', 'developer', 'colaborador', 'employee'].includes(
      role.name.toLowerCase(),
    ),
  )
  if (memberLike) return memberLike.id

  const firstNonAdmin = roles.find((role) => role.name.toLowerCase() !== 'admin')
  return firstNonAdmin?.id ?? roles[0]?.id ?? ''
}

export function UsersTable() {
  const {
    members,
    loading,
    refreshing,
    error,
    addMember,
    updateMember,
  } = useWorkspaceMembers(undefined, { includeInactive: true })
  const {
    users: assignableUsers,
    loading: assignableLoading,
    error: assignableError,
  } = useAssignableUsersCatalog()
  const { roles, loading: rolesLoading } = useRoles()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [saving, setSaving] = useState(false)

  const activeMembersCount = useMemo(
    () => members.filter((member) => member.is_active).length,
    [members],
  )

  const membershipByUserId = useMemo(
    () => new Map(members.map((member) => [member.id, member] as const)),
    [members],
  )

  const addableUsers = useMemo(() => {
    return assignableUsers.filter((user) => {
      const existing = membershipByUserId.get(user.id)
      return !existing || !existing.is_active
    })
  }, [assignableUsers, membershipByUserId])

  useEffect(() => {
    if (!isAddDialogOpen) return
    setSelectedRoleId((current) => current || getPreferredRoleId(roles))
  }, [isAddDialogOpen, roles])

  const handleOpenAddDialog = () => {
    setSelectedUserId(null)
    setSelectedRoleId(getPreferredRoleId(roles))
    setIsAddDialogOpen(true)
  }

  const handleConfirmAdd = async () => {
    if (!selectedUserId) {
      alert('Selecione um usuario para vincular.')
      return
    }

    setSaving(true)
    try {
      await addMember({
        userId: selectedUserId,
        roleId: selectedRoleId || null,
      })
      setIsAddDialogOpen(false)
      setSelectedUserId(null)
      setSelectedRoleId('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao adicionar usuario ao workspace')
    } finally {
      setSaving(false)
    }
  }

  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      await updateMember(userId, { roleId })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar cargo')
    }
  }

  const handleToggleActive = async (userId: string, nextValue: boolean) => {
    const message = nextValue
      ? 'Reativar este usuario no workspace?'
      : 'Desativar este usuario neste workspace?'

    if (!confirm(message)) return

    try {
      await updateMember(userId, { isActive: nextValue })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }

  if (loading && members.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Usuarios deste workspace
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Somente membros vinculados a esta workspace podem aparecer como responsaveis e atuar nos elementos locais.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<Plus size={18} />}
          onClick={handleOpenAddDialog}
          disabled={rolesLoading}
        >
          Adicionar usuario
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {assignableError ? <Alert severity="warning">{assignableError}</Alert> : null}
      {activeMembersCount === 0 ? (
        <Alert severity="error">
          Esta workspace precisa manter ao menos um usuario ativo para continuar operando.
        </Alert>
      ) : null}
      {refreshing ? <Alert severity="info">Sincronizando membros desta workspace em segundo plano.</Alert> : null}

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
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    Nenhum usuario vinculado a esta workspace ainda.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={600}>
                        {member.name}
                      </Typography>
                      {member.is_default ? (
                        <Chip label="Principal" size="small" variant="outlined" sx={{ height: 20 }} />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {member.email || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel id={`workspace-role-${member.id}`}>Cargo</InputLabel>
                      <Select
                        labelId={`workspace-role-${member.id}`}
                        value={member.role?.id ?? ''}
                        label="Cargo"
                        onChange={(event) => handleRoleChange(member.id, String(event.target.value))}
                      >
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
                      label={member.is_active ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={member.is_active ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={member.is_active ? 'Desativar neste workspace' : 'Reativar neste workspace'}>
                      <Button
                        size="small"
                        color={member.is_active ? 'success' : 'inherit'}
                        onClick={() => handleToggleActive(member.id, !member.is_active)}
                        startIcon={member.is_active ? <ToggleOn fontSize="small" /> : <ToggleOff fontSize="small" />}
                      >
                        {member.is_active ? 'Ativo' : 'Reativar'}
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar usuario ao workspace</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Selecione um usuario ja existente no sistema para vincular a esta workspace.
            </Typography>

            <Autocomplete
              options={addableUsers}
              loading={assignableLoading}
              getOptionLabel={(option) => option.name || option.email || option.id}
              isOptionEqualToValue={(left, right) => left.id === right.id}
              value={addableUsers.find((user) => user.id === selectedUserId) ?? null}
              onChange={(_, value) => setSelectedUserId(value?.id ?? null)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Usuario"
                  placeholder="Busque por nome ou email"
                />
              )}
              renderOption={(props, option) => {
                const existing = membershipByUserId.get(option.id)
                return (
                  <Box component="li" {...props}>
                    <Stack spacing={0.25}>
                      <Typography variant="body2" fontWeight={600}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.email}
                        {existing && !existing.is_active ? ' • ja vinculado, mas inativo' : ''}
                      </Typography>
                    </Stack>
                  </Box>
                )
              }}
              noOptionsText="Nenhum usuario disponivel para vincular"
            />

            <FormControl fullWidth>
              <InputLabel id="workspace-add-role-label">Cargo</InputLabel>
              <Select
                labelId="workspace-add-role-label"
                value={selectedRoleId}
                label="Cargo"
                onChange={(event) => setSelectedRoleId(String(event.target.value))}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.display_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsAddDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmAdd}
            disabled={saving || !selectedUserId || !selectedRoleId}
          >
            {saving ? 'Salvando...' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
