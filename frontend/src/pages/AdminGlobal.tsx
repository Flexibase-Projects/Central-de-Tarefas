import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowLeft, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import AppSurface from '@/components/system/AppSurface'
import FormDialog from '@/components/system/FormDialog'
import SectionHeader from '@/components/system/SectionHeader'
import StatusToken from '@/components/system/StatusToken'
import { useAdminWorkspaces, type AdminWorkspaceModuleState, type AdminWorkspaceRecord } from '@/hooks/use-admin-workspaces'
import { useAuth } from '@/contexts/AuthContext'

type WorkspaceFormState = {
  id?: string
  mode: 'create' | 'edit'
  name: string
  slug: string
  description: string
  group_key: string
  is_active: boolean
  is_hidden: boolean
}

type ModuleCategoryGroup = {
  key: string
  label: string
  modules: AdminWorkspaceModuleState[]
}

const EMPTY_FORM: WorkspaceFormState = {
  mode: 'create',
  name: '',
  slug: '',
  description: '',
  group_key: 'core',
  is_active: true,
  is_hidden: false,
}

function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toLabel(value: string): string {
  return value
    .split(/[_-]+/g)
    .map((part) => (part ? `${part[0]?.toUpperCase() ?? ''}${part.slice(1).toLowerCase()}` : part))
    .join(' ')
}

function formatCategoryLabel(value?: string | null): string {
  if (!value?.trim()) return 'Sem categoria'
  return toLabel(value.trim())
}

