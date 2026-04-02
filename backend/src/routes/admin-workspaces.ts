import express from 'express';
import { getRequesterId } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/require-admin.js';
import {
  createAdminWorkspace,
  loadAdminWorkspaceCatalog,
  setAdminWorkspaceModuleState,
  updateAdminWorkspace,
} from '../services/admin-workspaces.js';
import { isSupabaseConnectionRefused, SUPABASE_UNAVAILABLE_MESSAGE } from '../utils/supabase-errors.js';
import { isValidationError, optionalString, requireString } from '../utils/validation.js';

const router = express.Router();

function parseOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }
  return value;
}

function parseOptionalName(value: unknown): string | undefined {
  const normalized = optionalString(value, 'name', { maxLength: 200 });
  if (normalized !== null && normalized.length < 2) {
    throw new Error('name must have at least 2 characters');
  }
  return normalized ?? undefined;
}

router.use(requireAdmin);

router.get('/', async (_req, res) => {
  try {
    const catalog = await loadAdminWorkspaceCatalog();
    return res.json(catalog);
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('admin-workspaces.list:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao carregar o catalogo administrativo',
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const workspace = await createAdminWorkspace({
      name: requireString(body.name, 'name', { minLength: 2, maxLength: 200 }),
      slug: requireString(body.slug, 'slug', { minLength: 2, maxLength: 120 }),
      description: optionalString(body.description, 'description', { maxLength: 2000 }),
      groupKey: optionalString(body.group_key, 'group_key', { maxLength: 80 }),
      isActive: parseOptionalBoolean(body.is_active, 'is_active'),
      isHidden: parseOptionalBoolean(body.is_hidden, 'is_hidden'),
      actorUserId: getRequesterId(req),
    });

    return res.status(201).json({ workspace });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Error && /boolean/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('admin-workspaces.create:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao criar workspace',
    });
  }
});

router.patch('/:workspaceId', async (req, res) => {
  try {
    const workspaceId = requireString(req.params.workspaceId, 'workspaceId', { minLength: 1, maxLength: 120 });
    const body = (req.body ?? {}) as Record<string, unknown>;

    const workspace = await updateAdminWorkspace(workspaceId, {
      name: parseOptionalName(body.name),
      description: optionalString(body.description, 'description', { maxLength: 2000 }),
      groupKey: optionalString(body.group_key, 'group_key', { maxLength: 80 }) ?? undefined,
      isActive: parseOptionalBoolean(body.is_active, 'is_active'),
      isHidden: parseOptionalBoolean(body.is_hidden, 'is_hidden'),
    });

    return res.json({ workspace });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Error && /boolean/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('admin-workspaces.update:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao atualizar workspace',
    });
  }
});

router.put('/:workspaceId/modules/:moduleKey', async (req, res) => {
  try {
    const workspaceId = requireString(req.params.workspaceId, 'workspaceId', { minLength: 1, maxLength: 120 });
    const moduleKey = requireString(req.params.moduleKey, 'moduleKey', { minLength: 1, maxLength: 120 });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const isEnabled = parseOptionalBoolean(body.is_enabled, 'is_enabled');

    if (isEnabled === undefined) {
      return res.status(400).json({ error: 'is_enabled is required' });
    }

    const workspace = await setAdminWorkspaceModuleState({
      workspaceId,
      moduleKey,
      isEnabled,
      actorUserId: getRequesterId(req),
    });

    return res.json({ workspace });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Error && /boolean/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('admin-workspaces.modules.update:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao atualizar modulo do workspace',
    });
  }
});

export default router;
