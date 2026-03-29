import { supabase } from '../config/supabase.js';

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function getNativeAdminEmails(): string[] {
  const fromEnv = String(process.env.NATIVE_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
  return Array.from(new Set(fromEnv));
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

  const byCentralUserId = await supabase
    .from('cdt_users')
    .select('id')
    .eq('central_user_id', params.authUserId)
    .maybeSingle();

  if (!byCentralUserId.error && byCentralUserId.data?.id) {
    await supabase
      .from('cdt_users')
      .update({
        is_active: true,
        name: params.name,
        avatar_url: params.avatarUrl,
        identity_status: 'linked',
        last_identity_sync_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', byCentralUserId.data.id);
    return byCentralUserId.data.id as string;
  }

  const byId = await supabase
    .from('cdt_users')
    .select('id, central_user_id')
    .eq('id', params.authUserId)
    .maybeSingle();

  if (!byId.error && byId.data?.id) {
    if (!byId.data.central_user_id || byId.data.central_user_id === params.authUserId) {
      await supabase
        .from('cdt_users')
        .update({
          central_user_id: params.authUserId,
          identity_status: 'linked',
          last_identity_sync_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', byId.data.id);
    }
    return byId.data.id as string;
  }

  const byEmail = await supabase
    .from('cdt_users')
    .select('id, central_user_id')
    .eq('email', params.email)
    .maybeSingle();

  if (!byEmail.error && byEmail.data?.id) {
    if (byEmail.data.central_user_id && byEmail.data.central_user_id !== params.authUserId) {
      console.error('[native-admin] Existing cdt_users row has conflicting central_user_id');
      return null;
    }

    await supabase
      .from('cdt_users')
      .update({
        is_active: true,
        name: params.name,
        avatar_url: params.avatarUrl,
        central_user_id: params.authUserId,
        identity_status: 'linked',
        last_identity_sync_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', byEmail.data.id);
    return byEmail.data.id as string;
  }

  const inserted = await supabase
    .from('cdt_users')
    .insert({
      id: params.authUserId,
      central_user_id: params.authUserId,
      identity_status: 'linked',
      last_identity_sync_at: nowIso,
      email: params.email,
      name: params.name,
      avatar_url: params.avatarUrl,
      is_active: true,
    })
    .select('id')
    .single();

  if (inserted.error || !inserted.data?.id) {
    console.error('[native-admin] Failed to create cdt_users row:', inserted.error?.message);
    return null;
  }

  return inserted.data.id as string;
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
  return userId;
}

export async function isNativeAdminUserId(userId: string): Promise<boolean> {
  const userRes = await supabase
    .from('cdt_users')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  if (userRes.error || !userRes.data?.email) return false;
  return isNativeAdminEmail(userRes.data.email);
}
