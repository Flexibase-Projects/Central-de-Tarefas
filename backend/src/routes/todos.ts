import express from 'express';
import { supabase } from '../config/supabase.js';
import { hasRole } from '../services/permissions.js';
import { gamificationMigration503Payload } from '../constants/gamificationMigrationSql.js';
import {
  awardTodoCompletionXp,
  calculateItemCompletionXp,
  evaluateAndAwardGlobalAchievements,
  getLinkedAchievementReward,
  revertTodoCompletionXp,
  unlockLinkedAchievementIfNeeded,
} from '../services/gamification.js';
import {
  clearTodoAssignmentNotifications,
  clearTodoXpPendingNotifications,
  notifyAdminsTodoXpPending,
  notifyTodoAssigned,
} from '../services/todo-notifications.js';

const router = express.Router();

type TodoRecord = {
  id: string;
  title: string;
  project_id: string | null;
  activity_id: string | null;
  created_by: string | null;
  assigned_to: string | null;
  assigned_at?: string | null;
  completed: boolean;
  xp_reward?: number | string | null;
  deadline?: string | null;
  achievement_id?: string | null;
  deadline_bonus_percent?: number | string | null;
  completed_at?: string | null;
};

const OPTIONAL_TODO_COLUMNS = [
  'assigned_at',
  'xp_reward',
  'deadline',
  'achievement_id',
  'deadline_bonus_percent',
  'completed_at',
] as const;

type OptionalTodoColumn = (typeof OPTIONAL_TODO_COLUMNS)[number];

function getRequesterId(req: express.Request): string | null {
  return (
    ((req as express.Request & { userId?: string }).userId ?? null) ||
    (req.headers['x-user-id'] as string | undefined) ||
    null
  );
}

function getPrivilegeRequesterId(req: express.Request): string | null {
  return (
    ((req as express.Request & { realUserId?: string }).realUserId ?? null) ||
    getRequesterId(req)
  );
}

function getAuthRequesterId(req: express.Request): string | null {
  return ((req as express.Request & { authUserId?: string }).authUserId ?? null) || null;
}

function parseDecimal(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Number(value.toFixed(2));
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Number(parsed.toFixed(2));
  }
  return fallback;
}

function hasPositiveXp(value: unknown): boolean {
  return parseDecimal(value, 0) > 0;
}

function getMissingOptionalTodoColumn(error: unknown): OptionalTodoColumn | null {
  const msg = String((error as { message?: string } | null)?.message || '');

  const quoted = msg.match(/'([^']+)' column/i)?.[1];
  if (quoted && OPTIONAL_TODO_COLUMNS.includes(quoted as OptionalTodoColumn)) {
    return quoted as OptionalTodoColumn;
  }

  for (const column of OPTIONAL_TODO_COLUMNS) {
    if (
      msg.includes(column) &&
      (/does not exist/i.test(msg) || /Could not find/i.test(msg) || /schema cache/i.test(msg))
    ) {
      return column;
    }
  }

  return null;
}

function isMissingSchemaEntity(message: string, entity: string): boolean {
  return (
    message.includes(entity) &&
    (/does not exist/i.test(message) || /Could not find/i.test(message) || /schema cache/i.test(message))
  );
}

function isGamificationSchemaError(error: unknown): boolean {
  const msg = String((error as { message?: string } | null)?.message || '');

  return (
    /column.*(xp_reward|deadline_bonus_percent|achievement_id|completed_at|deadline|assigned_at).*does not exist/i.test(msg) ||
    /Could not find the '(xp_reward|deadline_bonus_percent|achievement_id|completed_at|deadline|assigned_at)' column/i.test(msg) ||
    isMissingSchemaEntity(msg, 'cdt_user_xp_log') ||
    isMissingSchemaEntity(msg, 'cdt_user_achievements') ||
    isMissingSchemaEntity(msg, 'cdt_achievements')
  );
}

