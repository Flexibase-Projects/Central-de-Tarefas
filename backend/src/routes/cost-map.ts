import express from 'express';
import { supabase } from '../config/supabase.js';
import { getWorkspaceContext } from '../middleware/workspace.js';
import { requireWorkspaceManager } from '../middleware/require-workspace-manager.js';

const router = express.Router();
router.use(requireWorkspaceManager);

function getRequiredWorkspaceId(req: express.Request, res: express.Response): string | null {
  const workspaceId = getWorkspaceContext(req)?.workspace.id ?? null;
  if (!workspaceId) {
    res.status(400).json({ error: 'Workspace is required' });
    return null;
  }
  return workspaceId;
}

/** GET /api/cost-map/layout */
router.get('/layout', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { data, error } = await supabase
      .from('cdt_cost_map_layout')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    res.json(data ?? []);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** PUT /api/cost-map/layout */
router.put('/layout', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const rows = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({
        error: 'Body must be an array of { entity_type, entity_id, position_x, position_y }',
      });
    }

    for (const row of rows) {
      if (!row.entity_type || !row.entity_id) {
        return res.status(400).json({ error: 'Each row needs entity_type and entity_id' });
      }
    }

    const upserts = rows.map((row: Record<string, unknown>) => ({
      workspace_id: workspaceId,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      position_x: Number(row.position_x) || 0,
      position_y: Number(row.position_y) || 0,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('cdt_cost_map_layout')
      .upsert(upserts, { onConflict: 'workspace_id,entity_type,entity_id' });

    if (error) throw error;

    const { data } = await supabase
      .from('cdt_cost_map_layout')
      .select('*')
      .eq('workspace_id', workspaceId);

    res.json(data ?? []);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
