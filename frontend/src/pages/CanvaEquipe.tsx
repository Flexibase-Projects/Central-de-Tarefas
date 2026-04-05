import { lazy, Suspense, useCallback, useRef } from 'react'
import { Alert, Box, CircularProgress, Stack, Typography } from '@/compat/mui/material'
import type { Theme } from '@/compat/mui/styles'
import { PageSyncScreen } from '@/components/system/WorkspaceSyncFeedback'
import { useAuth } from '@/contexts/AuthContext'
import { useTeamCanvas } from '@/hooks/use-team-canvas'

const TeamExcalidrawCanvas = lazy(async () => {
  const mod = await import('@/components/team-canvas/TeamExcalidrawCanvas')
  return { default: mod.TeamExcalidrawCanvas }
})

function emptyContent(): Record<string, unknown> {
  return { elements: [], appState: {} }
}

export default function CanvaEquipe() {
  const { currentWorkspace } = useAuth()
  const workspaceSlug = currentWorkspace?.slug ?? ''
  const { data, loading, saving, error, saveContent } = useTeamCanvas()

  const frozenRef = useRef<{ slug: string; content: Record<string, unknown> }>({
    slug: '',
    content: emptyContent(),
  })

  let rawContentForCanvas = frozenRef.current.content
  if (!loading && data && frozenRef.current.slug !== workspaceSlug) {
    const raw = data.content
    frozenRef.current = {
      slug: workspaceSlug,
      content: raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : emptyContent(),
    }
    rawContentForCanvas = frozenRef.current.content
  } else if (!loading && data && frozenRef.current.slug === workspaceSlug) {
    rawContentForCanvas = frozenRef.current.content
  }

  const handleSceneChange = useCallback(
    (payload: Record<string, unknown>) => {
      saveContent(payload)
    },
    [saveContent],
  )

  if (loading) {
    return (
      <PageSyncScreen
        title="Carregando canva da equipe"
        description="Buscando o quadro desta workspace para voce continuar de onde o time parou."
        minHeight="55vh"
      />
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0, px: { xs: 1.75, sm: 3 }, pt: 2, pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
          Canva em equipe
        </Typography>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mt: 0.35 }}>
          <Typography variant="body2" color="text.secondary">
            Quadro compartilhado desta workspace; alteracoes sao salvas automaticamente.
          </Typography>
          {saving ? (
            <Typography variant="caption" color="text.secondary">
              Salvando...
            </Typography>
          ) : null}
        </Stack>
        {error ? (
          <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
            {error}
          </Alert>
        ) : null}
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          px: { xs: 1.75, sm: 3 },
          pb: { xs: 1.75, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 360,
            overflow: 'hidden',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: (theme: Theme) =>
              theme.palette.mode === 'light' ? '0 4px 12px rgba(15,23,42,0.06)' : '0 4px 12px rgba(0,0,0,0.2)',
            '& .team-excalidraw-root, & .team-excalidraw-root .excalidraw, & .team-excalidraw-root .excalidraw .App': {
              height: '100%',
            },
          }}
        >
          <Suspense
            fallback={
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress size={36} />
              </Box>
            }
          >
            <TeamExcalidrawCanvas
              key={workspaceSlug}
              rawContent={rawContentForCanvas}
              onSceneChange={handleSceneChange}
            />
          </Suspense>
        </Box>
      </Box>
    </Box>
  )
}
