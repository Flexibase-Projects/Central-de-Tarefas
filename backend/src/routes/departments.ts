import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireAdmin } from '../middleware/require-admin.js';

const router = express.Router();
router.use(requireAdmin);

function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e?.code === '42P01' || !!(e?.message && /relation.*does not exist/i.test(e.message));
}

/** GET /api/departments */
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('cdt_departments').select('*').order('name');
    if (error) {
      if (isMissingTable(error)) {
        return res.status(503).json({ error: 'Execute 003_cost_management.sql', code: 'MIGRATION_REQUIRED' });
      }
      throw error;
    }
    res.json(data ?? []);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** GET /api/departments/:id */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cdt_departments').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** POST /api/departments */
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body ?? {};
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' });
    const { data, error } = await supabase
      .from('cdt_departments')
      .insert({ name, description: description ?? null })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** PATCH /api/departments/:id */
router.patch('/:id', async (req, res) => {
  try {
    const { name, description } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    const { data, error } = await supabase.from('cdt_departments').update(updates).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** DELETE /api/departments/:id */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('cdt_departments').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** GET /api/departments/:id/costs */
router.get('/:id/costs', async (req, res) => {
  try {
    const { data: links, error } = await supabase
      .from('cdt_department_costs')
      .select('*')
      .eq('department_id', req.params.id);
    if (error) throw error;
    const list = links ?? [];
    const costIds = list.map((l: { cost_id: string }) => l.cost_id);
    let imap = new Map<string, Record<string, unknown>>();
    if (costIds.length > 0) {
      const { data: items } = await supabase.from('cdt_cost_items').select('*').in('id', costIds);
      imap = new Map(
        (items ?? []).map((it: { id: string }) => [it.id, it as unknown as Record<string, unknown>])
      );
    }
    const enriched = list.map((l: Record<string, unknown>) => ({
      ...l,
      cost_item: imap.get(l.cost_id as string) ?? null,
    }));
    res.json(enriched);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** POST /api/departments/:id/costs */
router.post('/:id/costs', async (req, res) => {
  try {
    const { cost_id, link_status } = req.body ?? {};
    if (!cost_id) return res.status(400).json({ error: 'cost_id is required' });
    const { data, error } = await supabase
      .from('cdt_department_costs')
      .insert({
        department_id: req.params.id,
        cost_id,
        link_status: link_status ?? 'ativo',
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Link already exists' });
      throw error;
    }
    res.status(201).json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** DELETE /api/departments/:id/costs/:costId */
router.delete('/:id/costs/:costId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('cdt_department_costs')
      .delete()
      .eq('department_id', req.params.id)
      .eq('cost_id', req.params.costId);
    if (error) throw error;
    res.status(204).send();
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** GET /api/departments/:id/members */
router.get('/:id/members', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cdt_department_members').select('*').eq('department_id', req.params.id);
    if (error) throw error;
    const members = data ?? [];
    const userIds = members.map((m: { user_id: string }) => m.user_id);
    if (userIds.length === 0) return res.json([]);
    const { data: users } = await supabase.from('cdt_users').select('id, name, email, avatar_url').in('id', userIds);
    const umap = new Map(
      (users ?? []).map((u: { id: string; name: string; email: string; avatar_url: string | null }) => [u.id, u])
    );
    const enriched = members.map((m: Record<string, unknown>) => ({
      ...m,
      user: umap.get(m.user_id as string) ?? null,
    }));
    res.json(enriched);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** POST /api/departments/:id/members */
router.post('/:id/members', async (req, res) => {
  try {
    const { user_id, individual_monthly_cost, role_label } = req.body ?? {};
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    const { data, error } = await supabase
      .from('cdt_department_members')
      .insert({
        department_id: req.params.id,
        user_id,
        individual_monthly_cost: individual_monthly_cost ?? 0,
        role_label: role_label ?? null,
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'User already in department' });
      throw error;
    }
    res.status(201).json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** PATCH /api/departments/:id/members/:userId */
router.patch('/:id/members/:userId', async (req, res) => {
  try {
    const { individual_monthly_cost, role_label } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (individual_monthly_cost !== undefined) updates.individual_monthly_cost = individual_monthly_cost;
    if (role_label !== undefined) updates.role_label = role_label;
    const { data, error } = await supabase
      .from('cdt_department_members')
      .update(updates)
      .eq('department_id', req.params.id)
      .eq('user_id', req.params.userId)
      .select('*')
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** DELETE /api/departments/:id/members/:userId */
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('cdt_department_members')
      .delete()
      .eq('department_id', req.params.id)
      .eq('user_id', req.params.userId);
    if (error) throw error;
    res.status(204).send();
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
