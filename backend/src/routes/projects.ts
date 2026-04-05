import express from 'express';
import { supabase } from '../config/supabase.js';
import { Project } from '../types/index.js';
import { getRecentCommits, parseGitHubUrl } from '../services/github.js';
import { getRequesterId } from '../middleware/auth.js';
import { getWorkspaceContext } from '../middleware/workspace.js';
import { resolveAuthBackedUserId } from '../services/assignment-users.js';
import { getTrimmedString, isValidationError, optionalNumber, optionalString, requireOneOf, requireString } from '../utils/validation.js';

const router = express.Router();

type ProjectTodoSummaryRow = {
  project_id: string | null;
  activity_id?: string | null;
  assigned_to: string | null;
  completed: boolean | null;
  xp_reward: number | null;
};

type ActivitySummaryRow = {
  id: string;
  name: string;
  status: string;
};

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function getWorkspaceIdOrFail(req: express.Request, res: express.Response): string | null {
  const workspace = getWorkspaceContext(req);
  if (!workspace?.workspace.id) {
    res.status(500).json({ error: 'Workspace context unavailable.' });
    return null;
  }
  return workspace.workspace.id;
}

async function fetchOrderedProjects(workspaceId: string) {
  const baseQuery = supabase
    .from('cdt_projects')
    .select('id, name, description, status, github_url, github_owner, github_repo, project_url, map_quadrant, map_x, map_y, priority_order, responsible_user_id, created_at, updated_at, created_by')
    .eq('workspace_id', workspaceId);
  const orderedQuery = await baseQuery
    .order('priority_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (orderedQuery.error && /priority_order|does not exist|column.*not exist/i.test(String(orderedQuery.error.message || ''))) {
    const fallback = await supabase
      .from('cdt_projects')
      .select('id, name, description, status, github_url, github_owner, github_repo, project_url, map_quadrant, map_x, map_y, responsible_user_id, created_at, updated_at, created_by')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []) as Array<Project>;
  }

  if (orderedQuery.error) throw orderedQuery.error;
  return (orderedQuery.data ?? []) as Array<Project>;
}

// Get all projects (ordem: priority_order quando a coluna existir, senão created_at)
router.get('/', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return res.status(503).json({
        error: 'Supabase not configured',
        message: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env',
      });
    }

    const data = await fetchOrderedProjects(workspaceId);
    res.json(data || []);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch projects' });
  }
});

// Health check: valida se a URL do projeto está online (GET com timeout)
router.get('/health-check', async (req, res) => {
  try {
    const rawUrl = getTrimmedString(req.query.url);
    if (!rawUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http and https URLs are allowed' });
    }
    if (/(^|\.)localhost$|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./i.test(parsed.hostname)) {
      return res.status(400).json({ error: 'Private or local URLs are not allowed' });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(parsed.toString(), {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Central-de-Tarefas-HealthCheck/1.0' },
    });
    clearTimeout(timeout);
    const ok = response.status >= 200 && response.status < 400;
    res.json({ ok, status: response.status });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return res.json({ ok: false, status: 408, error: 'Timeout' });
    }
    res.json({ ok: false, status: 0, error: err.message || 'Request failed' });
  }
});