function groupModulesByCategory(modules: AdminWorkspaceModuleState[]): ModuleCategoryGroup[] {
  const grouped = new Map<string, ModuleCategoryGroup>()

  for (const module of modules) {
    const key = module.category?.trim().toLowerCase() || 'sem-categoria'
    const current = grouped.get(key) ?? {
      key,
      label: formatCategoryLabel(module.category),
      modules: [],
    }

    current.modules.push(module)
    grouped.set(key, current)
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      modules: [...group.modules].sort((left, right) => left.display_name.localeCompare(right.display_name, 'pt-BR')),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'))
}

function getModuleTone(module: AdminWorkspaceModuleState): 'success' | 'warning' | 'neutral' | 'info' {
  if (module.available && module.is_enabled) return 'success'
  if (module.reason === 'dependency_disabled') return 'warning'
  if (module.is_enabled) return 'info'
  return 'neutral'
}

function getModuleStatusLabel(module: AdminWorkspaceModuleState): string {
  if (module.available && module.is_enabled) return 'Ativo'

  switch (module.reason) {
    case 'definition_inactive':
      return 'Definicao desligada'
    case 'not_configured':
      return 'Nao configurado'
    case 'disabled':
      return 'Desligado'
    case 'dependency_disabled':
      return 'Dependencia pendente'
    default:
      return 'Indisponivel'
  }
}

function getModuleReason(module: AdminWorkspaceModuleState): string {
  switch (module.reason) {
    case 'definition_inactive':
      return 'Este modulo esta desligado na definicao central.'
    case 'not_configured':
      return 'Ainda nao existe configuracao deste modulo para este workspace.'
    case 'disabled':
      return 'O modulo foi desligado para este workspace.'
    case 'dependency_disabled':
      return 'Ative primeiro os modulos dos quais ele depende.'
    default:
      return 'Modulo disponivel para este workspace.'
  }
}

function createFormFromWorkspace(workspace: AdminWorkspaceRecord): WorkspaceFormState {
  return {
    id: workspace.id,
    mode: 'edit',
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description ?? '',
    group_key: workspace.group_key,
    is_active: workspace.is_active,
    is_hidden: workspace.is_hidden,
  }
}

export default function AdminGlobal() {
  const { logout } = useAuth()
  const {
    workspaces,
    groups,
    loading,
    error,
    creating,
    savingWorkspaceIds,
    savingModuleIds,
    stats,
    refresh,
    createWorkspace,
    updateWorkspace,
    setModuleState,
  } = useAdminWorkspaces()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [dialogSaving, setDialogSaving] = useState(false)
  const [slugDirty, setSlugDirty] = useState(false)
  const [form, setForm] = useState<WorkspaceFormState>({
    ...EMPTY_FORM,
    group_key: groups[0]?.key ?? EMPTY_FORM.group_key,
  })

  const totalAvailableModules = useMemo(() => {
    return workspaces.reduce((count, workspace) => count + workspace.modules.length, 0)
  }, [workspaces])

  const handleOpenCreate = () => {
    setDialogError(null)
    setSlugDirty(false)
    setForm({
      ...EMPTY_FORM,
      group_key: groups[0]?.key ?? EMPTY_FORM.group_key,
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (workspace: AdminWorkspaceRecord) => {
    setDialogError(null)
    setSlugDirty(true)
    setForm(createFormFromWorkspace(workspace))
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    if (dialogSaving) return
    setDialogOpen(false)
    setDialogError(null)
  }

  const handleSaveWorkspace = async () => {
    setDialogSaving(true)
    setDialogError(null)

    try {
      if (form.mode === 'create') {
        await createWorkspace({
          name: form.name,
          slug: form.slug,
          description: form.description,
          group_key: form.group_key,
          is_active: form.is_active,
          is_hidden: form.is_hidden,
        })
      } else if (form.id) {
        await updateWorkspace(form.id, {
          name: form.name,
          description: form.description,
          group_key: form.group_key,
          is_active: form.is_active,
          is_hidden: form.is_hidden,
        })
      }

      setDialogOpen(false)
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Falha ao salvar workspace.')
    } finally {
      setDialogSaving(false)
    }
  }

  const handleToggleWorkspace = async (workspace: AdminWorkspaceRecord, nextValue: boolean) => {
    try {
      await updateWorkspace(workspace.id, { is_active: nextValue })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Falha ao atualizar o status do workspace.')
    }
  }

  const handleToggleModule = async (workspace: AdminWorkspaceRecord, module: AdminWorkspaceModuleState, nextValue: boolean) => {
    try {
      await setModuleState(workspace.id, module.key, nextValue)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Falha ao atualizar o modulo do workspace.')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage:
          'radial-gradient(circle at top left, rgba(34, 197, 94, 0.08), transparent 30%), radial-gradient(circle at top right, rgba(20, 184, 166, 0.08), transparent 26%)',
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2.5} justifyContent="space-between" sx={{ mb: 3 }}>
          <Box sx={{ maxWidth: 760 }}>
            <SectionHeader
              title="Administracao Global"
              description="Crie workspaces, mantenha o catalogo central organizado e controle o que fica ligado ou desligado em cada workspace sem depender de um acesso operacional."
              sx={{ pb: 0 }}
            />
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button component={RouterLink} to="/workspaces" variant="outlined" startIcon={<ArrowLeft size={16} />}>
              Voltar para workspaces
            </Button>
            <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => void refresh()}>
              Atualizar
            </Button>
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={handleOpenCreate} disabled={creating}>
              {creating ? 'Criando...' : 'Novo workspace'}
            </Button>
            <Button variant="text" color="inherit" onClick={() => void logout()}>
              Sair
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
            gap: 2,
            mb: 3,
          }}
        >
          <AppSurface surface="raised">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Workspaces
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.75 }}>
              {stats.totalWorkspaces}
            </Typography>
          </AppSurface>

          <AppSurface surface="raised">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Workspaces ativos
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.75 }}>
              {stats.activeWorkspaces}
            </Typography>
          </AppSurface>

          <AppSurface surface="raised">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Modulos ligados
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.75 }}>
              {stats.enabledModules}
            </Typography>
          </AppSurface>

          <AppSurface surface="raised">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Modulos mapeados
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.75 }}>
              {totalAvailableModules}
            </Typography>
          </AppSurface>
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : workspaces.length === 0 ? (
          <AppSurface surface="raised">
            <Stack spacing={1.5}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-sm)',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'action.hover',
                  color: 'primary.main',
                }}
              >
                <ShieldCheck size={20} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Nenhum workspace cadastrado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Comece criando o primeiro workspace. Depois voce consegue ligar os modulos operacionais de cada um por
                aqui.
              </Typography>
              <Box>
                <Button variant="contained" startIcon={<Plus size={16} />} onClick={handleOpenCreate}>
                  Criar primeiro workspace
                </Button>
              </Box>
            </Stack>
          </AppSurface>
        ) : (
          <Stack spacing={2.5}>
            {workspaces.map((workspace) => {
              const moduleCategories = groupModulesByCategory(workspace.modules)

              return (
                <AppSurface key={workspace.id} surface="raised" sx={{ overflow: 'hidden' }}>
                  <Stack spacing={2.25}>
                    <Stack
                      direction={{ xs: 'column', lg: 'row' }}
                      spacing={2}
                      justifyContent="space-between"
                      alignItems={{ lg: 'flex-start' }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
                          <Typography variant="h4" sx={{ fontWeight: 800 }}>
                            {workspace.name}
                          </Typography>
                          <StatusToken tone={workspace.is_active ? 'success' : 'warning'}>
                            {workspace.is_active ? 'Workspace ativo' : 'Workspace desligado'}
                          </StatusToken>
                          <StatusToken tone={workspace.is_hidden ? 'neutral' : 'info'}>
                            {workspace.is_hidden ? 'Oculto da selecao' : 'Visivel na selecao'}
                          </StatusToken>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="body2" color="text.secondary">
                            /{workspace.slug}
                          </Typography>
                          <StatusToken tone="neutral">
                            {workspace.group_label}
                          </StatusToken>
                          <StatusToken tone="info">
                            {workspace.modules.filter((module) => module.is_enabled).length} modulos ligados
                          </StatusToken>
                        </Stack>

                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mt: 1.25 }}>
                          {workspace.description || 'Workspace sem descricao definida.'}
                        </Typography>
                      </Box>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'center' }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={workspace.is_active}
                              onChange={(_, checked) => void handleToggleWorkspace(workspace, checked)}
                              disabled={Boolean(savingWorkspaceIds[workspace.id])}
                              inputProps={{
                                'aria-label': `Ativar workspace ${workspace.name}`,
                              }}
                            />
                          }
                          label={savingWorkspaceIds[workspace.id] ? 'Salvando...' : 'Workspace ativo'}
                        />

                        <Button variant="outlined" onClick={() => handleOpenEdit(workspace)}>
                          Editar detalhes
                        </Button>
                      </Stack>
                    </Stack>

                    <Stack spacing={1.5}>
                      {moduleCategories.map((category) => {
                        const activeModules = category.modules.filter((module) => module.is_enabled).length

                        return (
                          <AppSurface key={`${workspace.id}:${category.key}`} surface="subtle" compact>
                            <Stack spacing={1.25}>
                              <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={0.75}
                                justifyContent="space-between"
                                alignItems={{ md: 'center' }}
                              >
                                <Box>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                    {category.label}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {activeModules} de {category.modules.length} modulos ligados nesta categoria
                                  </Typography>
                                </Box>

                                <StatusToken tone="neutral">
                                  {category.modules.length} item{category.modules.length === 1 ? '' : 's'}
                                </StatusToken>
                              </Stack>

                              <TableContainer
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 'var(--radius-sm)',
                                  bgcolor: 'background.paper',
                                  overflowX: 'auto',
                                }}
                              >
                                <Table
                                  size="small"
                                  aria-label={`Modulos da categoria ${category.label} no workspace ${workspace.name}`}
                                >
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 700 }}>Modulo</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Dependencias</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Descricao</TableCell>
                                      <TableCell align="right" sx={{ fontWeight: 700 }}>Ligado</TableCell>
                                    </TableRow>
                                  </TableHead>

                                  <TableBody>
                                    {category.modules.map((module) => {
                                      const savingKey = `${workspace.id}:${module.key}`
                                      const saving = Boolean(savingModuleIds[savingKey])

                                      return (
                                        <TableRow
                                          key={module.key}
                                          hover
                                          sx={{
                                            '&:last-child td': {
                                              borderBottom: 0,
                                            },
                                          }}
                                        >
                                          <TableCell sx={{ minWidth: 220, verticalAlign: 'top' }}>
                                            <Stack spacing={0.35}>
                                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                {module.display_name}
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                {module.key}
                                              </Typography>
                                            </Stack>
                                          </TableCell>

                                          <TableCell sx={{ minWidth: 180, verticalAlign: 'top' }}>
                                            <StatusToken tone={getModuleTone(module)}>
                                              {saving ? 'Salvando...' : getModuleStatusLabel(module)}
                                            </StatusToken>
                                          </TableCell>

                                          <TableCell sx={{ minWidth: 180, verticalAlign: 'top' }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                                              {module.dependency_keys.length > 0 ? module.dependency_keys.join(', ') : 'Sem dependencias'}
                                            </Typography>
                                          </TableCell>

                                          <TableCell sx={{ minWidth: 320, verticalAlign: 'top' }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                                              {module.description || getModuleReason(module)}
                                            </Typography>
                                          </TableCell>

                                          <TableCell align="right" sx={{ width: 120, verticalAlign: 'top' }}>
                                            <Stack spacing={0.35} alignItems="flex-end">
                                              <Switch
                                                checked={module.is_enabled}
                                                onChange={(_, checked) => void handleToggleModule(workspace, module, checked)}
                                                disabled={saving}
                                                inputProps={{
                                                  'aria-label': `Ativar modulo ${module.display_name} no workspace ${workspace.name}`,
                                                }}
                                              />
                                              <Typography variant="caption" color="text.secondary">
                                                {saving ? 'Salvando...' : module.is_enabled ? 'Ligado' : 'Desligado'}
                                              </Typography>
                                            </Stack>
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Stack>
                          </AppSurface>
                        )
                      })}
                    </Stack>
                  </Stack>
                </AppSurface>
              )
            })}
          </Stack>
        )}
      </Box>

      <FormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={form.mode === 'create' ? 'Novo workspace' : 'Editar workspace'}
        description={
          form.mode === 'create'
            ? 'Crie um novo contexto operacional e depois ligue os modulos necessarios.'
            : 'Ajuste os dados centrais deste workspace sem sair do painel global.'
        }
        maxWidth="sm"
        actions={
          <>
            <Button onClick={handleCloseDialog} disabled={dialogSaving}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSaveWorkspace()}
              variant="contained"
              disabled={dialogSaving || !form.name.trim() || !form.slug.trim() || !form.group_key}
            >
              {dialogSaving ? 'Salvando...' : form.mode === 'create' ? 'Criar workspace' : 'Salvar alteracoes'}
            </Button>
          </>
        }
      >
        <Stack spacing={2}>
          {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}

          <TextField
            label="Nome"
            value={form.name}
            onChange={(event) => {
              const nextName = event.target.value
              setForm((current) => ({
                ...current,
                name: nextName,
                slug:
                  current.mode === 'create' && !slugDirty
                    ? toSlug(nextName)
                    : current.slug,
              }))
            }}
            required
            fullWidth
          />

          <TextField
            label="Slug"
            value={form.slug}
            onChange={(event) => {
              setSlugDirty(true)
              setForm((current) => ({ ...current, slug: toSlug(event.target.value) }))
            }}
            helperText={
              form.mode === 'create'
                ? 'Usado na URL do workspace.'
                : 'O slug permanece fixo para nao quebrar acessos ja existentes.'
            }
            disabled={form.mode === 'edit'}
            required
            fullWidth
          />

          <TextField
            select
            label="Grupo"
            value={form.group_key}
            onChange={(event) => setForm((current) => ({ ...current, group_key: event.target.value }))}
            required
            fullWidth
          >
            {groups.map((group) => (
              <MenuItem key={group.key} value={group.key}>
                {group.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Descricao"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            multiline
            minRows={3}
            fullWidth
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(_, checked) => setForm((current) => ({ ...current, is_active: checked }))}
              />
            }
            label="Workspace ativo"
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.is_hidden}
                onChange={(_, checked) => setForm((current) => ({ ...current, is_hidden: checked }))}
              />
            }
            label="Ocultar da tela de selecao de workspaces"
          />
        </Stack>
      </FormDialog>
    </Box>
  )
}
