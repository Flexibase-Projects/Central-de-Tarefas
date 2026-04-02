import { useEffect, useState } from 'react'
import { Collapse, LinearProgress, Stack, Typography } from '@mui/material'
import { RefreshCw } from 'lucide-react'
import AppSurface from '@/components/system/AppSurface'

interface PageSyncScreenProps {
  title?: string
  description?: string
  minHeight?: number | string
}

interface WorkspaceSyncBannerProps {
  active: boolean
  title?: string
  description?: string
  delayMs?: number
}

const DEFAULT_TITLE = 'Sincronizando dados do workspace'
const DEFAULT_DESCRIPTION =
  'Estamos atualizando as informacoes mais recentes para voce seguir com contexto e sem perder o ritmo.'

export function PageSyncScreen({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  minHeight = 320,
}: PageSyncScreenProps) {
  return (
    <AppSurface
      surface="subtle"
      sx={{
        minHeight,
        display: 'grid',
        placeItems: 'center',
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Stack spacing={1.5} alignItems="center" sx={{ maxWidth: 420, textAlign: 'center' }}>
        <RefreshCw size={18} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          {description}
        </Typography>
        <LinearProgress sx={{ width: '100%', borderRadius: 999 }} />
      </Stack>
    </AppSurface>
  )
}

export function WorkspaceSyncBanner({
  active,
  title = DEFAULT_TITLE,
  description = 'Os dados continuam visiveis enquanto terminamos a sincronizacao em segundo plano.',
  delayMs = 350,
}: WorkspaceSyncBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return
    }

    const timer = window.setTimeout(() => setVisible(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [active, delayMs])

  return (
    <Collapse in={visible} unmountOnExit>
      <AppSurface
        surface="interactive"
        compact
        role="status"
        aria-live="polite"
        aria-busy={active}
        sx={{ overflow: 'hidden' }}
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <RefreshCw size={16} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {description}
          </Typography>
          <LinearProgress sx={{ borderRadius: 999 }} />
        </Stack>
      </AppSurface>
    </Collapse>
  )
}
