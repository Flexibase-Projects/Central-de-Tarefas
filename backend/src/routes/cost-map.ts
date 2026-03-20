import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireAdmin } from '../middleware/require-admin.js';

const router = express.Router();
router.use(requireAdmin);

/** GET /api/cost-map/layout */
router.get('/layout', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('cdt_cost_map_layout').select('*');
    if (error) throw error;
    res.json(data ?? []);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** PUT /api/cost-map/layout */
router.put('/layout', async (req, res) => {
  try {
    const rows = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'Body must be an array of { entity_type, entity_id, position_x, position_y }' });
    }
    for (const r of rows) {
      if (!r.entity_type || !r.entity_id) {
        return res.status(400).json({ error: 'Each row needs entity_type and entity_id' });
      }
    }
    const upserts = rows.map((r: Record<string, unknown>) => ({
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      position_x: Number(r.position_x) || 0,
      position_y: Number(r.position_y) || 0,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('cdt_cost_map_layout').upsert(upserts, {
      onConflict: 'entity_type,entity_id',
    });
    if (error) throw error;
    const { data } = await supabase.from('cdt_cost_map_layout').select('*');
    res.json(data ?? []);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
