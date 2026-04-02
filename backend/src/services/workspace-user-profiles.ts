import { supabase } from '../config/supabase.js';

export type WorkspaceUserProfileRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type WorkspaceResolvedUserProfile = {
  workspace_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  fallback_name: string;
  fallback_avatar_url: string | null;
  effective_name: string;
  effective_avatar_url: string | null;
  is_overridden: boolean;
};

type UserRow = {
  id: string;
  name: string;
  avatar_url: string | null;
};

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

function toResolvedProfile(params: {
  workspaceId: string;
  user: UserRow;
  profile: WorkspaceUserProfileRow | null;
}): WorkspaceResolvedUserProfile {
  const profileDisplayName = normalizeOptionalText(params.profile?.display_name ?? null);
  const profileAvatarUrl = normalizeOptionalText(params.profile?.avatar_url ?? null);
  const fallbackName = normalizeOptionalText(params.user.name) ?? 'Usuario';
  const fallbackAvatarUrl = normalizeOptionalText(params.user.avatar_url ?? null);

  return {
    workspace_id: params.workspaceId,
    user_id: params.user.id,
    display_name: profileDisplayName,
    avatar_url: profileAvatarUrl,
    fallback_name: fallbackName,
    fallback_avatar_url: fallbackAvatarUrl,
    effective_name: profileDisplayName ?? fallbackName,
    effective_avatar_url: profileAvatarUrl ?? fallbackAvatarUrl,
    is_overridden: Boolean(profileDisplayName || profileAvatarUrl),
  };
}

async function loadUsersByIds(userIds: string[]): Promise<UserRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('cdt_users')
    .select('id, name, avatar_url')
    .in('id', userIds);

  if (error) throw error;
  return (data ?? []) as UserRow[];
}

async function loadWorkspaceProfiles(
  workspaceId: string,
  userIds: string[],
): Promise<WorkspaceUserProfileRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('cdt_workspace_user_profiles')
    .select('id, workspace_id, user_id, display_name, avatar_url, created_at, updated_at, created_by, updated_by')
    .eq('workspace_id', workspaceId)
    .in('user_id', userIds);

  if (error) throw error;
  return (data ?? []) as WorkspaceUserProfileRow[];
}

export async function getWorkspaceResolvedUserProfile(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceResolvedUserProfile | null> {
  const [users, profiles] = await Promise.all([
    loadUsersByIds([userId]),
    loadWorkspaceProfiles(workspaceId, [userId]),
  ]);

  const user = users[0];
  if (!user) return null;
  const profile = profiles.find((item) => item.user_id === userId) ?? null;
  return toResolvedProfile({ workspaceId, user, profile });
}

export async function listWorkspaceResolvedUserProfiles(
  workspaceId: string,
  userIds: string[],
): Promise<Map<string, WorkspaceResolvedUserProfile>> {
  const uniqueUserIds = Array.from(new Set(userIds));
  const [users, profiles] = await Promise.all([
    loadUsersByIds(uniqueUserIds),
    loadWorkspaceProfiles(workspaceId, uniqueUserIds),
  ]);

  const profileByUserId = new Map(profiles.map((profile) => [profile.user_id, profile] as const));
  return new Map(
    users.map((user) => [
      user.id,
      toResolvedProfile({
        workspaceId,
        user,
        profile: profileByUserId.get(user.id) ?? null,
      }),
    ]),
  );
}

export async function upsertWorkspaceUserProfile(params: {
  workspaceId: string;
  userId: string;
  actorUserId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<WorkspaceResolvedUserProfile | null> {
  const displayName = normalizeOptionalText(params.displayName ?? null);
  const avatarUrl = normalizeOptionalText(params.avatarUrl ?? null);

  if (!displayName && !avatarUrl) {
    const { error } = await supabase
      .from('cdt_workspace_user_profiles')
      .delete()
      .eq('workspace_id', params.workspaceId)
      .eq('user_id', params.userId);

    if (error) throw error;
    return getWorkspaceResolvedUserProfile(params.workspaceId, params.userId);
  }

  const { error } = await supabase
    .from('cdt_workspace_user_profiles')
    .upsert(
      {
        workspace_id: params.workspaceId,
        user_id: params.userId,
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
        updated_by: params.actorUserId,
        created_by: params.actorUserId,
      },
      {
        onConflict: 'workspace_id,user_id',
      },
    );

  if (error) throw error;
  return getWorkspaceResolvedUserProfile(params.workspaceId, params.userId);
}
