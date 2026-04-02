import type { Request } from 'express';
import { supabase } from '../config/supabase.js';
import { getAuthUserEmail, getAuthUserId, getRequesterId } from '../middleware/auth.js';
import { getUserPermissions } from './permissions.js';
import { resolveWorkspaceContext as resolveWorkspaceContextCompat } from './workspaces.js';
import {
  loadWorkspaceMembershipByWorkspaceAndUser,
  loadWorkspaceMembershipRows,
  type WorkspaceMembershipCompatRow,
} from './workspace-memberships.js';

export type WorkspaceStatus = 'active' | 'pending' | 'revoked';

export type WorkspaceRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  group_key: string;
  group_label: string;
  group_description: string | null;
  avatar_url: string | null;
  is_public: boolean;
  is_active: boolean;
};

export type WorkspaceMembershipRecord = {
  id: string;
  workspace_id: string;
  user_id: string;
  role_id: string | null;
  role_key: string | null;
  role_name: string | null;
  role_display_name: string | null;
  status: WorkspaceStatus;
  source: string;
  approved_at: string | null;
  revoked_at: string | null;
};

export type WorkspaceSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  group_key: string;
  group_label: string;
  group_description: string | null;
  avatar_url: string | null;
  has_access: boolean;
  membership_status: WorkspaceStatus | null;
  role_name: string | null;
  role_display_name: string | null;
};

export type WorkspaceGroupSummary = {
  key: string;
  label: string;
  description: string | null;
};

export type WorkspaceContextPayload = {
  workspace: WorkspaceRecord;
  membership: WorkspaceMembershipRecord;
  permissions: string[];
};

type AccessRequestRecord = {
  id: string;
  workspace_id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
};

function normalizeSlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  return normalized || null;
}

function toWorkspaceRecord(
  workspace: Awaited<ReturnType<typeof resolveWorkspaceContextCompat>> extends { workspace: infer T }
    ? Exclude<T, null>
    : never,
): WorkspaceRecord {
  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    description: workspace.description ?? null,
    group_key: workspace.group_key,
    group_label: workspace.group?.label ?? workspace.group_key,
    group_description: workspace.group?.description ?? null,
    avatar_url: workspace.avatar_url ?? null,
    is_public: workspace.is_public,
    is_active: workspace.is_active,
  };
}

function toWorkspaceMembershipRecord(
  membership: NonNullable<
    Awaited<ReturnType<typeof resolveWorkspaceContextCompat>> extends { membership: infer T } ? T : never
  >,
): WorkspaceMembershipRecord {
  const roleName = membership.role_key ?? 'member';
  return {
    id: membership.id,
    workspace_id: membership.workspace_id,
    user_id: membership.user_id,
    role_id: membership.role_id ?? null,
    role_key: roleName,
    role_name: roleName,
    role_display_name: roleName === 'admin' ? 'Administrador' : roleName === 'member' ? 'Membro' : roleName,
    status:
      membership.membership_status === 'pending'
        ? 'pending'
        : membership.membership_status === 'active'
          ? 'active'
          : 'revoked',
    source: 'workspace_compat',
    approved_at: membership.membership_status === 'active' ? membership.updated_at ?? membership.created_at : null,
    revoked_at: membership.membership_status === 'revoked' ? membership.updated_at ?? membership.created_at : null,
  };
}

function normalizeWorkspaceStatus(status: string): WorkspaceStatus {
  return status === 'pending' ? 'pending' : status === 'active' ? 'active' : 'revoked';
}

function formatWorkspaceRoleDisplayName(roleName?: string | null, currentValue?: string | null): string | null {
  if (currentValue) return currentValue;
  if (!roleName) return null;
  return roleName === 'admin' ? 'Administrador' : roleName === 'member' ? 'Membro' : roleName;
}

function toWorkspaceMembershipRecordFromCompat(
  membership: WorkspaceMembershipCompatRow,
): WorkspaceMembershipRecord {
  const roleName = membership.role_name ?? membership.role_key ?? 'member';
  const normalizedStatus = normalizeWorkspaceStatus(membership.membership_status);

  return {
    id: membership.id,
    workspace_id: membership.workspace_id,
    user_id: membership.user_id,
    role_id: membership.role_id ?? null,
    role_key: roleName,
    role_name: roleName,
    role_display_name: formatWorkspaceRoleDisplayName(roleName, membership.role_display_name),
    status: normalizedStatus,
    source: membership.source ?? 'workspace_compat',
    approved_at:
      membership.approved_at ??
      (normalizedStatus === 'active' ? membership.updated_at ?? membership.created_at : null),
    revoked_at:
      membership.revoked_at ??
      (normalizedStatus === 'revoked' ? membership.updated_at ?? membership.created_at : null),
  };
}

