import express from 'express';
import { supabase } from '../config/supabase.js';
import { getAuthUserEmail, getAuthUserId, getRequesterId } from '../middleware/auth.js';
import {
  isSupabaseConnectionRefused,
  SUPABASE_UNAVAILABLE_MESSAGE,
} from '../utils/supabase-errors.js';
import { isValidationError, optionalString, requireString } from '../utils/validation.js';
import {
  loadWorkspaceCatalog,
  normalizeWorkspaceSlug,
  resolveWorkspaceUser,
  requestWorkspaceAccess,
} from '../services/workspaces.js';

const router = express.Router();

/** Indica se o email pode usar o fluxo "definir senha" na tela de login (convite com senha temporaria). */
router.post('/first-access-hint', async (req, res) => {
  try {
    const normalized = optionalString((req.body as Record<string, unknown>).email, 'email', { maxLength: 320 })?.toLowerCase() ?? '';
    if (!normalized) {
      return res.json({ eligible: false });
    }

    const { data, error } = await supabase
      .from('cdt_users')
      .select('must_set_password')
      .eq('email', normalized)
      .maybeSingle();

    if (error) throw error;
    return res.json({ eligible: Boolean(data?.must_set_password) });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('first-access-hint:', error);
    return res.json({ eligible: false });
  }
});

/** Projecao publica do catalogo de workspaces com flag de acesso do usuario autenticado, quando houver. */
router.get('/public-workspaces', async (req, res) => {
  try {
    const subjectUser = await resolveWorkspaceUser({
      requesterUserId: getRequesterId(req),
      authUserId: getAuthUserId(req),
      authUserEmail: getAuthUserEmail(req),
      includeInactive: true,
    });

    const payload = await loadWorkspaceCatalog(subjectUser.user?.id ?? null);
    return res.json({
      status: 'success',
      ...payload,
    });
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('public-workspaces:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar workspaces publicos',
    });
  }
});

/** Solicita acesso a um workspace e registra uma conta local pendente quando necessario. */
router.post('/request-access', async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const workspaceSlug = normalizeWorkspaceSlug(requireString(body.workspace_slug, 'workspace_slug', { minLength: 2, maxLength: 120 }));
    const email = requireString(body.email, 'email', { minLength: 3, maxLength: 320 }).toLowerCase();
    const name = requireString(body.name, 'name', { minLength: 2, maxLength: 200 });
    const password = requireString(body.password, 'password', { minLength: 8, maxLength: 128 });
    const message = optionalString(body.message, 'message', { maxLength: 2000 });

    const result = await requestWorkspaceAccess({
      workspaceSlug,
      email,
      name,
      password,
      message,
    });

    if (result.status === 'not_found') {
      return res.status(404).json({
        status: 'not_found',
        error: 'Workspace nao encontrado.',
      });
    }

    if (result.status === 'blocked') {
      return res.status(403).json({
        status: 'blocked',
        error: result.workspace?.is_active === false
          ? 'Workspace bloqueado.'
          : 'Acesso bloqueado para este workspace.',
        workspace: result.workspace,
      });
    }

    if (result.status === 'success') {
      return res.status(200).json({
        status: 'success',
        workspace: result.workspace,
        membership: result.membership,
        request: result.request,
        local_user: result.local_user,
        auth_user_created: result.auth_user_created,
      });
    }

    return res.status(200).json({
      status: 'pending',
      workspace: result.workspace,
      membership: result.membership,
      request: result.request,
      local_user: result.local_user,
      auth_user_created: result.auth_user_created,
    });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('request-access:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao solicitar acesso',
    });
  }
});

/** Define a primeira senha forte; so permitido quando must_set_password esta true no cdt_users. */
router.post('/set-initial-password', async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const normalized = requireString(body.email, 'email', { minLength: 3, maxLength: 320 }).toLowerCase();
    const pwd = requireString(body.password, 'password', { minLength: 8, maxLength: 128 });

    if (pwd.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres.' });
    }

    const { data: row, error: rowError } = await supabase
      .from('cdt_users')
      .select('id, must_set_password')
      .eq('email', normalized)
      .maybeSingle();

    if (rowError) throw rowError;
    if (!row?.id || !row.must_set_password) {
      return res.status(403).json({
        error: 'Este email nao esta elegivel para definir senha por aqui.',
      });
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(row.id, {
      password: pwd,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message || 'Falha ao atualizar senha no Auth' });
    }

    const { error: updError } = await supabase
      .from('cdt_users')
      .update({
        must_set_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (updError) throw updError;
    return res.json({ ok: true });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('set-initial-password:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao definir senha inicial',
    });
  }
});

export default router;
