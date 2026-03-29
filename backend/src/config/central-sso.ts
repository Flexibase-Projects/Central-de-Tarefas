function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type CentralSsoConfig = {
  enabled: boolean;
  allowLegacyPasswordLogin: boolean;
  portalUrl: string | null;
  clientId: string | null;
  clientSecret: string | null;
  authorizePath: string;
  tokenPath: string;
  logoutPath: string;
  redirectUri: string | null;
  postLogoutRedirectUri: string | null;
  scope: string;
  stateSecret: string | null;
  stateTtlSeconds: number;
};

export function getCentralSsoConfig(): CentralSsoConfig {
  return {
    enabled: readBoolean(process.env.CENTRAL_SSO_ENABLED, false),
    allowLegacyPasswordLogin: readBoolean(process.env.CENTRAL_SSO_ALLOW_LEGACY_PASSWORD_LOGIN, true),
    portalUrl: clean(process.env.CENTRAL_SSO_PORTAL_URL),
    clientId: clean(process.env.CENTRAL_SSO_CLIENT_ID),
    clientSecret: clean(process.env.CENTRAL_SSO_CLIENT_SECRET),
    authorizePath: clean(process.env.CENTRAL_SSO_AUTHORIZE_PATH) ?? '/authorize',
    tokenPath: clean(process.env.CENTRAL_SSO_TOKEN_PATH) ?? '/token',
    logoutPath: clean(process.env.CENTRAL_SSO_LOGOUT_PATH) ?? '/logout',
    redirectUri: clean(process.env.CENTRAL_SSO_REDIRECT_URI),
    postLogoutRedirectUri:
      clean(process.env.CENTRAL_SSO_POST_LOGOUT_REDIRECT_URI) ??
      clean(process.env.CENTRAL_SSO_REDIRECT_URI),
    scope: clean(process.env.CENTRAL_SSO_SCOPE) ?? 'openid profile email',
    stateSecret: clean(process.env.CENTRAL_SSO_STATE_SECRET),
    stateTtlSeconds: Number(process.env.CENTRAL_SSO_STATE_TTL_SECONDS ?? 300) || 300,
  };
}

export function buildCentralSsoUrl(baseUrl: string, path: string): URL {
  return new URL(path.startsWith('/') ? path : `/${path}`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
}

export function getCentralSsoPublicConfig() {
  const config = getCentralSsoConfig();
  return {
    enabled: config.enabled,
    allow_legacy_password_login: config.allowLegacyPasswordLogin,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    portal_url: config.portalUrl,
    authorize_path: config.authorizePath,
    logout_path: config.logoutPath,
    scope: config.scope,
  };
}
