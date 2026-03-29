import crypto from 'crypto';
import express from 'express';
import {
  buildCentralSsoUrl,
  getCentralSsoConfig,
  getCentralSsoPublicConfig,
} from '../config/central-sso.js';
import { supabase } from '../config/supabase.js';
import { loadWorkspaceMembersForSlug, resolveWorkspaceUser } from '../services/workspaces.js';
import { isValidationError, optionalString, requireString } from '../utils/validation.js';

const router = express.Router();

type SignedStatePayload = {
  workspace_slug: string | null;
  return_to: string | null;
  nonce: string;
  exp: number;
  iat: number;
};

function isRelativePath(value: string | null): boolean {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'));
}

function signStatePayload(payload: SignedStatePayload, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifySignedState(state: string, secret: string): SignedStatePayload | null {
  const [encodedPayload, signature] = state.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SignedStatePayload;
    if (!payload?.nonce || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

router.get('/config', (_req, res) => {
  res.json(getCentralSsoPublicConfig());
});

router.post('/start', async (req, res) => {
  try {
    const config = getCentralSsoConfig();
    if (!config.enabled) {
      return res.status(404).json({ error: 'Central SSO is disabled for this application.' });
    }

    if (!config.portalUrl || !config.clientId || !config.redirectUri || !config.stateSecret) {
      return res.status(503).json({
        error: 'Central SSO is enabled but not fully configured on the backend.',
      });
    }

    const body = req.body as Record<string, unknown>;
    const workspaceSlug = optionalString(body.workspace_slug, 'workspace_slug', { maxLength: 120 });
    const requestedReturnTo = optionalString(body.return_to, 'return_to', { maxLength: 1024 });
    const returnTo = isRelativePath(requestedReturnTo) ? requestedReturnTo : workspaceSlug ? `/w/${workspaceSlug}` : '/';

    const now = Math.floor(Date.now() / 1000);
    const payload: SignedStatePayload = {
      workspace_slug: workspaceSlug,
      return_to: returnTo,
      nonce: crypto.randomBytes(18).toString('base64url'),
      iat: now,
      exp: now + config.stateTtlSeconds,
    };

    const state = signStatePayload(payload, config.stateSecret);
    const authorizeUrl = buildCentralSsoUrl(config.portalUrl, config.authorizePath);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', config.clientId);
    authorizeUrl.searchParams.set('redirect_uri', config.redirectUri);
    authorizeUrl.searchParams.set('scope', config.scope);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('nonce', payload.nonce);
    if (workspaceSlug) authorizeUrl.searchParams.set('workspace_slug', workspaceSlug);
    if (returnTo) authorizeUrl.searchParams.set('return_to', returnTo);

    return res.json({
      enabled: true,
      redirectUrl: authorizeUrl.toString(),
      authorize_url: authorizeUrl.toString(),
      state,
      expires_at: new Date(payload.exp * 1000).toISOString(),
      allow_legacy_password_login: config.allowLegacyPasswordLogin,
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('sso.start:', error);
    return res.status(500).json({ error: 'Failed to initialize central SSO.' });
  }
});

router.post('/exchange', async (req, res) => {
  try {
    const config = getCentralSsoConfig();
    if (!config.enabled) {
      return res.status(404).json({ error: 'Central SSO is disabled for this application.' });
    }

    if (!config.portalUrl || !config.clientId || !config.clientSecret || !config.redirectUri || !config.stateSecret) {
      return res.status(503).json({
        error: 'Central SSO is enabled but not fully configured on the backend.',
      });
    }

    const body = req.body as Record<string, unknown>;
    const code = requireString(body.code, 'code', { minLength: 8, maxLength: 4096 });
    const state = requireString(body.state, 'state', { minLength: 16, maxLength: 4096 });
    const signedState = verifySignedState(state, config.stateSecret);

    if (!signedState) {
      return res.status(400).json({ error: 'Invalid or expired SSO state.' });
    }

    const tokenUrl = buildCentralSsoUrl(config.portalUrl, config.tokenPath);
    const upstreamResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        nonce: signedState.nonce,
        workspace_slug: signedState.workspace_slug,
        return_to: signedState.return_to,
      }),
    });

    const upstreamBody = (await upstreamResponse.json().catch(() => null)) as
      | {
          error?: string;
          error_description?: string;
          access_token?: string;
          refresh_token?: string;
          token_type?: string;
          expires_in?: number;
          user?: unknown;
          workspace?: unknown;
          memberships?: unknown;
        }
      | null;

    if (!upstreamResponse.ok) {
      return res.status(502).json({
        error:
          upstreamBody?.error_description ||
          upstreamBody?.error ||
          'Central SSO token exchange failed.',
      });
    }

    if (!upstreamBody?.access_token || !upstreamBody.refresh_token) {
      return res.status(502).json({
        error: 'Central SSO returned an unusable session payload for this adapter.',
      });
    }

    let localUser: unknown = upstreamBody.user ?? null;
    let localWorkspace: unknown = upstreamBody.workspace ?? null;
    let localMemberships: unknown[] = Array.isArray(upstreamBody.memberships) ? upstreamBody.memberships : [];

    try {
      const identity = await supabase.auth.getUser(upstreamBody.access_token);
      const identityUser = identity.data.user;

      if (identityUser) {
        const subject = await resolveWorkspaceUser({
          authUserId: identityUser.id,
          authUserEmail: identityUser.email ?? null,
          includeInactive: true,
        });

        if (subject.user) {
          localUser = subject.user;
        }

        if (signedState.workspace_slug) {
          const workspaceContext = await loadWorkspaceMembersForSlug({
            slug: signedState.workspace_slug,
            requesterUserId: subject.user?.id ?? null,
            authUserId: identityUser.id,
            authUserEmail: identityUser.email ?? null,
          });

          if (workspaceContext.workspace) {
            localWorkspace = workspaceContext.workspace;
          }
          if (workspaceContext.members?.length) {
            localMemberships = workspaceContext.members;
          }
        }
      }
    } catch (localResolutionError) {
      console.warn('sso.exchange.local-resolution:', localResolutionError);
    }

    return res.json({
      access_token: upstreamBody.access_token,
      refresh_token: upstreamBody.refresh_token,
      token_type: upstreamBody.token_type || 'bearer',
      expires_in: upstreamBody.expires_in ?? null,
      user: localUser,
      workspace: localWorkspace,
      memberships: localMemberships,
      redirectTo: signedState.return_to,
      return_to: signedState.return_to,
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('sso.exchange:', error);
    return res.status(500).json({ error: 'Failed to exchange central SSO code.' });
  }
});

router.get('/logout-url', (req, res) => {
  try {
    const config = getCentralSsoConfig();
    if (!config.enabled || !config.portalUrl || !config.clientId || !config.postLogoutRedirectUri) {
      return res.json({ enabled: false, logout_url: null });
    }

    const requestedNext = optionalString(req.query.next, 'next', { maxLength: 1024 });
    const next = isRelativePath(requestedNext) ? requestedNext : null;

    const logoutUrl = buildCentralSsoUrl(config.portalUrl, config.logoutPath);
    logoutUrl.searchParams.set('client_id', config.clientId);
    logoutUrl.searchParams.set('post_logout_redirect_uri', config.postLogoutRedirectUri);
    if (next) logoutUrl.searchParams.set('return_to', next);

    return res.json({
      enabled: true,
      logout_url: logoutUrl.toString(),
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('sso.logout-url:', error);
    return res.status(500).json({ error: 'Failed to build central SSO logout URL.' });
  }
});

export default router;
