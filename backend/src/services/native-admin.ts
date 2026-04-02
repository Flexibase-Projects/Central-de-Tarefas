import { supabase } from '../config/supabase.js';
import {
  findCdtUserByField,
  insertCdtUserCompat,
  updateCdtUserByIdCompat,
} from './cdt-users.js';
import {
  insertWorkspaceMembershipCompat,
  loadWorkspaceMembershipByWorkspaceAndUser,
  updateWorkspaceMembershipCompat,
} from './workspace-memberships.js';

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

type WorkspaceMembershipCompatRow = {
  id: string;
  workspace_id: string;
  user_id: string;
};

function getTemporaryNativeAdminConfig() {
  const email = normalizeEmail(process.env.TEMP_NATIVE_ADMIN_EMAIL);
  const password = String(process.env.TEMP_NATIVE_ADMIN_PASSWORD ?? '').trim();
  const name = String(process.env.TEMP_NATIVE_ADMIN_NAME ?? 'Acesso Temporário').trim() || 'Acesso Temporário';

  if (!email || !password) return null;

  return {
    email,
    password,
    name,
  };
}

export function getNativeAdminEmails(): string[] {
  const fromEnv = String(process.env.NATIVE_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
  const tempEmail = getTemporaryNativeAdminConfig()?.email ?? null;
  return Array.from(new Set(tempEmail ? [...fromEnv, tempEmail] : fromEnv));
}

export function isNativeAdminEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getNativeAdminEmails().includes(normalized);
}

async function ensureAdminRoleId(): Promise<string | null> {
  const existing = await supabase
    .from('cdt_roles')
    .select('id')
    .eq('name', 'admin')
    .maybeSingle();

  if (!existing.error && existing.data?.id) {
    return existing.data.id as string;
  }

  const created = await supabase
    .from('cdt_roles')
    .insert({
      name: 'admin',
      display_name: 'Administrador',
      description: 'Acesso total ao sistema',
    })
    .select('id')
    .single();

  if (created.error || !created.data?.id) {
    console.error('[native-admin] Failed to create admin role:', created.error?.message);
    return null;
  }

  return created.data.id as string;
}

