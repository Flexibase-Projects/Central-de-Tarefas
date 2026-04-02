import type express from 'express';
import { getRequesterId } from './auth.js';
import { getWorkspaceContext } from './workspace.js';
import { hasRole } from '../services/permissions.js';
import { isManagerialWorkspaceRole } from '../services/workspace-roles.js';

export async function requireWorkspaceManager(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): Promise<void> {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const workspaceContext = getWorkspaceContext(req);
  if (!workspaceContext?.workspace.id) {
    res.status(400).json({ error: 'Workspace is required' });
    return;
  }

  const membershipRoleKey =
    workspaceContext.membership.role_key ??
    workspaceContext.membership.role_name ??
    null;
  const isWorkspaceManager = isManagerialWorkspaceRole(membershipRoleKey);
  const isGlobalAdmin = await hasRole(requesterId, 'admin');

  if (!isWorkspaceManager && !isGlobalAdmin) {
    res.status(403).json({
      error: 'Only workspace admins or managers can access this resource.',
    });
    return;
  }

  next();
}