// Extrai SHA curto (7 hex) de meta tags, comentários ou data-attributes no HTML
function extractVersionFromHtml(html: string): string | null {
  const sha7Regex = /[a-fA-F0-9]{7}/;
  // Meta: name="version" content="...", name="build-id", name="git-commit"
  const metaMatch = html.match(/<meta[^>]+name=["'](?:version|build-id|git-commit)["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["'](?:version|build-id|git-commit)["']/i);
  if (metaMatch) {
    const m = metaMatch[1].match(sha7Regex);
    if (m) return m[0].toLowerCase();
    const trimmed = metaMatch[1].trim();
    if (/^[a-fA-F0-9]{7,40}$/.test(trimmed)) return trimmed.substring(0, 7).toLowerCase();
  }
  // Comentários: <!-- version: ... -->, <!-- build: ... -->, <!-- commit: ... -->
  const commentMatch = html.match(/<!--\s*(?:version|build|commit):\s*([a-fA-F0-9]{7,40})/);
  if (commentMatch) return commentMatch[1].substring(0, 7).toLowerCase();
  // data-version, data-build, data-commit em body ou #root
  const dataMatch = html.match(/data-(?:version|build|commit)=["']([^"']+)["']/i);
  if (dataMatch) {
    const m = dataMatch[1].match(sha7Regex);
    if (m) return m[0].toLowerCase();
    if (/^[a-fA-F0-9]{7,40}$/.test(dataMatch[1].trim())) return dataMatch[1].trim().substring(0, 7).toLowerCase();
  }
  // Qualquer ocorrência de 7 hex que pareça SHA (evitar números de versão tipo 1.2.3)
  const anySha = html.match(/\b([a-fA-F0-9]{7})\b/);
  if (anySha) return anySha[1].toLowerCase();
  return null;
}

// Version check: compara deploy (project_url) com último commit do GitHub
router.get('/version-check', async (req, res) => {
  let reason: string | undefined;
  try {
    const { projectUrl, githubUrl } = req.query;
    if (!projectUrl || typeof projectUrl !== 'string' || !githubUrl || typeof githubUrl !== 'string') {
      return res.status(400).json({ error: 'projectUrl and githubUrl are required' });
    }
    const parsed = parseGitHubUrl(githubUrl);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid GitHub URL' });
    }
    const [latestCommit] = await getRecentCommits(parsed.owner, parsed.repo, 1);
    const latestSha = latestCommit ? latestCommit.sha.substring(0, 7) : null;
    if (!latestSha) {
      return res.json({ upToDate: null, latestSha: null, deployedSha: null, reason: 'no_github_commits' });
    }
    const base = projectUrl.replace(/\/$/, '');
    const candidates = [`${base}/version`, `${base}/api/version`, `${base}/api/health`];
    let deployedSha: string | null = null;
    for (const url of candidates) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Central-de-Tarefas-VersionCheck/1.0' } });
        clearTimeout(t);
        if (!r.ok) continue;
        const contentType = r.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
          const raw = body.commit ?? body.sha ?? body.version ?? body.git_commit ?? body.buildId ?? null;
          if (raw && typeof raw === 'string') {
            deployedSha = raw.length >= 7 ? raw.substring(0, 7) : raw;
            break;
          }
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') reason = 'timeout';
        continue;
      }
    }
    // Fallback: GET da página principal e parse do HTML
    if (!deployedSha) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const r = await fetch(base, { signal: ctrl.signal, headers: { 'User-Agent': 'Central-de-Tarefas-VersionCheck/1.0' } });
        clearTimeout(t);
        if (r.ok) {
          const html = await r.text();
          deployedSha = extractVersionFromHtml(html);
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') reason = 'timeout';
        else reason = 'fetch_error';
      }
      if (!deployedSha) reason = reason || 'no_version_found';
    }
    const upToDate = deployedSha ? deployedSha.toLowerCase() === latestSha.toLowerCase() : null;
    const payload: Record<string, unknown> = { upToDate: upToDate === null ? null : !!upToDate, latestSha, deployedSha };
    if (reason) payload.reason = reason;
    res.json(payload);
  } catch (err: any) {
    if (isValidationError(err)) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error in version-check:', err);
    res.json({ upToDate: null, latestSha: null, deployedSha: null, reason: 'fetch_error', error: err.message });
  }
});