function omitOptionalColumn<T extends Record<string, unknown>>(payload: T, column: OptionalTodoColumn): T {
  const next = { ...payload };
  delete next[column];
  return next;
}

function isCreatedByFkError(error: unknown): boolean {
  const msg = String((error as { message?: string } | null)?.message || '');
  const code = String((error as { code?: string } | null)?.code || '');
  return (
    code === '23503' &&
    (/created_by/i.test(msg) || /project_todos_created_by_fkey/i.test(msg) || /foreign key/i.test(msg))
  );
}

async function insertTodoCompat(insertData: Record<string, unknown>, options?: { authUserId?: string | null }) {
  let payload = { ...insertData };
  const removed = new Set<string>();
  let retriedCreatedBy = false;
  let clearedCreatedBy = false;

  while (true) {
    const result = await supabase.from('cdt_project_todos').insert(payload).select().single();
    if (!result.error) return result;

    if (
      !retriedCreatedBy &&
      options?.authUserId &&
      payload.created_by !== options.authUserId &&
      isCreatedByFkError(result.error)
    ) {
      retriedCreatedBy = true;
      payload = {
        ...payload,
        created_by: options.authUserId,
      };
      continue;
    }

    if (!clearedCreatedBy && payload.created_by != null && isCreatedByFkError(result.error)) {
      clearedCreatedBy = true;
      payload = {
        ...payload,
        created_by: null,
      };
      continue;
    }

    const missingColumn = getMissingOptionalTodoColumn(result.error);
    if (!missingColumn || removed.has(missingColumn) || !(missingColumn in payload)) {
      return result;
    }

    removed.add(missingColumn);
    payload = omitOptionalColumn(payload, missingColumn);
  }
}

async function updateTodoCompat(id: string, updateData: Record<string, unknown>) {
  let payload = { ...updateData };
  const removed = new Set<string>();

  while (true) {
    const result = await supabase
      .from('cdt_project_todos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!result.error) return result;

    const missingColumn = getMissingOptionalTodoColumn(result.error);
    if (!missingColumn || removed.has(missingColumn) || !(missingColumn in payload)) {
      return result;
    }

    removed.add(missingColumn);
    payload = omitOptionalColumn(payload, missingColumn);
  }
}

async function getTodoByIdCompat(id: string) {
  const columns: string[] = [
    'id',
    'title',
    'project_id',
    'activity_id',
    'created_by',
    'assigned_to',
    'assigned_at',
    'completed',
    'xp_reward',
    'deadline',
    'achievement_id',
    'deadline_bonus_percent',
    'completed_at',
  ];

  const removed = new Set<string>();

  while (true) {
    const result = await supabase
      .from('cdt_project_todos')
      .select(columns.join(', '))
      .eq('id', id)
      .single();

    if (!result.error) return result;

    const missingColumn = getMissingOptionalTodoColumn(result.error);
    if (!missingColumn || removed.has(missingColumn)) {
      return result;
    }

    removed.add(missingColumn);
    const index = columns.indexOf(missingColumn);
    if (index >= 0) columns.splice(index, 1);
  }
}

async function ensureAdmin(req: express.Request, res: express.Response): Promise<string | null> {
  const requesterId = getRequesterId(req);
  const privilegeUserId = getPrivilegeRequesterId(req);
  if (!requesterId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const isAdmin = privilegeUserId ? await hasRole(privilegeUserId, 'admin') : false;
  if (!isAdmin) {
    res.status(403).json({ error: 'Only admins can perform this action.' });
    return null;
  }
  return privilegeUserId;
}

async function getNextSortOrder(params: {
  projectId?: string | null;
  activityId?: string | null;
}): Promise<number> {
  if (params.projectId) {
    const { data: maxTodo } = await supabase
      .from('cdt_project_todos')
      .select('sort_order')
      .eq('project_id', params.projectId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    return maxTodo ? maxTodo.sort_order + 1 : 0;
  }

  const { data: maxTodo } = await supabase
    .from('cdt_project_todos')
    .select('sort_order')
    .eq('activity_id', params.activityId ?? '')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  return maxTodo ? maxTodo.sort_order + 1 : 0;
}

async function calculateTodoAwardXp(todo: TodoRecord): Promise<number> {
  const linkedReward = await getLinkedAchievementReward(todo.achievement_id ?? null);
  const completedAt = todo.completed_at ? new Date(todo.completed_at) : new Date();
  const onDeadline =
    Boolean(todo.deadline) && completedAt.getTime() <= new Date(todo.deadline as string).getTime();

  return calculateItemCompletionXp({
    baseXp: parseDecimal(todo.xp_reward, 0),
    onDeadline,
    deadlineBonusPercent: parseDecimal(todo.deadline_bonus_percent, 0),
    linkedAchievementFixedXp: linkedReward.fixedXp,
    linkedAchievementPercent: linkedReward.percent,
  });
}

// Listar to-dos de uma atividade (sem projeto) — antes de GET /:projectId
router.get('/by-activity/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;

    const { data, error } = await supabase
      .from('cdt_project_todos')
      .select('*')
      .eq('activity_id', activityId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching activity todos:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch activity todos' });
  }
});

// Get all todos for a project
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('cdt_project_todos')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch todos' });
  }
});

