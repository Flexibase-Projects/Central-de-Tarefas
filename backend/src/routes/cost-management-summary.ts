import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireAdmin } from '../middleware/require-admin.js';

const router = express.Router();
router.use(requireAdmin);

/** GET /api/cost-management/graph — dados agregados para árvore de custos */
router.get('/graph', async (_req, res) => {
  try {
    const [{ data: departments }, { data: links }, { data: members }, { data: costItems }] = await Promise.all([
      supabase.from('cdt_departments').select('*').order('name'),
      supabase.from('cdt_department_costs').select('*'),
      supabase.from('cdt_department_members').select('*'),
      supabase.from('cdt_cost_items').select('*').order('name'),
    ]);

    const userIds = [...new Set((members ?? []).map((m: { user_id: string }) => m.user_id))];
    let users: { id: string; name: string; email: string; avatar_url: string | null }[] = [];
    if (userIds.length > 0) {
      const { data: u } = await supabase.from('cdt_users').select('id, name, email, avatar_url').in('id', userIds);
      users = u ?? [];
    }
    const umap = new Map(users.map((u) => [u.id, u]));

    const enrichedMembers = (members ?? []).map((m: Record<string, unknown>) => ({
      ...m,
      user: umap.get(m.user_id as string) ?? null,
    }));

    res.json({
      departments: departments ?? [],
      departmentCosts: links ?? [],
      members: enrichedMembers,
      costItems: costItems ?? [],
    });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** GET /api/cost-management/summary */
router.get('/summary', async (_req, res) => {
  try {
    const [{ data: departments }, { data: costLinks }, { data: members }, { data: costItems }] = await Promise.all([
      supabase.from('cdt_departments').select('id, name'),
      supabase.from('cdt_department_costs').select('department_id, cost_id'),
      supabase.from('cdt_department_members').select('department_id, user_id, individual_monthly_cost'),
      supabase.from('cdt_cost_items').select('id, name, amount, status, is_active, category, activities_description, result_savings_description, result_savings_amount'),
    ]);

    const deptList = departments ?? [];
    const links = costLinks ?? [];
    const mems = members ?? [];
    const items = costItems ?? [];

    const costById = new Map(items.map((c: { id: string }) => [c.id, c]));

    const byDept: Record<
      string,
      {
        departmentId: string;
        departmentName: string;
        fixedCostsTotal: number;
        peopleCostsTotal: number;
        total: number;
        costItemCount: number;
        memberCount: number;
      }
    > = {};

    for (const d of deptList as { id: string; name: string }[]) {
      byDept[d.id] = {
        departmentId: d.id,
        departmentName: d.name,
        fixedCostsTotal: 0,
        peopleCostsTotal: 0,
        total: 0,
        costItemCount: 0,
        memberCount: 0,
      };
    }

    for (const l of links as { department_id: string; cost_id: string }[]) {
      const row = byDept[l.department_id];
      if (!row) continue;
      const ci = costById.get(l.cost_id) as { amount?: number; is_active?: boolean } | undefined;
      if (ci && ci.is_active !== false) {
        row.fixedCostsTotal += Number(ci.amount) || 0;
      }
      row.costItemCount += 1;
    }

    for (const m of mems as { department_id: string; individual_monthly_cost: number }[]) {
      const row = byDept[m.department_id];
      if (!row) continue;
      row.peopleCostsTotal += Number(m.individual_monthly_cost) || 0;
      row.memberCount += 1;
    }

    for (const k of Object.keys(byDept)) {
      const r = byDept[k];
      r.total = Math.round((r.fixedCostsTotal + r.peopleCostsTotal) * 100) / 100;
      r.fixedCostsTotal = Math.round(r.fixedCostsTotal * 100) / 100;
      r.peopleCostsTotal = Math.round(r.peopleCostsTotal * 100) / 100;
    }

    const statusTotals: Record<string, { count: number; amount: number }> = {};
    for (const c of items as { status: string; amount: number }[]) {
      if (!statusTotals[c.status]) statusTotals[c.status] = { count: 0, amount: 0 };
      statusTotals[c.status].count += 1;
      statusTotals[c.status].amount += Number(c.amount) || 0;
    }

    res.json({
      departments: Object.values(byDept),
      costItemsByStatus: statusTotals,
      costItemsNarrative: items.map((c: Record<string, unknown>) => ({
        id: c.id,
        name: c.name,
        amount: c.amount,
        status: c.status,
        category: c.category,
        is_active: c.is_active,
        activities_description: c.activities_description,
        result_savings_description: c.result_savings_description,
        result_savings_amount: c.result_savings_amount,
      })),
    });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