router.get('/todo-card-summary', async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!workspaceId) return;

    const [projects, activitiesRes, todosRes] = await Promise.all([
      fetchOrderedProjects(workspaceId),
      supabase
        .from('cdt_activities')
        .select('id, name, status')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      supabase
        .from('cdt_project_todos')
        .select('project_id, activity_id, assigned_to, completed, xp_reward')
        .eq('workspace_id', workspaceId),
    ]);

    if (activitiesRes.error) throw activitiesRes.error;
    if (todosRes.error) throw todosRes.error;

    const todos = (todosRes.data ?? []) as ProjectTodoSummaryRow[];
    const activities = (activitiesRes.data ?? []) as ActivitySummaryRow[];
    const todoCountByEntity = new Map<
      string,
      { myAssignedOpenCount: number; totalOpenCount: number; totalCompletedCount: number; xpPendingCount: number }
    >();

    for (const todo of todos) {
      const entityId = todo.project_id ?? todo.activity_id ?? null;
      if (!entityId) continue;
      const current =
        todoCountByEntity.get(entityId) ?? {
          myAssignedOpenCount: 0,
          totalOpenCount: 0,
          totalCompletedCount: 0,
          xpPendingCount: 0,
        };
      if (todo.completed === true) {
        current.totalCompletedCount += 1;
      } else {
        current.totalOpenCount += 1;
      }
      if (todo.assigned_to === requesterId && todo.completed !== true) {
        current.myAssignedOpenCount += 1;
      }
      if (parseNumber(todo.xp_reward, 0) <= 0) {
        current.xpPendingCount += 1;
      }
      todoCountByEntity.set(entityId, current);
    }

    const emptyCounts = { myAssignedOpenCount: 0, totalOpenCount: 0, totalCompletedCount: 0, xpPendingCount: 0 };

    const projectSummary = projects.map((project: { id: string; name: string; status: string }) => {
      const counts = todoCountByEntity.get(project.id) ?? emptyCounts;
      return {
        entity_type: 'project',
        project_id: project.id,
        project_name: project.name,
        project_status: project.status,
        myAssignedOpenCount: counts.myAssignedOpenCount,
        totalOpenCount: counts.totalOpenCount,
        totalCompletedCount: counts.totalCompletedCount,
        xpPendingCount: counts.xpPendingCount,
      };
    });

    const activitySummary = activities.map((activity) => {
      const counts = todoCountByEntity.get(activity.id) ?? emptyCounts;
      return {
        entity_type: 'activity',
        project_id: activity.id,
        project_name: activity.name,
        project_status: activity.status,
        myAssignedOpenCount: counts.myAssignedOpenCount,
        totalOpenCount: counts.totalOpenCount,
        totalCompletedCount: counts.totalCompletedCount,
        xpPendingCount: counts.xpPendingCount,
      };
    });

    return res.json([...projectSummary, ...activitySummary]);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error fetching todo card summary:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch todo card summary' });
  }
});

