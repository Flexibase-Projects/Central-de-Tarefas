import { apiUrl } from '@/lib/api'

export type CentralSsoConfig = {
  enabled: boolean
  allow_legacy_password_login: boolean
  client_id: string | null
  redirect_uri: string | null
  portal_url: string | null
  authorize_path: string
  logout_path: string
  scope: string
}

export type CentralSsoStartResponse = {
  enabled: boolean
  redirectUrl?: string
  authorize_url: string
  state: string
  expires_at: string
  allow_legacy_password_login: boolean
}

export type CentralSsoExchangeResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number | null
  user: unknown
  workspace: unknown
  memberships: unknown[]
  redirectTo?: string | null
  return_to: string | null
}

type CentralSsoLogoutResponse = {
  enabled: boolean
  logout_url: string | null
}

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function fetchCentralSsoConfig(): Promise<CentralSsoConfig> {
  const response = await fetch(apiUrl('/api/sso/config'))
  const body = await parseJson<CentralSsoConfig & { error?: string }>(response)
  if (!response.ok || !body) {
    throw new Error(body?.error || 'Falha ao carregar a configuracao de SSO central.')
  }
  return body
}

export async function startCentralSso(params: {
  workspaceSlug?: string | null
  returnTo?: string | null
}): Promise<CentralSsoStartResponse> {
  const response = await fetch(apiUrl('/api/sso/start'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspace_slug: params.workspaceSlug ?? null,
      return_to: params.returnTo ?? null,
    }),
  })

  const body = await parseJson<CentralSsoStartResponse & { error?: string }>(response)
  if (!response.ok || !body) {
    throw new Error(body?.error || 'Falha ao iniciar o SSO central.')
  }
  return body
}

export async function exchangeCentralSso(params: {
  code: string
  state: string
}): Promise<CentralSsoExchangeResponse> {
  const response = await fetch(apiUrl('/api/sso/exchange'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const body = await parseJson<CentralSsoExchangeResponse & { error?: string }>(response)
  if (!response.ok || !body) {
    throw new Error(body?.error || 'Falha ao concluir o SSO central.')
  }
  return body
}

export async function fetchCentralSsoLogoutUrl(next?: string | null): Promise<string | null> {
  const response = await fetch(apiUrl('/api/sso/logout-url', next ? { next } : undefined))
  const body = await parseJson<CentralSsoLogoutResponse & { error?: string }>(response)

  if (!response.ok || !body?.enabled) {
    return null
  }

  return body.logout_url ?? null
}
