import express from 'express';
import { supabase } from '../config/supabase.js';
import { getWorkspaceContext } from '../middleware/workspace.js';
import { requireWorkspaceManager } from '../middleware/require-workspace-manager.js';

const router = express.Router();
router.use(requireWorkspaceManager);

const VALID_STATUS = ['analise', 'ativo', 'desativado', 'cancelado'] as const;
const VALID_CATEGORY = ['ferramenta', 'licenca', 'infraestrutura', 'servico', 'outro'] as const;

function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e?.code === '42P01' || !!(e?.message && /relation.*does not exist/i.test(e.message));
}

function getRequiredWorkspaceId(req: express.Request, res: express.Response): string | null {
  const workspaceId = getWorkspaceContext(req)?.workspace.id ?? null;
  if (!workspaceId) {
    res.status(400).json({ error: 'Workspace is required' });
    return null;
  }
  return workspaceId;
}

/** GET /api/cost-items */
router.get('/', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    let query = supabase
      .from('cdt_cost_items')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');

    const { status, is_active, category, department_id } = req.query;
    if (typeof status === 'string' && VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
      query = query.eq('status', status);
    }
    if (is_active === 'true') query = query.eq('is_active', true);
    if (is_active === 'false') query = query.eq('is_active', false);
    if (typeof category === 'string' && VALID_CATEGORY.includes(category as (typeof VALID_CATEGORY)[number])) {
      query = query.eq('category', category);
    }
    if (typeof department_id === 'string') {
      const { data: links } = await supabase
        .from('cdt_department_costs')
        .select('cost_id')
        .eq('workspace_id', workspaceId)
        .eq('department_id', department_id);

      const ids = (links ?? []).map((link: { cost_id: string }) => link.cost_id);
      if (ids.length === 0) return res.json([]);
      query = query.in('id', ids);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTable(error)) {
        return res.status(503).json({ error: 'Execute 003_cost_management.sql', code: 'MIGRATION_REQUIRED' });
      }
      throw error;
    }

    res.json(data ?? []);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** GET /api/cost-items/:id */
router.get('/:id', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { data, error } = await supabase
      .from('cdt_cost_items')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });

    res.json(data);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** POST /api/cost-items */
router.post('/', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const body = req.body ?? {};
    const name = body.name;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }

    const payload = {
      workspace_id: workspaceId,
      name,
      description: body.description ?? null,
      amount: body.amount != null ? Number(body.amount) : 0,
      currency: typeof body.currency === 'string' ? body.currency : 'BRL',
      status: VALID_STATUS.includes(body.status) ? body.status : 'analise',
      is_active: body.is_active !== false,
      category: VALID_CATEGORY.includes(body.category) ? body.category : 'outro',
      activities_description: body.activities_description ?? null,
      result_savings_description: body.result_savings_description ?? null,
      result_savings_amount: body.result_savings_amount != null ? Number(body.result_savings_amount) : null,
    };

    const { data, error } = await supabase.from('cdt_cost_items').insert(payload).select('*').single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** PATCH /api/cost-items/:id */
router.patch('/:id', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const body = req.body ?? {};
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

    for (const field of fields) {
      if (body[field] !== undefined) {
        updates[field] =
          field === 'amount' || field === 'result_savings_amount'
            ? body[field] == null
              ? null
              : Number(body[field])
            : body[field];
      }
    }

    const { data, error } = await supabase
      .from('cdt_cost_items')
      .update(updates)
      .eq('workspace_id', workspaceId)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });

    res.json(data);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** DELETE /api/cost-items/:id */
router.delete('/:id', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { error } = await supabase
      .from('cdt_cost_items')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** GET /api/cost-items/:id/allocations */
router.get('/:id/allocations', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { data, error } = await supabase
      .from('cdt_person_cost_allocations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('cost_id', req.params.id);

    if (error) throw error;
    res.json(data ?? []);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** POST /api/cost-items/:id/allocations */
router.post('/:id/allocations', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { department_id, user_id, allocation_pct, amount } = req.body ?? {};
    if (!department_id || !user_id) {
      return res.status(400).json({ error: 'department_id and user_id required' });
    }

    const { data, error } = await supabase
      .from('cdt_person_cost_allocations')
      .insert({
        workspace_id: workspaceId,
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
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** DELETE /api/cost-items/:id/allocations/:allocationId */
router.delete('/:id/allocations/:allocationId', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { error } = await supabase
      .from('cdt_person_cost_allocations')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', req.params.allocationId);

    if (error) throw error;
    res.status(204).send();
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
