import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import { ArrowRight, Building2, LockKeyhole, LogOut, Rocket, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'
import { buildWorkspaceLoginPath, buildWorkspacePath } from '@/lib/workspace-routing'
import { PILOT_WORKSPACE_SLUG } from '@/lib/workspace-config'
import AppSurface from '@/components/system/AppSurface'
import SectionHeader from '@/components/system/SectionHeader'
import StatusToken from '@/components/system/StatusToken'
import type { WorkspaceQuickEntry } from '@/types'

type Workspace = {
  id: string
  slug: string
  name: string
  description?: string | null
  group_key?: string
  has_access: boolean
  avatar_url?: string | null
}

type WorkspaceGroup = {
  key: string
  label: string
  description?: string | null
}

type AuthWithWorkspace = {
  currentUser: { avatar_url?: string | null; name?: string | null; email?: string | null } | null
  getAuthHeaders: () => Record<string, string>
  switchWorkspace: (slug: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (role: string) => boolean
}

type PublicWorkspaceResponse = {
  groups: WorkspaceGroup[]
  workspaces: Workspace[]
}

export default function Workspaces() {
  const navigate = useNavigate()
  const { currentUser, getAuthHeaders, switchWorkspace, logout, hasRole } = useAuth() as unknown as AuthWithWorkspace
  const [data, setData] = useState<PublicWorkspaceResponse>({ groups: [], workspaces: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(apiUrl('/api/auth/public-workspaces'), {
        headers: currentUser ? getAuthHeaders() : { 'Content-Type': 'application/json' },
      })
      const body = (await response.json().catch(() => null)) as PublicWorkspaceResponse | { error?: string } | null
      if (!response.ok || !body || !('groups' in body)) {
        throw new Error((body as { error?: string } | null)?.error || 'Falha ao carregar os workspaces.')
      }
      setData(body)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar os workspaces.')
    } finally {
      setLoading(false)
    }
  }, [currentUser, getAuthHeaders])

  useEffect(() => {
    void fetchWorkspaces()
  }, [fetchWorkspaces])

  const groupedWorkspaces = useMemo(() => {
    return data.groups.map((group) => ({
      group,
      workspaces: data.workspaces.filter((workspace) => workspace.group_key === group.key),
    }))
  }, [data.groups, data.workspaces])

  const pilotWorkspace = useMemo(
    () => data.workspaces.find((workspace) => workspace.slug === PILOT_WORKSPACE_SLUG) ?? null,
    [data.workspaces],
  )

  const adminPath = useMemo(
    () => buildWorkspacePath(PILOT_WORKSPACE_SLUG, '/configuracoes/administracao'),
    [],
  )
  const adminLoginPath = useMemo(
    () => buildWorkspaceLoginPath(PILOT_WORKSPACE_SLUG, adminPath),
    [adminPath],
  )

  const quickEntries = useMemo<WorkspaceQuickEntry[]>(() => {
    const pilotHref =
      currentUser && pilotWorkspace?.has_access
        ? buildWorkspacePath(PILOT_WORKSPACE_SLUG)
        : buildWorkspaceLoginPath(PILOT_WORKSPACE_SLUG, buildWorkspacePath(PILOT_WORKSPACE_SLUG))

    const isAdmin = hasRole('admin')
    const adminDisabled = Boolean(currentUser && !isAdmin)

    return [
      {
        key: 'pilot',
        title: 'Sistema Piloto',
        description:
          'Entre direto no workspace piloto para continuar usando a operação já lançada enquanto o funil unificado evolui.',
        href: pilotHref,
        cta: currentUser && pilotWorkspace?.has_access ? 'Abrir piloto' : 'Entrar no piloto',
        badge: pilotWorkspace?.has_access ? 'Acesso liberado' : 'Workspace piloto',
      },
      {
        key: 'admin',
        title: 'Painel Administrativo',
        description: currentUser
          ? isAdmin
            ? 'Acesso direto às configurações administrativas dentro do contexto do workspace piloto.'
            : 'Visível para manter o caminho claro, mas disponível apenas para perfis administrativos.'
          : 'Faça login no workspace piloto e siga direto para a área administrativa enquanto o SSO unificado não entra no ar.',
        href: currentUser && isAdmin ? adminPath : adminLoginPath,
        cta: currentUser
          ? isAdmin
            ? 'Abrir painel'
            : 'Restrito ao admin'
          : 'Login administrativo',
        disabled: adminDisabled,
        badge: currentUser
          ? isAdmin
            ? 'Admin'
            : 'Sem permissão'
          : 'Acesso guiado',
      },
    ]
  }, [adminLoginPath, adminPath, currentUser, hasRole, pilotWorkspace])

  const handleOpenWorkspace = useCallback(
    async (workspace: Workspace) => {
      if (currentUser && workspace.has_access) {
        await switchWorkspace(workspace.slug)
        return
      }

      navigate(buildWorkspaceLoginPath(workspace.slug, buildWorkspacePath(workspace.slug)))
    },
    [currentUser, navigate, switchWorkspace],
  )

  const handleQuickEntry = useCallback(
    async (entry: WorkspaceQuickEntry) => {
      if (entry.disabled) return

      if (entry.key === 'pilot' && currentUser && pilotWorkspace?.has_access) {
        await switchWorkspace(PILOT_WORKSPACE_SLUG)
        return
      }

      navigate(entry.href)
    },
    [currentUser, navigate, pilotWorkspace?.has_access, switchWorkspace],
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
      <Box sx={{ maxWidth: 1360, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'flex-start' }} justifyContent="space-between" sx={{ mb: 3 }}>
          <Box sx={{ maxWidth: 760 }}>
            <SectionHeader
              title="Escolha por onde entrar"
              description="Use o acesso rápido para cair direto no Sistema Piloto ou no Painel Administrativo. Abaixo, o catálogo completo continua disponível por workspace."
              sx={{ pb: 0 }}
            />
          </Box>

          <AppSurface sx={{ minWidth: { lg: 360 }, alignSelf: 'stretch' }}>
            {currentUser ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar src={currentUser.avatar_url ?? undefined}>
                  {currentUser.name?.[0]?.toUpperCase() ?? '?'}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {currentUser.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {currentUser.email}
                  </Typography>
                </Box>
                <Button
                  variant="text"
                  color="inherit"
                  startIcon={<LogOut size={16} />}
                  onClick={() => void logout()}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Sair
                </Button>
              </Stack>
            ) : (
              <Stack spacing={0.75}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Acesso por área
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecione um workspace para entrar no contexto correto do sistema.
                </Typography>
              </Stack>
            )}
          </AppSurface>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={34} />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            <AppSurface surface="subtle" sx={{ overflow: 'hidden' }}>
              <SectionHeader
                title="Acessos rápidos"
                description="Atalhos para a operação principal do momento: o Sistema Piloto e o caminho administrativo enquanto o SSO unificado ainda não está pronto."
                sx={{ pb: 2 }}
              />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2,
                }}
              >
                {quickEntries.map((entry) => {
                  const isPilot = entry.key === 'pilot'
                  const Icon = isPilot ? Rocket : ShieldCheck

                  return (
                    <Box key={entry.key}>
                      <AppSurface
                        surface={entry.disabled ? 'subtle' : 'interactive'}
                        sx={{
                          height: '100%',
                          opacity: entry.disabled ? 0.82 : 1,
                          borderColor: !entry.disabled ? 'primary.main' : 'divider',
                        }}
                      >
                        <Stack spacing={1.5} sx={{ height: '100%' }}>
                          <Stack direction="row" spacing={1.25} alignItems="flex-start" justifyContent="space-between">
                            <Box
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 'var(--radius-sm)',
                                bgcolor: isPilot ? 'primary.light' : 'action.hover',
                                color: isPilot ? 'primary.main' : 'text.primary',
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Icon size={18} />
                            </Box>
                            <StatusToken tone={entry.disabled ? 'neutral' : 'info'}>
                              {entry.badge}
                            </StatusToken>
                          </Stack>

                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h5" sx={{ mb: 0.45 }}>
                              {entry.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                              {entry.description}
                            </Typography>
                          </Box>

                          <Box sx={{ mt: 'auto' }}>
                            <Button
                              fullWidth
                              variant={entry.disabled ? 'outlined' : 'contained'}
                              color={isPilot ? 'primary' : 'secondary'}
                              disabled={entry.disabled}
                              onClick={() => void handleQuickEntry(entry)}
                              endIcon={entry.disabled ? <LockKeyhole size={16} /> : <ArrowRight size={16} />}
                              sx={{ justifyContent: 'space-between' }}
                            >
                              {entry.cta}
                            </Button>
                          </Box>
                        </Stack>
                      </AppSurface>
                    </Box>
                  )
                })}
              </Box>
            </AppSurface>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: `repeat(${Math.max(1, groupedWorkspaces.length)}, minmax(0, 1fr))` },
                gap: 2,
                alignItems: 'start',
              }}
            >
              {groupedWorkspaces.map(({ group, workspaces }) => (
                <AppSurface key={group.key} sx={{ p: 0, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1.75 }}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--radius-sm)',
                          bgcolor: 'action.hover',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'primary.main',
                        }}
                      >
                        <Building2 size={18} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6">{group.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {workspaces.length} workspace{workspaces.length === 1 ? '' : 's'}
                        </Typography>
                      </Box>
                    </Stack>

                    {group.description ? (
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mt: 1.25 }}>
                        {group.description}
                      </Typography>
                    ) : null}
                  </Box>

                  <Divider />

                  <Stack spacing={1} sx={{ p: 1.5 }}>
                    {workspaces.map((workspace) => (
                      <AppSurface
                        key={workspace.id}
                        surface={workspace.has_access ? 'interactive' : 'default'}
                        sx={{
                          p: 1.5,
                          borderColor: workspace.has_access ? 'primary.main' : 'divider',
                        }}
                      >
                        <Stack spacing={1.25}>
                          <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                                {workspace.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                /{workspace.slug}
                              </Typography>
                            </Box>
                            <StatusToken tone={workspace.has_access ? 'info' : 'neutral'}>
                              {workspace.has_access ? 'Acesso liberado' : 'Solicitar acesso'}
                            </StatusToken>
                          </Stack>

                          <Typography variant="body2" color="text.secondary" sx={{ minHeight: 44, lineHeight: 1.55 }}>
                            {workspace.description || 'Workspace configurável com módulos, títulos e regras próprias.'}
                          </Typography>

                          <Button
                            fullWidth
                            variant={workspace.has_access ? 'contained' : 'outlined'}
                            onClick={() => void handleOpenWorkspace(workspace)}
                            endIcon={<ArrowRight size={16} />}
                            sx={{ justifyContent: 'space-between' }}
                          >
                            {currentUser && workspace.has_access ? 'Entrar agora' : 'Abrir acesso'}
                          </Button>
                        </Stack>
                      </AppSurface>
                    ))}
                  </Stack>
                </AppSurface>
              ))}
            </Box>
          </Stack>
        )}
      </Box>
    </Box>
  )
}
