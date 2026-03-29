import express from 'express';
import { supabase } from '../config/supabase.js';
import { Activity } from '../types/index.js';
import { hasRole } from '../services/permissions.js';
import { getRequesterId } from '../middleware/auth.js';
import { getWorkspaceContext } from '../middleware/workspace.js';
import {
  awardActivityCompletionXp,
  calculateItemCompletionXp,
  evaluateAndAwardGlobalAchievements,
  getLinkedAchievementReward,
  unlockLinkedAchievementIfNeeded,
} from '../services/gamification.js';
import { gamificationMigration503Payload } from '../constants/gamificationMigrationSql.js';

const router = express.Router();
const ACTIVITY_COVERS_BUCKET = 'activity-covers';

const VALID_STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

function parseDecimal(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Number(value.toFixed(2));
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Number(parsed.toFixed(2));
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

async function ensureAdmin(req: express.Request, res: express.Response): Promise<string | null> {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const isAdmin = await hasRole(requesterId, 'admin');
  if (!isAdmin) {
    res.status(403).json({ error: 'Only admins can perform this action.' });
    return null;
  }
  return requesterId;
}

// Get all activities
router.get('/', async (_req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(_req, res);
    if (!workspaceId) return;
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return res.status(503).json({
        error: 'Supabase not configured',
        message: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env',
      });
    }

    const { data, error } = await supabase
      .from('cdt_activities')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch activities' });
  }
});

// Get activity by ID
router.get('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;
    const { id } = req.params;
    const { data, error } = await supabase
      .from('cdt_activities')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Activity not found' });
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch activity' });
  }
});

