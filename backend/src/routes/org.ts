import express from 'express';
import { supabase } from '../config/supabase.js';
import { getWorkspaceContext } from '../middleware/workspace.js';
import { requireWorkspaceManager } from '../middleware/require-workspace-manager.js';

const router = express.Router();
router.use(requireWorkspaceManager);

type OrgRow = {
  id: string;
  person_name: string;
  reports_to_id: string | null;
  job_title: string | null;
  display_order: number;
  department_id: string | null;
  monthly_salary: unknown;
  monthly_cost: unknown;
};

export type OrgTreeNode = {
  orgEntryId: string;
  personName: string;
  jobTitle: string | null;
  displayOrder: number;
  departmentId: string | null;
  monthlySalary: number | null;
  monthlyCost: number | null;
  children: OrgTreeNode[];
};

function nMoney(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e?.code === '42P01' || !!(e?.message && /relation.*does not exist/i.test(e.message));
}

function isOrgSchemaMismatch(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? '').toLowerCase();
  return (
    (msg.includes('person_name') && (msg.includes('does not exist') || msg.includes('schema cache'))) ||
    (msg.includes('user_id') && msg.includes('does not exist')) ||
    (msg.includes('monthly_salary') && (msg.includes('does not exist') || msg.includes('schema cache'))) ||
    (msg.includes('monthly_cost') && (msg.includes('does not exist') || msg.includes('schema cache')))
  );
}

function getRequiredWorkspaceId(req: express.Request, res: express.Response): string | null {
  const workspaceId = getWorkspaceContext(req)?.workspace.id ?? null;
  if (!workspaceId) {
    res.status(400).json({ error: 'Workspace is required' });
    return null;
  }
  return workspaceId;
}

function buildChildrenMap(rows: OrgRow[]): Map<string, OrgRow[]> {
  const byParent = new Map<string, OrgRow[]>();
  for (const row of rows) {
    const key = row.reports_to_id ?? '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)?.push(row);
  }
  for (const list of byParent.values()) {
    list.sort((left, right) => {
      if (left.display_order !== right.display_order) return left.display_order - right.display_order;
      return left.person_name.localeCompare(right.person_name, 'pt-BR');
    });
  }
  return byParent;
}

function rowToTreeNode(row: OrgRow, byParent: Map<string, OrgRow[]>): OrgTreeNode {
  const children = byParent.get(row.id) ?? [];
  return {
    orgEntryId: row.id,
    personName: row.person_name,
    jobTitle: row.job_title,
    displayOrder: row.display_order,
    departmentId: row.department_id,
    monthlySalary: nMoney(row.monthly_salary),
    monthlyCost: nMoney(row.monthly_cost),
    children: children.map((child) => rowToTreeNode(child, byParent)),
  };
}

function collectDescendantEntryIds(entryId: string, byParent: Map<string, OrgRow[]>): string[] {
  const out: string[] = [entryId];
  for (const child of byParent.get(entryId) ?? []) {
    out.push(...collectDescendantEntryIds(child.id, byParent));
  }
  return out;
}

function rowByIdMap(rows: OrgRow[]): Map<string, OrgRow> {
  return new Map(rows.map((row) => [row.id, row]));
}

function flattenSubtreeDfs(
  rootId: string,
  byParent: Map<string, OrgRow[]>,
  rowMap: Map<string, OrgRow>,
): OrgRow[] {
  const out: OrgRow[] = [];

  function walk(id: string) {
    const row = rowMap.get(id);
    if (!row) return;
    out.push(row);
    for (const child of byParent.get(id) ?? []) {
      walk(child.id);
    }
  }

  walk(rootId);
  return out;
}

function parseMoneyBody(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100) / 100;
}

async function fetchOrgRows(workspaceId: string): Promise<{ rows: OrgRow[]; error: unknown }> {
  const { data, error } = await supabase
    .from('cdt_user_org')
    .select(
      'id, person_name, reports_to_id, job_title, display_order, department_id, monthly_salary, monthly_cost',
    )
    .eq('workspace_id', workspaceId)
    .order('display_order', { ascending: true });

  if (error) return { rows: [], error };
  return { rows: (data ?? []) as OrgRow[], error: null };
}

async function loadDepartmentNames(
  workspaceId: string,
  departmentIds: string[],
): Promise<Map<string, string>> {
  if (departmentIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from('cdt_departments')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .in('id', departmentIds);

  if (error) throw error;

  return new Map(
    ((data ?? []) as Array<{ id: string; name: string }>).map((department) => [
      department.id,
      department.name,
    ]),
  );
}

/** GET /api/org/tree */
router.get('/tree', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { rows, error } = await fetchOrgRows(workspaceId);
    if (error) {
      if (isMissingTable(error)) {
        return res.status(503).json({
          error: 'Tabela cdt_user_org nÃ£o existe. Execute backend/migrations/003_cost_management.sql no Supabase.',
          code: 'MIGRATION_REQUIRED',
        });
      }
      if (isOrgSchemaMismatch(error)) {
        return res.status(503).json({
          error:
            'Organograma desatualizado: execute migraÃ§Ãµes 004 e 005 em backend/migrations no Supabase (SQL Editor).',
          code: 'MIGRATION_REQUIRED',
        });
      }
      throw error;
    }

    const byParent = buildChildrenMap(rows);
    const roots = byParent.get('__root__') ?? [];
    res.json({ tree: roots.map((row) => rowToTreeNode(row, byParent)) });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('org/tree:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch org tree' });
  }
});