// Create a new todo — project_id OU activity_id (exatamente um)
router.post('/', async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    const authRequesterId = getAuthRequesterId(req);
    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isAdmin = await hasRole(requesterId, 'admin');
    const {
      project_id,
      activity_id,
      title,
      assigned_to,
      xp_reward,
      deadline,
      achievement_id,
      deadline_bonus_percent,
    } = req.body;

    const hasProject = Boolean(project_id);
    const hasActivity = Boolean(activity_id);
    if (!title || (hasProject === hasActivity)) {
      return res.status(400).json({
        error: 'Informe title e exatamente um entre project_id ou activity_id',
      });
    }

    const resolvedAssignedTo = isAdmin ? (assigned_to || null) : requesterId;
    const sortOrder = await getNextSortOrder({
      projectId: hasProject ? project_id : null,
      activityId: hasActivity ? activity_id : null,
    });

    const { data, error } = await insertTodoCompat(
      {
        project_id: hasProject ? project_id : null,
        activity_id: hasActivity ? activity_id : null,
        title,
        completed: false,
        created_by: requesterId,
        assigned_to: resolvedAssignedTo,
        assigned_at: resolvedAssignedTo ? new Date().toISOString() : null,
        sort_order: sortOrder,
        xp_reward: isAdmin ? parseDecimal(xp_reward, 1) : 0,
        deadline: deadline || null,
        achievement_id: isAdmin ? (achievement_id || null) : null,
        deadline_bonus_percent: isAdmin ? parseDecimal(deadline_bonus_percent, 0) : 0,
        completed_at: null,
      },
      { authUserId: authRequesterId },
    );

    if (error) throw error;

    if (resolvedAssignedTo && resolvedAssignedTo !== requesterId) {
      await notifyTodoAssigned({
        todoId: data.id,
        title: data.title,
        assignedTo: resolvedAssignedTo,
        projectId: data.project_id,
        activityId: data.activity_id,
      });
    }

    if (!isAdmin) {
      await notifyAdminsTodoXpPending({
        todoId: data.id,
        title: data.title,
        projectId: data.project_id,
        activityId: data.activity_id,
        createdBy: requesterId,
      });
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating todo:', error);
    const msg = String(error?.message || '');
    if (
      /column.*(xp_reward|deadline_bonus_percent|achievement_id|completed_at|deadline|assigned_at).*does not exist/i.test(msg) ||
      /Could not find the '(xp_reward|deadline_bonus_percent|achievement_id|completed_at|deadline|assigned_at)' column/i.test(msg)
    ) {
      return res.status(503).json(gamificationMigration503Payload());
    }
    res.status(500).json({ error: error.message || 'Failed to create todo' });
  }
});

