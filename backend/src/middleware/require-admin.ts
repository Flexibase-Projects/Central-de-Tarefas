import type express from 'express';
import { getRequesterId } from './auth.js';
import { hasRole } from '../services/permissions.js';

/** Middleware: 401 sem usuário, 403 se não for admin */
export async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const ok = await hasRole(requesterId, 'admin');
  if (!ok) {
    res.status(403).json({ error: 'Only admins can access this resource.' });
    return;
  }
  next();
}
