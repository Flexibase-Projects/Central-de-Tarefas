import express from 'express';
import { supabase } from '../config/supabase.js';
import { getWorkspaceContext } from '../middleware/workspace.js';
import { Task } from '../types/index.js';

const router = express.Router();

function getWorkspaceIdOrFail(req: express.Request, res: express.Response): string | null {
  const workspace = getWorkspaceContext(req);
  if (!workspace?.workspace.id) {
    res.status(500).json({ error: 'Workspace context unavailable.' });
    return null;
  }
  return workspace.workspace.id;
}

async function projectBelongsToWorkspace(projectId: string, workspaceId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('cdt_projects')
    .select('id')
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

async function loadTaskInWorkspace(taskId: string, workspaceId: string) {
  const { data, error } = await supabase
    .from('cdt_tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.project_id) return null;

  const allowed = await projectBelongsToWorkspace(data.project_id, workspaceId);
  if (!allowed) return null;

  return data;
}

// Get all tasks for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    const { projectId } = req.params;
    const projectAllowed = await projectBelongsToWorkspace(projectId, workspaceId);
    if (!projectAllowed) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data, error } = await supabase
      .from('cdt_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tasks' });
  }
});

// Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    const { id } = req.params;
    const data = await loadTaskInWorkspace(id, workspaceId);
    if (!data) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch task' });
  }
});

// Create new task
router.post('/', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    const task: Partial<Task> = req.body;
    if (!task.project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    const projectAllowed = await projectBelongsToWorkspace(task.project_id, workspaceId);
    if (!projectAllowed) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const { data, error } = await supabase
      .from('cdt_tasks')
      .insert([{
        project_id: task.project_id,
        title: task.title,
        description: task.description || null,
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assigned_to: task.assigned_to || null,
        created_by: task.created_by || null,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message || 'Failed to create task' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    const { id } = req.params;
    const updates: Partial<Task> = req.body;
    const existingTask = await loadTaskInWorkspace(id, workspaceId);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (updates.project_id) {
      const projectAllowed = await projectBelongsToWorkspace(updates.project_id, workspaceId);
      if (!projectAllowed) {
        return res.status(404).json({ error: 'Project not found' });
      }
    }

    const { data, error } = await supabase
      .from('cdt_tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message || 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    const { id } = req.params;
    const existingTask = await loadTaskInWorkspace(id, workspaceId);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { error } = await supabase
      .from('cdt_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message || 'Failed to delete task' });
  }
});

export default router;