// Create new activity (admin only)
router.post('/', async (req, res) => {
  try {
    const requesterId = await ensureAdmin(req, res);
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!requesterId) return;
    if (!workspaceId) return;

    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return res.status(503).json({
        error: 'Supabase not configured',
        message: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env',
      });
    }

    const activity: Partial<Activity> & {
      xp_reward?: number;
      deadline_bonus_percent?: number;
      achievement_id?: string | null;
    } = req.body;

    if (activity.status && !VALID_STATUSES.includes(activity.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (activity.priority && !VALID_PRIORITIES.includes(activity.priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const isDone = (activity.status || 'backlog') === 'done';

    const { data, error } = await supabase
      .from('cdt_activities')
      .insert([
        {
          workspace_id: workspaceId,
          name: activity.name,
          description: activity.description || null,
          status: activity.status || 'backlog',
          due_date: activity.due_date || null,
          priority: activity.priority || 'medium',
          assigned_to: activity.assigned_to || null,
          cover_image_url: activity.cover_image_url ?? null,
          created_by: activity.created_by || requesterId,
          xp_reward: parseDecimal(activity.xp_reward, 1),
          deadline_bonus_percent: parseDecimal(activity.deadline_bonus_percent, 0),
          achievement_id: activity.achievement_id || null,
          completed_at: isDone ? new Date().toISOString() : null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    if (isDone) {
      const earnerId = data.assigned_to || data.created_by;
      if (earnerId) {
        const linkedReward = await getLinkedAchievementReward(data.achievement_id ?? null);
        const completedAt = data.completed_at ? new Date(data.completed_at) : new Date();
        const onDeadline =
          Boolean(data.due_date) && completedAt.getTime() <= new Date(data.due_date as string).getTime();
        const xpAmount = calculateItemCompletionXp({
          baseXp: parseDecimal(data.xp_reward, 1),
          onDeadline,
          deadlineBonusPercent: parseDecimal(data.deadline_bonus_percent, 0),
          linkedAchievementFixedXp: linkedReward.fixedXp,
          linkedAchievementPercent: linkedReward.percent,
        });

        const awarded = await awardActivityCompletionXp({
          userId: earnerId,
          activityId: data.id,
          xpAmount,
        });
        await unlockLinkedAchievementIfNeeded(earnerId, data.achievement_id ?? null);
        if (awarded) {
          await evaluateAndAwardGlobalAchievements(earnerId);
        }
      }
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: error.message || 'Failed to create activity' });
  }
});

// Upload cover image (admin only)
router.post('/:id/cover', async (req, res) => {
  try {
    const requesterId = await ensureAdmin(req, res);
    if (!requesterId) return;

    const { id } = req.params;
    const { image } = req.body as { image?: string };
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Body must include { image: "data:image/...;base64,..." }' });
    }

    const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'jpg';
    const base64Data = match ? match[2] : image;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch {
      return res.status(400).json({ error: 'Invalid base64 image' });
    }

    const maxCoverBytes = 10 * 1024 * 1024;
    if (buffer.length > maxCoverBytes) {
      return res.status(413).json({ error: 'Image too large. Maximum is 10MB.' });
    }

    const path = `${id}/cover-${Date.now()}.${ext}`;
    const contentType = match ? `image/${match[1]}` : 'image/jpeg';

    const { error: uploadError } = await supabase.storage
      .from(ACTIVITY_COVERS_BUCKET)
      .upload(path, buffer, { upsert: true, contentType });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(ACTIVITY_COVERS_BUCKET).getPublicUrl(path);
    res.json({ url: data.publicUrl });
  } catch (error: any) {
    console.error('Error uploading activity cover:', error);
    res.status(500).json({ error: error.message || 'Failed to upload cover' });
  }
});

// Update activity
router.put('/:id', async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!workspaceId) return;

    const { id } = req.params;
    const updates: Partial<Activity> & {
      xp_reward?: number;
      deadline_bonus_percent?: number;
      achievement_id?: string | null;
    } = req.body;
    const isAdmin = await hasRole(requesterId, 'admin');
    const incomingKeys = Object.keys(req.body as Record<string, unknown>);

    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (updates.priority && !VALID_PRIORITIES.includes(updates.priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const { data: currentActivity, error: currentError } = await supabase
      .from('cdt_activities')
      .select(
        'id, name, status, due_date, assigned_to, created_by, xp_reward, deadline_bonus_percent, achievement_id, completed_at',
      )
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (currentError) throw currentError;
    if (!currentActivity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    if (!isAdmin) {
      const onlyStatusUpdate =
        incomingKeys.length === 1 &&
        incomingKeys.includes('status') &&
        typeof updates.status === 'string';

      if (!onlyStatusUpdate) {
        return res.status(403).json({ error: 'Only admins can edit activity configuration.' });
      }
      if (currentActivity.assigned_to !== requesterId) {
        return res.status(403).json({ error: 'You can only update activities assigned to you.' });
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.assigned_to !== undefined) updateData.assigned_to = updates.assigned_to;
    if (updates.cover_image_url !== undefined) updateData.cover_image_url = updates.cover_image_url;

    if (isAdmin) {
      if (updates.xp_reward !== undefined) updateData.xp_reward = parseDecimal(updates.xp_reward, 1);
      if (updates.deadline_bonus_percent !== undefined) {
        updateData.deadline_bonus_percent = parseDecimal(updates.deadline_bonus_percent, 0);
      }
      if (updates.achievement_id !== undefined) {
        updateData.achievement_id = updates.achievement_id || null;
      }
    }

    const nextStatus = (updates.status ?? currentActivity.status) as string;
    const transitionedToDone = nextStatus === 'done' && currentActivity.status !== 'done';
    const transitionedOutOfDone = nextStatus !== 'done' && currentActivity.status === 'done';

    if (transitionedToDone) {
      updateData.completed_at = new Date().toISOString();
    } else if (transitionedOutOfDone) {
      updateData.completed_at = null;
    }

    const { data, error } = await supabase
      .from('cdt_activities')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      const msg = String(error.message || '');
      if (error.code === 'PGRST204' || /column.*does not exist/i.test(msg)) {
        if (/xp_reward|deadline_bonus_percent|achievement_id|completed_at/.test(msg)) {
          return res.status(503).json(gamificationMigration503Payload());
        }
        if (updateData.cover_image_url !== undefined && /cover_image_url/i.test(msg)) {
          return res.status(503).json({
            error: 'To save cover image, add the required DB column first.',
            code: 'MIGRATION_REQUIRED',
            sql: 'ALTER TABLE cdt_activities ADD COLUMN IF NOT EXISTS cover_image_url TEXT NULL;',
          });
        }
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    if (transitionedToDone) {
      const earnerId = data.assigned_to || data.created_by;
      if (earnerId) {
        const linkedReward = await getLinkedAchievementReward(data.achievement_id ?? null);
        const completedAt = data.completed_at ? new Date(data.completed_at) : new Date();
        const onDeadline =
          Boolean(data.due_date) && completedAt.getTime() <= new Date(data.due_date as string).getTime();

        const xpAmount = calculateItemCompletionXp({
          baseXp: parseDecimal(data.xp_reward, 1),
          onDeadline,
          deadlineBonusPercent: parseDecimal(data.deadline_bonus_percent, 0),
          linkedAchievementFixedXp: linkedReward.fixedXp,
          linkedAchievementPercent: linkedReward.percent,
        });

        const awarded = await awardActivityCompletionXp({
          userId: earnerId,
          activityId: data.id,
          xpAmount,
        });
        await unlockLinkedAchievementIfNeeded(earnerId, data.achievement_id ?? null);
        if (awarded) {
          await evaluateAndAwardGlobalAchievements(earnerId);
        }
      }
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error updating activity:', error);
    const msg = String(error?.message || '');
    if (/column.*xp_reward|column.*deadline_bonus_percent|column.*achievement_id|column.*completed_at/.test(msg)) {
      return res.status(503).json(gamificationMigration503Payload());
    }
    res.status(500).json({ error: error.message || 'Failed to update activity' });
  }
});

// Delete activity (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const requesterId = await ensureAdmin(req, res);
    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!requesterId) return;
    if (!workspaceId) return;

    const { id } = req.params;
    const { error } = await supabase
      .from('cdt_activities')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: error.message || 'Failed to delete activity' });
  }
});

export default router;
