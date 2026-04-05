import { Button, Stack, Typography } from '@/compat/mui/material'
import { RefreshCw } from 'lucide-react'
import AppSurface from '@/components/system/AppSurface'

type ProfileLoadErrorScreenProps = {
  message: string
  onRetry: () => void | Promise<void>
  minHeight?: number | string
}

export function ProfileLoadErrorScreen({
  message,
  onRetry,
  minHeight = '100vh',
}: ProfileLoadErrorScreenProps) {
  return (
    <AppSurface
      surface="subtle"
      sx={{ minHeight, display: 'grid', placeItems: 'center', p: 2 }}
      role="alert"
    >
      <Stack spacing={2} alignItems="center" sx={{ maxWidth: 440, textAlign: 'center' }}>
        <RefreshCw size={20} aria-hidden />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Não foi possível sincronizar seu perfil
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          {message}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Sua sessão na plataforma foi mantida. Quando o servidor responder, você continua de onde parou.
        </Typography>
        <Button variant="contained" onClick={() => void onRetry()}>
          Tentar novamente
        </Button>
      </Stack>
    </AppSurface>
  )
}
