import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { ArrowLeft, Building2, Info, Lock, Moon, Send, Sun, Unlock, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useThemeMode } from '@/theme/ThemeProvider'
import { apiUrl } from '@/lib/api'
import { buildWorkspacePath, sanitizeWorkspaceReturnTo } from '@/lib/workspace-routing'
import { fetchCentralSsoConfig, startCentralSso, type CentralSsoConfig } from '@/lib/central-sso'
import { useWorkspaceAccess } from '@/hooks/use-workspace-access'
import AppSurface from '@/components/system/AppSurface'
import SectionHeader from '@/components/system/SectionHeader'
import StatusToken from '@/components/system/StatusToken'
type Workspace = {
  id: string
  slug: string
  name: string
  description?: string | null
  role_display_name?: string | null
}

const LOGIN_REMEMBER_KEY = 'cdt-login-remember-30d'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const EMAIL_LOOKS_VALID = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type PublicWorkspaceResponse = {
  workspaces: Workspace[]
}

type LoginLocationState = {
  returnTo?: string
  accessStatus?: 'pending' | 'blocked' | 'not_found' | 'error'
  accessMessage?: string
} | null

export default function Login() {
  const { workspaceSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login, currentUser } = useAuth()
  const { mode, toggleTheme } = useThemeMode()
  const isLight = mode === 'light'

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [centralSsoConfig, setCentralSsoConfig] = useState<CentralSsoConfig | null>(null)
  const [centralSsoLoading, setCentralSsoLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberFor30d, setRememberFor30d] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [firstAccessByHint, setFirstAccessByHint] = useState(false)
  const [hintChecking, setHintChecking] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [requestMode, setRequestMode] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [requestSuccess, setRequestSuccess] = useState('')
  const locationState = location.state as LoginLocationState
  const workspaceAccess = useWorkspaceAccess(workspaceSlug)

  const workspaceRootPath = useMemo(() => buildWorkspacePath(workspaceSlug), [workspaceSlug])
  const returnTo = useMemo(
    () =>
      sanitizeWorkspaceReturnTo(searchParams.get('returnTo') ?? locationState?.returnTo ?? null, workspaceSlug) ??
      workspaceRootPath,
    [locationState?.returnTo, searchParams, workspaceRootPath, workspaceSlug],
  )

  useEffect(() => {
    if (!workspaceSlug) {
      navigate('/workspaces', { replace: true })
    }
  }, [navigate, workspaceSlug])

  useEffect(() => {
    if (!workspaceSlug) return

    let mounted = true
    const run = async () => {
      try {
        setWorkspaceLoading(true)
        const response = await fetch(apiUrl('/api/auth/public-workspaces'))
        const body = (await response.json().catch(() => null)) as PublicWorkspaceResponse | { error?: string } | null
        if (!response.ok || !body || !('workspaces' in body)) {
          throw new Error((body as { error?: string } | null)?.error || 'Falha ao carregar o workspace.')
        }

        const match = body.workspaces.find((item) => item.slug === workspaceSlug) ?? null
        if (!mounted) return

        if (!match) {
          setWorkspaceError('Workspace nao encontrado.')
          setWorkspace(null)
          return
        }

        setWorkspace(match)
        setWorkspaceError(null)
      } catch (err) {
        if (!mounted) return
        setWorkspaceError(err instanceof Error ? err.message : 'Falha ao carregar o workspace.')
      } finally {
        if (mounted) setWorkspaceLoading(false)
      }
    }

    void run()
    return () => {
      mounted = false
    }
  }, [workspaceSlug])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOGIN_REMEMBER_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { email?: string; expiresAt?: number }
      if (!parsed.expiresAt || parsed.expiresAt < Date.now()) {
        localStorage.removeItem(LOGIN_REMEMBER_KEY)
        return
      }
      setEmail(parsed.email ?? '')
      setRememberFor30d(true)
    } catch {
      localStorage.removeItem(LOGIN_REMEMBER_KEY)
    }
  }, [])

  useEffect(() => {
    if (currentUser && workspaceSlug && workspaceAccess.status === 'success') {
      navigate(returnTo, { replace: true })
    }
  }, [currentUser, navigate, returnTo, workspaceAccess.status, workspaceSlug])

  useEffect(() => {
    let mounted = true

    const run = async () => {
      try {
        const config = await fetchCentralSsoConfig()
        if (!mounted) return
        setCentralSsoConfig(config)
      } catch {
        if (mounted) {
          setCentralSsoConfig(null)
        }
      } finally {
        if (mounted) {
          setCentralSsoLoading(false)
        }
      }
    }

    void run()

    return () => {
      mounted = false
    }
  }, [])

  const fetchFirstAccessHint = useCallback(async (targetEmail: string) => {
    const normalized = targetEmail.trim().toLowerCase()
    if (!normalized || !EMAIL_LOOKS_VALID.test(normalized)) {
      setFirstAccessByHint(false)
      return
    }
    setHintChecking(true)
    try {
      const res = await fetch(apiUrl('/api/auth/first-access-hint'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      })
      const body = (await res.json().catch(() => ({}))) as { eligible?: boolean }
      const eligible = Boolean(body.eligible)
      setFirstAccessByHint(eligible)
      if (eligible) {
        setPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
        setError('')
      }
    } catch {
      setFirstAccessByHint(false)
    } finally {
      setHintChecking(false)
    }
  }, [])

  const definePasswordMode = firstAccessByHint
  const canSubmitDefine =
    Boolean(email.trim() && newPassword && confirmNewPassword) && newPassword === confirmNewPassword
  const canSubmitLogin = Boolean(email.trim() && password)

  const persistRemember = useCallback(
    () => {
      if (rememberFor30d) {
        localStorage.setItem(
          LOGIN_REMEMBER_KEY,
          JSON.stringify({
            email,
            expiresAt: Date.now() + THIRTY_DAYS_MS,
          }),
        )
      } else {
        localStorage.removeItem(LOGIN_REMEMBER_KEY)
      }
    },
    [email, rememberFor30d],
  )

  const workspaceMeta = useMemo(() => {
    if (!workspace) return null
    return {
      title: workspace.name,
      slug: workspace.slug,
      description:
        workspace.description ||
        'Acesso contextualizado com modulos, titulos e permissoes proprios para este workspace.',
    }
  }, [workspace])

  const centralSsoEnabled = Boolean(centralSsoConfig?.enabled)
  const legacyLoginAvailable = !centralSsoEnabled || Boolean(centralSsoConfig?.allow_legacy_password_login)
  const accessAlert =
    currentUser && workspaceAccess.status !== 'idle' && workspaceAccess.status !== 'loading'
      ? {
          severity:
            workspaceAccess.status === 'blocked' || workspaceAccess.status === 'not_found' || workspaceAccess.status === 'error'
              ? 'warning'
              : 'info',
          message: workspaceAccess.message,
        }
      : locationState?.accessMessage
        ? {
            severity:
              locationState.accessStatus === 'blocked' || locationState.accessStatus === 'not_found' || locationState.accessStatus === 'error'
                ? 'warning'
                : 'info',
            message: locationState.accessMessage,
          }
        : null

  const handleStartCentralSso = useCallback(async () => {
    if (!workspaceSlug) return

    setError('')
    setRequestSuccess('')
    setLoading(true)
    try {
      const response = await startCentralSso({
        workspaceSlug,
        returnTo,
      })
      window.location.assign(response.redirectUrl ?? response.authorize_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao iniciar o SSO central.')
      setLoading(false)
    }
  }, [returnTo, workspaceSlug])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setRequestSuccess('')
    setLoading(true)

    try {
      if (definePasswordMode) {
        if (newPassword.length < 8) {
          setError('Use pelo menos 8 caracteres na senha.')
          return
        }
        if (newPassword !== confirmNewPassword) {
          setError('As senhas nao coincidem.')
          return
        }

        const res = await fetch(apiUrl('/api/auth/set-initial-password'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password: newPassword }),
        })
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setError(body.error || 'Nao foi possivel definir a senha.')
          return
        }

        await login(email, newPassword)
        persistRemember()
        navigate(returnTo, { replace: true })
        return
      }

      await login(email, password)
      persistRemember()
      navigate(returnTo, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao entrar'
      setError(message)
      void fetchFirstAccessHint(email)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestAccess = async () => {
    setError('')
    setRequestSuccess('')

    if (!workspaceSlug) return
    if (!requestName.trim()) {
      setError('Informe seu nome para solicitar acesso.')
      return
    }
    if (!EMAIL_LOOKS_VALID.test(email.trim().toLowerCase())) {
      setError('Informe um e-mail valido para a solicitacao.')
      return
    }
    if (password.length < 8) {
      setError('Use uma senha com pelo menos 8 caracteres para criar sua conta.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(apiUrl('/api/auth/request-access'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_slug: workspaceSlug,
          email: email.trim().toLowerCase(),
          name: requestName.trim(),
          password,
          message: requestMessage.trim() || null,
        }),
      })
      const body = (await response.json().catch(() => ({}))) as {
        status?: 'success' | 'pending' | 'blocked' | 'not_found'
        error?: string
      }
      if (!response.ok) {
        throw new Error(body.error || 'Falha ao enviar a solicitacao.')
      }

      if (body.status === 'success') {
        setRequestSuccess(
          currentUser
            ? 'Seu acesso a este workspace já está liberado. Redirecionando...'
            : 'Seu acesso a este workspace já está liberado. Você já pode entrar.'
        )
        setRequestMode(false)
        if (currentUser) {
          navigate(returnTo, { replace: true })
        }
        return
      }

      if (body.status === 'blocked') {
        setError('Seu acesso a este workspace está bloqueado no momento.')
        return
      }

      setRequestSuccess('Solicitação enviada. Assim que ela for aprovada, você poderá entrar neste workspace.')
      setRequestMode(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao solicitar acesso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(320px, 420px) minmax(0, 1fr)' },
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRight: { lg: '1px solid' },
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Button variant="text" color="inherit" startIcon={<ArrowLeft size={16} />} onClick={() => navigate('/workspaces')}>
            Workspaces
          </Button>
          <Tooltip title={isLight ? 'Modo escuro' : 'Modo claro'}>
            <IconButton onClick={toggleTheme} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </IconButton>
          </Tooltip>
        </Stack>

        <SectionHeader
          title="Acesso ao workspace"
          description="Entre com sua conta da plataforma dentro do contexto correto."
          sx={{ pb: 0 }}
        />

        <AppSurface surface="subtle" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              bgcolor: 'action.hover',
              display: 'grid',
              placeItems: 'center',
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            <Building2 size={16} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {workspaceMeta?.title || 'Carregando workspace'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
              {workspaceMeta?.description || 'O acesso e definido por workspace antes do login.'}
            </Typography>
          </Box>
        </AppSurface>

        <Stack spacing={1}>
          <AppSurface compact surface="default">
            <Typography variant="body2" color="text.secondary">
              Login, solicitacao de acesso e definicao de senha inicial usam o mesmo fluxo.
            </Typography>
          </AppSurface>
          <AppSurface compact surface="default">
            <Typography variant="body2" color="text.secondary">
              O contexto do workspace aplica navegacao, modulos e permissoes corretos assim que voce entra.
            </Typography>
          </AppSurface>
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 2.5, md: 4 }, display: 'grid', placeItems: 'center' }}>
        <AppSurface sx={{ width: '100%', maxWidth: 520 }}>
          {workspaceLoading ? (
            <Box sx={{ minHeight: 260, display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={30} />
            </Box>
          ) : workspaceError ? (
            <Alert severity="error">{workspaceError}</Alert>
          ) : (
            <Stack spacing={2.25}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="h3" sx={{ mb: 0.35 }}>
                    {workspaceMeta?.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {requestMode
                      ? 'Envie sua solicitacao para este workspace.'
                      : centralSsoEnabled
                        ? 'SSO central e login legado estao disponiveis neste workspace.'
                        : 'Entre com seu e-mail e senha da plataforma.'}
                  </Typography>
                </Box>
                {workspaceMeta?.slug ? (
                  <Stack spacing={0.75} alignItems="flex-end">
                    <StatusToken tone="neutral">/{workspaceMeta.slug}</StatusToken>
                    {centralSsoEnabled ? <StatusToken tone="info">SSO ativo</StatusToken> : null}
                  </Stack>
                ) : null}
              </Stack>

              {error ? (
                <Alert severity="error" onClose={() => setError('')}>
                  {error}
                </Alert>
              ) : null}

              {requestSuccess ? (
                <Alert severity="success" onClose={() => setRequestSuccess('')}>
                  {requestSuccess}
                </Alert>
              ) : null}

              {accessAlert?.message ? (
                <Alert severity={accessAlert.severity as 'info' | 'warning'}>{accessAlert.message}</Alert>
              ) : null}

              {centralSsoLoading ? (
                <AppSurface surface="subtle" sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Verificando disponibilidade do SSO central...
                  </Typography>
                </AppSurface>
              ) : centralSsoEnabled ? (
                <AppSurface surface="subtle" sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        SSO central
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                        Entre com a identidade central e volte automaticamente para este workspace.
                      </Typography>
                    </Box>
                    <StatusToken tone="info">Primário</StatusToken>
                  </Stack>

                  <Button
                    type="button"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    onClick={() => void handleStartCentralSso()}
                    startIcon={
                      loading ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <Unlock size={18} />
                      )
                    }
                  >
                    {loading ? 'Abrindo SSO...' : 'Entrar com SSO central'}
                  </Button>

                  {legacyLoginAvailable ? (
                    <Typography variant="caption" color="text.secondary">
                      O login por e-mail e senha continua disponivel como fallback legado.
                    </Typography>
                  ) : null}
                </AppSurface>
              ) : null}

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  {requestMode ? (
                    <TextField
                      label="Seu nome"
                      value={requestName}
                      onChange={(event) => setRequestName(event.target.value)}
                      fullWidth
                      disabled={loading}
                    />
                  ) : null}

                  <TextField
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setFirstAccessByHint(false)
                    }}
                    onBlur={() => void fetchFirstAccessHint(email)}
                    fullWidth
                    disabled={loading}
                    InputProps={{
                      endAdornment: hintChecking ? (
                        <InputAdornment position="end">
                          <CircularProgress size={16} />
                        </InputAdornment>
                      ) : undefined,
                    }}
                  />

                  {definePasswordMode && !requestMode ? (
                    <Alert severity="info">
                      Primeiro acesso detectado. Defina a senha forte da sua conta para continuar.
                    </Alert>
                  ) : null}

                  {definePasswordMode && !requestMode ? (
                    <>
                      <TextField
                        label="Nova senha"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        fullWidth
                        disabled={loading}
                      />
                      <TextField
                        label="Confirmar senha"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(event) => setConfirmNewPassword(event.target.value)}
                        fullWidth
                        disabled={loading}
                      />
                    </>
                  ) : (
                    <TextField
                      label={requestMode ? 'Crie sua senha' : 'Senha'}
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      fullWidth
                      disabled={loading}
                    />
                  )}

                  {requestMode ? (
                    <TextField
                      label="Mensagem para aprovacao"
                      value={requestMessage}
                      onChange={(event) => setRequestMessage(event.target.value)}
                      fullWidth
                      multiline
                      minRows={3}
                      disabled={loading}
                    />
                  ) : null}

                  {!requestMode ? (
                    <FormControlLabel
                      sx={{ m: 0 }}
                      control={
                        <Checkbox
                          checked={rememberFor30d}
                          onChange={(event) => setRememberFor30d(event.target.checked)}
                          disabled={loading}
                        />
                      }
                      label="Lembrar meu e-mail por 30 dias neste navegador"
                    />
                  ) : null}

                  <Button
                    type="submit"
                    variant={centralSsoEnabled ? 'outlined' : 'contained'}
                    size="large"
                    disabled={loading || requestMode || (definePasswordMode ? !canSubmitDefine : !canSubmitLogin)}
                    startIcon={
                      loading ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : definePasswordMode ? (
                        <Unlock size={18} />
                      ) : (
                        <Lock size={18} />
                      )
                    }
                  >
                    {loading ? 'Processando...' : definePasswordMode ? 'Definir senha e entrar' : 'Entrar no workspace'}
                  </Button>

                  {requestMode ? (
                    <Button
                      type="button"
                      variant="outlined"
                      disabled={loading}
                      onClick={() => void handleRequestAccess()}
                      startIcon={<Send size={16} />}
                    >
                      Enviar solicitacao
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="text"
                      disabled={loading}
                      onClick={() => setRequestMode(true)}
                      startIcon={<UserPlus size={16} />}
                    >
                      Solicitar cadastro neste workspace
                    </Button>
                  )}

                  {requestMode ? (
                    <Button type="button" variant="text" disabled={loading} onClick={() => setRequestMode(false)}>
                      Voltar ao login
                    </Button>
                  ) : null}
                </Stack>
              </Box>

              <Divider />

              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Info size={16} />
                <Typography variant="body2" color="text.secondary">
                  Voce esta entrando em <strong>{workspaceMeta?.title}</strong>. Se quiser trocar de area, volte para a selecao de workspaces.
                </Typography>
              </Stack>
            </Stack>
          )}
        </AppSurface>
      </Box>
    </Box>
  )
}
