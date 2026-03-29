import express from 'express';
import { supabase } from '../config/supabase.js';
import { getRequesterId } from '../middleware/auth.js';
import { getWorkspaceContext } from '../middleware/workspace.js';
import { hasRole } from '../services/permissions.js';

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
  created_by: string | null;
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
};

type HomeReviewItem = {
  id: string;
  kind: 'project' | 'activity';
  title: string;
  status: string;
  dueDate: string | null;
  ownerName?: string | null;
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

function isOverdue(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  const parsed = new Date(deadline).getTime();
  if (!Number.isFinite(parsed)) return false;
  return parsed < Date.now();
}

async function fetchUsers(workspaceId: string): Promise<UserRow[]> {
  const membershipAttempts: Array<
    | { field: 'status' | 'membership_status'; value: string }
    | { field: 'is_active'; value: boolean }
  > = [
    { field: 'status', value: 'active' },
    { field: 'membership_status', value: 'active' },
    { field: 'is_active', value: true },
  ];

  let userIds: string[] = [];
  for (const attempt of membershipAttempts) {
    const membershipRes = await supabase
      .from('cdt_workspace_memberships')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq(attempt.field, attempt.value);

    if (!membershipRes.error) {
      userIds = Array.from(
        new Set((membershipRes.data ?? []).map((row: { user_id: string }) => row.user_id)),
      );
      break;
    }

    const message = String(membershipRes.error.message || '');
    if (!/does not exist|Could not find|schema cache/i.test(message)) {
      throw membershipRes.error;
    }
  }

  if (userIds.length === 0) return [];

  const usersRes = await supabase
    .from('cdt_users')
    .select('id, name, email')
    .in('id', userIds)
    .eq('is_active', true);
  if (usersRes.error) throw usersRes.error;
  return (usersRes.data ?? []) as UserRow[];
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
  const res = await supabase
    .from('cdt_projects')
    .select('id, name, status, created_by, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (res.error) throw res.error;
  return (res.data ?? []) as ProjectRow[];
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
  };
}

function compareTodoPriority(a: TodoRow, b: TodoRow): number {
  const deadlineDelta = dateValue(a.deadline) - dateValue(b.deadline);
  if (deadlineDelta !== 0) return deadlineDelta;

  const assignedDelta = activityDateValue(b.assigned_at ?? b.updated_at ?? b.created_at) - activityDateValue(a.assigned_at ?? a.updated_at ?? a.created_at);
  if (assignedDelta !== 0) return assignedDelta;

  return a.title.localeCompare(b.title, 'pt-BR');
}

function compareReviewPriority(a: HomeReviewItem, b: HomeReviewItem): number {
  const dueDelta = dateValue(a.dueDate) - dateValue(b.dueDate);
  if (dueDelta !== 0) return dueDelta;
  return a.title.localeCompare(b.title, 'pt-BR');
}

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
    const userNameById = new Map(
      users.map((user) => [user.id, user.name || user.email?.split('@')[0] || 'Usuário']),
    );

    const assignedToMe = todos.filter((todo) => todo.assigned_to === requesterId && isTodoOpen(todo));
    const overdueTodos = assignedToMe.filter((todo) => isOverdue(todo.deadline)).sort(compareTodoPriority);
    const nowTodos = assignedToMe.filter((todo) => !isOverdue(todo.deadline)).sort(compareTodoPriority);

    const delegatedTodos = todos
      .filter((todo) => todo.created_by === requesterId && todo.assigned_to && todo.assigned_to !== requesterId && isTodoOpen(todo))
      .sort(compareTodoPriority);

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
      }));

    const waitingFromProjects: HomeReviewItem[] = projects
      .filter((project) => project.status === 'review')
      .filter((project) => isAdmin || project.created_by === requesterId)
      .map((project) => ({
        id: project.id,
        kind: 'project',
        title: project.name,
        status: project.status,
        dueDate: null,
        ownerName: project.created_by ? userNameById.get(project.created_by) ?? null : null,
      }));

    const waiting = [...waitingFromActivities, ...waitingFromProjects].sort(compareReviewPriority);

    const response = {
      persona: isAdmin ? 'admin' : 'member',
      summary: {
        myOpen: assignedToMe.length,
        overdue: overdueTodos.length,
        waiting: waiting.length,
        delegated: delegatedTodos.length,
        teamOpen: isAdmin ? todos.filter((todo) => isTodoOpen(todo)).length : undefined,
        xpPending: isAdmin ? todos.filter((todo) => isTodoOpen(todo) && Number(todo.xp_reward ?? 0) <= 0).length : undefined,
      },
      buckets: {
        now: nowTodos.slice(0, 8).map((todo) => buildTodoItem(todo, { projectNameById, activityNameById, userNameById })),
        overdue: overdueTodos.slice(0, 8).map((todo) => buildTodoItem(todo, { projectNameById, activityNameById, userNameById })),
        waiting: waiting.slice(0, 8),
        delegated: delegatedTodos.slice(0, 8).map((todo) => buildTodoItem(todo, { projectNameById, activityNameById, userNameById })),
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
