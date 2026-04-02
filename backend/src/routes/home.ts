import express from 'express';
import { supabase } from '../config/supabase.js';
import { getRequesterId } from '../middleware/auth.js';
import { getWorkspaceContext } from '../middleware/workspace.js';
import { hasRole } from '../services/permissions.js';
import { listActiveWorkspaceUserIds } from '../services/workspace-memberships.js';

const router = express.Router();

type TodoRow = {
  id: string;
  title: string;
  project_id: string | null;
  activity_id: string | null;
  created_by: string | null;
  assigned_to: string | null;
  completed: boolean | null;
  assigned_at?: string | null;
  deadline: string | null;
  xp_reward?: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  responsible_user_id?: string | null;
  created_by: string | null;
  priority_order?: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type ActivityRow = {
  id: string;
  name: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
};

type HomeTodoItem = {
  id: string;
  title: string;
  deadline: string | null;
  projectId: string | null;
  projectName: string | null;
  activityId: string | null;
  activityName: string | null;
  assigneeName?: string | null;
  sourceType?: 'todo' | 'activity';
};

type HomeReviewItem = {
  id: string;
  kind: 'project' | 'activity' | 'todo';
  title: string;
  status: string;
  dueDate: string | null;
  ownerName?: string | null;
  waitingReason?: 'review' | 'xp';
};

function getWorkspaceIdOrFail(req: express.Request, res: express.Response): string | null {
  const workspace = getWorkspaceContext(req);
  if (!workspace?.workspace.id) {
    res.status(500).json({ error: 'Workspace context unavailable.' });
    return null;
  }
  return workspace.workspace.id;
}

function getWorkspaceSlug(req: express.Request): string | null {
  return getWorkspaceContext(req)?.workspace.slug ?? null;
}

function dateValue(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function activityDateValue(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isTodoOpen(todo: TodoRow): boolean {
  return todo.completed !== true;
}

function isActivityOpen(activity: ActivityRow): boolean {
  return activity.status !== 'done';
}

function isOverdue(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  const parsed = new Date(deadline).getTime();
  if (!Number.isFinite(parsed)) return false;
  return parsed < Date.now();
}

function projectPriorityValue(projectId: string | null, priorityById: Map<string, number>): number {
  if (!projectId) return Number.POSITIVE_INFINITY;
  return priorityById.get(projectId) ?? Number.POSITIVE_INFINITY;
}

async function fetchUsers(workspaceId: string): Promise<UserRow[]> {
  const userIds = await listActiveWorkspaceUserIds(workspaceId);
  if (userIds.length === 0) return [];

  const usersRes = await supabase
    .from('cdt_users')
    .select('id, name, email')
    .in('id', userIds)
    .eq('is_active', true);
  if (usersRes.error) throw usersRes.error;
  return (usersRes.data ?? []) as UserRow[];
}

async function countPendingTodosForUser(workspaceId: string, userId: string): Promise<number> {
  const response = await supabase
    .from('cdt_project_todos')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('assigned_to', userId)
    .eq('completed', false);

  if (response.error) throw response.error;
  return response.count ?? 0;
}

async function fetchTodos(workspaceId: string): Promise<TodoRow[]> {
  const withAssignedAt = await supabase
    .from('cdt_project_todos')
    .select('id, title, project_id, activity_id, created_by, assigned_to, completed, assigned_at, deadline, xp_reward, created_at, updated_at')
    .eq('workspace_id', workspaceId);

  if (withAssignedAt.error && /assigned_at|does not exist|column.*not exist/i.test(String(withAssignedAt.error.message || ''))) {
    const fallback = await supabase
      .from('cdt_project_todos')
      .select('id, title, project_id, activity_id, created_by, assigned_to, completed, deadline, xp_reward, created_at, updated_at')
      .eq('workspace_id', workspaceId);
    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []) as TodoRow[];
  }

  if (withAssignedAt.error) throw withAssignedAt.error;
  return (withAssignedAt.data ?? []) as TodoRow[];
}

async function fetchProjects(workspaceId: string): Promise<ProjectRow[]> {
  const orderedQuery = await supabase
    .from('cdt_projects')
    .select('id, name, status, responsible_user_id, created_by, priority_order, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('priority_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (orderedQuery.error && /priority_order|does not exist|column.*not exist/i.test(String(orderedQuery.error.message || ''))) {
    const fallback = await supabase
      .from('cdt_projects')
      .select('id, name, status, responsible_user_id, created_by, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []) as ProjectRow[];
  }

  if (orderedQuery.error) throw orderedQuery.error;
  return (orderedQuery.data ?? []) as ProjectRow[];
}

async function fetchActivities(workspaceId: string): Promise<ActivityRow[]> {
  const res = await supabase
    .from('cdt_activities')
    .select('id, name, status, assigned_to, due_date, created_by, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (res.error) throw res.error;
  return (res.data ?? []) as ActivityRow[];
}

function buildTodoItem(
  todo: TodoRow,
  lookup: {
    projectNameById: Map<string, string>;
    activityNameById: Map<string, string>;
    userNameById: Map<string, string>;
  },
  sourceType: 'todo' = 'todo',
): HomeTodoItem {
  return {
    id: todo.id,
    title: todo.title,
    deadline: todo.deadline ?? null,
    projectId: todo.project_id ?? null,
    projectName: todo.project_id ? lookup.projectNameById.get(todo.project_id) ?? null : null,
    activityId: todo.activity_id ?? null,
    activityName: todo.activity_id ? lookup.activityNameById.get(todo.activity_id) ?? null : null,
    assigneeName: todo.assigned_to ? lookup.userNameById.get(todo.assigned_to) ?? null : null,
    sourceType,
  };
}

function buildActivityItem(
  activity: ActivityRow,
  lookup: {
    userNameById: Map<string, string>;
  },
): HomeTodoItem {
  return {
    id: activity.id,
    title: activity.name,
    deadline: activity.due_date ?? null,
    projectId: null,
    projectName: null,
    activityId: activity.id,
    activityName: activity.name,
    assigneeName: activity.assigned_to ? lookup.userNameById.get(activity.assigned_to) ?? null : null,
    sourceType: 'activity',
  };
}

function compareOpenTodoPriority(
  a: TodoRow,
  b: TodoRow,
  priorityById: Map<string, number>,
): number {
  const aPriority = projectPriorityValue(a.project_id, priorityById);
  const bPriority = projectPriorityValue(b.project_id, priorityById);
  if (aPriority !== bPriority) return aPriority - bPriority;

  const aOverdue = isOverdue(a.deadline);
  const bOverdue = isOverdue(b.deadline);
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

  const deadlineDelta = dateValue(a.deadline) - dateValue(b.deadline);
  if (deadlineDelta !== 0) return deadlineDelta;

  const assignedDelta = activityDateValue(b.assigned_at ?? b.updated_at ?? b.created_at) - activityDateValue(a.assigned_at ?? a.updated_at ?? a.created_at);
  if (assignedDelta !== 0) return assignedDelta;

  return a.title.localeCompare(b.title, 'pt-BR');
}

type TeamOpenItem =
  | {
      sourceType: 'todo';
      todo: TodoRow;
      projectPriority: number;
    }
  | {
      sourceType: 'activity';
      activity: ActivityRow;
      projectPriority: number;
    };

function compareTeamOpenItem(a: TeamOpenItem, b: TeamOpenItem): number {
  if (a.projectPriority !== b.projectPriority) return a.projectPriority - b.projectPriority;

  const aDeadline = a.sourceType === 'todo' ? a.todo.deadline : a.activity.due_date;
  const bDeadline = b.sourceType === 'todo' ? b.todo.deadline : b.activity.due_date;
  const aOverdue = isOverdue(aDeadline);
  const bOverdue = isOverdue(bDeadline);
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

  const deadlineDelta = dateValue(aDeadline) - dateValue(bDeadline);
  if (deadlineDelta !== 0) return deadlineDelta;

  const aUpdated = a.sourceType === 'todo'
    ? a.todo.updated_at ?? a.todo.assigned_at ?? a.todo.created_at
    : a.activity.updated_at ?? a.activity.created_at;
  const bUpdated = b.sourceType === 'todo'
    ? b.todo.updated_at ?? b.todo.assigned_at ?? b.todo.created_at
    : b.activity.updated_at ?? b.activity.created_at;
  const updatedDelta = activityDateValue(bUpdated) - activityDateValue(aUpdated);
  if (updatedDelta !== 0) return updatedDelta;

  const aTitle = a.sourceType === 'todo' ? a.todo.title : a.activity.name;
  const bTitle = b.sourceType === 'todo' ? b.todo.title : b.activity.name;
  return aTitle.localeCompare(bTitle, 'pt-BR');
}

function compareReviewPriority(a: HomeReviewItem, b: HomeReviewItem): number {
  const reasonRank = (value: HomeReviewItem['waitingReason']): number => (value === 'review' ? 0 : 1);
  const reasonDelta = reasonRank(a.waitingReason) - reasonRank(b.waitingReason);
  if (reasonDelta !== 0) return reasonDelta;

  const dueDelta = dateValue(a.dueDate) - dateValue(b.dueDate);
  if (dueDelta !== 0) return dueDelta;

  return a.title.localeCompare(b.title, 'pt-BR');
}

router.get('/sidebar-summary', async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;

    const pendingTodos = await countPendingTodosForUser(workspaceId, requesterId);

    res.json({
      pendingTodos,
      workspace: getWorkspaceSlug(req) ? { slug: getWorkspaceSlug(req) } : undefined,
    });
  } catch (error: any) {
    console.error('Error building sidebar summary payload:', error);
    res.status(500).json({ error: error?.message || 'Failed to build sidebar summary payload' });
  }
});

router.get('/', async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspaceId = getWorkspaceIdOrFail(req, res);
    if (!workspaceId) return;

    const workspaceSlug = getWorkspaceSlug(req);
    const isAdmin = await hasRole(requesterId, 'admin');

    const [users, todos, projects, activities] = await Promise.all([
      fetchUsers(workspaceId),
      fetchTodos(workspaceId),
      fetchProjects(workspaceId),
      fetchActivities(workspaceId),
    ]);

    const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
    const activityNameById = new Map(activities.map((activity) => [activity.id, activity.name]));
    const projectPriorityById = new Map(
      projects
        .filter((project) => typeof project.priority_order === 'number')
        .map((project) => [project.id, project.priority_order as number]),
    );
    const userNameById = new Map(
      users.map((user) => [user.id, user.name || user.email?.split('@')[0] || 'Usuario']),
    );

    const assignedToMe = todos.filter((todo) => todo.assigned_to === requesterId && isTodoOpen(todo));
    const openAssignedTodos = [...assignedToMe].sort((a, b) => compareOpenTodoPriority(a, b, projectPriorityById));
    const overdueTodos = openAssignedTodos.filter((todo) => isOverdue(todo.deadline));
    const nowTodos = openAssignedTodos;
    const pendingTodos = openAssignedTodos.slice(0, 5);

    const openTeamActivities = activities.filter((activity) => isActivityOpen(activity));
    const openTeamTodos = todos.filter((todo) => isTodoOpen(todo));

    const waitingFromActivities: HomeReviewItem[] = activities
      .filter((activity) => activity.status === 'review')
      .filter((activity) => isAdmin || activity.assigned_to === requesterId || activity.created_by === requesterId)
      .map((activity) => ({
        id: activity.id,
        kind: 'activity',
        title: activity.name,
        status: activity.status,
        dueDate: activity.due_date ?? null,
        ownerName: activity.assigned_to ? userNameById.get(activity.assigned_to) ?? null : activity.created_by ? userNameById.get(activity.created_by) ?? null : null,
        waitingReason: 'review',
      }));

    const waitingFromProjects: HomeReviewItem[] = projects
      .filter((project) => project.status === 'review')
      .filter((project) => isAdmin || project.responsible_user_id === requesterId || project.created_by === requesterId)
      .map((project) => ({
        id: project.id,
        kind: 'project',
        title: project.name,
        status: project.status,
        dueDate: null,
        ownerName: project.responsible_user_id
          ? userNameById.get(project.responsible_user_id) ?? null
          : project.created_by
            ? userNameById.get(project.created_by) ?? null
            : null,
        waitingReason: 'review',
      }));

    const waitingFromTodos: HomeReviewItem[] = openAssignedTodos
      .filter((todo) => Number(todo.xp_reward ?? 0) <= 0)
      .map((todo) => ({
        id: todo.id,
        kind: 'todo',
        title: todo.title,
        status: 'xp_pending',
        dueDate: todo.deadline ?? null,
        ownerName: todo.assigned_to ? userNameById.get(todo.assigned_to) ?? null : null,
        waitingReason: 'xp',
      }));

    const waitingAll = [...waitingFromActivities, ...waitingFromProjects, ...waitingFromTodos]
      .sort(compareReviewPriority);
    const waiting = waitingAll.slice(0, 5);

    const teamOpenItemsAll = [
      ...openTeamTodos.map((todo) => ({
        sourceType: 'todo' as const,
        todo,
        projectPriority: projectPriorityValue(todo.project_id, projectPriorityById),
      })),
      ...openTeamActivities.map((activity) => ({
        sourceType: 'activity' as const,
        activity,
        projectPriority: Number.POSITIVE_INFINITY,
      })),
    ]
      .sort(compareTeamOpenItem);
    const teamOpenItems = teamOpenItemsAll.slice(0, 12);

    const response = {
      persona: isAdmin ? 'admin' : 'member',
      summary: {
        myOpen: assignedToMe.length,
        myPending: openAssignedTodos.length,
        overdue: overdueTodos.length,
        waiting: waitingAll.length,
        teamOpenActivities: isAdmin ? openTeamActivities.length : undefined,
        teamOpenItems: isAdmin ? teamOpenItemsAll.length : undefined,
        xpPending: isAdmin ? todos.filter((todo) => isTodoOpen(todo) && Number(todo.xp_reward ?? 0) <= 0).length : undefined,
      },
      buckets: {
        now: nowTodos.slice(0, 3).map((todo) => buildTodoItem(todo, { projectNameById, activityNameById, userNameById })),
        pending: pendingTodos.map((todo) => buildTodoItem(todo, { projectNameById, activityNameById, userNameById })),
        overdue: overdueTodos.slice(0, 5).map((todo) => buildTodoItem(todo, { projectNameById, activityNameById, userNameById })),
        waiting,
        teamOpenActivities: isAdmin
          ? openTeamActivities.slice(0, 12).map((activity) => buildActivityItem(activity, { userNameById }))
          : [],
        teamOpenItems: isAdmin
          ? teamOpenItems.map((entry) =>
              entry.sourceType === 'todo'
                ? buildTodoItem(entry.todo, { projectNameById, activityNameById, userNameById })
                : buildActivityItem(entry.activity, { userNameById }),
            )
          : [],
      },
      quickTargets: {
        projectsOpen: '/desenvolvimentos?view=list',
        activitiesOpen: '/atividades?view=list',
        indicatorsUrl: '/indicadores',
        adminUrl: isAdmin ? '/configuracoes/administracao' : undefined,
      },
      workspace: workspaceSlug ? { slug: workspaceSlug } : undefined,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error building home payload:', error);
    res.status(500).json({ error: error?.message || 'Failed to build home payload' });
  }
});

export default router;