// Reorder projects (prioridades): body { orderedIds: string[] }
router.put('/reorder', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : null;
    if (!orderedIds || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array of project IDs' });
    }
    const migrationSql = 'ALTER TABLE cdt_projects ADD COLUMN IF NOT EXISTS priority_order INTEGER NULL; CREATE INDEX IF NOT EXISTS idx_cdt_projects_priority_order ON cdt_projects(priority_order);';
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if (typeof id !== 'string') {
        return res.status(400).json({ error: 'Each orderedIds item must be a string' });
      }
      const { error } = await supabase
        .from('cdt_projects')
        .update({ priority_order: i, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('workspace_id', workspaceId);
      if (error) {
        if (/priority_order|does not exist|column.*not exist/i.test(String(error.message || ''))) {
          return res.status(503).json({
            error: 'Coluna priority_order não existe. Execute a migração no Supabase (SQL Editor):',
            code: 'MIGRATION_REQUIRED',
            sql: migrationSql,
          });
        }
        throw error;
      }
    }
    const { data, error } = await supabase
      .from('cdt_projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('priority_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error reordering projects:', error);
    res.status(500).json({ error: error.message || 'Failed to reorder projects' });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    const { id } = req.params;
    const { data, error } = await supabase
      .from('cdt_projects')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(data);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch project' });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    // Check if Supabase is configured
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return res.status(503).json({ 
        error: 'Supabase not configured',
        message: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env'
      });
    }

    const projectBody = req.body as Partial<Project>;
    const status = projectBody.status ? requireOneOf(projectBody.status, 'status', ['backlog', 'todo', 'in_progress', 'review', 'done'] as const) : 'backlog';
    const name = requireString(projectBody.name, 'name', { minLength: 2, maxLength: 200 });
    const description = optionalString(projectBody.description, 'description', { maxLength: 4000 });
    const projectUrl = optionalString(projectBody.project_url, 'project_url', { maxLength: 2048 });
    const createdBy = optionalString(projectBody.created_by, 'created_by', { maxLength: 64 });
    const responsibleUserId = await resolveAuthBackedUserId(
      optionalString(projectBody.responsible_user_id, 'responsible_user_id', { maxLength: 64 }),
      'responsible_user_id',
    );
    const mapQuadrant = optionalNumber(projectBody.map_quadrant, 'map_quadrant');
    const mapX = optionalNumber(projectBody.map_x, 'map_x');
    const mapY = optionalNumber(projectBody.map_y, 'map_y');
    const { data, error } = await supabase
      .from('cdt_projects')
      .insert([{
        workspace_id: workspaceId,
        name,
        description,
        status,
        github_url: null,
        github_owner: null,
        github_repo: null,
        project_url: projectUrl,
        map_quadrant: mapQuadrant,
        map_x: mapX ?? null,
        map_y: mapY ?? null,
        responsible_user_id: responsibleUserId,
        created_by: createdBy,
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating project:', error);
      throw error;
    }
    
    console.log('Project created successfully:', data);
    res.status(201).json(data);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating project:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create project',
      details: error.details || error.hint || null
    });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    const { id } = req.params;
    const updates: Partial<Project> = req.body;

    // Validar status se fornecido
    const validStatuses = ['backlog', 'todo', 'in_progress', 'review', 'done'] as const;
    if (updates.status && !validStatuses.includes(updates.status as (typeof validStatuses)[number])) {
      return res.status(400).json({ 
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Preparar update apenas com campos válidos
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = requireString(updates.name, 'name', { minLength: 2, maxLength: 200 });
    if (updates.description !== undefined) updateData.description = optionalString(updates.description, 'description', { maxLength: 4000 });
    if (updates.status !== undefined) updateData.status = requireOneOf(updates.status, 'status', validStatuses);
    if (updates.project_url !== undefined) updateData.project_url = optionalString(updates.project_url, 'project_url', { maxLength: 2048 });
    if (updates.map_quadrant !== undefined) updateData.map_quadrant = optionalNumber(updates.map_quadrant, 'map_quadrant');
    if (updates.map_x !== undefined) updateData.map_x = optionalNumber(updates.map_x, 'map_x');
    if (updates.map_y !== undefined) updateData.map_y = optionalNumber(updates.map_y, 'map_y');
    if (updates.priority_order !== undefined) updateData.priority_order = optionalNumber(updates.priority_order, 'priority_order');
    if (updates.responsible_user_id !== undefined) {
      updateData.responsible_user_id = await resolveAuthBackedUserId(
        optionalString(updates.responsible_user_id, 'responsible_user_id', { maxLength: 64 }),
        'responsible_user_id',
      );
    }

    const { data, error } = await supabase
      .from('cdt_projects')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      const isMapColumnMissing = error.code === 'PGRST204' && /map_(quadrant|x|y)/i.test(String(error.message || ''));
      if (isMapColumnMissing) {
        const { map_quadrant: _mq, map_x: _mx, map_y: _my, ...updateDataWithoutMap } = updateData;
        const { data: dataRetry, error: errorRetry } = await supabase
          .from('cdt_projects')
          .update(updateDataWithoutMap)
          .eq('id', id)
          .eq('workspace_id', workspaceId)
          .select()
          .single();
        if (!errorRetry && dataRetry) {
          const merged = { ...dataRetry, map_quadrant: updates.map_quadrant, map_x: updates.map_x, map_y: updates.map_y };
          return res.json(merged);
        }
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(data);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message || 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    const { id } = req.params;
    const { error } = await supabase
      .from('cdt_projects')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message || 'Failed to delete project' });
  }
});

export default router;
