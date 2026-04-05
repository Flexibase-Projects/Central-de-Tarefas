import { supabase } from '../config/supabase.js';
import { getLevelFromTotalXp } from '../utils/level-xp.js';
import { getTierForLevel } from '../utils/tier.js';
import {
  PRESET_ACHIEVEMENTS,
  evaluateAchievements,
  type AchievementContext,
} from '../utils/achievement-engine.js';
import { isOnOrBeforeDate } from '../utils/date-only.js';
import { listActiveWorkspaceUserIds } from './workspace-memberships.js';
import { listWorkspaceResolvedUserProfiles } from './workspace-user-profiles.js';

type TodoProgressRow = {
  xp_reward?: number | null;
  completed_at?: string | null;
  deadline?: string | null;
  achievement_id?: string | null;
};

type ActivityProgressRow = {
  xp_reward?: number | null;
  completed_at?: string | null;
  due_date?: string | null;
};

type ProgressAchievementRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  category?: string;
  mode?: string;
  conditionType?: string | null;
  conditionValue?: number | null;
  rewardPercent?: number;
  xpBonus: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type WorkspaceAchievementListItem = ProgressAchievementRow & {
  rewardXpFixed?: number;
  isActive?: boolean;
};

type WorkspaceUserStats = {
  totalXp: number;
  completedTodos: number;
  completedActivities: number;
  deadlineTodos: number;
  deadlineActivities: number;
  challengeTodos: number;
  commentsCount: number;
  streakDays: number;
};

export type WorkspaceUserProgress = WorkspaceUserStats & {
  userId: string;
  level: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  tier: ReturnType<typeof getTierForLevel>;
  achievements: ProgressAchievementRow[];
};

export type WorkspaceTeamGamificationSummary = {
  total_members: number;
  active_with_xp: number;
  average_level: number;
  average_xp: number;
  total_unlocked_achievements: number;
  top_members: Array<{
    user_id: string;
    name: string;
    avatar_url: string | null;
    level: number;
    total_xp: number;
    unlocked_achievements: number;
  }>;
};

export type WorkspaceRankingEntry = {
  position: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  level: number;
  total_xp: number;
  unlocked_achievements: number;
};

export type WorkspaceRankingSnapshot = {
  total_members: number;
  active_with_xp: number;
  average_level: number;
  average_xp: number;
  total_unlocked_achievements: number;
  leaderboard: WorkspaceRankingEntry[];
  current_user: WorkspaceRankingEntry | null;
  gap_to_next: {
    position: number;
    name: string;
    xp_difference: number;
  } | null;
};

function roundNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (match) return match[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function computeStreakDays(dateKeys: string[]): number {
  if (dateKeys.length === 0) return 0;

  const uniqueDays = Array.from(new Set(dateKeys)).sort((left, right) => (left > right ? -1 : 1));
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let index = 1; index < uniqueDays.length; index += 1) {
    const previous = new Date(uniqueDays[index - 1] as string);
    const current = new Date(uniqueDays[index] as string);
    const diffDays = Math.round((previous.getTime() - current.getTime()) / 86_400_000);
    if (diffDays !== 1) break;
    streak += 1;
  }

  return streak;
}

