import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireAdmin } from '../middleware/require-admin.js';

const router = express.Router();
router.use(requireAdmin);

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

function buildChildrenMap(rows: OrgRow[]): Map<string, OrgRow[]> {
  const byParent = new Map<string, OrgRow[]>();
  for (const r of rows) {
    const key = r.reports_to_id ?? '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(r);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => {
      if (a.display_order !== b.display_order) return a.display_order - b.display_order;
      return a.person_name.localeCompare(b.person_name, 'pt-BR');
    });
  }
  return byParent;
}

function rowToTreeNode(r: OrgRow, byParent: Map<string, OrgRow[]>): OrgTreeNode {
  const kids = byParent.get(r.id) ?? [];
  return {
    orgEntryId: r.id,
    personName: r.person_name,
    jobTitle: r.job_title,
    displayOrder: r.display_order,
    departmentId: r.department_id,
    monthlySalary: nMoney(r.monthly_salary),
    monthlyCost: nMoney(r.monthly_cost),
    children: kids.map((k) => rowToTreeNode(k, byParent)),
  };
}

function collectDescendantEntryIds(entryId: string, byParent: Map<string, OrgRow[]>): string[] {
  const out: string[] = [entryId];
  const kids = byParent.get(entryId) ?? [];
  for (const k of kids) {
    out.push(...collectDescendantEntryIds(k.id, byParent));
  }
  return out;
}

function rowByIdMap(rows: OrgRow[]): Map<string, OrgRow> {
  return new Map(rows.map((r) => [r.id, r]));
}

/** Ordem em profundidade (pai antes dos filhos), a partir do nó raiz da seleção */
function flattenSubtreeDfs(rootId: string, byParent: Map<string, OrgRow[]>, rmap: Map<string, OrgRow>): OrgRow[] {
  const out: OrgRow[] = [];
  function walk(id: string) {
    const r = rmap.get(id);
    if (!r) return;
    out.push(r);
    for (const c of byParent.get(id) ?? []) walk(c.id);
  }
  walk(rootId);
  return out;
}

function parseMoneyBody(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100) / 100;
}

async function fetchOrgRows(): Promise<{ rows: OrgRow[]; error: unknown }> {
  const { data, error } = await supabase
    .from('cdt_user_org')
    .select(
      'id, person_name, reports_to_id, job_title, display_order, department_id, monthly_salary, monthly_cost'
    )
    .order('display_order', { ascending: true });
  if (error) return { rows: [], error };
  return { rows: (data ?? []) as OrgRow[], error: null };
}

/** GET /api/org/tree */
router.get('/tree', async (_req, res) => {
  try {
    const { rows, error } = await fetchOrgRows();
    if (error) {
      if (isMissingTable(error)) {
        return res.status(503).json({
          error: 'Tabela cdt_user_org não existe. Execute backend/migrations/003_cost_management.sql no Supabase.',
          code: 'MIGRATION_REQUIRED',
        });
      }
      if (isOrgSchemaMismatch(error)) {
        return res.status(503).json({
          error:
            'Organograma desatualizado: execute migrações 004 e 005 em backend/migrations no Supabase (SQL Editor).',
          code: 'MIGRATION_REQUIRED',
        });
      }
      throw error;
    }
    const byParent = buildChildrenMap(rows);
    const roots = byParent.get('__root__') ?? [];
    const tree = roots.map((r) => rowToTreeNode(r, byParent));
    res.json({ tree });
  } catch (e: unknown) {
    const err = e as Error;
    console.error('org/tree:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch org tree' });
  }
});

/** GET /api/org/entries — lista plana (CRUD) */
router.get('/entries', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('cdt_user_org')
      .select(
        'id, person_name, reports_to_id, job_title, display_order, department_id, monthly_salary, monthly_cost, created_at, updated_at'
      )
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
  } catch (e: unknown) {
    const err = e as Error;
    console.error('org/entries:', err);
    res.status(500).json({ error: err.message || 'Failed to list org entries' });
  }
});

/** POST /api/org/entries */
router.post('/entries', async (req, res) => {
  try {
    const { person_name, reports_to_id, job_title, display_order, department_id, monthly_salary, monthly_cost } =
      req.body ?? {};
    const name = typeof person_name === 'string' ? person_name.trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'person_name is required' });
    }

    let parentId: string | null =
      reports_to_id && typeof reports_to_id === 'string' && reports_to_id.trim() ? reports_to_id.trim() : null;
    if (parentId) {
      const { data: parentRow } = await supabase.from('cdt_user_org').select('id').eq('id', parentId).maybeSingle();
      if (!parentRow) return res.status(400).json({ error: 'reports_to_id: entrada pai não encontrada' });
    }

    const ms = monthly_salary !== undefined ? parseMoneyBody(monthly_salary) : null;
    const mc = monthly_cost !== undefined ? parseMoneyBody(monthly_cost) : null;
    if (ms === undefined) return res.status(400).json({ error: 'monthly_salary inválido' });
    if (mc === undefined) return res.status(400).json({ error: 'monthly_cost inválido' });

    const payload = {
      person_name: name,
      reports_to_id: parentId,
      job_title: typeof job_title === 'string' && job_title.trim() ? job_title.trim() : null,
      display_order: typeof display_order === 'number' ? display_order : 0,
      department_id: department_id && typeof department_id === 'string' ? department_id : null,
      monthly_salary: ms,
      monthly_cost: mc,
    };

    const { data, error } = await supabase.from('cdt_user_org').insert(payload).select('*').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e: unknown) {
    const err = e as Error;
    console.error('org POST entries:', err);
    res.status(500).json({ error: err.message || 'Failed to create org entry' });
  }
});