export function readWorkspaceSlugFromRequest(req: Request): string | null {
  const headerValue = req.headers['x-workspace-slug'];
  if (typeof headerValue === 'string') return normalizeSlug(headerValue);
  if (Array.isArray(headerValue)) return normalizeSlug(headerValue[0] ?? null);

  const paramsValue =
    (req.params as Record<string, string | undefined>).workspaceSlug ??
    (req.params as Record<string, string | undefined>).workspace_slug;
  if (paramsValue) return normalizeSlug(paramsValue);

  const queryValue =
    (req.query.workspaceSlug as string | undefined) ??
    (req.query.workspace_slug as string | undefined);
  return normalizeSlug(queryValue ?? null);
}

export async function getWorkspaceBySlug(workspaceSlug: string): Promise<WorkspaceRecord | null> {
  const { data, error } = await supabase
    .from('cdt_workspaces')
    .select(
      'id, slug, name, description, group_key, group_label, group_description, avatar_url, is_public, is_active',
    )
    .eq('slug', workspaceSlug)
    .maybeSingle();

  if (error) throw error;
  return (data as WorkspaceRecord | null) ?? null;
}

export async function getMembershipForWorkspace(params: {
  workspaceId: string;
  userId: string;
}): Promise<WorkspaceMembershipRecord | null> {
  const membership = await loadWorkspaceMembershipByWorkspaceAndUser(params.workspaceId, params.userId);
  return membership ? toWorkspaceMembershipRecordFromCompat(membership) : null;
}

export async function getPendingAccessRequest(params: {
  workspaceId: string;
  email: string;
}): Promise<AccessRequestRecord | null> {
  const { data, error } = await supabase
    .from('cdt_workspace_access_requests')
    .select('id, workspace_id, email, status')
    .eq('workspace_id', params.workspaceId)
    .eq('status', 'pending')
    .eq('email', params.email)
    .maybeSingle();

  if (error) throw error;
  return (data as AccessRequestRecord | null) ?? null;
}

export async function listPublicWorkspaces(userId?: string | null) {
  const [{ data: workspaces, error: workspacesError }, memberships] = await Promise.all([
    supabase
      .from('cdt_workspaces')
      .select(
        'id, slug, name, description, group_key, group_label, group_description, avatar_url, is_public, is_active',
      )
      .eq('is_public', true)
      .eq('is_active', true)
      .order('group_label', { ascending: true })
      .order('name', { ascending: true }),
    userId ? loadWorkspaceMembershipRows({ userId }) : Promise.resolve([] as WorkspaceMembershipCompatRow[]),
  ]);

  if (workspacesError) throw workspacesError;

  const membershipByWorkspaceId = new Map<string, WorkspaceMembershipRecord>();
  for (const membership of memberships) {
    membershipByWorkspaceId.set(membership.workspace_id, toWorkspaceMembershipRecordFromCompat(membership));
  }

  const rows = ((workspaces ?? []) as WorkspaceRecord[]).map<WorkspaceSummary>((workspace) => {
    const membership = membershipByWorkspaceId.get(workspace.id) ?? null;
    return {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
      description: workspace.description,
      group_key: workspace.group_key,
      group_label: workspace.group_label,
      group_description: workspace.group_description,
      avatar_url: workspace.avatar_url,
      has_access: membership?.status === 'active',
      membership_status: membership?.status ?? null,
      role_name: membership?.role_name ?? null,
      role_display_name: membership?.role_display_name ?? null,
    };
  });

  const groups = rows.reduce<WorkspaceGroupSummary[]>((acc, workspace) => {
    if (acc.some((group) => group.key === workspace.group_key)) return acc;
    acc.push({
      key: workspace.group_key,
      label: workspace.group_label,
      description: workspace.group_description,
    });
    return acc;
  }, []);

  return {
    groups,
    workspaces: rows,
  };
}

export async function listMembershipsForUser(userId: string): Promise<WorkspaceSummary[]> {
  const memberships = await loadWorkspaceMembershipRows({ userId });
  if (memberships.length === 0) return [];

  const workspaceIds = Array.from(new Set(memberships.map((membership) => membership.workspace_id)));
  const { data, error } = await supabase
    .from('cdt_workspaces')
    .select(
      'id, slug, name, description, group_key, group_label, group_description, avatar_url, is_public, is_active',
    )
    .in('id', workspaceIds);

  if (error) throw error;

  const workspaceById = new Map(
    ((data ?? []) as WorkspaceRecord[]).map((workspace) => [workspace.id, workspace] as const),
  );

  return memberships.flatMap((membership) => {
    const workspace = workspaceById.get(membership.workspace_id) ?? null;
    if (!workspace) return [];

    const normalizedStatus = normalizeWorkspaceStatus(membership.membership_status);
    const roleName = membership.role_name ?? membership.role_key;

    return [
      {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        description: workspace.description,
        group_key: workspace.group_key,
        group_label: workspace.group_label,
        group_description: workspace.group_description,
        avatar_url: workspace.avatar_url,
        has_access: normalizedStatus === 'active',
        membership_status: normalizedStatus,
        role_name: roleName,
        role_display_name: formatWorkspaceRoleDisplayName(roleName, membership.role_display_name),
      },
    ];
  });
}

