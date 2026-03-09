import { useState, useEffect, useCallback } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useTeamCanvas } from '@/hooks/use-team-canvas'
import { useThemeMode } from '@/theme/ThemeProvider'
import '@excalidraw/excalidraw/index.css'

export default function CanvaEquipe() {
  const [ExcalidrawComponent, setExcalidrawComponent] = useState<React.ComponentType<any> | null>(null)
  useEffect(() => {
    import('@excalidraw/excalidraw').then((mod) => setExcalidrawComponent(() => mod.Excalidraw))
  }, [])
  const { mode } = useThemeMode()
  const { data, loading, saving, error, saveContent } = useTeamCanvas()
  const theme = mode === 'dark' ? 'dark' : 'light'

  const handleChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      saveContent({
        elements: elements as unknown[],
        appState,
      })
    },
    [saveContent]
  )

  const initialData = data?.content && typeof data.content === 'object'
    ? (() => {
        const content = data.content as { elements?: unknown[]; appState?: Record<string, unknown> }
        const rawAppState = content.appState ?? {}
        // Excalidraw espera appState.collaborators como array; ao carregar do backend pode vir como objeto ou undefined
        const appState = {
          ...rawAppState,
          collaborators: Array.isArray(rawAppState.collaborators)
            ? rawAppState.collaborators
            : [],
        }
        return {
          elements: Array.isArray(content.elements) ? content.elements : [],
          appState,
        }
      })()
    : undefined

  if (!ExcalidrawComponent) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography color="text.secondary">Carregando canva...</Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {saving && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: 8,
            right: 16,
            zIndex: 10,
            bgcolor: 'background.paper',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          Salvando...
        </Typography>
      )}
      {error && (
        <Typography variant="caption" color="error" sx={{ position: 'absolute', top: 8, left: 16, zIndex: 10 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ExcalidrawComponent
          initialData={initialData}
          onChange={handleChange}
          theme={theme}
        />
      </Box>
    </Box>
  )
}
