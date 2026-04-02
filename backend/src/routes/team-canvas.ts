import express from 'express';
import { supabase } from '../config/supabase.js';
import { getWorkspaceContext } from '../middleware/workspace.js';

const router = express.Router();
const DEFAULT_CANVAS_NAME = 'default';

/** GET /api/team-canvas — retorna o canva da equipe (registro default) */
router.get('/', async (req, res) => {
  try {
    const workspaceContext = getWorkspaceContext(req);
    const workspaceId = workspaceContext?.workspace.id ?? null;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace is required' });
    }

    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return res.status(503).json({
        error: 'Supabase not configured',
        message: 'Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env',
      });
    }

    const { data, error } = await supabase
      .from('cdt_team_canvas')
      .select('id, name, content, updated_at')
      .eq('workspace_id', workspaceId)
      .eq('name', DEFAULT_CANVAS_NAME)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.json({ id: null, name: DEFAULT_CANVAS_NAME, content: {}, updated_at: null });
    }

    res.json({
      id: data.id,
      name: data.name,
      content: data.content ?? {},
      updated_at: data.updated_at,
    });
  } catch (error: any) {
    console.error('Error fetching team canvas:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch team canvas' });
  }
});

/** Garante que o conteúdo é um objeto JSON-serializável (evita undefined, NaN, etc.) */
function sanitizeContent(content: unknown): Record<string, unknown> {
  if (content === null || content === undefined) return {};
  if (typeof content !== 'object' || Array.isArray(content)) return {};
  try {
    return JSON.parse(JSON.stringify(content)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** PUT /api/team-canvas — atualiza o conteúdo do canva default (upsert) */
router.put('/', async (req, res) => {
  try {
    const workspaceContext = getWorkspaceContext(req);
    const workspaceId = workspaceContext?.workspace.id ?? null;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace is required' });
    }

    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return res.status(503).json({
        error: 'Supabase not configured',
        message: 'Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env',
      });
    }

    const raw = req.body;
    if (raw === undefined || raw === null) {
      return res.status(400).json({ error: 'Body must be a JSON object (Excalidraw content)' });
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) {
      return res.status(400).json({ error: 'content must be an object' });
    }

    const content = sanitizeContent(raw);
    const payload = {
      workspace_id: workspaceId,
      name: DEFAULT_CANVAS_NAME,
      content,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('cdt_team_canvas')
      .upsert(payload, { onConflict: 'workspace_id,name' })
      .select('id, name, content, updated_at')
      .single();

    if (error) {
      if (error.code === '42P01' || (error.message && /relation.*does not exist/i.test(error.message))) {
        return res.status(503).json({
          error: 'Tabela do canva não existe. Execute a migração no Supabase (SQL Editor):',
          code: 'MIGRATION_REQUIRED',
          sql: 'CREATE TABLE IF NOT EXISTS cdt_team_canvas (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id UUID NOT NULL REFERENCES cdt_workspaces(id) ON DELETE CASCADE, name VARCHAR(100) NOT NULL DEFAULT \'default\', content JSONB NOT NULL DEFAULT \'{}\', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), created_by UUID REFERENCES auth.users(id)); CREATE UNIQUE INDEX IF NOT EXISTS ux_cdt_team_canvas_workspace_name ON cdt_team_canvas(workspace_id, name);',
        });
      }
      throw error;
    }
    res.json({ id: data.id, name: data.name, content: data.content ?? {}, updated_at: data.updated_at });
  } catch (error: any) {
    console.error('Error updating team canvas:', error);
    res.status(500).json({ error: error.message || 'Failed to update team canvas' });
  }
});

export default router;