export async function resolveWorkspaceContext(params: {
  workspaceSlug: string;
  userId: string;
}): Promise<
  | { status: 'not_found' }
  | { status: 'blocked'; workspace: WorkspaceRecord }
  | { status: 'pending'; workspace: WorkspaceRecord }
  | { status: 'revoked'; workspace: WorkspaceRecord }
  | { status: 'forbidden'; workspace: WorkspaceRecord }
  | { status: 'ok'; payload: WorkspaceContextPayload }
> {
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  if (!workspace) {
    return { status: 'not_found' };
  }

  if (workspace.is_active === false) {
    return { status: 'blocked', workspace };
  }

  const membership = await getMembershipForWorkspace({
    workspaceId: workspace.id,
    userId: params.userId,
  });

  if (!membership) {
    return { status: 'forbidden', workspace };
  }

  if (membership.status === 'pending') {
    return { status: 'pending', workspace };
  }

  if (membership.status !== 'active') {
    return { status: 'revoked', workspace };
  }

  const permissions = (await getUserPermissions(params.userId)).map((permission) => permission.name);
  return {
    status: 'ok',
    payload: {
      workspace,
      membership,
      permissions,
    },
  };
}

export async function createWorkspaceAccessRequest(params: {
  workspaceSlug: string;
  email: string;
  name: string;
  message?: string | null;
  requestedByUserId?: string | null;
}): Promise<'pending' | 'already_pending' | 'already_member'> {
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  if (!workspace || workspace.is_active === false || workspace.is_public === false) {
    throw new Error('Workspace not found');
  }

  const normalizedEmail = normalizeEmail(params.email);
  if (!normalizedEmail) {
    throw new Error('email is required');
  }

  const existingUser = await supabase
    .from('cdt_users')
    .select('id, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingUser.error) throw existingUser.error;

  if (existingUser.data?.id) {
    const membership = await getMembershipForWorkspace({
      workspaceId: workspace.id,
      userId: existingUser.data.id,
    });
    if (membership?.status === 'active') {
      return 'already_member';
    }
    if (membership?.status === 'pending') {
      return 'already_pending';
    }
  }

  const pending = await getPendingAccessRequest({
    workspaceId: workspace.id,
    email: normalizedEmail,
  });
  if (pending) {
    return 'already_pending';
  }

  const { error } = await supabase.from('cdt_workspace_access_requests').insert({
    workspace_id: workspace.id,
    email: normalizedEmail,
    name: params.name.trim(),
    message: params.message?.trim() || null,
    requested_by_user_id: params.requestedByUserId ?? null,
    status: 'pending',
  });

  if (error) throw error;
  return 'pending';
}

export async function listWorkspaceMembers(workspaceId: string) {
  const memberships = await loadWorkspaceMembershipRows({ workspaceId, status: 'active' });
  if (memberships.length === 0) return [];

  const userIds = Array.from(new Set(memberships.map((membership) => membership.user_id)));
  const { data, error } = await supabase
    .from('cdt_users')
    .select('id, name, email, avatar_url')
    .in('id', userIds);

  if (error) throw error;

  const userById = new Map(
    ((data ?? []) as Array<{ id: string; name: string; email: string; avatar_url: string | null }>).map((user) => [
      user.id,
      user,
    ]),
  );

  return memberships.flatMap((membership) => {
    const user = userById.get(membership.user_id) ?? null;
    if (!user) return [];

    return [
      {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        role_display_name: formatWorkspaceRoleDisplayName(
          membership.role_name ?? membership.role_key,
          membership.role_display_name,
        ),
      },
    ];
  });
}

export async function getCurrentWorkspaceContextFromRequest(req: Request) {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    return { status: 'unauthorized' as const };
  }

  const workspaceSlug = readWorkspaceSlugFromRequest(req);
  if (!workspaceSlug) {
    return { status: 'missing_workspace' as const };
  }

  const resolved = await resolveWorkspaceContextCompat({
    slug: workspaceSlug,
    requesterUserId: requesterId,
    authUserId: getAuthUserId(req),
    authUserEmail: getAuthUserEmail(req),
  });

  if (resolved.status === 'not_found' || !resolved.workspace) {
    return { status: 'not_found' as const };
  }

  const workspace = toWorkspaceRecord(resolved.workspace);

  if (resolved.status === 'blocked') {
    return { status: 'blocked' as const, workspace };
  }

  if (resolved.status === 'pending') {
    return { status: 'pending' as const, workspace };
  }

  if (resolved.status !== 'success' || !resolved.membership) {
    return { status: 'forbidden' as const, workspace };
  }

  const membership = toWorkspaceMembershipRecord(resolved.membership);
  if (membership.status === 'pending') {
    return { status: 'pending' as const, workspace };
  }

  if (membership.status !== 'active') {
    return { status: 'revoked' as const, workspace };
  }

  const permissions = (await getUserPermissions(requesterId)).map((permission) => permission.name);
  return {
    status: 'ok' as const,
    payload: {
      workspace,
      membership,
      permissions,
    },
  };
}
