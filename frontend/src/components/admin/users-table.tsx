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
import { AdminThemedSelect } from '@/components/admin/admin-themed-select'
import { ToggleOn, ToggleOff } from '@/compat/mui/icons-material'
import { Plus } from '@/components/ui/icons'
import { denseTableHeadCellSx, denseTableBodyCellSx } from '@/components/system/denseTableHeadCellSx'
import { useAssignableUsersCatalog } from '@/hooks/use-assignable-users-catalog'
import { useRoles } from '@/hooks/use-roles'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'
import type { WorkspaceManagedMember } from '@/types'

/**
 * Alinha o cargo do membro ao catálogo `/api/roles`: o backend pode mandar `role_id` vazio
 * mas `role.name` / `role_key` / `display_name` preenchidos — o valor do &lt;select&gt; precisa ser o `id` real.
 */
function resolveMemberRoleCatalogId(
  member: WorkspaceManagedMember,
  catalog: Array<{ id: string; name: string; display_name: string }>,
): string {
  const rawId = member.role?.id?.trim() ?? ''
  if (rawId && catalog.some((r) => r.id === rawId)) return rawId

  const key = (member.role?.name ?? member.role_key ?? '').trim().toLowerCase()
  if (key) {
    const byName = catalog.find((r) => r.name.trim().toLowerCase() === key)
    if (byName) return byName.id
  }

  const fromDisplay = [
    member.role?.display_name,
    member.role_display_name,
    member.role?.name,
  ]
    .map((s) => (typeof s === 'string' ? s.trim().toLowerCase() : ''))
    .find(Boolean)
  if (fromDisplay) {
    const byCatalogDisplay = catalog.find((r) => r.display_name.trim().toLowerCase() === fromDisplay)
    if (byCatalogDisplay) return byCatalogDisplay.id
  }

  return rawId
}

/** Texto do cargo para o trigger quando o id ainda não casa com o catálogo. */
function memberCargoFallbackLabel(member: WorkspaceManagedMember): string | undefined {
  const candidates = [
    member.role_display_name,
    member.role?.display_name,
    member.role?.name,
    member.role_key,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  return undefined
}

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} gap={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.95rem' }}>
            Usuarios deste workspace
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.4, maxWidth: 520 }}>
            Membros vinculados podem ser responsaveis nos fluxos locais.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          startIcon={<Plus size={16} />}
          onClick={handleOpenAddDialog}
          disabled={rolesLoading}
          sx={{
            whiteSpace: 'nowrap',
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 600,
            py: 0.5,
            px: 1.125,
            minHeight: 32,
            alignSelf: { xs: 'stretch', sm: 'center' },
          }}
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
            <TableRow>
              <TableCell sx={denseTableHeadCellSx}>Nome</TableCell>
              <TableCell sx={denseTableHeadCellSx}>Email</TableCell>
              <TableCell sx={denseTableHeadCellSx}>Cargo</TableCell>
              <TableCell sx={denseTableHeadCellSx}>Status</TableCell>
              <TableCell align="right" sx={denseTableHeadCellSx}>
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
                  <TableCell
                    sx={[
                      denseTableBodyCellSx,
                      { fontWeight: 500, verticalAlign: 'middle', py: 0.5 },
                    ]}
                  >
                    <Stack direction="row" alignItems="center" gap={0.5} sx={{ flexWrap: 'wrap' }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem', lineHeight: 1.3 }}>
                        {member.name}
                      </Typography>
                      {member.is_default ? (
                        <Chip label="Principal" size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell sx={[denseTableBodyCellSx, { verticalAlign: 'middle', py: 0.5 }]}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.35 }}>
                      {member.email || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={[denseTableBodyCellSx, { verticalAlign: 'middle', py: 0.5, maxWidth: 220 }]}>
                    <Box sx={{ minWidth: 140, maxWidth: 220 }}>
                      <AdminThemedSelect
                        dense
                        ariaLabel="Cargo no workspace"
                        value={resolveMemberRoleCatalogId(member, roles)}
                        fallbackLabel={memberCargoFallbackLabel(member)}
                        onChange={(roleId) => handleRoleChange(member.id, roleId)}
                        options={roles.map((role) => ({
                          value: role.id,
                          label: role.display_name?.trim() || role.name?.trim() || role.id,
                        }))}
                      />
                    </Box>
                  </TableCell>
                  <TableCell sx={[denseTableBodyCellSx, { verticalAlign: 'middle', py: 0.5 }]}>
                    <Chip
                      label={member.is_active ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={member.is_active ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={[denseTableBodyCellSx, { verticalAlign: 'middle', py: 0.5 }]}>
                    <Tooltip title={member.is_active ? 'Desativar neste workspace' : 'Reativar neste workspace'}>
                      <Button
                        size="small"
                        color={member.is_active ? 'success' : 'inherit'}
                        onClick={() => handleToggleActive(member.id, !member.is_active)}
                        startIcon={member.is_active ? <ToggleOn fontSize="small" /> : <ToggleOff fontSize="small" />}
                        sx={{ py: 0.25, minHeight: 28, fontSize: 12, textTransform: 'none' }}
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

            <AdminThemedSelect
              fullWidth
              label="Cargo"
              value={selectedRoleId}
              onChange={setSelectedRoleId}
              options={roles.map((role) => ({
                value: role.id,
                label: role.display_name,
              }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsAddDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="outlined"
            color="inherit"
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