/** PATCH /api/org/entries/:id */
router.patch('/entries/:id', async (req, res) => {
  try {
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
      const v = reports_to_id === null || reports_to_id === '' ? null : String(reports_to_id);
      if (v && v === id) {
        return res.status(400).json({ error: 'reports_to_id cannot equal own id' });
      }
      if (v) {
        const { data: parentRow } = await supabase.from('cdt_user_org').select('id').eq('id', v).maybeSingle();
        if (!parentRow) return res.status(400).json({ error: 'reports_to_id: entrada pai não encontrada' });
      }
      updates.reports_to_id = v;
    }
    if (job_title !== undefined) updates.job_title = job_title === null || job_title === '' ? null : String(job_title);
    if (display_order !== undefined) updates.display_order = Number(display_order);
    if (department_id !== undefined) {
      updates.department_id = department_id === null || department_id === '' ? null : department_id;
    }
    if (person_name !== undefined) {
      const n = typeof person_name === 'string' ? person_name.trim() : '';
      if (!n) return res.status(400).json({ error: 'person_name cannot be empty' });
      updates.person_name = n;
    }
    if (monthly_salary !== undefined) {
      const m = parseMoneyBody(monthly_salary);
      if (m === undefined) return res.status(400).json({ error: 'monthly_salary inválido' });
      updates.monthly_salary = m;
    }
    if (monthly_cost !== undefined) {
      const m = parseMoneyBody(monthly_cost);
      if (m === undefined) return res.status(400).json({ error: 'monthly_cost inválido' });
      updates.monthly_cost = m;
    }

    const { data, error } = await supabase.from('cdt_user_org').update(updates).eq('id', id).select('*').single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e: unknown) {
    const err = e as Error;
    console.error('org PATCH entries:', err);
    res.status(500).json({ error: err.message || 'Failed to update org entry' });
  }
});

/** DELETE /api/org/entries/:id */
router.delete('/entries/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('cdt_user_org').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e: unknown) {
    const err = e as Error;
    console.error('org DELETE entries:', err);
    res.status(500).json({ error: err.message || 'Failed to delete org entry' });
  }
});

/** GET /api/org/entry/:entryId/subtree */
router.get('/entry/:entryId/subtree', async (req, res) => {
  try {
    const { entryId } = req.params;
    const { data, error } = await supabase.from('cdt_user_org').select('id, reports_to_id, display_order');
    if (error) {
      if (isMissingTable(error)) {
        return res.status(503).json({ error: 'Migration required', code: 'MIGRATION_REQUIRED' });
      }
      throw error;
    }
    const rows = (data ?? []) as { id: string; reports_to_id: string | null; display_order: number }[];
    const asOrg: OrgRow[] = rows.map((r) => ({
      id: r.id,
      person_name: '',
      reports_to_id: r.reports_to_id,
      job_title: null,
      display_order: r.display_order,
      department_id: null,
      monthly_salary: null,
      monthly_cost: null,
    }));
    const byParent = buildChildrenMap(asOrg);
    const ids = collectDescendantEntryIds(entryId, byParent);
    res.json({ entryIds: ids });
  } catch (e: unknown) {
    const err = e as Error;
    console.error('org subtree:', err);
    res.status(500).json({ error: err.message || 'Failed subtree' });
  }
});

/** GET /api/org/entry/:entryId/summary */
router.get('/entry/:entryId/summary', async (req, res) => {
  try {
    const { entryId } = req.params;
    const { rows, error: orgError } = await fetchOrgRows();
    if (orgError) {
      if (isMissingTable(orgError)) {
        return res.status(503).json({ error: 'Migration required', code: 'MIGRATION_REQUIRED' });
      }
      throw orgError;
    }
    const byParent = buildChildrenMap(rows);
    const rmap = rowByIdMap(rows);
    const teamRows = flattenSubtreeDfs(entryId, byParent, rmap);
    const deptIds = [...new Set(teamRows.map((r) => r.department_id).filter(Boolean))] as string[];
    let deptNameById = new Map<string, string>();
    if (deptIds.length > 0) {
      const { data: depts } = await supabase.from('cdt_departments').select('id, name').in('id', deptIds);
      deptNameById = new Map((depts ?? []).map((d: { id: string; name: string }) => [d.id, d.name]));
    }

    let totalMonthlySalary = 0;
    let totalMonthlyCost = 0;
    const team = teamRows.map((r) => {
      const sal = nMoney(r.monthly_salary);
      const cost = nMoney(r.monthly_cost);
      if (sal != null) totalMonthlySalary += sal;
      if (cost != null) totalMonthlyCost += cost;
      return {
        orgEntryId: r.id,
        personName: r.person_name,
        jobTitle: r.job_title,
        displayOrder: r.display_order,
        departmentId: r.department_id,
        departmentName: r.department_id ? deptNameById.get(r.department_id) ?? null : null,
        monthlySalary: sal,
        monthlyCost: cost,
        isSelectedRoot: r.id === entryId,
      };
    });

    res.json({
      headcount: team.length,
      totalMonthlySalary: Math.round(totalMonthlySalary * 100) / 100,
      totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
      team,
    });
  } catch (e: unknown) {
    const err = e as Error;
    console.error('org summary:', err);
    res.status(500).json({ error: err.message || 'Failed summary' });
  }
});

export default router;
