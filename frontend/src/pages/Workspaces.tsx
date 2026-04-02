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
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BarChart2,
  Building2,
  ClipboardList,
  LockKeyhole,
  LogOut,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
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

type StoryCard = {
  icon: LucideIcon
  title: string
  description: string
}

const storyPillars = [
  'Entrada guiada por contexto',
  'Login somente depois da escolha',
  'Operacao, leitura e governanca no mesmo ecossistema',
]

const funnelSteps = [
  {
    title: 'Entenda a Central',
    description: 'A plataforma organiza ferramentas operacionais e gerenciais em workspaces com regras proprias.',
  },
  {
    title: 'Escolha o sistema certo',
    description: 'Voce entra pela area ideal e evita cair em um funil generico antes da hora.',
  },
  {
    title: 'Autentique no proximo passo',
    description: 'O login acontece apenas quando o contexto ja esta definido para a sua jornada.',
  },
]

const toolGroups: StoryCard[] = [
  {
    icon: ClipboardList,
    title: 'Execucao diaria',
    description: 'Projetos, atividades, listas e to-dos vivem no mesmo fluxo para a operacao andar sem trocar de tela.',
  },
  {
    icon: BarChart2,
    title: 'Leitura gerencial',
    description: 'Indicadores, prioridades e visoes de acompanhamento ajudam cada area a decidir com mais clareza.',
  },
  {
    icon: Network,
    title: 'Governanca por workspace',
    description: 'Cada sistema tem modulos, permissoes e acessos proprios, sem misturar administracao com rotina operacional.',
  },
]

