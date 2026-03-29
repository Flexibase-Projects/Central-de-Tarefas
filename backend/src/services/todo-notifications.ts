import { supabase } from '../config/supabase.js';
import { getAdminUserIds } from './permissions.js';

type TodoContext = {
  contextLabel: string;
  contextName: string;
  projectId: string | null;
};

async function resolveTodoContext(params: {
  projectId?: string | null;
  activityId?: string | null;
}): Promise<TodoContext> {
  if (params.projectId) {
    const { data: project } = await supabase
      .from('cdt_projects')
      .select('name')
      .eq('id', params.projectId)
      .maybeSingle();
    return {
      contextLabel: 'projeto',
      contextName: project?.name || 'Projeto',
      projectId: params.projectId,
    };
  }

  if (params.activityId) {
    const { data: activity } = await supabase
      .from('cdt_activities')
      .select('name')
      .eq('id', params.activityId)
      .maybeSingle();
    return {
      contextLabel: 'atividade',
      contextName: activity?.name || 'Atividade',
      // Reutilizamos project_id como alvo navegável nas notificações para deep-link de atividades.
      projectId: params.activityId,
    };
  }

  return {
    contextLabel: 'item',
    contextName: 'Item',
    projectId: null,
  };
}

export async function clearTodoAssignmentNotifications(todoId: string, userId?: string | null): Promise<void> {
  let query = supabase
    .from('cdt_notifications')
    .delete()
    .eq('related_id', todoId)
    .eq('related_type', 'todo')
    .eq('type', 'todo_assigned');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;
  if (error) {
    throw error;
  }
}

export async function notifyTodoAssigned(params: {
  workspaceId: string;
  todoId: string;
  title: string;
  assignedTo: string;
  projectId?: string | null;
  activityId?: string | null;
}): Promise<void> {
  const ctx = await resolveTodoContext({
    projectId: params.projectId ?? null,
    activityId: params.activityId ?? null,
  });

  await clearTodoAssignmentNotifications(params.todoId, params.assignedTo);

  const { error } = await supabase.from('cdt_notifications').insert({
    workspace_id: params.workspaceId,
    user_id: params.assignedTo,
    type: 'todo_assigned',
    title: 'Novo TO-DO para voce!',
    message: `Voce foi atribuido ao TODO "${params.title}" na ${ctx.contextLabel} "${ctx.contextName}"`,
    related_id: params.todoId,
    related_type: 'todo',
    project_id: ctx.projectId,
  });

  if (error) {
    throw error;
  }
}

export async function clearTodoXpPendingNotifications(todoId: string): Promise<void> {
  const { error } = await supabase
    .from('cdt_notifications')
    .delete()
    .eq('related_id', todoId)
    .eq('related_type', 'todo')
    .eq('type', 'todo_xp_pending');

  if (error) {
    throw error;
  }
}

export async function notifyAdminsTodoXpPending(params: {
  workspaceId: string;
  todoId: string;
  title: string;
  projectId?: string | null;
  activityId?: string | null;
  createdBy: string;
}): Promise<void> {
  const adminIds = await getAdminUserIds();
  const recipientIds = adminIds.filter((adminId) => adminId !== params.createdBy);
  if (recipientIds.length === 0) return;

  const ctx = await resolveTodoContext({
    projectId: params.projectId ?? null,
    activityId: params.activityId ?? null,
  });

  await clearTodoXpPendingNotifications(params.todoId);

  const payload = recipientIds.map((userId) => ({
    workspace_id: params.workspaceId,
    user_id: userId,
    type: 'todo_xp_pending',
    title: 'TO-DO pendente de XP',
    message: `Defina a experiencia do TODO "${params.title}" na ${ctx.contextLabel} "${ctx.contextName}"`,
    related_id: params.todoId,
    related_type: 'todo',
    project_id: ctx.projectId,
  }));

  const { error } = await supabase.from('cdt_notifications').insert(payload);
  if (error) {
    throw error;
  }
}
