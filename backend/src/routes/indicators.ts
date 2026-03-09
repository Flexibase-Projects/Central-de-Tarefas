import express from 'express';
import { supabase } from '../config/supabase.js';
import { isSupabaseConnectionRefused, SUPABASE_UNAVAILABLE_MESSAGE } from '../utils/supabase-errors.js';

const router = express.Router();

interface UserIndicator {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  comments_count: number;
  todos_created: number;
  todos_completed: number;
  activities_created: number;
  activities_assigned: number;
}

interface ProjectIndicator {
  project_id: string;
  project_name: string;
  project_status: string;
  todos_count: number;
  todos_completed: number;
  comments_count: number;
}

interface ActivityIndicator {
  activity_id: string;
  activity_name: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
}

interface TeamTotals {
  total_users: number;
  total_projects: number;
  total_activities: number;
  total_comments: number;
  total_todos_created: number;
  total_todos_completed: number;
}

/**
 * GET /api/indicators
 * Retorna indicadores por usuário, por projeto, por atividade e totais do time.
 */
router.get('/', async (req, res) => {
  try {
    const [
      usersRes,
      commentsRes,
      todosRes,
      projectsRes,
      activitiesRes,
    ] = await Promise.all([
      supabase.from('cdt_users').select('id, name, email, avatar_url').eq('is_active', true),
      supabase.from('cdt_comments').select('id, created_by, project_id'),
      supabase.from('cdt_project_todos').select('id, project_id, created_by, assigned_to, completed'),
      supabase.from('cdt_projects').select('id, name, status'),
      supabase.from('cdt_activities').select('id, name, status, assigned_to, due_date, created_by'),
    ]);

    if (usersRes.error) throw usersRes.error;
    if (commentsRes.error) throw commentsRes.error;
    if (todosRes.error) throw todosRes.error;
    if (projectsRes.error) throw projectsRes.error;
    if (activitiesRes.error) throw activitiesRes.error;

    const users = usersRes.data || [];
    const comments = commentsRes.data || [];
    const todos = todosRes.data || [];
    const projects = projectsRes.data || [];
    const activities = activitiesRes.data || [];

    const commentsByUser = new Map<string, number>();
    const todosCreatedByUser = new Map<string, number>();
    const todosCompletedByUser = new Map<string, number>();
    const commentsByProject = new Map<string, number>();
    const todosByProject = new Map<string, { total: number; completed: number }>();
    const activitiesCreatedByUser = new Map<string, number>();
    const activitiesAssignedByUser = new Map<string, number>();

    comments.forEach((c: { id: string; created_by?: string | null; project_id?: string | null }) => {
      if (c.created_by) {
        commentsByUser.set(c.created_by, (commentsByUser.get(c.created_by) ?? 0) + 1);
      }
      if (c.project_id) {
        commentsByProject.set(c.project_id, (commentsByProject.get(c.project_id) ?? 0) + 1);
      }
    });

    todos.forEach((t: { id: string; project_id: string; created_by?: string | null; assigned_to?: string | null; completed?: boolean }) => {
      if (t.created_by) {
        todosCreatedByUser.set(t.created_by, (todosCreatedByUser.get(t.created_by) ?? 0) + 1);
      }
      if (t.assigned_to && t.completed) {
        todosCompletedByUser.set(t.assigned_to, (todosCompletedByUser.get(t.assigned_to) ?? 0) + 1);
      }
      const cur = todosByProject.get(t.project_id) ?? { total: 0, completed: 0 };
      cur.total += 1;
      if (t.completed) cur.completed += 1;
      todosByProject.set(t.project_id, cur);
    });

    activities.forEach((a: { id: string; created_by?: string | null; assigned_to?: string | null }) => {
      if (a.created_by) {
        activitiesCreatedByUser.set(a.created_by, (activitiesCreatedByUser.get(a.created_by) ?? 0) + 1);
      }
      if (a.assigned_to) {
        activitiesAssignedByUser.set(a.assigned_to, (activitiesAssignedByUser.get(a.assigned_to) ?? 0) + 1);
      }
    });

    const byUser: UserIndicator[] = users.map((u: { id: string; name: string; email: string; avatar_url: string | null }) => ({
      user_id: u.id,
      name: u.name || u.email?.split('@')[0] || '—',
      email: u.email || '',
      avatar_url: u.avatar_url ?? null,
      comments_count: commentsByUser.get(u.id) ?? 0,
      todos_created: todosCreatedByUser.get(u.id) ?? 0,
      todos_completed: todosCompletedByUser.get(u.id) ?? 0,
      activities_created: activitiesCreatedByUser.get(u.id) ?? 0,
      activities_assigned: activitiesAssignedByUser.get(u.id) ?? 0,
    }));

    const byProject: ProjectIndicator[] = projects.map((p: { id: string; name: string; status: string }) => {
      const tp = todosByProject.get(p.id) ?? { total: 0, completed: 0 };
      return {
        project_id: p.id,
        project_name: p.name,
        project_status: p.status,
        todos_count: tp.total,
        todos_completed: tp.completed,
        comments_count: commentsByProject.get(p.id) ?? 0,
      };
    });

    const byActivity: ActivityIndicator[] = activities.map((a: { id: string; name: string; status: string; assigned_to: string | null; due_date: string | null }) => ({
      activity_id: a.id,
      activity_name: a.name,
      status: a.status,
      assigned_to: a.assigned_to ?? null,
      due_date: a.due_date ?? null,
    }));

    const totalComments = comments.length;
    const totalTodosCreated = todos.length;
    const totalTodosCompleted = todos.filter((t: { completed?: boolean }) => t.completed).length;

    const team: TeamTotals = {
      total_users: users.length,
      total_projects: projects.length,
      total_activities: activities.length,
      total_comments: totalComments,
      total_todos_created: totalTodosCreated,
      total_todos_completed: totalTodosCompleted,
    };

    res.json({
      by_user: byUser,
      by_project: byProject,
      by_activity: byActivity,
      team: team,
    });
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error fetching indicators:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch indicators',
    });
  }
});

export default router;