async function fetchWorkspaceUserStats(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceUserStats> {
  const [xpLogRes, todosRes, activitiesRes, commentsRes] = await Promise.all([
    supabase
      .from('cdt_user_xp_log')
      .select('xp_amount, created_at, reason')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId),
    supabase
      .from('cdt_project_todos')
      .select('xp_reward, completed_at, deadline, achievement_id')
      .eq('workspace_id', workspaceId)
      .eq('assigned_to', userId)
      .eq('completed', true),
    supabase
      .from('cdt_activities')
      .select('xp_reward, completed_at, due_date')
      .eq('workspace_id', workspaceId)
      .eq('status', 'done')
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`),
    supabase
      .from('cdt_comments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('created_by', userId),
  ]);

  const todos = (todosRes.data ?? []) as TodoProgressRow[];
  const activities = (activitiesRes.data ?? []) as ActivityProgressRow[];
  const commentsCount = commentsRes.error ? 0 : commentsRes.data?.length ?? 0;

  const completedTodos = todos.length;
  const completedActivities = activities.length;
  const deadlineTodos = todos.filter((todo) => isOnOrBeforeDate(todo.completed_at ?? null, todo.deadline ?? null)).length;
  const deadlineActivities = activities.filter((activity) => isOnOrBeforeDate(activity.completed_at ?? null, activity.due_date ?? null)).length;
  const challengeTodos = todos.filter((todo) => todo.achievement_id != null).length;

  let totalXp = 0;
  let streakDays = 0;

  if (!xpLogRes.error && xpLogRes.data && xpLogRes.data.length > 0) {
    totalXp = roundNumber(
      (xpLogRes.data as Array<{ xp_amount: number | null }>).reduce(
        (sum, row) => sum + parseNumber(row.xp_amount, 0),
        0,
      ),
    );

    streakDays = computeStreakDays(
      (xpLogRes.data as Array<{ created_at: string; reason: string }>).flatMap((row) =>
        ['todo_completed', 'activity_completed'].includes(row.reason)
          ? [normalizeDateKey(row.created_at)].filter((value): value is string => Boolean(value))
          : [],
      ),
    );
  } else {
    totalXp = roundNumber(
      todos.reduce((sum, todo) => sum + parseNumber(todo.xp_reward, 1), 0) +
        activities.reduce((sum, activity) => sum + parseNumber(activity.xp_reward, 1), 0),
    );

    streakDays = computeStreakDays(
      [...todos, ...activities]
        .map((row) => normalizeDateKey(row.completed_at ?? null))
        .filter((value): value is string => Boolean(value)),
    );
  }

  return {
    totalXp,
    completedTodos,
    completedActivities,
    deadlineTodos,
    deadlineActivities,
    challengeTodos,
    commentsCount,
    streakDays,
  };
}

async function fetchWorkspaceAchievements(
  workspaceId: string,
  userId: string,
  context: AchievementContext,
): Promise<ProgressAchievementRow[]> {
  const [allRes, userRes] = await Promise.all([
    supabase
      .from('cdt_achievements')
      .select(
        'id, slug, name, description, icon, category, rarity, xp_bonus, reward_xp_fixed, reward_percent, condition_type, condition_value, mode',
      )
      .eq('is_active', true)
      .order('slug'),
    supabase
      .from('cdt_user_achievements')
      .select('achievement_id, unlocked_at, workspace_id')
      .eq('user_id', userId)
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`),
  ]);

  if (!allRes.error && allRes.data) {
    const unlockedMap = new Map<string, { unlockedAt: string | null; workspaceId: string | null }>();

    if (!userRes.error && userRes.data) {
      for (const row of userRes.data as Array<{
        achievement_id: string;
        unlocked_at: string | null;
        workspace_id: string | null;
      }>) {
        const current = unlockedMap.get(row.achievement_id) ?? null;
        const nextIsScoped = row.workspace_id === workspaceId;
        const currentIsScoped = current?.workspaceId === workspaceId;

        if (!current || (nextIsScoped && !currentIsScoped)) {
          unlockedMap.set(row.achievement_id, {
            unlockedAt: row.unlocked_at ?? null,
            workspaceId: row.workspace_id ?? null,
          });
        }
      }
    }

    type DbAchievement = {
      id: string;
      slug: string;
      name: string;
      description: string;
      icon: string;
      category: string;
      rarity: string;
      xp_bonus: number | null;
      reward_xp_fixed?: number | null;
      reward_percent?: number | null;
      condition_type?: string | null;
      condition_value?: number | null;
      mode?: string | null;
    };

    return (allRes.data as DbAchievement[]).map((achievement) => {
      const unlockedEntry = unlockedMap.get(achievement.id) ?? null;

      return {
        id: achievement.id,
        slug: achievement.slug,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        rarity: achievement.rarity,
        mode: achievement.mode ?? 'global_auto',
        conditionType: achievement.condition_type ?? null,
        conditionValue: achievement.condition_value ?? null,
        rewardPercent: parseNumber(achievement.reward_percent, 0),
        xpBonus: roundNumber(parseNumber(achievement.reward_xp_fixed, parseNumber(achievement.xp_bonus, 0))),
        unlocked: Boolean(unlockedEntry),
        unlockedAt: unlockedEntry?.unlockedAt ?? null,
      };
    });
  }

  const unlockedPresetSlugs = new Set(evaluateAchievements(context, new Set<string>()));
  return PRESET_ACHIEVEMENTS.map((achievement) => ({
    id: achievement.slug,
    slug: achievement.slug,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    rarity: achievement.rarity,
    xpBonus: roundNumber(achievement.xpBonus),
    unlocked: unlockedPresetSlugs.has(achievement.slug),
    unlockedAt: unlockedPresetSlugs.has(achievement.slug) ? new Date().toISOString() : null,
  }));
}