/** GET /api/org/entries â€” lista plana (CRUD) */
router.get('/entries', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { data, error } = await supabase
      .from('cdt_user_org')
      .select(
        'id, person_name, reports_to_id, job_title, display_order, department_id, monthly_salary, monthly_cost, created_at, updated_at',
      )
      .eq('workspace_id', workspaceId)
      .order('display_order', { ascending: true });

    if (error) {
      if (isMissingTable(error)) {
        return res.status(503).json({
          error: 'Execute backend/migrations/003_cost_management.sql no Supabase.',
          code: 'MIGRATION_REQUIRED',
        });
      }
      if (isOrgSchemaMismatch(error)) {
        return res.status(503).json({
          error: 'Execute backend/migrations/005_org_person_salary_cost.sql no Supabase.',
          code: 'MIGRATION_REQUIRED',
        });
      }
      throw error;
    }

    res.json(data ?? []);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('org/entries:', err);
    res.status(500).json({ error: err.message || 'Failed to list org entries' });
  }
});

/** POST /api/org/entries */
router.post('/entries', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const {
      person_name,
      reports_to_id,
      job_title,
      display_order,
      department_id,
      monthly_salary,
      monthly_cost,
    } = req.body ?? {};

    const name = typeof person_name === 'string' ? person_name.trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'person_name is required' });
    }

    const parentId =
      reports_to_id && typeof reports_to_id === 'string' && reports_to_id.trim()
        ? reports_to_id.trim()
        : null;
    if (parentId) {
      const { data: parentRow } = await supabase
        .from('cdt_user_org')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('id', parentId)
        .maybeSingle();

      if (!parentRow) {
        return res.status(400).json({ error: 'reports_to_id: entrada pai nÃ£o encontrada' });
      }
    }

    const salary = monthly_salary !== undefined ? parseMoneyBody(monthly_salary) : null;
    const cost = monthly_cost !== undefined ? parseMoneyBody(monthly_cost) : null;
    if (salary === undefined) return res.status(400).json({ error: 'monthly_salary invÃ¡lido' });
    if (cost === undefined) return res.status(400).json({ error: 'monthly_cost invÃ¡lido' });

    const payload = {
      workspace_id: workspaceId,
      person_name: name,
      reports_to_id: parentId,
      job_title: typeof job_title === 'string' && job_title.trim() ? job_title.trim() : null,
      display_order: typeof display_order === 'number' ? display_order : 0,
      department_id: department_id && typeof department_id === 'string' ? department_id : null,
      monthly_salary: salary,
      monthly_cost: cost,
    };

    const { data, error } = await supabase.from('cdt_user_org').insert(payload).select('*').single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('org POST entries:', err);
    res.status(500).json({ error: err.message || 'Failed to create org entry' });
  }
});

/** PATCH /api/org/entries/:id */
router.patch('/entries/:id', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { id } = req.params;
    const {
      reports_to_id,
      job_title,
      display_order,
      department_id,
      person_name,
      monthly_salary,
      monthly_cost,
    } = req.body ?? {};

    const updates: Record<string, unknown> = {};

    if (reports_to_id !== undefined) {
      const value = reports_to_id === null || reports_to_id === '' ? null : String(reports_to_id);
      if (value && value === id) {
        return res.status(400).json({ error: 'reports_to_id cannot equal own id' });
      }
      if (value) {
        const { data: parentRow } = await supabase
          .from('cdt_user_org')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('id', value)
          .maybeSingle();

        if (!parentRow) {
          return res.status(400).json({ error: 'reports_to_id: entrada pai nÃ£o encontrada' });
        }
      }
      updates.reports_to_id = value;
    }

    if (job_title !== undefined) {
      updates.job_title = job_title === null || job_title === '' ? null : String(job_title);
    }
    if (display_order !== undefined) {
      updates.display_order = Number(display_order);
    }
    if (department_id !== undefined) {
      updates.department_id = department_id === null || department_id === '' ? null : department_id;
    }
    if (person_name !== undefined) {
      const name = typeof person_name === 'string' ? person_name.trim() : '';
      if (!name) return res.status(400).json({ error: 'person_name cannot be empty' });
      updates.person_name = name;
    }
    if (monthly_salary !== undefined) {
      const salary = parseMoneyBody(monthly_salary);
      if (salary === undefined) return res.status(400).json({ error: 'monthly_salary invÃ¡lido' });
      updates.monthly_salary = salary;
    }
    if (monthly_cost !== undefined) {
      const cost = parseMoneyBody(monthly_cost);
      if (cost === undefined) return res.status(400).json({ error: 'monthly_cost invÃ¡lido' });
      updates.monthly_cost = cost;
    }

    const { data, error } = await supabase
      .from('cdt_user_org')
      .update(updates)
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });

    res.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('org PATCH entries:', err);
    res.status(500).json({ error: err.message || 'Failed to update org entry' });
  }
});

