import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@/compat/mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppSurface from '@/components/system/AppSurface'
import SectionHeader from '@/components/system/SectionHeader'
import { useAuth } from '@/contexts/AuthContext'
import { exchangeCentralSso, fetchCentralSsoConfig } from '@/lib/central-sso'
import { buildWorkspacePath, sanitizeWorkspaceReturnTo } from '@/lib/workspace-routing'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUserData } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const providerError = searchParams.get('error')
      const providerErrorDescription = searchParams.get('error_description')
      if (providerError) {
        if (!cancelled) {
          setError(providerErrorDescription || providerError || 'O portal central recusou o login.')
        }
        return
      }

      const code = searchParams.get('code')
      const state = searchParams.get('state')
      if (!code || !state) {
        if (!cancelled) {
          setError('Callback de SSO incompleto: codigo ou state ausente.')
        }
        return
      }

      try {
        try {
          const config = await fetchCentralSsoConfig()
          if (!config.enabled) {
            throw new Error('Central SSO is disabled for this application.')
          }
        } catch (configError) {
          if (configError instanceof Error && configError.message === 'Central SSO is disabled for this application.') {
            throw configError
          }
        }

        const exchange = await exchangeCentralSso({ code, state })
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: exchange.access_token,
          refresh_token: exchange.refresh_token,
        })

        if (sessionError) {
          throw sessionError
        }

        await refreshUserData()
        if (!cancelled) {
          const exchangeWorkspaceSlug = (exchange.workspace as { slug?: string } | null)?.slug ?? null
          const redirectTarget = exchange.redirectTo ?? exchange.return_to
          const safeReturnTo = sanitizeWorkspaceReturnTo(redirectTarget, exchangeWorkspaceSlug)
          const targetPath =
            safeReturnTo && (safeReturnTo === '/workspaces' || safeReturnTo.startsWith('/w/'))
              ? safeReturnTo
              : buildWorkspacePath(exchangeWorkspaceSlug)
          navigate(targetPath, { replace: true })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao concluir o SSO central.')
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [navigate, refreshUserData, searchParams])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <AppSurface sx={{ width: '100%', maxWidth: 520 }}>
        <Stack spacing={2}>
          <SectionHeader
            title="Conectando acesso central"
            description="Estamos concluindo a troca segura do authorization code pela sessao local do CDT."
            sx={{ pb: 0 }}
          />

          {error ? (
            <>
              <Alert severity="error">{error}</Alert>
              <Button variant="outlined" onClick={() => navigate('/workspaces', { replace: true })}>
                Voltar ao login
              </Button>
            </>
          ) : (
            <Stack spacing={1.5} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Validando state, trocando o code com o portal e reidratando sua sessao.
              </Typography>
            </Stack>
          )}
        </Stack>
      </AppSurface>
    </Box>
  )
}
