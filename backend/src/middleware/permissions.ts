import { Request, Response, NextFunction } from 'express';
import { hasPermission, hasRole, getUserPermissions } from '../services/permissions.js';
import { jsonError } from '../utils/api-error.js';
import { getAuthFailureCode, getRequesterId } from './auth.js';

function respondUnauthorized(req: Request, res: Response): void {
  const bearer =
    typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : '';
  if (!bearer) {
    jsonError(res, 401, { error: 'User ID required', code: 'AUTH_MISSING' });
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
  jsonError(res, 401, { error: 'User ID required', code: 'AUTH_CONTEXT_INCOMPLETE' });
}

/**
 * Middleware para verificar se o usuário tem uma permissão específica
 * 
 * Uso:
 * router.get('/route', checkPermission('move_card'), handler);
 */
export function checkPermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getRequesterId(req);

      if (!userId) {
        respondUnauthorized(req, res);
        return;
      }

      const hasAccess = await hasPermission(userId, permission);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `You do not have permission: ${permission}`
        });
      }

      next();
    } catch (error) {
      console.error('Error in checkPermission middleware:', error);
      jsonError(res, 500, { error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };
}

/**
 * Middleware para verificar se o usuário tem um cargo específico
 * 
 * Uso:
 * router.get('/route', checkRole('admin'), handler);
 */
export function checkRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getRequesterId(req);

      if (!userId) {
        respondUnauthorized(req, res);
        return;
      }

      const hasAccess = await hasRole(userId, role);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `You do not have role: ${role}`
        });
      }

      next();
    } catch (error) {
      console.error('Error in checkRole middleware:', error);
      jsonError(res, 500, { error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };
}

/**
 * Middleware para adicionar permissões do usuário ao request
 * 
 * Uso:
 * router.use(addUserPermissions);
 * // Agora req.userPermissions está disponível
 */
export async function addUserPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getRequesterId(req);

    if (userId) {
      const permissions = await getUserPermissions(userId);
      (req as any).userPermissions = permissions.map(p => p.name);
    }

    next();
  } catch (error) {
    console.error('Error adding user permissions:', error);
    next();
  }
}
