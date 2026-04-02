import { supabase } from '../config/supabase.js';
import { getLevelFromTotalXp } from '../utils/level-xp.js';
import { PRESET_ACHIEVEMENTS, type AchievementDef, evaluateAchievements } from '../utils/achievement-engine.js';
import { isOnOrBeforeDate } from '../utils/date-only.js';

type AchievementMode = 'global_auto' | 'linked_item' | 'manual';

interface DbAchievement {
  id: string;
  slug: string;
  reward_xp_fixed: number | null;
  reward_percent: number | null;
  xp_bonus: number | null;
  condition_type: string | null;
  condition_value: number | null;
  mode: AchievementMode | null;
}

interface UserStatsContext {
  totalXp: number;
  completedTodos: number;
  completedActivities: number;
  deadlineTodos: number;
  deadlineActivities: number;
  challengeTodos: number;
  commentsCount: number;
  streakDays: number;
  level: number;
}

interface LinkedAchievementReward {
  fixedXp: number;
  percent: number;
}

interface TodoCompletionCycleState {
  openCompletionLogId: string | null;
  openCompletionXp: number;
}

const ROUND_FACTOR = 100;

function roundXp(value: number): number {
  return Math.round(value * ROUND_FACTOR) / ROUND_FACTOR;
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeConditionType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'level') return 'level_reached';
  if (normalized === 'streak') return 'streak_days';
  if (normalized === 'total_xp') return 'total_xp';
  return normalized;
}

function toPresetContext(stats: UserStatsContext) {
  return {
    completedTodos: stats.completedTodos,
    completedActivities: stats.completedActivities,
    level: stats.level,
    totalXp: stats.totalXp,
    streakDays: stats.streakDays,
    deadlineTodos: stats.deadlineTodos,
    deadlineActivities: stats.deadlineActivities,
    challengeTodos: stats.challengeTodos,
    commentsCount: stats.commentsCount,
  };
}

function getPresetBySlug(slug: string): AchievementDef | undefined {
  return PRESET_ACHIEVEMENTS.find((a) => a.slug === slug);
}

function evaluateDbCondition(achievement: DbAchievement, stats: UserStatsContext): boolean {
  const conditionType = normalizeConditionType(achievement.condition_type);
  const conditionValue = parseNumber(achievement.condition_value, 0);
  if (!conditionType) return false;

  switch (conditionType) {
    case 'todos_completed':
      return stats.completedTodos >= conditionValue;
    case 'activities_completed':
      return stats.completedActivities >= conditionValue;
    case 'level_reached':
      return stats.level >= conditionValue;
    case 'total_xp':
      return stats.totalXp >= conditionValue;
    case 'streak_days':
      return stats.streakDays >= conditionValue;
    case 'deadline_todos':
      return stats.deadlineTodos >= conditionValue;
    case 'deadline_activities':
      return stats.deadlineActivities >= conditionValue;
    case 'challenge_todos':
      return stats.challengeTodos >= conditionValue;
    case 'comments_count':
      return stats.commentsCount >= conditionValue;
    default:
      return false;
  }
}

async function hasXpLogEntry(
  userId: string,
  reason: string,
  relatedId: string,
  relatedType: string,
  workspaceId?: string | null,
): Promise<boolean> {
  let query = supabase
    .from('cdt_user_xp_log')
    .select('id')
    .eq('user_id', userId)
    .eq('reason', reason)
    .eq('related_id', relatedId)
    .eq('related_type', relatedType)
    .limit(1);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query;
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

async function getTodoCompletionCycleState(
  userId: string,
  todoId: string,
  workspaceId?: string | null,
): Promise<TodoCompletionCycleState> {
  let query = supabase
    .from('cdt_user_xp_log')
    .select('id, xp_amount, reason, created_at')
    .eq('user_id', userId)
    .eq('related_id', todoId)
    .eq('related_type', 'todo')
    .in('reason', ['todo_completed', 'todo_uncompleted'])
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { openCompletionLogId: null, openCompletionXp: 0 };
  }

  const stack: Array<{ id: string; xpAmount: number }> = [];

  for (const row of data as Array<{
    id: string;
    xp_amount: number | null;
    reason: string;
  }>) {
    if (row.reason === 'todo_completed') {
      stack.push({ id: row.id, xpAmount: roundXp(parseNumber(row.xp_amount, 0)) });
      continue;
    }

    if (row.reason === 'todo_uncompleted' && stack.length > 0) {
      stack.pop();
    }
  }

  const open = stack.at(-1);
  return {
    openCompletionLogId: open?.id ?? null,
    openCompletionXp: open?.xpAmount ?? 0,
  };
}

