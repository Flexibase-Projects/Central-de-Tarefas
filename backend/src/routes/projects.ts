import express from 'express';
import { supabase } from '../config/supabase.js';
import { Project } from '../types/index.js';
import { getRecentCommits, parseGitHubUrl } from '../services/github.js';

const router = express.Router();

// Get all projects (ordem: priority_order quando a coluna existir, senão created_at)
router.get('/', async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return res.status(503).json({
        error: 'Supabase not configured',
        message: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env',
      });
    }

    let query = supabase.from('cdt_projects').select('*');
    let { data, error } = await query
      .order('priority_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error && /priority_order|does not exist|column.*not exist/i.test(String(error.message || ''))) {
      const fallback = await supabase
        .from('cdt_projects')
        .select('*')
        .order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch projects' });
  }
});

// Health check: valida se a URL do projeto está online (GET com timeout)
router.get('/health-check', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http and https URLs are allowed' });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
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
    console.error('Error in version-check:', err);
    res.json({ upToDate: null, latestSha: null, deployedSha: null, reason: 'fetch_error', error: err.message });
  }
});

// Reorder projects (prioridades): body { orderedIds: string[] }
router.put('/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
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
        .eq('id', id);
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
      .order('priority_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error reordering projects:', error);
    res.status(500).json({ error: error.message || 'Failed to reorder projects' });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('cdt_projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch project' });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    // Check if Supabase is configured
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return res.status(503).json({ 
        error: 'Supabase not configured',
        message: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env'
      });
    }

    const project: Partial<Project> = req.body;
    console.log('Creating project with data:', project);
    
    const { data, error } = await supabase
      .from('cdt_projects')
      .insert([{
        name: project.name,
        description: project.description || null,
        status: project.status || 'backlog',
        github_url: project.github_url || null,
        github_owner: project.github_owner || null,
        github_repo: project.github_repo || null,
        project_url: project.project_url || null,
        map_quadrant: project.map_quadrant ?? null,
        map_x: project.map_x ?? null,
        map_y: project.map_y ?? null,
        created_by: project.created_by || null,
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
    const { id } = req.params;
    const updates: Partial<Project> = req.body;

    // Validar status se fornecido
    const validStatuses = ['backlog', 'todo', 'in_progress', 'review', 'done'];
    if (updates.status && !validStatuses.includes(updates.status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Preparar update apenas com campos válidos
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.github_url !== undefined) updateData.github_url = updates.github_url;
    if (updates.github_owner !== undefined) updateData.github_owner = updates.github_owner;
    if (updates.github_repo !== undefined) updateData.github_repo = updates.github_repo;
    if (updates.project_url !== undefined) updateData.project_url = updates.project_url;
    if (updates.map_quadrant !== undefined) updateData.map_quadrant = updates.map_quadrant;
    if (updates.map_x !== undefined) updateData.map_x = updates.map_x;
    if (updates.map_y !== undefined) updateData.map_y = updates.map_y;
    if (updates.priority_order !== undefined) updateData.priority_order = updates.priority_order;

    const { data, error } = await supabase
      .from('cdt_projects')
      .update(updateData)
      .eq('id', id)
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
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message || 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('cdt_projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message || 'Failed to delete project' });
  }
});

export default router;
