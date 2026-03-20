import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireAdmin } from '../middleware/require-admin.js';

const router = express.Router();
router.use(requireAdmin);

const VALID_STATUS = ['analise', 'ativo', 'desativado', 'cancelado'] as const;
const VALID_CATEGORY = ['ferramenta', 'licenca', 'infraestrutura', 'servico', 'outro'] as const;

function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e?.code === '42P01' || !!(e?.message && /relation.*does not exist/i.test(e.message));
}

/** GET /api/cost-items */
router.get('/', async (req, res) => {
  try {
    let q = supabase.from('cdt_cost_items').select('*').order('name');
    const { status, is_active, category, department_id } = req.query;
    if (typeof status === 'string' && VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
      q = q.eq('status', status);
    }
    if (is_active === 'true') q = q.eq('is_active', true);
    if (is_active === 'false') q = q.eq('is_active', false);
    if (typeof category === 'string' && VALID_CATEGORY.includes(category as (typeof VALID_CATEGORY)[number])) {
      q = q.eq('category', category);
    }
    if (typeof department_id === 'string') {
      const { data: links } = await supabase.from('cdt_department_costs').select('cost_id').eq('department_id', department_id);
      const ids = (links ?? []).map((l: { cost_id: string }) => l.cost_id);
      if (ids.length === 0) return res.json([]);
      q = q.in('id', ids);
    }
    const { data, error } = await q;
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

/** GET /api/cost-items/:id */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cdt_cost_items').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** POST /api/cost-items */
router.post('/', async (req, res) => {
  try {
    const b = req.body ?? {};
    const name = b.name;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' });
    const payload = {
      name,
      description: b.description ?? null,
      amount: b.amount != null ? Number(b.amount) : 0,
      currency: typeof b.currency === 'string' ? b.currency : 'BRL',
      status: VALID_STATUS.includes(b.status) ? b.status : 'analise',
      is_active: b.is_active !== false,
      category: VALID_CATEGORY.includes(b.category) ? b.category : 'outro',
      activities_description: b.activities_description ?? null,
      result_savings_description: b.result_savings_description ?? null,
      result_savings_amount: b.result_savings_amount != null ? Number(b.result_savings_amount) : null,
    };
    const { data, error } = await supabase.from('cdt_cost_items').insert(payload).select('*').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** PATCH /api/cost-items/:id */
router.patch('/:id', async (req, res) => {
  try {
    const b = req.body ?? {};
    const updates: Record<string, unknown> = {};
    const fields = [
      'name',
      'description',
      'amount',
      'currency',
      'status',
      'is_active',
      'category',
      'activities_description',
      'result_savings_description',
      'result_savings_amount',
    ] as const;
    for (const f of fields) {
      if (b[f] !== undefined) {
        if (f === 'amount' || f === 'result_savings_amount') updates[f] = b[f] == null ? null : Number(b[f]);
        else updates[f] = b[f];
      }
    }
    const { data, error } = await supabase.from('cdt_cost_items').update(updates).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** DELETE /api/cost-items/:id */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('cdt_cost_items').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** GET /api/cost-items/:id/allocations */
router.get('/:id/allocations', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cdt_person_cost_allocations').select('*').eq('cost_id', req.params.id);
    if (error) throw error;
    res.json(data ?? []);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** POST /api/cost-items/:id/allocations */
router.post('/:id/allocations', async (req, res) => {
  try {
    const { department_id, user_id, allocation_pct, amount } = req.body ?? {};
    if (!department_id || !user_id) return res.status(400).json({ error: 'department_id and user_id required' });
    const { data, error } = await supabase
      .from('cdt_person_cost_allocations')
      .insert({
        cost_id: req.params.id,
        department_id,
        user_id,
        allocation_pct: allocation_pct != null ? Number(allocation_pct) : null,
        amount: amount != null ? Number(amount) : null,
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Allocation exists' });
      throw error;
    }
    res.status(201).json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** DELETE /api/cost-items/:id/allocations/:allocationId */
router.delete('/:id/allocations/:allocationId', async (req, res) => {
  try {
    const { error } = await supabase.from('cdt_person_cost_allocations').delete().eq('id', req.params.allocationId);
    if (error) throw error;
    res.status(204).send();
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
