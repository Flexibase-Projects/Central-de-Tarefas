import { supabase } from '../config/supabase.js';
import { Permission, Role } from '../types/index.js';
import { isGlobalAdminRoleName, isGlobalAdminUserId } from './global-admin.js';
import { getNativeAdminEmails } from './native-admin.js';

/**
 * Verifica se um usuario tem uma permissao especifica
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  try {
    if (await isGlobalAdminUserId(userId)) {
      return true;
    }

    const { data: userRole, error: userRoleError } = await supabase
      .from('cdt_user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .single();

    if (userRoleError || !userRole) {
      return false;
    }

    const { data: permission, error: permissionError } = await supabase
      .from('cdt_permissions')
      .select('id')
      .eq('name', permissionName)
      .single();

    if (permissionError || !permission) {
      return false;
    }

    const { data: rolePermission, error: rolePermissionError } = await supabase
      .from('cdt_role_permissions')
      .select('id')
      .eq('role_id', userRole.role_id)
      .eq('permission_id', permission.id)
      .single();

    return !rolePermissionError && !!rolePermission;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Obtem todos os cargos de um usuario
 */
export async function getUserRoles(userId: string): Promise<Role[]> {
  try {
    const { data, error } = await supabase
      .from('cdt_user_roles')
      .select(`
        role_id,
        cdt_roles (
          id,
          name,
          display_name,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return (data || []).map((item: any) => item.cdt_roles).filter(Boolean);
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
}

/**
 * Obtem todas as permissoes de um usuario (atraves dos seus cargos)
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  try {
    if (await isGlobalAdminUserId(userId)) {
      const { data, error } = await supabase
        .from('cdt_permissions')
        .select('id, name, display_name, description, category, created_at')
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) {
        console.error('Error fetching global admin permissions:', error);
        return [];
      }

      return (data ?? []) as Permission[];
    }

    const { data: userRole, error: userRoleError } = await supabase
      .from('cdt_user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .single();

    if (userRoleError || !userRole) {
      return [];
    }

    const { data, error } = await supabase
      .from('cdt_role_permissions')
      .select(`
        permission_id,
        cdt_permissions (
          id,
          name,
          display_name,
          description,
          category,
          created_at
        )
      `)
      .eq('role_id', userRole.role_id);

    if (error) {
      console.error('Error fetching user permissions:', error);
      return [];
    }

    return (data || []).map((item: any) => item.cdt_permissions).filter(Boolean);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Verifica se um usuario tem um cargo especifico
 */
export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  try {
    if (roleName === 'admin') {
      return await isGlobalAdminUserId(userId);
    }

    const { data, error } = await supabase
      .from('cdt_user_roles')
      .select(`
        role_id,
        cdt_roles!inner (
          name
        )
      `)
      .eq('user_id', userId)
      .eq('cdt_roles.name', roleName)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
}

/**
 * Lista todos os IDs de usuarios que devem receber eventos administrativos.
 */
export async function getAdminUserIds(): Promise<string[]> {
  try {
    const roleAdminsPromise = supabase
      .from('cdt_user_roles')
      .select(`
        user_id,
        cdt_roles!inner (
          name
        )
      `);

    const nativeEmails = getNativeAdminEmails();
    const nativeAdminsPromise = nativeEmails.length > 0
      ? supabase
          .from('cdt_users')
          .select('id, email')
          .in('email', nativeEmails)
      : Promise.resolve({ data: [], error: null } as const);

    const [roleAdminsRes, nativeAdminsRes] = await Promise.all([roleAdminsPromise, nativeAdminsPromise]);

    const adminIds = new Set<string>();

    if (!roleAdminsRes.error && roleAdminsRes.data) {
      for (const row of roleAdminsRes.data as Array<{
        user_id?: string | null;
        cdt_roles?: { name?: string | null } | null;
      }>) {
        if (row.user_id && isGlobalAdminRoleName(row.cdt_roles?.name ?? null)) {
          adminIds.add(row.user_id);
        }
      }
    }

    if (!nativeAdminsRes.error && nativeAdminsRes.data) {
      for (const row of nativeAdminsRes.data as Array<{ id?: string | null }>) {
        if (row.id) adminIds.add(row.id);
      }
    }

    return Array.from(adminIds);
  } catch (error) {
    console.error('Error listing admin user ids:', error);
    return [];
  }
}