/** DELETE /api/org/entries/:id */
router.delete('/entries/:id', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { error } = await supabase
      .from('cdt_user_org')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: unknown) {
    const err = error as Error;
    console.error('org DELETE entries:', err);
    res.status(500).json({ error: err.message || 'Failed to delete org entry' });
  }
});

/** GET /api/org/entry/:entryId/subtree */
router.get('/entry/:entryId/subtree', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { entryId } = req.params;
    const { data, error } = await supabase
      .from('cdt_user_org')
      .select('id, reports_to_id, display_order')
      .eq('workspace_id', workspaceId);

    if (error) {
      if (isMissingTable(error)) {
        return res.status(503).json({ error: 'Migration required', code: 'MIGRATION_REQUIRED' });
      }
      throw error;
    }

    const rows = (data ?? []) as Array<{ id: string; reports_to_id: string | null; display_order: number }>;
    const normalizedRows: OrgRow[] = rows.map((row) => ({
      id: row.id,
      person_name: '',
      reports_to_id: row.reports_to_id,
      job_title: null,
      display_order: row.display_order,
      department_id: null,
      monthly_salary: null,
      monthly_cost: null,
    }));

    const ids = collectDescendantEntryIds(entryId, buildChildrenMap(normalizedRows));
    res.json({ entryIds: ids });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('org subtree:', err);
    res.status(500).json({ error: err.message || 'Failed subtree' });
  }
});

/** DELETE /api/org/entry/:entryId/subtree */
router.delete('/entry/:entryId/subtree', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { entryId } = req.params;
    const { data, error } = await supabase
      .from('cdt_user_org')
      .select(
        'id, person_name, reports_to_id, job_title, display_order, department_id, monthly_salary, monthly_cost',
      )
      .eq('workspace_id', workspaceId);

    if (error) {
      if (isMissingTable(error)) {
        return res.status(503).json({ error: 'Migration required', code: 'MIGRATION_REQUIRED' });
      }
      throw error;
    }

    const rows = (data ?? []) as OrgRow[];
    const rowMap = rowByIdMap(rows);
    if (!rowMap.has(entryId)) {
      return res.status(404).json({ error: 'Entrada nÃ£o encontrada' });
    }

    const deleteIds = collectDescendantEntryIds(entryId, buildChildrenMap(rows));
    if (deleteIds.length === 0) {
      return res.status(404).json({ error: 'Nada para excluir' });
    }

    const { error: deleteError } = await supabase
      .from('cdt_user_org')
      .delete()
      .eq('workspace_id', workspaceId)
      .in('id', deleteIds);

    if (deleteError) throw deleteError;

    return res.json({
      deletedCount: deleteIds.length,
      deletedRootId: entryId,
      deletedIds: deleteIds,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('org DELETE subtree:', err);
    res.status(500).json({ error: err.message || 'Failed to delete subtree' });
  }
});

/** GET /api/org/entry/:entryId/summary */
router.get('/entry/:entryId/summary', async (req, res) => {
  try {
    const workspaceId = getRequiredWorkspaceId(req, res);
    if (!workspaceId) return;

    const { entryId } = req.params;
    const { rows, error: orgError } = await fetchOrgRows(workspaceId);
    if (orgError) {
      if (isMissingTable(orgError)) {
        return res.status(503).json({ error: 'Migration required', code: 'MIGRATION_REQUIRED' });
      }
      throw orgError;
    }

    const byParent = buildChildrenMap(rows);
    const rowMap = rowByIdMap(rows);
    const teamRows = flattenSubtreeDfs(entryId, byParent, rowMap);
    const departmentIds = [...new Set(teamRows.map((row) => row.department_id).filter(Boolean))] as string[];
    const departmentNameById = await loadDepartmentNames(workspaceId, departmentIds);

    let totalMonthlySalary = 0;
    let totalMonthlyCost = 0;
    const team = teamRows.map((row) => {
      const salary = nMoney(row.monthly_salary);
      const cost = nMoney(row.monthly_cost);
      if (salary != null) totalMonthlySalary += salary;
      if (cost != null) totalMonthlyCost += cost;

      return {
        orgEntryId: row.id,
        personName: row.person_name,
        jobTitle: row.job_title,
        displayOrder: row.display_order,
        departmentId: row.department_id,
        departmentName: row.department_id ? departmentNameById.get(row.department_id) ?? null : null,
        monthlySalary: salary,
        monthlyCost: cost,
        isSelectedRoot: row.id === entryId,
      };
    });

    res.json({
      headcount: team.length,
      totalMonthlySalary: Math.round(totalMonthlySalary * 100) / 100,
      totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
      team,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('org summary:', err);
    res.status(500).json({ error: err.message || 'Failed summary' });
  }
});

export default router;
