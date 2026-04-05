import type express from 'express';
import { getAuthFailureCode } from './auth.js';
import {
  getCurrentWorkspaceContextFromRequest,
  type WorkspaceContextPayload,
} from '../services/workspace-access.js';
import { jsonError } from '../utils/api-error.js';

function withRequestId(res: express.Response, body: Record<string, unknown>): Record<string, unknown> {
  const rid = res.locals.requestId;
  return rid ? { ...body, requestId: rid } : body;
}

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
    const bearer =
      typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7).trim()
        : '';
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
    return;
  }

  if (resolved.status === 'missing_workspace') {
    res.status(400).json(
      withRequestId(res, {
        error: 'Workspace slug is required.',
        code: 'WORKSPACE_REQUIRED',
      }),
    );
    return;
  }

  if (resolved.status === 'not_found') {
    res.status(404).json(
      withRequestId(res, {
        error: 'Workspace not found.',
        code: 'WORKSPACE_NOT_FOUND',
      }),
    );
    return;
  }

  if (resolved.status === 'pending') {
    res.status(403).json(
      withRequestId(res, {
        error: 'Seu acesso a este workspace ainda esta pendente.',
        code: 'ACCESS_PENDING',
        workspace: resolved.workspace,
      }),
    );
    return;
  }

  if (resolved.status === 'revoked') {
    res.status(403).json(
      withRequestId(res, {
        error: 'Seu acesso a este workspace foi revogado.',
        code: 'ACCESS_REVOKED',
        workspace: resolved.workspace,
      }),
    );
    return;
  }

  if (resolved.status === 'forbidden') {
    res.status(403).json(
      withRequestId(res, {
        error: 'Voce nao possui membership ativa neste workspace.',
        code: 'WORKSPACE_FORBIDDEN',
        workspace: resolved.workspace,
      }),
    );
    return;
  }

  if (resolved.status === 'blocked') {
    res.status(403).json(
      withRequestId(res, {
        error: 'Este workspace esta bloqueado.',
        code: 'WORKSPACE_BLOCKED',
        workspace: resolved.workspace,
      }),
    );
    return;
  }

  (req as WorkspaceRequest).workspaceContext = resolved.payload;
  next();
}
