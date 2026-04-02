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

/** GET /api/cost-management/graph */
router.get('/graph', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const [{ data: departments }, { data: links }, { data: members }, { data: costItems }] = await Promise.all([
      supabase
        .from('cdt_departments')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name'),
      supabase
        .from('cdt_department_costs')
        .select('*')
        .eq('workspace_id', workspaceId),
      supabase
        .from('cdt_department_members')
        .select('*')
        .eq('workspace_id', workspaceId),
      supabase
        .from('cdt_cost_items')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name'),
    ]);

    const userIds = [...new Set((members ?? []).map((member: { user_id: string }) => member.user_id))];
    let users: { id: string; name: string; email: string; avatar_url: string | null }[] = [];

    if (userIds.length > 0) {
      const { data: userRows } = await supabase
        .from('cdt_users')
        .select('id, name, email, avatar_url')
        .in('id', userIds);
      users = userRows ?? [];
    }

    const userById = new Map(users.map((user) => [user.id, user] as const));
    const enrichedMembers = (members ?? []).map((member: Record<string, unknown>) => ({
      ...member,
      user: userById.get(member.user_id as string) ?? null,
    }));

    res.json({
      departments: departments ?? [],
      departmentCosts: links ?? [],
      members: enrichedMembers,
      costItems: costItems ?? [],
    });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** GET /api/cost-management/summary */
router.get('/summary', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const [{ data: departments }, { data: costLinks }, { data: members }, { data: costItems }] = await Promise.all([
      supabase
        .from('cdt_departments')
        .select('id, name')
        .eq('workspace_id', workspaceId),
      supabase
        .from('cdt_department_costs')
        .select('department_id, cost_id')
        .eq('workspace_id', workspaceId),
      supabase
        .from('cdt_department_members')
        .select('department_id, user_id, individual_monthly_cost')
        .eq('workspace_id', workspaceId),
      supabase
        .from('cdt_cost_items')
        .select('id, name, amount, status, is_active, category, activities_description, result_savings_description, result_savings_amount')
        .eq('workspace_id', workspaceId),
    ]);

    const deptList = departments ?? [];
    const links = costLinks ?? [];
    const mems = members ?? [];
    const items = costItems ?? [];
    const costById = new Map(items.map((cost: { id: string }) => [cost.id, cost]));

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

    for (const department of deptList as Array<{ id: string; name: string }>) {
      byDept[department.id] = {
        departmentId: department.id,
        departmentName: department.name,
        fixedCostsTotal: 0,
        peopleCostsTotal: 0,
        total: 0,
        costItemCount: 0,
        memberCount: 0,
      };
    }

    for (const link of links as Array<{ department_id: string; cost_id: string }>) {
      const row = byDept[link.department_id];
      if (!row) continue;

      const costItem = costById.get(link.cost_id) as { amount?: number; is_active?: boolean } | undefined;
      if (costItem && costItem.is_active !== false) {
        row.fixedCostsTotal += Number(costItem.amount) || 0;
      }
      row.costItemCount += 1;
    }

    for (const member of mems as Array<{ department_id: string; individual_monthly_cost: number }>) {
      const row = byDept[member.department_id];
      if (!row) continue;

      row.peopleCostsTotal += Number(member.individual_monthly_cost) || 0;
      row.memberCount += 1;
    }

    for (const key of Object.keys(byDept)) {
      const row = byDept[key];
      row.total = Math.round((row.fixedCostsTotal + row.peopleCostsTotal) * 100) / 100;
      row.fixedCostsTotal = Math.round(row.fixedCostsTotal * 100) / 100;
      row.peopleCostsTotal = Math.round(row.peopleCostsTotal * 100) / 100;
    }

    const statusTotals: Record<string, { count: number; amount: number }> = {};
    for (const costItem of items as Array<{ status: string; amount: number }>) {
      if (!statusTotals[costItem.status]) {
        statusTotals[costItem.status] = { count: 0, amount: 0 };
      }
      statusTotals[costItem.status].count += 1;
      statusTotals[costItem.status].amount += Number(costItem.amount) || 0;
    }

    res.json({
      departments: Object.values(byDept),
      costItemsByStatus: statusTotals,
      costItemsNarrative: items.map((costItem: Record<string, unknown>) => ({
        id: costItem.id,
        name: costItem.name,
        amount: costItem.amount,
        status: costItem.status,
        category: costItem.category,
        is_active: costItem.is_active,
        activities_description: costItem.activities_description,
        result_savings_description: costItem.result_savings_description,
        result_savings_amount: costItem.result_savings_amount,
      })),
    });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