export async function listWorkspaceAchievements(
  workspaceId: string,
  userId: string | null,
  includeInactive = false,
): Promise<WorkspaceAchievementListItem[]> {
  let allQuery = supabase
    .from('cdt_achievements')
    .select(
      'id, slug, name, description, icon, category, rarity, xp_bonus, reward_xp_fixed, reward_percent, condition_type, condition_value, mode, is_active',
    )
    .order('slug');

  if (!includeInactive) {
    allQuery = allQuery.eq('is_active', true);
  }

  const { data: dbAchievements, error: dbError } = await allQuery;
  if (dbError || !dbAchievements) {
    return PRESET_ACHIEVEMENTS.map((achievement) => ({
      id: achievement.slug,
      slug: achievement.slug,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      category: achievement.category,
      rarity: achievement.rarity,
      xpBonus: achievement.xpBonus,
      rewardXpFixed: achievement.xpBonus,
      rewardPercent: 0,
      conditionType: achievement.conditionType,
      conditionValue: achievement.conditionValue,
      mode: 'global_auto',
      isActive: true,
      unlocked: false,
      unlockedAt: null,
    }));
  }

  const unlockedMap = new Map<string, string | null>();
  if (userId) {
    const { data: userAchievements, error: userAchievementsError } = await supabase
      .from('cdt_user_achievements')
      .select('achievement_id, unlocked_at, workspace_id')
      .eq('user_id', userId)
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);

    if (!userAchievementsError && userAchievements) {
      for (const row of userAchievements as Array<{
        achievement_id: string;
        unlocked_at: string | null;
        workspace_id: string | null;
      }>) {
        if (!unlockedMap.has(row.achievement_id) || row.workspace_id === workspaceId) {
          unlockedMap.set(row.achievement_id, row.unlocked_at ?? null);
        }
      }
    }
  }

  return (dbAchievements as Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
    xp_bonus: number | null;
    reward_xp_fixed?: number | null;
    reward_percent?: number | null;
    condition_type?: string | null;
    condition_value?: number | null;
    mode?: string | null;
    is_active?: boolean;
  }>).map((achievement) => ({
    id: achievement.id,
    slug: achievement.slug,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    category: achievement.category,
    rarity: achievement.rarity,
    mode: achievement.mode ?? 'global_auto',
    conditionType: achievement.condition_type ?? null,
    conditionValue: achievement.condition_value ?? null,
    rewardPercent: parseNumber(achievement.reward_percent, 0),
    rewardXpFixed: roundNumber(parseNumber(achievement.reward_xp_fixed, parseNumber(achievement.xp_bonus, 0))),
    xpBonus: roundNumber(parseNumber(achievement.reward_xp_fixed, parseNumber(achievement.xp_bonus, 0))),
    isActive: achievement.is_active ?? true,
    unlocked: userId ? unlockedMap.has(achievement.id) : false,
    unlockedAt: userId ? unlockedMap.get(achievement.id) ?? null : null,
  }));
}

