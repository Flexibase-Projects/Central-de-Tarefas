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
import { ArrowRight, Building2, LogOut } from 'lucide-react'
import type { Workspace, WorkspaceGroup } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { getApiBase } from '@/lib/api'
import { buildWorkspacePath } from '@/lib/workspace-routing'
import AppSurface from '@/components/system/AppSurface'
import SectionHeader from '@/components/system/SectionHeader'
import StatusToken from '@/components/system/StatusToken'

const API_URL = getApiBase()

type PublicWorkspaceResponse = {
  groups: WorkspaceGroup[]
  workspaces: Workspace[]
}

export default function Workspaces() {
  const navigate = useNavigate()
  const { currentUser, getAuthHeaders, switchWorkspace, logout } = useAuth()
  const [data, setData] = useState<PublicWorkspaceResponse>({ groups: [], workspaces: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/api/auth/public-workspaces`, {
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

  const handleOpenWorkspace = useCallback(
    async (workspace: Workspace) => {
      if (currentUser && workspace.has_access) {
        await switchWorkspace(workspace.slug)
        navigate(buildWorkspacePath(workspace.slug), { replace: true })
        return
      }

      navigate(`/w/${workspace.slug}/login`)
    },
    [currentUser, navigate, switchWorkspace],
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
      <Box sx={{ maxWidth: 1360, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'flex-start' }} justifyContent="space-between" sx={{ mb: 3 }}>
          <Box sx={{ maxWidth: 760 }}>
            <SectionHeader
              title="Selecionar workspace"
              description="Escolha o contexto de trabalho. Cada workspace aplica módulos, títulos e permissões próprios."
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
                  Acesso por area
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
                          {workspace.description || 'Workspace configuravel com modulos, titulos e regras proprios.'}
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
        )}
      </Box>
    </Box>
  )
}