async function insertXpLog(params: {
  userId: string;
  xpAmount: number;
  reason: string;
  relatedId: string;
  relatedType: string;
  workspaceId?: string | null;
}): Promise<boolean> {
  const rounded = roundXp(params.xpAmount);
  if (rounded === 0) return false;
  const { error } = await supabase.from('cdt_user_xp_log').insert({
    user_id: params.userId,
    workspace_id: params.workspaceId ?? null,
    xp_amount: rounded,
    reason: params.reason,
    related_id: params.relatedId,
    related_type: params.relatedType,
  });
  if (error && error.code !== '23505') {
    throw error;
  }
  return !error;
}

async function fetchStats(userId: string, workspaceId?: string | null): Promise<UserStatsContext> {
  const [xpLogRes, todosRes, activitiesRes, commentsRes] = await Promise.all([
    (workspaceId
      ? supabase.from('cdt_user_xp_log').select('xp_amount').eq('user_id', userId).eq('workspace_id', workspaceId)
      : supabase.from('cdt_user_xp_log').select('xp_amount').eq('user_id', userId)),
    (workspaceId
      ? supabase
          .from('cdt_project_todos')
          .select('id, completed_at, deadline, achievement_id')
          .eq('workspace_id', workspaceId)
          .eq('assigned_to', userId)
          .eq('completed', true)
      : supabase
          .from('cdt_project_todos')
          .select('id, completed_at, deadline, achievement_id')
          .eq('assigned_to', userId)
          .eq('completed', true)),
    (workspaceId
      ? supabase
          .from('cdt_activities')
          .select('id, completed_at, due_date')
          .eq('workspace_id', workspaceId)
          .eq('status', 'done')
          .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      : supabase
          .from('cdt_activities')
          .select('id, completed_at, due_date')
          .eq('status', 'done')
          .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)),
    supabase.from('cdt_project_comments').select('id').eq('user_id', userId),
  ]);

  let totalXpFromLog = 0;
  if (!xpLogRes.error && xpLogRes.data) {
    totalXpFromLog = (xpLogRes.data as Array<{ xp_amount: number | null }>).reduce(
      (sum, row) => sum + parseNumber(row.xp_amount, 0),
      0,
    );
  }

  const todos = !todosRes.error && todosRes.data
    ? (todosRes.data as Array<{
        completed_at?: string | null;
        deadline?: string | null;
        achievement_id?: string | null;
      }>)
    : [];
  const activities = !activitiesRes.error && activitiesRes.data
    ? (activitiesRes.data as Array<{ completed_at?: string | null; due_date?: string | null }>)
    : [];
  const commentsCount = !commentsRes.error && commentsRes.data ? commentsRes.data.length : 0;

  const completedTodos = todos.length;
  const completedActivities = activities.length;

  const deadlineTodos = todos.filter(
    (t) => isOnOrBeforeDate(t.completed_at ?? null, t.deadline ?? null),
  ).length;
  const deadlineActivities = activities.filter(
    (a) => isOnOrBeforeDate(a.completed_at ?? null, a.due_date ?? null),
  ).length;
  const challengeTodos = todos.filter((t) => t.achievement_id != null).length;

  let totalXp = roundXp(totalXpFromLog);
  if (totalXp <= 0 && (completedTodos > 0 || completedActivities > 0)) {
    const [legacyTodoXpRes, legacyActivityXpRes] = await Promise.all([
      (workspaceId
        ? supabase
            .from('cdt_project_todos')
            .select('xp_reward')
            .eq('workspace_id', workspaceId)
            .eq('assigned_to', userId)
            .eq('completed', true)
        : supabase
            .from('cdt_project_todos')
            .select('xp_reward')
            .eq('assigned_to', userId)
            .eq('completed', true)),
      (workspaceId
        ? supabase
            .from('cdt_activities')
            .select('xp_reward')
            .eq('workspace_id', workspaceId)
            .eq('status', 'done')
            .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
        : supabase
            .from('cdt_activities')
            .select('xp_reward')
            .eq('status', 'done')
            .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)),
    ]);
    if (!legacyTodoXpRes.error && !legacyActivityXpRes.error) {
      const todoXp = (legacyTodoXpRes.data ?? []).reduce(
        (sum: number, row: { xp_reward?: number | null }) => sum + parseNumber(row.xp_reward, 1),
        0,
      );
      const activityXp = (legacyActivityXpRes.data ?? []).reduce(
        (sum: number, row: { xp_reward?: number | null }) => sum + parseNumber(row.xp_reward, 1),
        0,
      );
      totalXp = roundXp(todoXp + activityXp);
    }
  }

  const streakDays = await fetchStreakDaysFromCompletions(userId, workspaceId);
  const { level } = getLevelFromTotalXp(totalXp);

  return {
    totalXp,
    completedTodos,
    completedActivities,
    deadlineTodos,
    deadlineActivities,
    challengeTodos,
    commentsCount,
    streakDays,
    level,
  };
}

