import express from 'express';
import { supabase } from '../config/supabase.js';
import { Notification } from '../types/index.js';
import { getRequesterId } from '../middleware/auth.js';
import { getWorkspaceContext } from '../middleware/workspace.js';
import { isSupabaseConnectionRefused, SUPABASE_UNAVAILABLE_MESSAGE } from '../utils/supabase-errors.js';

const router = express.Router();

function getWorkspaceIdOrFail(req: express.Request, res: express.Response): string | null {
  const workspace = getWorkspaceContext(req);
  if (!workspace?.workspace.id) {
    res.status(500).json({ error: 'Workspace context unavailable.' });
    return null;
  }
  return workspace.workspace.id;
}

// Função para limpar notificações órfãs (TODOs que não existem mais)
async function cleanupOrphanedNotifications() {
  try {
    // Buscar todas as notificações relacionadas a TODOs
    const { data: todoNotifications, error: fetchError } = await supabase
      .from('cdt_notifications')
      .select('id, related_id')
      .eq('related_type', 'todo');

    if (fetchError) {
      if (isSupabaseConnectionRefused(fetchError)) {
        console.warn('⚠️', SUPABASE_UNAVAILABLE_MESSAGE);
      } else {
        console.error('Error fetching notifications for cleanup:', fetchError);
      }
      return;
    }

    if (!todoNotifications || todoNotifications.length === 0) {
      return;
    }

    // Buscar todos os IDs de TODOs existentes
    const { data: existingTodos, error: todosError } = await supabase
      .from('cdt_project_todos')
      .select('id');

    if (todosError) {
      if (isSupabaseConnectionRefused(todosError)) {
        console.warn('⚠️', SUPABASE_UNAVAILABLE_MESSAGE);
      } else {
        console.error('Error fetching todos for cleanup:', todosError);
      }
      return;
    }

    const existingTodoIds = new Set(existingTodos?.map((t: { id: string }) => t.id) || []);

    // Encontrar notificações órfãs
    const orphanedNotificationIds = todoNotifications
      .filter((n: { related_id: string | null }) => n.related_id && !existingTodoIds.has(n.related_id))
      .map((n: { id: string }) => n.id);

    if (orphanedNotificationIds.length > 0) {
      // Deletar notificações órfãs
      const { error: deleteError } = await supabase
        .from('cdt_notifications')
        .delete()
        .in('id', orphanedNotificationIds);

      if (deleteError) {
        console.error('Error deleting orphaned notifications:', deleteError);
      } else {
        console.log(`🧹 Limpadas ${orphanedNotificationIds.length} notificações órfãs`);
      }
    }
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      console.warn('⚠️', SUPABASE_UNAVAILABLE_MESSAGE);
    } else {
      console.error('Error in cleanupOrphanedNotifications:', error);
    }
  }
}

// Get all notifications for current user
router.get('/', async (req, res) => {
  try {
    const userId = getRequesterId(req);
    const workspaceId = getWorkspaceIdOrFail(req, res);

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    if (!workspaceId) return;

    // Limpar notificações órfãs antes de buscar
    await cleanupOrphanedNotifications();

    const { data, error } = await supabase
      .from('cdt_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
});

// Get unread notifications count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = getRequesterId(req);
    const workspaceId = getWorkspaceIdOrFail(req, res);

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    if (!workspaceId) return;

    const { count, error } = await supabase
      .from('cdt_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .eq('read', false);

    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getRequesterId(req);
    const workspaceId = getWorkspaceIdOrFail(req, res);

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    if (!workspaceId) return;

    const { data, error } = await supabase
      .from('cdt_notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message || 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const userId = getRequesterId(req);
    const workspaceId = getWorkspaceIdOrFail(req, res);

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    if (!workspaceId) return;

    const { error } = await supabase
      .from('cdt_notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .eq('read', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message || 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getRequesterId(req);
    const workspaceId = getWorkspaceIdOrFail(req, res);

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    if (!workspaceId) return;

    const { error } = await supabase
      .from('cdt_notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: error.message || 'Failed to delete notification' });
  }
});

export default router;
