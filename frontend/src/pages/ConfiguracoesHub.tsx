import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'
import { buildWorkspacePath } from '@/lib/workspace-routing'
import { Settings, Security } from '@/components/ui/icons'

type WorkspaceElementCard = {
  key: string
  title: string
  description: string
  path?: string
  managerialOnly?: boolean
  maintenance?: boolean
}

const MODULE_CARDS: Record<string, WorkspaceElementCard> = {
  dashboard: {
    key: 'dashboard',
    title: 'Central de Tarefas',
    description: 'Painel principal da workspace.',
    path: '/',
  },
  projects: {
    key: 'projects',
    title: 'Projetos e prioridades',
    description: 'Mapa, priorizacao e desenvolvimentos desta workspace.',
    path: '/desenvolvimentos',
  },
  activities: {
    key: 'activities',
    title: 'Atividades',
    description: 'Execucao das atividades e atribuicoes locais.',
    path: '/atividades',
  },
  indicators: {
    key: 'indicators',
    title: 'Indicadores',
    description: 'Leituras e comparativos do workspace.',
    path: '/indicadores',
  },
  ranking: {
    key: 'ranking',
    title: 'Ranking',
    description: 'Painel competitivo e acompanhamento de desempenho.',
    path: '/ranking',
  },
  gamification: {
    key: 'gamification',
    title: 'Gamificacao',
    description: 'Conquistas e progressao do workspace.',
    path: '/conquistas',
  },
  teams: {
    key: 'teams',
    title: 'Canva em Equipe',
    description: 'Ferramenta visual compartilhada desta workspace.',
    path: '/canva-equipe',
    maintenance: true,
  },
  org_chart: {
    key: 'org_chart',
    title: 'Organograma',
    description: 'Estrutura de pessoas e responsabilidades da workspace.',
    path: '/organograma',
    managerialOnly: true,
  },
  costs: {
    key: 'costs',
    title: 'Custos',
    description: 'Mapa de departamentos, custos fixos e pessoas da workspace.',
    path: '/custos-departamento',
    managerialOnly: true,
  },
}

export default function ConfiguracoesHub() {
  const navigate = useNavigate()
  const { hasRole } = usePermissions()
  const { currentWorkspace } = useAuth()
  const workspaceSlug = currentWorkspace?.slug ?? null
  const { workspace, membership, modules, loading, isManagerial } = useWorkspaceContext(workspaceSlug)
  const { members, loading: membersLoading } = useWorkspaceMembers(workspaceSlug, { includeInactive: true })
  const isGlobalAdmin = hasRole('admin')

  const activeMembersCount = useMemo(
    () => members.filter((member) => member.is_active).length,
    [members],
  )
  const inactiveMembersCount = Math.max(0, members.length - activeMembersCount)
  const activeModules = useMemo(
    () => modules.filter((module) => module.available && module.is_enabled),
    [modules],
  )
  const visibleModuleCards = useMemo(() => {
    return activeModules
      .map((module) => MODULE_CARDS[module.key])
      .filter((card): card is WorkspaceElementCard => Boolean(card))
  }, [activeModules])

  const canManageWorkspace = isManagerial || isGlobalAdmin

  if (loading && !workspace) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1120 }}>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.08)'),
            color: 'primary.main',
          }}
        >
          <Settings size={22} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
            Workspace atual
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visao centralizada do que esta ativo nesta workspace e dos recursos de gestao disponiveis no seu perfil.
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 3 }}>
        <Chip label={workspace?.name ?? currentWorkspace?.name ?? 'Workspace'} />
        {workspace?.slug ? <Chip label={`slug: ${workspace.slug}`} variant="outlined" /> : null}
        {membership?.role_display_name ? <Chip label={membership.role_display_name} color="primary" variant="outlined" /> : null}
        {canManageWorkspace ? <Chip label="Perfil gerencial" color="success" variant="outlined" /> : null}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Pessoas
            </Typography>
            <Typography variant="h4" fontWeight={800}>
              {membersLoading ? '--' : activeMembersCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              usuarios ativos nesta workspace
            </Typography>
            {inactiveMembersCount > 0 ? (
              <Typography variant="caption" color="text.secondary">
                {inactiveMembersCount} vinculacoes inativas registradas
              </Typography>
            ) : null}
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Elementos ativos
            </Typography>
            <Typography variant="h4" fontWeight={800}>
              {activeModules.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              modulos habilitados para esta workspace
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Organograma, custos, canvas e demais ferramentas agora variam por workspace.
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {activeMembersCount === 0 ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          Esta workspace precisa manter ao menos um usuario ativo. Sem isso, os responsaveis locais deixam de funcionar.
        </Alert>
      ) : null}

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          Elementos ativos nesta workspace
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cada card abaixo representa um elemento local da workspace atual. Nao ha mais compartilhamento automatico com outra workspace.
        </Typography>

        {visibleModuleCards.length === 0 ? (
          <Alert severity="info">Nenhum elemento adicional esta habilitado nesta workspace.</Alert>
        ) : (
          <Stack spacing={2}>
            {visibleModuleCards.map((card) => {
              const content = (
                <CardContent sx={{ display: 'flex', gap: 2, py: 2.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 0.75 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {card.title}
                      </Typography>
                      <Chip label="Ativo nesta workspace" size="small" color="success" variant="outlined" />
                      {card.managerialOnly ? (
                        <Chip label="Gestao gerencial" size="small" color="primary" variant="outlined" />
                      ) : null}
                      {card.maintenance ? (
                        <Chip label="Interface em manutencao" size="small" color="warning" variant="outlined" />
                      ) : null}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {card.description}
                    </Typography>
                  </Box>
                </CardContent>
              )

              const canOpen = Boolean(card.path) && (!card.managerialOnly || canManageWorkspace)

              return (
                <Card
                  key={card.key}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:hover': canOpen
                      ? {
                          borderColor: 'primary.main',
                          boxShadow: (theme) =>
                            theme.palette.mode === 'light' ? '0 8px 24px rgba(15,23,42,0.08)' : 8,
                        }
                      : undefined,
                  }}
                >
                  {canOpen ? (
                    <CardActionArea
                      onClick={() => navigate(buildWorkspacePath(workspaceSlug, card.path ?? '/'))}
                      sx={{ alignItems: 'stretch' }}
                    >
                      {content}
                    </CardActionArea>
                  ) : (
                    content
                  )}
                </Card>
              )
            })}
          </Stack>
        )}
      </Box>

      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          Gestao da workspace
        </Typography>
        {canManageWorkspace ? (
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardActionArea onClick={() => navigate(buildWorkspacePath(workspaceSlug, '/configuracoes/administracao'))}>
              <CardContent sx={{ display: 'flex', gap: 2, py: 2.5 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                    color: 'text.secondary',
                  }}
                >
                  <Security size={22} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Administracao
                    </Typography>
                    <Chip label="Usuarios da workspace" size="small" color="primary" variant="outlined" sx={{ height: 22 }} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Gerencie membros desta workspace sem sair da area de configuracoes. Administradores globais continuam com acesso extra a cargos, permissoes e conquistas.
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ) : (
          <Alert severity="info">
            Seu perfil atual pode visualizar os elementos ativos desta workspace, mas a gestao de membros exige perfil gerencial.
          </Alert>
        )}
      </Box>
    </Box>
  )
}