export async function getWorkspaceUserProgress(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceUserProgress> {
  const stats = await fetchWorkspaceUserStats(workspaceId, userId);
  const { level, xpInCurrentLevel, xpForNextLevel } = getLevelFromTotalXp(stats.totalXp);
  const tier = getTierForLevel(level);

  const achievementContext: AchievementContext = {
    completedTodos: stats.completedTodos,
    completedActivities: stats.completedActivities,
    level,
    totalXp: stats.totalXp,
    streakDays: stats.streakDays,
    deadlineTodos: stats.deadlineTodos,
    deadlineActivities: stats.deadlineActivities,
    challengeTodos: stats.challengeTodos,
    commentsCount: stats.commentsCount,
  };

  const achievements = await fetchWorkspaceAchievements(workspaceId, userId, achievementContext);

  return {
    userId,
    ...stats,
    level,
    xpInCurrentLevel: roundNumber(xpInCurrentLevel),
    xpForNextLevel: roundNumber(xpForNextLevel),
    tier,
    achievements,
  };
}

export async function getWorkspaceTeamGamificationSummary(
  workspaceId: string,
): Promise<WorkspaceTeamGamificationSummary> {
  const ranking = await buildWorkspaceRankingComputation(workspaceId);

  return {
    total_members: ranking.total_members,
    active_with_xp: ranking.active_with_xp,
    average_level: ranking.average_level,
    average_xp: ranking.average_xp,
    total_unlocked_achievements: ranking.total_unlocked_achievements,
    top_members: ranking.leaderboard.slice(0, 5).map(({ position: _position, ...member }) => member),
  };
}

export async function getWorkspaceRankingSnapshot(
  workspaceId: string,
  requesterUserId: string,
): Promise<WorkspaceRankingSnapshot> {
  const ranking = await buildWorkspaceRankingComputation(workspaceId);
  const currentUserIndex = ranking.leaderboard.findIndex((entry) => entry.user_id === requesterUserId);
  const currentUser = currentUserIndex >= 0 ? ranking.leaderboard[currentUserIndex] : null;
  const userAbove = currentUserIndex > 0 ? ranking.leaderboard[currentUserIndex - 1] : null;

  return {
    total_members: ranking.total_members,
    active_with_xp: ranking.active_with_xp,
    average_level: ranking.average_level,
    average_xp: ranking.average_xp,
    total_unlocked_achievements: ranking.total_unlocked_achievements,
    leaderboard: ranking.leaderboard.slice(0, 5),
    current_user: currentUser,
    gap_to_next:
      currentUser && userAbove
        ? {
            position: userAbove.position,
            name: userAbove.name,
            xp_difference: Math.max(0, userAbove.total_xp - currentUser.total_xp),
          }
        : null,
  };
}

async function buildWorkspaceRankingComputation(workspaceId: string): Promise<{
  total_members: number;
  active_with_xp: number;
  average_level: number;
  average_xp: number;
  total_unlocked_achievements: number;
  leaderboard: WorkspaceRankingEntry[];
}> {
  const userIds = await listActiveWorkspaceUserIds(workspaceId);
  if (userIds.length === 0) {
    return {
      total_members: 0,
      active_with_xp: 0,
      average_level: 0,
      average_xp: 0,
      total_unlocked_achievements: 0,
      leaderboard: [],
    };
  }

  const [profiles, progressRows] = await Promise.all([
    listWorkspaceResolvedUserProfiles(workspaceId, userIds),
    Promise.all(userIds.map((userId) => getWorkspaceUserProgress(workspaceId, userId))),
  ]);

  const totalMembers = progressRows.length;
  const totalXp = progressRows.reduce((sum, row) => sum + row.totalXp, 0);
  const totalLevels = progressRows.reduce((sum, row) => sum + row.level, 0);
  const totalUnlockedAchievements = progressRows.reduce(
    (sum, row) => sum + row.achievements.filter((achievement) => achievement.unlocked).length,
    0,
  );
  const leaderboard = [...progressRows]
    .sort((left, right) => {
      if (right.totalXp !== left.totalXp) return right.totalXp - left.totalXp;
      if (right.level !== left.level) return right.level - left.level;
      return left.userId.localeCompare(right.userId);
    })
    .map((row, index) => {
      const profile = profiles.get(row.userId) ?? null;

      return {
        position: index + 1,
        user_id: row.userId,
        name: profile?.effective_name ?? 'Usuario',
        avatar_url: profile?.effective_avatar_url ?? null,
        level: row.level,
        total_xp: row.totalXp,
        unlocked_achievements: row.achievements.filter((achievement) => achievement.unlocked).length,
      };
    });

  return {
    total_members: totalMembers,
    active_with_xp: progressRows.filter((row) => row.totalXp > 0).length,
    average_level: totalMembers > 0 ? roundNumber(totalLevels / totalMembers) : 0,
    average_xp: totalMembers > 0 ? roundNumber(totalXp / totalMembers) : 0,
    total_unlocked_achievements: totalUnlockedAchievements,
    leaderboard,
  };
}

/** Compact gamification fields for workspace member list (header avatars, tooltips). */
export type WorkspaceMemberGamificationPeek = {
  level: number;
  tier_color: string;
  tier_name: string;
  todos_delivered_30d: number;
};

/**
 * Batch-compute level (from total XP, same rules as getWorkspaceUserProgress) and
 * completed to-dos in the last 30 days per user, for tooltip-style UI.
 */
export async function getWorkspaceMembersGamificationPeek(
  workspaceId: string,
  userIds: string[],
): Promise<Map<string, WorkspaceMemberGamificationPeek>> {
  const out = new Map<string, WorkspaceMemberGamificationPeek>();
  if (userIds.length === 0) return out;

  const uniqueIds = Array.from(new Set(userIds.filter((id) => typeof id === 'string' && id.length > 0)));
  if (uniqueIds.length === 0) return out;

  const idSet = new Set(uniqueIds);
  const cutoffIso = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const inList = uniqueIds.join(',');

  const [xpLogRes, todosRes, activitiesRes] = await Promise.all([
    supabase
      .from('cdt_user_xp_log')
      .select('user_id, xp_amount, created_at, reason')
      .eq('workspace_id', workspaceId)
      .in('user_id', uniqueIds),
    supabase
      .from('cdt_project_todos')
      .select('assigned_to, xp_reward, completed_at, deadline, achievement_id')
      .eq('workspace_id', workspaceId)
      .eq('completed', true)
      .in('assigned_to', uniqueIds),
    supabase
      .from('cdt_activities')
      .select('assigned_to, created_by, xp_reward, completed_at, due_date')
      .eq('workspace_id', workspaceId)
      .eq('status', 'done')
      .or(`assigned_to.in.(${inList}),created_by.in.(${inList})`),
  ]);

  type XpRow = { user_id: string; xp_amount: number | null };
  const xpRows = (!xpLogRes.error && xpLogRes.data ? xpLogRes.data : []) as XpRow[];
  const xpByUser = new Map<string, XpRow[]>();
  for (const row of xpRows) {
    const uid = row.user_id;
    if (!idSet.has(uid)) continue;
    const list = xpByUser.get(uid) ?? [];
    list.push(row);
    xpByUser.set(uid, list);
  }

  type TodoRow = TodoProgressRow & { assigned_to?: string | null };
  const todos = (!todosRes.error && todosRes.data ? todosRes.data : []) as TodoRow[];
  const todosByUser = new Map<string, TodoProgressRow[]>();
  for (const row of todos) {
    const uid = typeof row.assigned_to === 'string' ? row.assigned_to : '';
    if (!uid || !idSet.has(uid)) continue;
    const list = todosByUser.get(uid) ?? [];
    list.push(row);
    todosByUser.set(uid, list);
  }

  const activities = (!activitiesRes.error && activitiesRes.data ? activitiesRes.data : []) as Array<{
    assigned_to?: string | null;
    created_by?: string | null;
    xp_reward?: number | null;
    completed_at?: string | null;
    due_date?: string | null;
  }>;

  const activityXpByUser = new Map<string, number>();
  for (const activity of activities) {
    const xp = parseNumber(activity.xp_reward, 1);
    const aid = activity.assigned_to ?? null;
    const cid = activity.created_by ?? null;
    if (aid && idSet.has(aid)) {
      activityXpByUser.set(aid, (activityXpByUser.get(aid) ?? 0) + xp);
    }
    if (cid && idSet.has(cid) && cid !== aid) {
      activityXpByUser.set(cid, (activityXpByUser.get(cid) ?? 0) + xp);
    }
  }

  for (const userId of uniqueIds) {
    const userTodos = todosByUser.get(userId) ?? [];
    const userXpLog = xpByUser.get(userId) ?? [];

    let totalXp = 0;
    if (userXpLog.length > 0) {
      totalXp = roundNumber(
        userXpLog.reduce((sum, row) => sum + parseNumber(row.xp_amount, 0), 0),
      );
    } else {
      const todoXp = userTodos.reduce((sum, todo) => sum + parseNumber(todo.xp_reward, 1), 0);
      const activityXp = activityXpByUser.get(userId) ?? 0;
      totalXp = roundNumber(todoXp + activityXp);
    }

    const { level } = getLevelFromTotalXp(totalXp);
    const tier = getTierForLevel(level);

    const todos30d = userTodos.filter((todo) => {
      const ca = todo.completed_at ?? null;
      return typeof ca === 'string' && ca.length > 0 && ca >= cutoffIso;
    }).length;

    out.set(userId, {
      level,
      tier_color: tier.color,
      tier_name: tier.name,
      todos_delivered_30d: todos30d,
    });
  }

  return out;
}