async function fetchStreakDaysFromCompletions(
  userId: string,
  workspaceId?: string | null,
): Promise<number> {
  const [todoDaysRes, activityDaysRes] = await Promise.all([
    (workspaceId
      ? supabase
          .from('cdt_project_todos')
          .select('completed_at')
          .eq('workspace_id', workspaceId)
          .eq('assigned_to', userId)
          .eq('completed', true)
          .not('completed_at', 'is', null)
      : supabase
          .from('cdt_project_todos')
          .select('completed_at')
          .eq('assigned_to', userId)
          .eq('completed', true)
          .not('completed_at', 'is', null)),
    (workspaceId
      ? supabase
          .from('cdt_activities')
          .select('completed_at')
          .eq('workspace_id', workspaceId)
          .eq('status', 'done')
          .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
          .not('completed_at', 'is', null)
      : supabase
          .from('cdt_activities')
          .select('completed_at')
          .eq('status', 'done')
          .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
          .not('completed_at', 'is', null)),
  ]);

  if (todoDaysRes.error && activityDaysRes.error) return 0;

  const allDates = [
    ...((todoDaysRes.data ?? []) as Array<{ completed_at?: string | null }>),
    ...((activityDaysRes.data ?? []) as Array<{ completed_at?: string | null }>),
  ]
    .map((r) => r.completed_at?.substring(0, 10))
    .filter((d): d is string => Boolean(d));

  if (allDates.length === 0) return 0;

  const uniqueDays = Array.from(new Set(allDates)).sort((a, b) => (a > b ? -1 : 1));
  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().substring(0, 10);
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1] as string);
    const curr = new Date(uniqueDays[i] as string);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

async function ensureAchievementUnlocked(
  userId: string,
  achievementId: string,
  workspaceId?: string | null,
): Promise<boolean> {
  const { error } = await supabase.from('cdt_user_achievements').insert({
    user_id: userId,
    achievement_id: achievementId,
    workspace_id: workspaceId ?? null,
  });
  if (error && error.code !== '23505') {
    throw error;
  }
  return !error;
}

async function fetchActiveAchievements(): Promise<DbAchievement[]> {
  const { data, error } = await supabase
    .from('cdt_achievements')
    .select(
      'id, slug, reward_xp_fixed, reward_percent, xp_bonus, condition_type, condition_value, mode',
    )
    .eq('is_active', true);
  if (error || !data) return [];
  return data as DbAchievement[];
}

async function fetchUnlockedAchievementIds(
  userId: string,
  workspaceId?: string | null,
): Promise<Set<string>> {
  let query = supabase
    .from('cdt_user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  if (workspaceId) {
    query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);
  }

  const { data, error } = await query;
  if (error || !data) return new Set<string>();
  return new Set((data as Array<{ achievement_id: string }>).map((row) => row.achievement_id));
}

function resolveGlobalUnlockedSlugs(stats: UserStatsContext, unlockedSlugs: Set<string>): Set<string> {
  const unlocked = new Set<string>(evaluateAchievements(toPresetContext(stats), unlockedSlugs));
  return unlocked;
}

function getAchievementRewards(achievement: DbAchievement): LinkedAchievementReward {
  const fixed = parseNumber(achievement.reward_xp_fixed, parseNumber(achievement.xp_bonus, 0));
  const percent = parseNumber(achievement.reward_percent, 0);
  return { fixedXp: roundXp(fixed), percent: roundXp(percent) };
}

export async function getLinkedAchievementReward(
  achievementId: string | null | undefined,
): Promise<LinkedAchievementReward> {
  if (!achievementId) {
    return { fixedXp: 0, percent: 0 };
  }
  const { data, error } = await supabase
    .from('cdt_achievements')
    .select('id, slug, reward_xp_fixed, reward_percent, xp_bonus, condition_type, condition_value, mode')
    .eq('id', achievementId)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) {
    return { fixedXp: 0, percent: 0 };
  }
  return getAchievementRewards(data as DbAchievement);
}

export function calculateItemCompletionXp(params: {
  baseXp: number;
  onDeadline: boolean;
  deadlineBonusPercent: number;
  linkedAchievementFixedXp: number;
  linkedAchievementPercent: number;
}): number {
  const base = roundXp(parseNumber(params.baseXp, 1));
  const deadlinePercent = params.onDeadline ? parseNumber(params.deadlineBonusPercent, 0) : 0;
  const linkedFixed = parseNumber(params.linkedAchievementFixedXp, 0);
  const linkedPercent = parseNumber(params.linkedAchievementPercent, 0);
  const deadlineBonus = roundXp((base * deadlinePercent) / 100);
  const linkedPercentBonus = roundXp((base * linkedPercent) / 100);
  return roundXp(base + deadlineBonus + linkedFixed + linkedPercentBonus);
}