// Update a todo
router.put('/:id', async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const isAdmin = await hasRole(requesterId, 'admin');
    const { title, completed, assigned_to, xp_reward, deadline, achievement_id, deadline_bonus_percent } = req.body;
    const incomingKeys = Object.keys(req.body as Record<string, unknown>);

    const { data: currentTodo, error: currentTodoError } = await getTodoByIdCompat(id);

    if (currentTodoError) throw currentTodoError;
    if (!currentTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const existingTodo = currentTodo as TodoRecord;

    if (!isAdmin) {
      const onlyCompletionUpdate =
        incomingKeys.length === 1 &&
        incomingKeys.includes('completed') &&
        typeof completed === 'boolean';

      if (!onlyCompletionUpdate) {
        return res.status(403).json({ error: 'Only admins can edit todo configuration.' });
      }
      if (existingTodo.assigned_to !== requesterId) {
        return res.status(403).json({ error: 'You can only complete todos assigned to you.' });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (completed !== undefined) updateData.completed = completed;
    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to || null;
      updateData.assigned_at = assigned_to ? new Date().toISOString() : null;
    }

    const hadXpConfigured = hasPositiveXp(existingTodo.xp_reward);

    if (isAdmin) {
      if (xp_reward !== undefined) updateData.xp_reward = parseDecimal(xp_reward, 1);
      if (deadline !== undefined) updateData.deadline = deadline || null;
      if (achievement_id !== undefined) updateData.achievement_id = achievement_id || null;
      if (deadline_bonus_percent !== undefined) {
        updateData.deadline_bonus_percent = parseDecimal(deadline_bonus_percent, 0);
      }
    }

    const transitionedToCompleted = completed === true && existingTodo.completed !== true;
    const transitionedToOpen = completed === false && existingTodo.completed === true;

    if (transitionedToCompleted) {
      updateData.completed_at = new Date().toISOString();
    } else if (transitionedToOpen) {
      updateData.completed_at = null;
    }

    const { data: updatedTodoRaw, error } = await updateTodoCompat(id, updateData);

    if (error) throw error;

    const updatedTodo = updatedTodoRaw as TodoRecord;
    let xpDelta = 0;
    let xpAction: 'none' | 'awarded' | 'reverted' | 'retro_awarded' = 'none';
    let gamificationWarning: ReturnType<typeof gamificationMigration503Payload> | null = null;

    try {
      if (transitionedToCompleted && updatedTodo.assigned_to) {
        const xpAmount = await calculateTodoAwardXp(updatedTodo);
        const awarded = await awardTodoCompletionXp({
          userId: updatedTodo.assigned_to,
          todoId: updatedTodo.id,
          xpAmount,
        });

        if (awarded.awarded) {
          xpDelta = awarded.xpDelta;
          xpAction = 'awarded';
          await unlockLinkedAchievementIfNeeded(updatedTodo.assigned_to, updatedTodo.achievement_id ?? null);
          await evaluateAndAwardGlobalAchievements(updatedTodo.assigned_to);
        }
      } else if (transitionedToOpen && existingTodo.assigned_to) {
        const reverted = await revertTodoCompletionXp({
          userId: existingTodo.assigned_to,
          todoId: existingTodo.id,
        });

        if (reverted.reverted) {
          xpDelta = reverted.xpDelta;
          xpAction = 'reverted';
        }
      } else if (
        isAdmin &&
        updatedTodo.completed === true &&
        !hadXpConfigured &&
        hasPositiveXp(updatedTodo.xp_reward) &&
        updatedTodo.assigned_to
      ) {
        const xpAmount = await calculateTodoAwardXp(updatedTodo);
        const retroAwarded = await awardTodoCompletionXp({
          userId: updatedTodo.assigned_to,
          todoId: updatedTodo.id,
          xpAmount,
        });

        if (retroAwarded.awarded) {
          xpDelta = retroAwarded.xpDelta;
          xpAction = 'retro_awarded';
          await unlockLinkedAchievementIfNeeded(updatedTodo.assigned_to, updatedTodo.achievement_id ?? null);
          await evaluateAndAwardGlobalAchievements(updatedTodo.assigned_to);
        }
      }
    } catch (gamificationError: any) {
      if (isGamificationSchemaError(gamificationError)) {
        console.warn('Gamification skipped while updating todo due to missing schema:', gamificationError?.message || gamificationError);
        gamificationWarning = gamificationMigration503Payload();
      } else {
        throw gamificationError;
      }
    }

    if (completed === true) {
      await clearTodoAssignmentNotifications(id);
    } else if (assigned_to === null && existingTodo.assigned_to) {
      await clearTodoAssignmentNotifications(id);
    } else if (assigned_to && assigned_to !== existingTodo.assigned_to && completed !== true) {
      if (existingTodo.assigned_to) {
        await clearTodoAssignmentNotifications(id, existingTodo.assigned_to);
      }
      if (assigned_to !== requesterId) {
        await notifyTodoAssigned({
          todoId: id,
          title: String(title || updatedTodo.title),
          assignedTo: assigned_to,
          projectId: updatedTodo.project_id,
          activityId: updatedTodo.activity_id,
        });
      }
    }

    if (isAdmin && xp_reward !== undefined && hasPositiveXp(updatedTodo.xp_reward)) {
      await clearTodoXpPendingNotifications(id);
    }

    res.json({
      todo: updatedTodo,
      xpDelta,
      xpAction,
      ...(gamificationWarning ? { gamificationWarning } : {}),
    });
  } catch (error: any) {
    console.error('Error updating todo:', error);
    const msg = String(error?.message || '');
    if (isGamificationSchemaError(error)) {
      return res.status(503).json(gamificationMigration503Payload());
    }
    res.status(500).json({ error: error.message || 'Failed to update todo' });
  }
});