async function ensureUserRow(params: {
  authUserId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}): Promise<string | null> {
  const nowIso = new Date().toISOString();

  const byCentralUserId = await findCdtUserByField({
    field: 'central_user_id',
    value: params.authUserId,
    includeColumns: ['central_user_id'],
  });

  if (byCentralUserId?.id) {
    await updateCdtUserByIdCompat(byCentralUserId.id, {
      is_active: true,
      email: params.email,
      name: params.name,
      avatar_url: params.avatarUrl,
      central_user_id: params.authUserId,
      identity_status: 'linked',
      last_identity_sync_at: nowIso,
      updated_at: nowIso,
    });
    return byCentralUserId.id;
  }

  const byId = await findCdtUserByField({
    field: 'id',
    value: params.authUserId,
    includeColumns: ['central_user_id'],
  });

  if (byId?.id) {
    if (!byId.central_user_id || byId.central_user_id === params.authUserId) {
      await updateCdtUserByIdCompat(byId.id, {
        is_active: true,
        email: params.email,
        name: params.name,
        avatar_url: params.avatarUrl,
        central_user_id: params.authUserId,
        identity_status: 'linked',
        last_identity_sync_at: nowIso,
        updated_at: nowIso,
      });
    }
    return byId.id;
  }

  const byEmail = await findCdtUserByField({
    field: 'email',
    value: params.email,
    includeColumns: ['central_user_id'],
  });

  if (byEmail?.id) {
    if (byEmail.central_user_id && byEmail.central_user_id !== params.authUserId) {
      console.error('[native-admin] Existing cdt_users row has conflicting central_user_id');
      return null;
    }

    await updateCdtUserByIdCompat(byEmail.id, {
      is_active: true,
      email: params.email,
      name: params.name,
      avatar_url: params.avatarUrl,
      central_user_id: params.authUserId,
      identity_status: 'linked',
      last_identity_sync_at: nowIso,
      updated_at: nowIso,
    });
    return byEmail.id;
  }

  try {
    await insertCdtUserCompat({
      id: params.authUserId,
      central_user_id: params.authUserId,
      identity_status: 'linked',
      last_identity_sync_at: nowIso,
      email: params.email,
      name: params.name,
      avatar_url: params.avatarUrl,
      is_active: true,
    });
  } catch (error) {
    console.error(
      '[native-admin] Failed to create cdt_users row:',
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }

  const inserted = await findCdtUserByField({
    field: 'id',
    value: params.authUserId,
    includeColumns: ['central_user_id'],
  });

  return inserted?.id ?? null;
}

async function ensureAdminRoleAssignment(userId: string, roleId: string): Promise<void> {
  const existing = await supabase
    .from('cdt_user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role_id', roleId)
    .maybeSingle();

  if (!existing.error && existing.data?.id) return;

  await supabase.from('cdt_user_roles').delete().eq('user_id', userId);

  const inserted = await supabase.from('cdt_user_roles').insert({
    user_id: userId,
    role_id: roleId,
    assigned_by: null,
  });

  if (inserted.error) {
    console.error('[native-admin] Failed to assign admin role:', inserted.error.message);
  }
}

async function listActiveWorkspaceIds(): Promise<Array<{ id: string; slug: string }>> {
  const richQuery = await supabase
    .from('cdt_workspaces')
    .select('id, slug, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('slug', { ascending: true });

  if (!richQuery.error) {
    return ((richQuery.data ?? []) as Array<{ id: string; slug: string }>).map((workspace) => ({
      id: workspace.id,
      slug: workspace.slug,
    }));
  }

  const fallbackQuery = await supabase
    .from('cdt_workspaces')
    .select('id, slug')
    .order('slug', { ascending: true });

  if (fallbackQuery.error) throw fallbackQuery.error;
  return (fallbackQuery.data ?? []) as Array<{ id: string; slug: string }>;
}

async function getExistingMembershipRow(params: {
  workspaceId: string;
  userId: string;
}): Promise<WorkspaceMembershipCompatRow | null> {
  const row = await loadWorkspaceMembershipByWorkspaceAndUser(params.workspaceId, params.userId);
  if (!row) return null;

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    user_id: row.user_id,
  };
}

async function ensureNativeAdminWorkspaceMemberships(userId: string): Promise<void> {
  const workspaces = await listActiveWorkspaceIds();
  if (workspaces.length === 0) return;

  const nowIso = new Date().toISOString();
  const defaultWorkspace = workspaces.find((workspace) => workspace.slug === 'desenvolvimento-de-sistemas') ?? workspaces[0];

  for (const workspace of workspaces) {
    const payload: Record<string, unknown> = {
      workspace_id: workspace.id,
      user_id: userId,
      role_key: 'admin',
      membership_status: 'active',
      is_default: workspace.id === defaultWorkspace?.id,
      joined_at: nowIso,
      status: 'active',
      role_name: 'admin',
      role_display_name: 'Administrador',
      source: 'native_admin_bootstrap',
      approved_at: nowIso,
      revoked_at: null,
      updated_at: nowIso,
    };

    const existing = await getExistingMembershipRow({
      workspaceId: workspace.id,
      userId,
    });

    if (existing?.id) {
      const result = await updateWorkspaceMembershipCompat(existing.id, payload);
      if (result.error) {
        console.error('[native-admin] Failed to update workspace membership:', result.error.message);
      }
      continue;
    }

    const result = await insertWorkspaceMembershipCompat(payload);
    if (result.error) {
      console.error('[native-admin] Failed to create workspace membership:', result.error.message);
    }
  }
}

export async function ensureNativeAdminAccess(params: {
  authUserId: string;
  email: string | null | undefined;
  name: string;
  avatarUrl: string | null;
}): Promise<string | null> {
  if (!isNativeAdminEmail(params.email)) return null;

  const email = normalizeEmail(params.email);
  if (!email) return null;

  const userId = await ensureUserRow({
    authUserId: params.authUserId,
    email,
    name: params.name,
    avatarUrl: params.avatarUrl,
  });
  if (!userId) return null;

  const adminRoleId = await ensureAdminRoleId();
  if (!adminRoleId) return userId;

  await ensureAdminRoleAssignment(userId, adminRoleId);
  await ensureNativeAdminWorkspaceMemberships(userId);
  return userId;
}

export async function isNativeAdminUserId(userId: string): Promise<boolean> {
  const user = await findCdtUserByField({
    field: 'id',
    value: userId,
    includeColumns: [],
  });

  if (!user?.email) return false;
  return isNativeAdminEmail(user.email);
}

async function findAuthUserByEmail(email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;
    const match = (data.users ?? []).find((user) => normalizeEmail(user.email) === email);
    if (match?.id) return match.id;
    if (!data.users || data.users.length < 1000) break;
  }

  return null;
}

export async function ensureTemporaryNativeAdminBootstrap(): Promise<void> {
  const config = getTemporaryNativeAdminConfig();
  if (!config) return;

  let authUserId = await findAuthUserByEmail(config.email);

  if (!authUserId) {
    const created = await supabase.auth.admin.createUser({
      email: config.email,
      password: config.password,
      email_confirm: true,
      user_metadata: {
        full_name: config.name,
        name: config.name,
      },
    });

    if (created.error || !created.data.user?.id) {
      console.error('[native-admin] Failed to create temporary auth user:', created.error?.message);
      return;
    }

    authUserId = created.data.user.id;
  } else {
    const updated = await supabase.auth.admin.updateUserById(authUserId, {
      password: config.password,
      email_confirm: true,
      user_metadata: {
        full_name: config.name,
        name: config.name,
      },
    });

    if (updated.error) {
      console.error('[native-admin] Failed to update temporary auth user:', updated.error.message);
    }
  }

  await ensureNativeAdminAccess({
    authUserId,
    email: config.email,
    name: config.name,
    avatarUrl: null,
  });
}
