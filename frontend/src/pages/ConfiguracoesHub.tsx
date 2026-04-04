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
} from '@/compat/mui/material'
import type { Theme } from '@/compat/mui/styles'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'
import { buildWorkspacePath } from '@/lib/workspace-routing'
import { Settings, Security } from '@/components/ui/icons'
import { listWorkspaceVisibleModuleEntries } from '@/features/workspace/module-manifest'

export default function ConfiguracoesHub() {
  const navigate = useNavigate()
  const { currentWorkspace } = useAuth()
  const workspaceSlug = currentWorkspace?.slug ?? null
  const {
    workspace,
    membership,
    modules,
    visibleModuleKeys,
    loading,
    canManageWorkspace,
  } = useWorkspaceContext(workspaceSlug)
  const { members, loading: membersLoading } = useWorkspaceMembers(workspaceSlug, { includeInactive: true })

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
    return listWorkspaceVisibleModuleEntries(visibleModuleKeys)
  }, [visibleModuleKeys])

  if (loading && !workspace) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.75, sm: 2 }, maxWidth: 1120 }}>
      <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            color: 'text.secondary',
            flexShrink: 0,
          }}
        >
          <Settings size={18} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800} letterSpacing="-0.02em" sx={{ fontSize: '1.05rem', lineHeight: 1.25 }}>
            Workspace atual
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
            O que esta ativo nesta workspace e recursos do seu perfil.
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mb: 2 }}>
        <Chip label={workspace?.name ?? currentWorkspace?.name ?? 'Workspace'} />
        {workspace?.slug ? <Chip label={`slug: ${workspace.slug}`} variant="outlined" /> : null}
        {membership?.role_display_name ? <Chip label={membership.role_display_name} variant="outlined" /> : null}
        {canManageWorkspace ? <Chip label="Perfil gerencial" color="success" variant="outlined" /> : null}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 1.5 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1.2 }}>
              Pessoas
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25, lineHeight: 1.15 }}>
              {membersLoading ? '--' : activeMembersCount}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
              ativos nesta workspace
            </Typography>
            {inactiveMembersCount > 0 ? (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }}>
                {inactiveMembersCount} inativos
              </Typography>
            ) : null}
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1, borderRadius: 1.5 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1.2 }}>
              Elementos
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25, lineHeight: 1.15 }}>
              {activeModules.length}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
              modulos habilitados
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {activeMembersCount === 0 ? (
        <Alert severity="error" sx={{ mb: 2, py: 0.75 }}>
          Esta workspace precisa manter ao menos um usuario ativo. Sem isso, os responsaveis locais deixam de funcionar.
        </Alert>
      ) : null}

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.35 }}>
          Modulos e rotas
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, display: 'block', lineHeight: 1.45 }}>
          Um card por elemento habilitado nesta workspace.
        </Typography>

        {visibleModuleCards.length === 0 ? (
          <Alert severity="info" sx={{ py: 0.75 }}>
            Nenhum elemento adicional habilitado.
          </Alert>
        ) : (
          <Stack spacing={1.25}>
            {visibleModuleCards.map((card) => {
              const content = (
                <CardContent sx={{ display: 'flex', gap: 1.5, py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" sx={{ mb: 0.35 }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.9rem' }}>
                        {card.title}
                      </Typography>
                      <Chip label="Ativo nesta workspace" size="small" color="success" variant="outlined" />
                      {card.managerialOnly ? (
                        <Chip label="Gestao gerencial" size="small" variant="outlined" />
                      ) : null}
                      {card.maintenance ? (
                        <Chip label="Interface em manutencao" size="small" color="warning" variant="outlined" />
                      ) : null}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, display: 'block' }}>
                      {card.description}
                    </Typography>
                  </Box>
                </CardContent>
              )

              const canOpen = Boolean(card.entryPath) && (!card.managerialOnly || canManageWorkspace)

              return (
                <Card
                  key={card.key}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:hover': canOpen
                      ? {
                          borderColor: 'var(--border-strong)',
                          boxShadow: (theme: Theme) =>
                            theme.palette.mode === 'light' ? '0 8px 24px rgba(15,23,42,0.08)' : 8,
                        }
                      : undefined,
                  }}
                >
                  {canOpen ? (
                    <CardActionArea
                      onClick={() => navigate(buildWorkspacePath(workspaceSlug, card.entryPath ?? '/'))}
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
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
          Gestao
        </Typography>
        {canManageWorkspace ? (
          <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
            <CardActionArea onClick={() => navigate(buildWorkspacePath(workspaceSlug, '/configuracoes/administracao'))}>
              <CardContent sx={{ display: 'flex', gap: 1.5, py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.25,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                    color: 'text.secondary',
                  }}
                >
                  <Security size={18} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" sx={{ mb: 0.25 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Administracao
                    </Typography>
                    <Chip label="Membros" size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, display: 'block' }}>
                    Membros da workspace; admin global: cargos, permissoes e conquistas.
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ) : (
          <Alert severity="info" sx={{ py: 0.75 }}>
            Seu perfil atual pode visualizar os elementos ativos desta workspace, mas a gestao de membros exige perfil gerencial.
          </Alert>
        )}
      </Box>
    </Box>
  )
}
