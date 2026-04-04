import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@/compat/mui/material'
import { alpha, type Theme } from '@/compat/mui/styles'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  LockKeyhole,
  LogOut,
  Rocket,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import AppSurface from '@/components/system/AppSurface'
import SectionHeader from '@/components/system/SectionHeader'
import StatusToken from '@/components/system/StatusToken'
import { apiUrl } from '@/lib/api'
import { buildAdminLoginPath } from '@/lib/admin-routing'
import { buildWorkspaceLoginPath, buildWorkspacePath } from '@/lib/workspace-routing'
import { PILOT_WORKSPACE_SLUG } from '@/lib/workspace-config'
import type { WorkspaceQuickEntry } from '@/types'
import { WorkspacePublicLanding } from '@/components/marketing/WorkspacePublicLanding'
import { WorkspaceLoginPanel } from '@/components/auth/WorkspaceLoginPanel'

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

function workspaceTagline(workspace: { slug: string; description?: string | null }): string {
  if (workspace.slug === PILOT_WORKSPACE_SLUG) {
    return 'Ambiente de referencia da Central de Tarefas, alinhado a operacao atual da base.'
  }
  return workspace.description?.trim() || 'Workspace com modulos e regras proprias.'
}

const GUEST_CATALOG_HISTORY_KEY = 'cdtGuestCatalog'

