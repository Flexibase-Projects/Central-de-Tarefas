import { Request, Response, NextFunction } from 'express';
import type { User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '../config/supabase.js';
import { ensureNativeAdminAccess } from '../services/native-admin.js';
import { findCdtUserByField, updateCdtUserByIdCompat } from '../services/cdt-users.js';
import { hasRole } from '../services/permissions.js';
import { jsonError } from '../utils/api-error.js';

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

export function getAuthFailureCode(req: Request): 'AUTH_TOKEN_INVALID' | undefined {
  return req.authFailureCode;
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
  const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = rawToken?.trim() || null;

  if (!token) {
    next();
    return;
  }

  let user: AuthUser;
  try {
    const {
      data: { user: u },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !u) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[authMiddleware] JWT não aceito pelo Supabase do backend (getUser falhou). Confira se SUPABASE_URL / chaves batem com o frontend:',
          error?.message ?? 'sem usuário',
        );
      }
      req.authFailureCode = 'AUTH_TOKEN_INVALID';
      next();
      return;
    }
    user = u;
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[authMiddleware] getUser lançou exceção (rede/config?):', e);
    }
    req.authFailureCode = 'AUTH_TOKEN_INVALID';
    next();
    return;
  }

  const authReq = req as AuthRequest;
  authReq.authUserId = user.id;
  authReq.authUserEmail = user.email ?? '';

  try {
    const requestedUserIdHeader = readUserIdHeader(req);
    const nowIso = new Date().toISOString();

    let realUserId: string | null = null;

    const byCentralUserId = await findCdtUserByField({
      field: 'central_user_id',
      value: user.id,
      includeColumns: ['central_user_id'],
    });

    if (byCentralUserId?.id && byCentralUserId.is_active !== false) {
      realUserId = byCentralUserId.id;
    }

    if (!realUserId) {
      const byId = await findCdtUserByField({
        field: 'id',
        value: user.id,
        includeColumns: ['central_user_id'],
      });

      if (byId?.id && byId.is_active !== false) {
        realUserId = byId.id;

        if (!byId.central_user_id || byId.central_user_id === user.id) {
          await updateCdtUserByIdCompat(byId.id, {
            central_user_id: user.id,
            identity_status: 'linked',
            last_identity_sync_at: nowIso,
          });
        }
      }
    }

    if (!realUserId && user.email) {
      const byEmail = await findCdtUserByField({
        field: 'email',
        value: user.email.toLowerCase(),
        includeColumns: ['central_user_id'],
      });

      if (
        byEmail?.id &&
        byEmail.is_active !== false &&
        (!byEmail.central_user_id || byEmail.central_user_id === user.id)
      ) {
        realUserId = byEmail.id;

        await updateCdtUserByIdCompat(byEmail.id, {
          ...(byEmail.central_user_id ? {} : { central_user_id: user.id }),
          identity_status: 'linked',
          last_identity_sync_at: nowIso,
        });
      }
    }

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
          const target = await findCdtUserByField({
            field: 'id',
            value: requestedUserIdHeader,
            includeColumns: [],
          });
          if (target?.id && target.is_active !== false) {
            effectiveUserId = target.id;
          }
        }
      }

      setRequestAuthContext(req, {
        realUserId,
        effectiveUserId,
        userId: effectiveUserId,
      });
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[authMiddleware] erro ao resolver usuário CDT:', e);
    }
  }

  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const t = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;

  if (!t?.trim()) {
    next();
    return;
  }

  next();
}

function readBearerToken(req: Request): string {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return '';
  return h.slice(7).trim();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (getRequesterId(req)) {
    next();
    return;
  }

  const bearer = readBearerToken(req);
  if (!bearer) {
    jsonError(res, 401, { error: 'Unauthorized', code: 'AUTH_MISSING' });
    return;
  }

  if (getAuthFailureCode(req) === 'AUTH_TOKEN_INVALID') {
    jsonError(res, 401, {
      error:
        'Token inválido ou emitido por outro projeto Supabase. Verifique SUPABASE_URL e chaves no backend.',
      code: 'AUTH_TOKEN_INVALID',
    });
    return;
  }

  jsonError(res, 401, { error: 'Unauthorized', code: 'AUTH_CONTEXT_INCOMPLETE' });
}