export async function awardTodoCompletionXp(params: {
  userId: string;
  todoId: string;
  xpAmount: number;
  workspaceId?: string | null;
}): Promise<{ awarded: boolean; xpDelta: number }> {
  const cycleState = await getTodoCompletionCycleState(params.userId, params.todoId, params.workspaceId);
  const roundedXp = roundXp(params.xpAmount);
  if (cycleState.openCompletionLogId) {
    return { awarded: false, xpDelta: 0 };
  }
  const inserted = await insertXpLog({
    userId: params.userId,
    xpAmount: roundedXp,
    reason: 'todo_completed',
    relatedId: params.todoId,
    relatedType: 'todo',
    workspaceId: params.workspaceId,
  });
  return { awarded: inserted, xpDelta: inserted ? roundedXp : 0 };
}

export async function revertTodoCompletionXp(params: {
  userId: string;
  todoId: string;
  workspaceId?: string | null;
}): Promise<{ reverted: boolean; xpDelta: number }> {
  const cycleState = await getTodoCompletionCycleState(params.userId, params.todoId, params.workspaceId);
  if (!cycleState.openCompletionLogId || cycleState.openCompletionXp === 0) {
    return { reverted: false, xpDelta: 0 };
  }

  const reverted = await insertXpLog({
    userId: params.userId,
    xpAmount: -Math.abs(cycleState.openCompletionXp),
    reason: 'todo_uncompleted',
    relatedId: params.todoId,
    relatedType: 'todo',
    workspaceId: params.workspaceId,
  });

  return {
    reverted,
    xpDelta: reverted ? -Math.abs(cycleState.openCompletionXp) : 0,
  };
}

export async function awardActivityCompletionXp(params: {
  userId: string;
  activityId: string;
  xpAmount: number;
  workspaceId?: string | null;
}): Promise<boolean> {
  const alreadyAwarded = await hasXpLogEntry(
    params.userId,
    'activity_completed',
    params.activityId,
    'activity',
    params.workspaceId,
  );
  if (alreadyAwarded) return false;
  return insertXpLog({
    userId: params.userId,
    xpAmount: params.xpAmount,
    reason: 'activity_completed',
    relatedId: params.activityId,
    relatedType: 'activity',
    workspaceId: params.workspaceId,
  });
}

export async function unlockLinkedAchievementIfNeeded(
  userId: string,
  achievementId: string | null | undefined,
  workspaceId?: string | null,
): Promise<void> {
  if (!achievementId) return;
  await ensureAchievementUnlocked(userId, achievementId, workspaceId);
}

export async function evaluateAndAwardGlobalAchievements(
  userId: string,
  workspaceId?: string | null,
): Promise<void> {
  const [achievements, unlockedIds] = await Promise.all([
    fetchActiveAchievements(),
    fetchUnlockedAchievementIds(userId, workspaceId),
  ]);
  if (achievements.length === 0) return;

  let stats = await fetchStats(userId, workspaceId);
  let unlockedSlugSet = new Set<string>();

  for (const achievement of achievements) {
    if (unlockedIds.has(achievement.id)) {
      unlockedSlugSet.add(achievement.slug);
    }
  }

  const presetUnlocked = resolveGlobalUnlockedSlugs(stats, unlockedSlugSet);
  for (const slug of presetUnlocked) unlockedSlugSet.add(slug);

  for (let pass = 0; pass < 5; pass++) {
    let unlockedInPass = false;
    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue;

      const mode = achievement.mode ?? 'global_auto';
      if (mode !== 'global_auto') continue;

      let shouldUnlock = false;
      const conditionType = normalizeConditionType(achievement.condition_type);
      if (conditionType) {
        shouldUnlock = evaluateDbCondition(achievement, stats);
      } else {
        shouldUnlock = unlockedSlugSet.has(achievement.slug);
      }
      if (!shouldUnlock) continue;

      const inserted = await ensureAchievementUnlocked(userId, achievement.id, workspaceId);
      if (!inserted) {
        unlockedIds.add(achievement.id);
        continue;
      }
      unlockedIds.add(achievement.id);
      unlockedInPass = true;

      const reward = getAchievementRewards(achievement);
      const percentPart = roundXp(((stats.totalXp + reward.fixedXp) * reward.percent) / 100);
      const totalRewardXp = roundXp(reward.fixedXp + percentPart);

      await insertXpLog({
        userId,
        xpAmount: totalRewardXp,
        reason: 'achievement_unlocked',
        relatedId: achievement.id,
        relatedType: 'achievement',
        workspaceId,
      });

      stats = {
        ...stats,
        totalXp: roundXp(stats.totalXp + totalRewardXp),
      };
      const { level } = getLevelFromTotalXp(stats.totalXp);
      stats.level = level;
      unlockedSlugSet.add(achievement.slug);
    }
    if (!unlockedInPass) break;
  }
}