export default function Workspaces() {
  const navigate = useNavigate()
  const { currentUser, getAuthHeaders, switchWorkspace, logout, hasRole } = useAuth() as unknown as AuthWithWorkspace
  const [data, setData] = useState<PublicWorkspaceResponse>({ groups: [], workspaces: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const selectorRef = useRef<HTMLDivElement | null>(null)
  const [guestStep, setGuestStep] = useState<'landing' | 'workspaces'>('landing')
  const [guestSelectedSlug, setGuestSelectedSlug] = useState<string | null>(null)

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

  useEffect(() => {
    if (currentUser) return
    const onPop = () => {
      setGuestSelectedSlug(null)
      setGuestStep((prev) => (prev === 'workspaces' ? 'landing' : prev))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [currentUser])

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

  const adminPath = '/admin'
  const adminLoginPath = buildAdminLoginPath('/admin')

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
        title: 'Workspace principal',
        description:
          'Acesse o workspace de referencia da Central para continuar na operacao principal ja alinhada a base atual.',
        href: pilotHref,
        cta: currentUser && pilotWorkspace?.has_access ? 'Abrir workspace' : 'Entrar',
        badge: pilotWorkspace?.has_access ? 'Acesso liberado' : 'Referencia',
      },
      {
        key: 'admin',
        title: 'Painel Administrativo',
        description: currentUser
          ? isAdmin
            ? 'Acesso central para criar workspaces e controlar os modulos ativos ou desligados em cada contexto.'
            : 'Visivel para manter o caminho claro, mas disponivel apenas para perfis administrativos.'
          : 'Entre com um usuario administrador e abra o painel global sem depender de uma workspace operacional.',
        href: currentUser && isAdmin ? adminPath : adminLoginPath,
        cta: currentUser
          ? isAdmin
            ? 'Abrir painel global'
            : 'Restrito ao admin'
          : 'Login administrativo',
        disabled: adminDisabled,
        badge: currentUser
          ? isAdmin
            ? 'Admin'
            : 'Sem permissao'
          : 'Acesso guiado',
      },
    ]
  }, [adminLoginPath, currentUser, hasRole, pilotWorkspace])

  const handleOpenWorkspace = useCallback(
    async (workspace: Workspace) => {
      if (currentUser && workspace.has_access) {
        await switchWorkspace(workspace.slug)
        return
      }

      if (!currentUser && guestStep === 'workspaces') {
        setGuestSelectedSlug(workspace.slug)
        return
      }

      navigate(buildWorkspaceLoginPath(workspace.slug, buildWorkspacePath(workspace.slug)))
    },
    [currentUser, guestStep, navigate, switchWorkspace],
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
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage: currentUser
          ? 'none'
          : 'none',
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
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
          <Stack spacing={3}>
            {currentUser ? (
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: 'column', lg: 'row' }}
                  spacing={2}
                  alignItems={{ lg: 'flex-start' }}
                  justifyContent="space-between"
                >
                  <Box sx={{ maxWidth: 760 }}>
                    <SectionHeader
                      title="Acesso por workspace"
                      description="Seu perfil ja esta identificado. Escolha o contexto operacional ou siga para a administracao global de acordo com a sua permissao."
                      sx={{ pb: 0 }}
                    />
                  </Box>

                  <AppSurface sx={{ minWidth: { lg: 360 }, alignSelf: 'stretch' }}>
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
                  </AppSurface>
                </Stack>

                <AppSurface surface="subtle" sx={{ overflow: 'hidden' }}>
                  <SectionHeader
                    title="Atalhos do seu perfil"
                    description="Continue pelo workspace principal ou abra o painel global se este for o seu contexto de trabalho."
                    sx={{ pb: 2 }}
                  />

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 2,
                    }}
                  >
                    {quickEntries.map((entry) => {
                      const isPilot = entry.key === 'pilot'
                      const Icon = isPilot ? Rocket : ShieldCheck

                      return (
                        <AppSurface
                          key={entry.key}
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
                              <StatusToken tone={entry.disabled ? 'neutral' : 'info'}>{entry.badge}</StatusToken>
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
                      )
                    })}
                  </Box>
                </AppSurface>
              </Stack>
            ) : guestStep === 'landing' ? (
              <WorkspacePublicLanding
                workspaceCount={data.workspaces.length}
                groupCount={data.groups.length}
                onAccessWorkspaces={() => {
                  window.history.pushState({ [GUEST_CATALOG_HISTORY_KEY]: true }, '', window.location.href)
                  setGuestStep('workspaces')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                onAdminAccess={() => navigate(adminLoginPath)}
              />
            ) : (
              <Box sx={{ mb: 0.5 }}>
                <Button
                  variant="text"
                  color="inherit"
                  size="small"
                  startIcon={<ArrowLeft size={18} />}
                  onClick={() => {
                    if (guestSelectedSlug) {
                      setGuestSelectedSlug(null)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                      return
                    }
                    setGuestSelectedSlug(null)
                    const st = window.history.state as Record<string, unknown> | null
                    if (st?.[GUEST_CATALOG_HISTORY_KEY]) {
                      window.history.back()
                    } else {
                      setGuestStep('landing')
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Voltar
                </Button>
              </Box>
            )}

            {(() => {
              const compactLeftColumn = Boolean(!currentUser && guestSelectedSlug)

              const sectionShellSx = {
                scrollMarginTop: { xs: 24, md: 32 },
                outline: 'none',
                '&:focus-visible': {
                  outline: (theme: Theme) => `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 8,
                  borderRadius: 'var(--radius-md)',
                },
              } as const

              const catalogInner = (
                <>
                  <SectionHeader
                    title={currentUser ? 'Catalogo de workspaces' : 'Workspaces disponiveis'}
                    description={
                      currentUser
                        ? 'Escolha o contexto operacional disponivel para o seu perfil ou troque de area quando precisar.'
                        : compactLeftColumn
                          ? undefined
                          : guestSelectedSlug
                            ? 'Troque de workspace na lista quando precisar; o login permanece neste painel.'
                            : 'Selecione o sistema da sua area. Ao continuar, o login abre ao lado.'
                    }
                    sx={{ pb: compactLeftColumn ? 1 : 2 }}
                  />

                  <AppSurface
                    surface="default"
                    sx={{
                      p: 0,
                      overflow: 'hidden',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {groupedWorkspaces.map(({ group, workspaces }, groupIndex) => (
                      <Box key={group.key}>
                        {groupIndex > 0 ? <Divider /> : null}
                        <Box
                          sx={(theme: Theme) => ({
                            px: compactLeftColumn ? 1.25 : 2,
                            py: compactLeftColumn ? 0.65 : 1.25,
                            borderLeft: `3px solid ${theme.palette.primary.main}`,
                            bgcolor: theme.palette.action.hover,
                          })}
                        >
                          <Stack direction="row" alignItems="center" spacing={compactLeftColumn ? 0.65 : 1} sx={{ minWidth: 0 }}>
                            <Building2
                              size={compactLeftColumn ? 14 : 17}
                              strokeWidth={2}
                              style={{ flexShrink: 0, opacity: 0.85 }}
                            />
                            {compactLeftColumn ? (
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.8125rem',
                                  lineHeight: 1.25,
                                  minWidth: 0,
                                }}
                                noWrap
                              >
                                {group.label}
                              </Typography>
                            ) : (
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                                  {group.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {workspaces.length} workspace{workspaces.length === 1 ? '' : 's'}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                          {!compactLeftColumn && group.description ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mt: 0.75, display: 'block', lineHeight: 1.5 }}
                            >
                              {group.description}
                            </Typography>
                          ) : null}
                        </Box>

                        {workspaces.length === 0 ? (
                          <Box sx={{ px: 2, py: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
                              Nenhum workspace publico nesta area por enquanto. A estrutura aparece para voce localizar a
                              familia quando novos contextos forem publicados.
                            </Typography>
                          </Box>
                        ) : (
                          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                            {workspaces.map((workspace, wsIndex) => {
                              const rowSelected = Boolean(!currentUser && guestSelectedSlug === workspace.slug)
                              const blurb = workspaceTagline(workspace)
                              const cta = currentUser && workspace.has_access ? 'Entrar' : 'Continuar'

                              return (
                                <Box component="li" key={workspace.id} sx={{ display: 'block' }}>
                                  {wsIndex > 0 ? <Divider /> : null}
                                  <Box
                                    sx={(theme: Theme) => ({
                                      display: 'flex',
                                      flexWrap: compactLeftColumn ? 'wrap' : 'nowrap',
                                      alignItems: 'center',
                                      gap: compactLeftColumn ? 1 : 1.5,
                                      px: compactLeftColumn ? 1.25 : 2,
                                      py: compactLeftColumn ? 1 : 1.35,
                                      transition: 'background-color 0.15s ease, border-color 0.15s ease',
                                      borderLeft: '3px solid',
                                      borderLeftColor: rowSelected ? theme.palette.primary.main : 'transparent',
                                      bgcolor: rowSelected
                                        ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08)
                                        : 'transparent',
                                      '&:hover': {
                                        bgcolor: rowSelected
                                          ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1)
                                          : alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.5 : 0.65),
                                      },
                                    })}
                                  >
                                    <Avatar
                                      src={workspace.avatar_url ?? undefined}
                                      alt=""
                                      variant="rounded"
                                      sx={{
                                        width: compactLeftColumn ? 32 : 40,
                                        height: compactLeftColumn ? 32 : 40,
                                        fontSize: compactLeftColumn ? '0.75rem' : '0.875rem',
                                        fontWeight: 700,
                                        flexShrink: 0,
                                        borderRadius: 'var(--radius-sm)',
                                      }}
                                    >
                                      {workspace.name?.[0]?.toUpperCase() ?? '?'}
                                    </Avatar>

                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'baseline',
                                          gap: 0.75,
                                          minWidth: 0,
                                        }}
                                      >
                                        <Typography component="span" variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                                          {workspace.name}
                                        </Typography>
                                        <Typography
                                          component="span"
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ fontFamily: 'ui-monospace, monospace', flexShrink: 0 }}
                                          noWrap
                                        >
                                          /{workspace.slug}
                                        </Typography>
                                      </Box>
                                      {!compactLeftColumn ? (
                                        <Tooltip title={blurb} placement="bottom-start" enterDelay={300} disableInteractive>
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                              mt: 0.25,
                                              lineHeight: 1.45,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              display: '-webkit-box',
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: 'vertical',
                                            }}
                                          >
                                            {blurb}
                                          </Typography>
                                        </Tooltip>
                                      ) : null}
                                    </Box>

                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      onClick={() => void handleOpenWorkspace(workspace)}
                                      endIcon={<ArrowRight size={16} strokeWidth={2} />}
                                      sx={(theme: Theme) => ({
                                        flexShrink: compactLeftColumn ? undefined : 0,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        minWidth: compactLeftColumn ? undefined : 108,
                                        width: compactLeftColumn ? '100%' : undefined,
                                        mt: compactLeftColumn ? 0.5 : 0,
                                        px: 1.75,
                                        borderRadius: 'var(--radius-sm)',
                                        borderWidth: 1,
                                        borderColor: alpha(
                                          theme.palette.primary.main,
                                          rowSelected ? 0.65 : theme.palette.mode === 'dark' ? 0.5 : 0.42,
                                        ),
                                        bgcolor: rowSelected
                                          ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.05)
                                          : 'transparent',
                                        boxShadow: 'none',
                                        '&:hover': {
                                          borderColor: theme.palette.primary.main,
                                          bgcolor: alpha(
                                            theme.palette.primary.main,
                                            theme.palette.mode === 'dark' ? 0.16 : 0.08,
                                          ),
                                          boxShadow: 'none',
                                        },
                                      })}
                                    >
                                      {cta}
                                    </Button>
                                  </Box>
                                </Box>
                              )
                            })}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </AppSurface>
                </>
              )

              if (currentUser) {
                return (
                  <Box
                    component="section"
                    ref={selectorRef}
                    tabIndex={-1}
                    sx={{
                      ...sectionShellSx,
                      maxWidth: { xs: '100%', md: 680 },
                    }}
                  >
                    {catalogInner}
                  </Box>
                )
              }

              if (!currentUser && guestStep === 'workspaces') {
                return (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        md: guestSelectedSlug
                          ? 'minmax(280px, min(36vw, 400px)) minmax(0, 1fr)'
                          : 'minmax(0, 680px)',
                      },
                      gap: { xs: 2, md: 3 },
                      width: '100%',
                      maxWidth: guestSelectedSlug ? '100%' : 680,
                      mx: 'auto',
                      alignItems: 'start',
                    }}
                  >
                    <Box
                      component="section"
                      ref={selectorRef}
                      tabIndex={-1}
                      sx={{
                        ...sectionShellSx,
                        width: '100%',
                        minWidth: 0,
                        justifySelf: guestSelectedSlug ? 'stretch' : { md: 'center' },
                        maxWidth: guestSelectedSlug ? undefined : { md: 680 },
                      }}
                    >
                      {catalogInner}
                    </Box>
                    {guestSelectedSlug ? (
                      <Box
                        sx={{
                          width: '100%',
                          minWidth: 0,
                          position: { md: 'sticky' },
                          top: { md: 24 },
                        }}
                      >
                        <WorkspaceLoginPanel
                          key={guestSelectedSlug}
                          workspaceSlug={guestSelectedSlug}
                          variant="embedded"
                        />
                      </Box>
                    ) : null}
                  </Box>
                )
              }

              return null
            })()}
          </Stack>
        )}
      </Box>
    </Box>
  )
}
