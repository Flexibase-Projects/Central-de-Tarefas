import express from 'express';
import { getAuthUserEmail, getAuthUserId, getRequesterId } from '../middleware/auth.js';
import { isSupabaseConnectionRefused, SUPABASE_UNAVAILABLE_MESSAGE } from '../utils/supabase-errors.js';
import { isValidationError } from '../utils/validation.js';
import {
  loadCurrentWorkspaceMembers,
  loadWorkspaceCatalog,
  loadWorkspaceMembersForSlug,
  normalizeWorkspaceSlug,
  resolveWorkspaceUser,
} from '../services/workspaces.js';

const router = express.Router();

function buildWorkspaceStatusPayload(
  result:
    | Awaited<ReturnType<typeof loadWorkspaceMembersForSlug>>
    | Awaited<ReturnType<typeof loadCurrentWorkspaceMembers>>,
) {
  return {
    status: result.status,
    workspace: result.workspace,
    members: result.members,
  };
}

router.get('/mine', async (req, res) => {
  try {
    const authUserId = getAuthUserId(req);
    const requesterUserId = getRequesterId(req);
    const authUserEmail = getAuthUserEmail(req);

    if (!authUserId && !requesterUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subjectUser = await resolveWorkspaceUser({
      requesterUserId,
      authUserId,
      authUserEmail,
      includeInactive: true,
    });

    if (!subjectUser.user) {
      return res.status(403).json({
        status: 'pending',
        code: 'ACCESS_PENDING',
        error: 'Acesso pendente de liberacao pelo administrador.',
        workspaces: [],
        pending_workspaces: [],
        blocked_workspaces: [],
        current_workspace: null,
      });
    }

    const catalog = await loadWorkspaceCatalog(subjectUser.user.id);
    const active = catalog.workspaces.filter((workspace) => workspace.access_state === 'active');
    const pending = catalog.workspaces.filter((workspace) => workspace.access_state === 'pending');
    const blocked = catalog.workspaces.filter((workspace) => workspace.access_state === 'blocked');
    const currentWorkspace =
      active.find((workspace) => workspace.is_default_membership) ?? active[0] ?? null;

    const status =
      subjectUser.user.is_active === false
        ? subjectUser.user.identity_status === 'disabled' || subjectUser.user.identity_status === 'conflict'
          ? 'blocked'
          : 'pending'
        : 'success';

    if (status !== 'success') {
      return res.status(403).json({
        status,
        error:
          status === 'blocked'
            ? 'Acesso bloqueado para este usuario.'
            : 'Acesso pendente de liberacao pelo administrador.',
        workspaces: active,
        pending_workspaces: pending,
        blocked_workspaces: blocked,
        current_workspace: currentWorkspace,
        subject_user: subjectUser.user,
      });
    }

    return res.json({
      status: 'success',
      workspaces: active,
      pending_workspaces: pending,
      blocked_workspaces: blocked,
      current_workspace: currentWorkspace,
      subject_user: subjectUser.user,
    });
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.mine:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar workspaces do usuario',
    });
  }
});

router.get('/current/members', async (req, res) => {
  try {
    const authUserId = getAuthUserId(req);
    const result = await loadCurrentWorkspaceMembers({
      requesterUserId: getRequesterId(req),
      authUserId,
      authUserEmail: getAuthUserEmail(req),
    });

    if (result.status === 'success') {
      return res.json(result.members);
    }

    if (result.status === 'not_found' && authUserId) {
      return res.status(403).json({
        status: 'pending',
        code: 'ACCESS_PENDING',
        error: 'Acesso pendente de liberacao pelo administrador.',
        workspace: null,
        members: [],
      });
    }

    return res.status(result.status === 'not_found' ? 404 : 403).json(buildWorkspaceStatusPayload(result));
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.current.members:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar membros do workspace atual',
    });
  }
});

router.get('/:workspaceSlug/context', async (req, res) => {
  try {
    const workspaceSlug = normalizeWorkspaceSlug(req.params.workspaceSlug);
    const subjectUser = await resolveWorkspaceUser({
      requesterUserId: getRequesterId(req),
      authUserId: getAuthUserId(req),
      authUserEmail: getAuthUserEmail(req),
      includeInactive: true,
    });

    const context = await loadWorkspaceMembersForSlug({
      slug: workspaceSlug,
      requesterUserId: getRequesterId(req),
      authUserId: getAuthUserId(req),
      authUserEmail: getAuthUserEmail(req),
    });

    if (context.status === 'not_found') {
      return res.status(404).json({
        status: 'not_found',
        error: 'Workspace nao encontrado.',
      });
    }

    if (context.status === 'blocked') {
      return res.status(403).json({
        status: 'blocked',
        error: context.message || 'Acesso bloqueado para este workspace.',
        workspace: context.workspace,
        access_state: context.access_state,
        membership: context.membership,
        request: context.request,
        subject_user: subjectUser.user,
      });
    }

    if (context.status === 'pending') {
      return res.status(403).json({
        status: 'pending',
        error: context.message || 'Acesso pendente de aprovacao.',
        workspace: context.workspace,
        access_state: context.access_state,
        membership: context.membership,
        request: context.request,
        subject_user: subjectUser.user,
      });
    }

    return res.json({
      status: 'success',
      workspace: context.workspace,
      access_state: context.access_state,
      membership: context.membership,
      request: context.request,
      subject_user: subjectUser.user,
      members: context.members,
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.context:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar o contexto do workspace',
    });
  }
});

router.get('/:workspaceSlug/members', async (req, res) => {
  try {
    const workspaceSlug = normalizeWorkspaceSlug(req.params.workspaceSlug);
    const result = await loadWorkspaceMembersForSlug({
      slug: workspaceSlug,
      requesterUserId: getRequesterId(req),
      authUserId: getAuthUserId(req),
      authUserEmail: getAuthUserEmail(req),
    });

    if (result.status === 'success') {
      return res.json({
        status: 'success',
        workspace: result.workspace,
        members: result.members,
      });
    }

    return res.status(result.status === 'not_found' ? 404 : 403).json(buildWorkspaceStatusPayload(result));
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('workspaces.members:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar membros do workspace',
    });
  }
});

export default router;
