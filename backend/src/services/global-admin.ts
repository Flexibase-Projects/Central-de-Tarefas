import { supabase } from '../config/supabase.js';
import { isNativeAdminUserId } from './native-admin.js';

export const GLOBAL_ADMIN_ROLE_NAMES = ['admin', 'developer'] as const;

const GLOBAL_ADMIN_ROLE_SET = new Set<string>(GLOBAL_ADMIN_ROLE_NAMES);

export function isGlobalAdminRoleName(roleName: string | null | undefined): boolean {
  const normalized = roleName?.trim().toLowerCase() ?? '';
  return GLOBAL_ADMIN_ROLE_SET.has(normalized);
}

export async function getUserRoleNames(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('cdt_user_roles')
      .select(`
        role_id,
        cdt_roles (
          name
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user role names:', error);
      return [];
    }

    return (data ?? [])
      .map((item: { cdt_roles?: { name?: string | null } | null }) => item.cdt_roles?.name ?? null)
      .filter((roleName: string | null): roleName is string => Boolean(roleName));
  } catch (error) {
    console.error('Error getting user role names:', error);
    return [];
  }
}

export async function isGlobalAdminUserId(userId: string): Promise<boolean> {
  if (await isNativeAdminUserId(userId)) {
    return true;
  }

  const roleNames = await getUserRoleNames(userId);
  return roleNames.some((roleName) => isGlobalAdminRoleName(roleName));
}