export default function Workspaces() {
  const navigate = useNavigate()
  const { currentUser, getAuthHeaders, switchWorkspace, logout, hasRole } = useAuth() as unknown as AuthWithWorkspace
  const [data, setData] = useState<PublicWorkspaceResponse>({ groups: [], workspaces: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const selectorRef = useRef<HTMLDivElement | null>(null)

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
        title: 'Sistema Piloto',
        description:
          'Entre direto no workspace piloto para continuar a operacao principal da Central no contexto que ja esta ativo hoje.',
        href: pilotHref,
        cta: currentUser && pilotWorkspace?.has_access ? 'Abrir piloto' : 'Entrar no piloto',
        badge: pilotWorkspace?.has_access ? 'Acesso liberado' : 'Workspace piloto',
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

  const scrollToSelector = useCallback(() => {
    const target = selectorRef.current
    if (!target) return

    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.requestAnimationFrame(() => {
      target.focus({ preventScroll: true })
    })
  }, [])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage: currentUser
          ? 'none'
          : (theme) =>
              `radial-gradient(circle at top left, ${alpha(theme.palette.primary.main, 0.08)}, transparent 36%),
               radial-gradient(circle at top right, ${alpha(theme.palette.secondary.main, 0.08)}, transparent 28%)`,
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
                    description="Continue pelo piloto ou abra o painel global se este for o seu contexto de trabalho."
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
            ) : (
              <Stack spacing={3}>
                <AppSurface
                  surface="raised"
                  sx={{
                    overflow: 'hidden',
                    p: { xs: 2.5, md: 3.5 },
                    backgroundImage: (theme) =>
                      `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 58%)`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.45fr) minmax(320px, 0.95fr)' },
                      gap: 3,
                      alignItems: 'start',
                    }}
                  >
                    <Stack spacing={2.5}>
                      <Stack spacing={1.25}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                          <Sparkles size={16} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Central de Tarefas
                          </Typography>
                        </Box>

                        <Typography variant="h2" component="h1" sx={{ maxWidth: 620 }}>
                          Entrar no sistema certo comeca pelo contexto.
                        </Typography>

                        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700 }}>
                          A Central organiza operacao, leitura e governanca em workspaces diferentes. Em vez de jogar voce
                          direto no login, ela primeiro apresenta o ecossistema, orienta a escolha do sistema e so depois
                          abre a autenticacao.
                        </Typography>
                      </Stack>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                        <Button
                          variant="contained"
                          size="large"
                          endIcon={<ArrowRight size={16} />}
                          onClick={scrollToSelector}
                        >
                          Escolher sistema
                        </Button>
                        <Button
                          variant="outlined"
                          color="secondary"
                          size="large"
                          onClick={() => navigate(adminLoginPath)}
                        >
                          Acesso administrativo
                        </Button>
                      </Stack>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {storyPillars.map((pillar) => (
                          <StatusToken key={pillar} tone="neutral">
                            {pillar}
                          </StatusToken>
                        ))}
                      </Box>
                    </Stack>

                    <AppSurface
                      surface="subtle"
                      sx={{
                        p: { xs: 2, md: 2.5 },
                        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.76),
                      }}
                    >
                      <Stack spacing={2}>
                        <Typography variant="h5">Como funciona a entrada</Typography>

                        {funnelSteps.map((step, index) => (
                          <Stack key={step.title} direction="row" spacing={1.5} alignItems="flex-start">
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                bgcolor: 'action.hover',
                                color: 'text.primary',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {String(index + 1).padStart(2, '0')}
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>
                                {step.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                {step.description}
                              </Typography>
                            </Box>
                          </Stack>
                        ))}

                        {pilotWorkspace ? (
                          <Box sx={{ pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                            <StatusToken tone="info" sx={{ mb: 1 }}>
                              Sistema piloto ja disponivel
                            </StatusToken>
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                              {pilotWorkspace.name} concentra o fluxo operacional ja em uso enquanto o funil unificado da
                              Central evolui.
                            </Typography>
                          </Box>
                        ) : null}
                      </Stack>
                    </AppSurface>
                  </Box>
                </AppSurface>

                <Box component="section">
                  <SectionHeader
                    title="O que voce encontra aqui"
                    description="A Central separa ferramentas por tipo de trabalho, sem misturar rotina operacional com administracao global."
                  />

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 1.5,
                    }}
                  >
                    {toolGroups.map(({ icon: Icon, title, description }) => (
                      <AppSurface key={title} surface="subtle" compact sx={{ height: '100%' }}>
                        <Stack spacing={1.25}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 'var(--radius-sm)',
                              bgcolor: 'background.paper',
                              color: 'text.primary',
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            <Icon size={18} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.4 }}>
                              {title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                              {description}
                            </Typography>
                          </Box>
                        </Stack>
                      </AppSurface>
                    ))}
                  </Box>
                </Box>

                <Box component="section">
                  <SectionHeader
                    title="Escolha seu caminho"
                    description="Selecione o tipo de entrada agora. O login aparece so na proxima etapa, ja dentro do contexto correto."
                  />

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 2,
                    }}
                  >
                    <AppSurface surface="interactive" sx={{ height: '100%', borderColor: 'primary.main' }}>
                      <Stack spacing={1.5} sx={{ height: '100%' }}>
                        <Stack direction="row" spacing={1.25} alignItems="flex-start" justifyContent="space-between">
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 'var(--radius-sm)',
                              bgcolor: 'primary.light',
                              color: 'primary.main',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Building2 size={18} />
                          </Box>
                          <StatusToken tone="info">Fluxo recomendado</StatusToken>
                        </Stack>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h5" sx={{ mb: 0.45 }}>
                            Entrar por workspace
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                            Veja os sistemas disponiveis por area, escolha o contexto certo e siga para a autenticacao
                            somente depois da selecao.
                          </Typography>
                        </Box>

                        <Box sx={{ mt: 'auto' }}>
                          <Button
                            fullWidth
                            variant="contained"
                            onClick={scrollToSelector}
                            endIcon={<ArrowRight size={16} />}
                            sx={{ justifyContent: 'space-between' }}
                          >
                            Abrir seletor
                          </Button>
                        </Box>
                      </Stack>
                    </AppSurface>

                    <AppSurface sx={{ height: '100%' }}>
                      <Stack spacing={1.5} sx={{ height: '100%' }}>
                        <Stack direction="row" spacing={1.25} alignItems="flex-start" justifyContent="space-between">
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 'var(--radius-sm)',
                              bgcolor: 'action.hover',
                              color: 'text.primary',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <ShieldCheck size={18} />
                          </Box>
                          <StatusToken tone="warning">Uso restrito</StatusToken>
                        </Stack>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h5" sx={{ mb: 0.45 }}>
                            Painel administrativo
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                            Use este caminho apenas para gerenciar workspaces, modulos, catalogo e permissoes da
                            plataforma.
                          </Typography>
                        </Box>

                        <Box sx={{ mt: 'auto' }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            color="secondary"
                            onClick={() => navigate(adminLoginPath)}
                            endIcon={<ArrowRight size={16} />}
                            sx={{ justifyContent: 'space-between' }}
                          >
                            Seguir para login admin
                          </Button>
                        </Box>
                      </Stack>
                    </AppSurface>
                  </Box>

                  {pilotWorkspace ? (
                    <AppSurface
                      compact
                      surface="default"
                      sx={{
                        mt: 2,
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: { xs: 'flex-start', md: 'center' },
                        justifyContent: 'space-between',
                        gap: 1.5,
                      }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-sm)',
                            bgcolor: 'primary.light',
                            color: 'primary.main',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Rocket size={16} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {pilotWorkspace.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Se voce ja sabe o destino, pode seguir direto para o workspace piloto.
                          </Typography>
                        </Box>
                      </Stack>

                      <Button
                        variant="text"
                        color="inherit"
                        onClick={() => void handleOpenWorkspace(pilotWorkspace)}
                        endIcon={<ArrowRight size={16} />}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        Selecionar piloto
                      </Button>
                    </AppSurface>
                  ) : null}
                </Box>
              </Stack>
            )}

            <Box
              component="section"
              ref={selectorRef}
              tabIndex={-1}
              sx={{
                scrollMarginTop: { xs: 24, md: 32 },
                outline: 'none',
                '&:focus-visible': {
                  outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 8,
                  borderRadius: 'var(--radius-md)',
                },
              }}
            >
              <SectionHeader
                title={currentUser ? 'Catalogo de workspaces' : 'Seletor de sistemas'}
                description={
                  currentUser
                    ? 'Escolha o contexto operacional disponivel para o seu perfil ou troque de area quando precisar.'
                    : 'Escolha a area desejada. No proximo passo o sistema pede autenticacao ja dentro do workspace selecionado.'
                }
              />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 2,
                  alignItems: 'start',
                }}
              >
                {groupedWorkspaces.map(({ group, workspaces }) => (
                  <AppSurface key={group.key} sx={{ p: 0, overflow: 'hidden', height: '100%' }}>
                    <Box sx={{ px: 2, py: 1.75 }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
                        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 'var(--radius-sm)',
                              bgcolor: 'action.hover',
                              display: 'grid',
                              placeItems: 'center',
                              color: 'primary.main',
                              flexShrink: 0,
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

                        <StatusToken tone="neutral">
                          {workspaces.length} area{workspaces.length === 1 ? '' : 's'}
                        </StatusToken>
                      </Stack>

                      {group.description ? (
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mt: 1.25 }}>
                          {group.description}
                        </Typography>
                      ) : null}
                    </Box>

                    <Divider />

                    <Stack spacing={1} sx={{ p: 1.5 }}>
                      {workspaces.map((workspace) => {
                        const isPilot = workspace.slug === PILOT_WORKSPACE_SLUG
                        const workspaceTone = isPilot && !currentUser ? 'info' : workspace.has_access ? 'info' : 'neutral'
                        const workspaceLabel = isPilot && !currentUser
                          ? 'Piloto'
                          : workspace.has_access
                            ? 'Acesso liberado'
                            : 'Solicitar acesso'

                        return (
                          <AppSurface
                            key={workspace.id}
                            surface={workspace.has_access || (isPilot && !currentUser) ? 'interactive' : 'default'}
                            sx={{
                              p: 1.5,
                              borderColor: workspace.has_access || (isPilot && !currentUser) ? 'primary.main' : 'divider',
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
                                <StatusToken tone={workspaceTone}>{workspaceLabel}</StatusToken>
                              </Stack>

                              <Typography variant="body2" color="text.secondary" sx={{ minHeight: 44, lineHeight: 1.55 }}>
                                {workspace.description || 'Workspace configuravel com modulos, titulos e regras proprias.'}
                              </Typography>

                              <Button
                                fullWidth
                                variant={workspace.has_access || (isPilot && !currentUser) ? 'contained' : 'outlined'}
                                onClick={() => void handleOpenWorkspace(workspace)}
                                endIcon={<ArrowRight size={16} />}
                                sx={{ justifyContent: 'space-between' }}
                              >
                                {currentUser && workspace.has_access
                                  ? 'Entrar agora'
                                  : isPilot && !currentUser
                                    ? 'Selecionar piloto'
                                    : 'Abrir acesso'}
                              </Button>
                            </Stack>
                          </AppSurface>
                        )
                      })}
                    </Stack>
                  </AppSurface>
                ))}
              </Box>
            </Box>
          </Stack>
        )}
      </Box>
    </Box>
  )
}
