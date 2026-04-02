import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import AppSurface from '@/components/system/AppSurface'
import { useAuth } from '@/contexts/AuthContext'
import { sanitizeAdminReturnTo } from '@/lib/admin-routing'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser, hasRole, isLoading, login, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const returnTo = useMemo(
    () => sanitizeAdminReturnTo(searchParams.get('returnTo')),
    [searchParams],
  )

  useEffect(() => {
    if (!isLoading && currentUser && hasRole('admin')) {
      navigate(returnTo, { replace: true })
    }
  }, [currentUser, hasRole, isLoading, navigate, returnTo])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login(email, password)
      navigate(returnTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao autenticar no painel administrativo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage:
          'radial-gradient(circle at top left, rgba(22, 163, 74, 0.08), transparent 36%), radial-gradient(circle at bottom right, rgba(15, 118, 110, 0.08), transparent 28%)',
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="stretch">
          <AppSurface surface="raised" sx={{ flex: 1.1 }}>
            <Stack spacing={2}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--radius-sm)',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'action.hover',
                  color: 'primary.main',
                }}
              >
                <ShieldCheck size={22} />
              </Box>

              <Box>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                  Painel Administrativo Global
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Gerencie workspaces, ligue ou desligue modulos por workspace e mantenha o catalogo central do CDT sob
                  um unico acesso administrativo.
                </Typography>
              </Box>

              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Este acesso nao depende do login de uma workspace especifica.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use seu usuario administrativo ou de desenvolvimento para entrar no painel global.
                </Typography>
              </Stack>
            </Stack>
          </AppSurface>

          <AppSurface surface="default" sx={{ flex: 0.9 }}>
            {currentUser && !hasRole('admin') ? (
              <Stack spacing={2}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  Conta sem acesso administrativo
                </Typography>
                <Alert severity="warning">
                  Esta sessao esta autenticada, mas nao possui um perfil global para abrir o painel central.
                </Alert>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  <Button component={RouterLink} to="/workspaces" variant="contained">
                    Voltar para workspaces
                  </Button>
                  <Button variant="outlined" onClick={() => void logout()}>
                    Trocar de conta
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack component="form" spacing={2} onSubmit={handleSubmit}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.75 }}>
                    Entrar no painel global
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Acesse o controle central sem passar por uma workspace operacional.
                  </Typography>
                </Box>

                {error ? <Alert severity="error">{error}</Alert> : null}

                <TextField
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                  fullWidth
                />

                <TextField
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  fullWidth
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={submitting || !email.trim() || !password}
                  startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <LockKeyhole size={16} />}
                >
                  {submitting ? 'Entrando...' : 'Abrir painel global'}
                </Button>

                <Button component={RouterLink} to="/workspaces" variant="text" color="inherit">
                  Voltar para workspaces
                </Button>
              </Stack>
            )}
          </AppSurface>
        </Stack>
      </Box>
    </Box>
  )
}
