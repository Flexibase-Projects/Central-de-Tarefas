import type express from 'express';
import {
  getCurrentWorkspaceContextFromRequest,
  type WorkspaceContextPayload,
} from '../services/workspace-access.js';

type WorkspaceRequest = express.Request & {
  workspaceContext?: WorkspaceContextPayload;
};

export function getWorkspaceContext(req: express.Request): WorkspaceContextPayload | null {
  return (req as WorkspaceRequest).workspaceContext ?? null;
}

export async function requireWorkspaceAccess(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): Promise<void> {
  const resolved = await getCurrentWorkspaceContextFromRequest(req);

  if (resolved.status === 'unauthorized') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (resolved.status === 'missing_workspace') {
    res.status(400).json({
      error: 'Workspace slug is required.',
      code: 'WORKSPACE_REQUIRED',
    });
    return;
  }

  if (resolved.status === 'not_found') {
    res.status(404).json({
      error: 'Workspace not found.',
      code: 'WORKSPACE_NOT_FOUND',
    });
    return;
  }

  if (resolved.status === 'pending') {
    res.status(403).json({
      error: 'Seu acesso a este workspace ainda esta pendente.',
      code: 'ACCESS_PENDING',
      workspace: resolved.workspace,
    });
    return;
  }

  if (resolved.status === 'revoked') {
    res.status(403).json({
      error: 'Seu acesso a este workspace foi revogado.',
      code: 'ACCESS_REVOKED',
      workspace: resolved.workspace,
    });
    return;
  }

  if (resolved.status === 'forbidden') {
    res.status(403).json({
      error: 'Voce nao possui membership ativa neste workspace.',
      code: 'WORKSPACE_FORBIDDEN',
      workspace: resolved.workspace,
    });
    return;
  }

  if (resolved.status === 'blocked') {
    res.status(403).json({
      error: 'Este workspace esta bloqueado.',
      code: 'WORKSPACE_BLOCKED',
      workspace: resolved.workspace,
    });
    return;
  }

  (req as WorkspaceRequest).workspaceContext = resolved.payload;
  next();
}
