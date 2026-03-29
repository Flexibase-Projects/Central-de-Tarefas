import { Request, Response, NextFunction } from 'express';
import { hasPermission, hasRole, getUserPermissions } from '../services/permissions.js';
import { getRequesterId } from './auth.js';

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
        return res.status(401).json({ error: 'User ID required' });
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
      res.status(500).json({ error: 'Internal server error' });
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
        return res.status(401).json({ error: 'User ID required' });
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
      res.status(500).json({ error: 'Internal server error' });
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