// Delete a todo (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const requesterId = await ensureAdmin(req, res);
    if (!requesterId) return;

    const { id } = req.params;

    await clearTodoAssignmentNotifications(id);
    await clearTodoXpPendingNotifications(id);

    const { error } = await supabase
      .from('cdt_project_todos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: error.message || 'Failed to delete todo' });
  }
});

// Reorder activity todos (admin only)
router.post('/reorder-activity', async (req, res) => {
  try {
    const requesterId = await ensureAdmin(req, res);
    if (!requesterId) return;

    const { activity_id, todo_ids } = req.body;

    if (!activity_id || !Array.isArray(todo_ids)) {
      return res.status(400).json({ error: 'activity_id and todo_ids array are required' });
    }

    const updates = todo_ids.map((todoId: string, index: number) =>
      supabase
        .from('cdt_project_todos')
        .update({ sort_order: index })
        .eq('id', todoId)
        .eq('activity_id', activity_id),
    );

    await Promise.all(updates);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error reordering activity todos:', error);
    res.status(500).json({ error: error.message || 'Failed to reorder activity todos' });
  }
});

// Reorder todos (admin only)
router.post('/reorder', async (req, res) => {
  try {
    const requesterId = await ensureAdmin(req, res);
    if (!requesterId) return;

    const { project_id, todo_ids } = req.body;

    if (!project_id || !Array.isArray(todo_ids)) {
      return res.status(400).json({ error: 'project_id and todo_ids array are required' });
    }

    const updates = todo_ids.map((todoId: string, index: number) =>
      supabase
        .from('cdt_project_todos')
        .update({ sort_order: index })
        .eq('id', todoId)
        .eq('project_id', project_id),
    );

    await Promise.all(updates);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error reordering todos:', error);
    res.status(500).json({ error: error.message || 'Failed to reorder todos' });
  }
});

export default router;
