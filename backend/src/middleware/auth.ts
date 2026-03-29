import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { ensureNativeAdminAccess } from '../services/native-admin.js';
import { hasRole } from '../services/permissions.js';

type AuthRequest = Request & {
  userId?: string;
  effectiveUserId?: string;
  realUserId?: string;
  authUserId?: string;
  authUserEmail?: string;
};

function readUserIdHeader(req: Request): string | null {
  const value = req.headers['x-user-id'];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export function getRealUserId(req: Request): string | null {
  const authReq = req as AuthRequest;
  return authReq.realUserId ?? authReq.userId ?? null;
}

export function getAuthUserId(req: Request): string | null {
  const authReq = req as AuthRequest;
  return authReq.authUserId ?? null;
}

export function getAuthUserEmail(req: Request): string | null {
  const authReq = req as AuthRequest;
  return authReq.authUserEmail ?? null;
}

export function getEffectiveUserId(req: Request): string | null {
  const authReq = req as AuthRequest;
  return authReq.effectiveUserId ?? authReq.userId ?? null;
}

export function getRequesterId(req: Request): string | null {
  return getEffectiveUserId(req) ?? getRealUserId(req) ?? null;
}

export function setRequestAuthContext(
  req: Request,
  context: Partial<Pick<AuthRequest, 'authUserId' | 'authUserEmail' | 'realUserId' | 'effectiveUserId' | 'userId'>>,
): void {
  const authReq = req as AuthRequest;
  if (context.authUserId !== undefined) authReq.authUserId = context.authUserId;
  if (context.authUserEmail !== undefined) authReq.authUserEmail = context.authUserEmail;
  if (context.realUserId !== undefined) authReq.realUserId = context.realUserId;
  if (context.effectiveUserId !== undefined) authReq.effectiveUserId = context.effectiveUserId;
  if (context.userId !== undefined) authReq.userId = context.userId;
  const nextHeader = context.effectiveUserId ?? context.userId ?? context.realUserId ?? null;
  if (nextHeader) {
    req.headers['x-user-id'] = nextHeader;
  }
}

/**
 * Resolves authenticated user context from Supabase JWT.
 * - `authUserId` / `authUserEmail`: any valid Supabase Auth user.
 * - `realUserId`: row in `cdt_users` for the authenticated identity.
 * - `effectiveUserId`: real user or impersonated target allowed for admins.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  try {
    const requestedUserIdHeader = readUserIdHeader(req);
    const nowIso = new Date().toISOString();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      next();
      return;
    }

    const authReq = req as AuthRequest;
    authReq.authUserId = user.id;
    authReq.authUserEmail = user.email ?? '';

    let realUserId: string | null = null;

    // Novo fluxo: vínculo explícito com a identidade central.
    const byCentralUserId = await supabase
      .from('cdt_users')
      .select('id, is_active')
      .eq('central_user_id', user.id)
      .maybeSingle();

    if (!byCentralUserId.error && byCentralUserId.data?.id && byCentralUserId.data.is_active !== false) {
      realUserId = byCentralUserId.data.id;
    }

    // Compatibilidade com o modelo legado em que cdt_users.id == auth.users.id.
    if (!realUserId) {
      const byId = await supabase
        .from('cdt_users')
        .select('id, central_user_id, is_active')
        .eq('id', user.id)
        .maybeSingle();

      if (!byId.error && byId.data?.id && byId.data.is_active !== false) {
        realUserId = byId.data.id;

        if (!byId.data.central_user_id || byId.data.central_user_id === user.id) {
          await supabase
            .from('cdt_users')
            .update({
              central_user_id: user.id,
              identity_status: 'linked',
              last_identity_sync_at: nowIso,
            })
            .eq('id', byId.data.id);
        }
      }
    }

    // Fallback legado por email: só vincula automaticamente quando não há conflito explícito.
    if (!realUserId && user.email) {
      const byEmail = await supabase
        .from('cdt_users')
        .select('id, central_user_id, is_active')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();

      if (
        !byEmail.error &&
        byEmail.data?.id &&
        byEmail.data.is_active !== false &&
        (!byEmail.data.central_user_id || byEmail.data.central_user_id === user.id)
      ) {
        realUserId = byEmail.data.id;

        await supabase
          .from('cdt_users')
          .update({
            ...(byEmail.data.central_user_id ? {} : { central_user_id: user.id }),
            identity_status: 'linked',
            last_identity_sync_at: nowIso,
          })
          .eq('id', byEmail.data.id);
      }
    }

    // Automatic access only for native admin emails.
    if (!realUserId) {
      const resolvedName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split('@')[0] ||
        'Usuario';

      const nativeAdminUserId = await ensureNativeAdminAccess({
        authUserId: user.id,
        email: user.email,
        name: resolvedName,
        avatarUrl: (user.user_metadata?.avatar_url as string | null) ?? null,
      });

      if (nativeAdminUserId) {
        realUserId = nativeAdminUserId;
      }
    }

    if (realUserId) {
      let effectiveUserId = realUserId;

      if (requestedUserIdHeader && requestedUserIdHeader !== realUserId) {
        const realUserIsAdmin = await hasRole(realUserId, 'admin');
        if (realUserIsAdmin) {
          const target = await supabase
            .from('cdt_users')
            .select('id, is_active')
            .eq('id', requestedUserIdHeader)
            .maybeSingle();
          if (!target.error && target.data?.id && target.data.is_active !== false) {
            effectiveUserId = target.data.id;
          }
        }
      }

      setRequestAuthContext(req, {
        realUserId,
        effectiveUserId,
        userId: effectiveUserId,
      });
    }
  } catch {
    // Ignore auth errors and continue as unauthenticated for app-level handling.
  }

  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

  if (!token) {
    next();
    return;
  }

  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (getRequesterId(req)) {
    next();
    return;
  }

  res.status(401).json({ error: 'Unauthorized' });
}
