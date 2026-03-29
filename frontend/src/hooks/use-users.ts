import { useState, useEffect, useCallback } from 'react';
import { User, UserWithRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { apiUrl } from '@/lib/api';

export function useUsers() {
  const { currentUser, getAuthHeaders } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (forAssignment = false) => {
    try {
      setLoading(true);
      setError(null);
      const url = apiUrl('/api/users', {
        ...(forAssignment ? { for_assignment: true } : {}),
      });
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setUsers([]);
          return;
        }
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (userData: { email: string; name: string; avatar_url?: string }) => {
    try {
      const response = await fetch(apiUrl('/api/users'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const msg =
          body &&
          typeof body === 'object' &&
          body !== null &&
          'error' in body &&
          typeof (body as { error?: string }).error === 'string'
            ? (body as { error: string }).error
            : 'Falha ao criar usuário';
        throw new Error(msg);
      }

      const newUser = body as User;
      await fetchUsers();
      return newUser;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Falha ao criar usuário');
    }
  };

  /** Admin: cria usuario no Supabase Auth + cdt_users (senha temporaria no servidor). */
  const createUserWithAuth = async (userData: {
    email: string;
    name: string;
    avatar_url?: string;
    role_id?: string;
  }) => {
    const response = await fetch(apiUrl('/api/users/with-auth'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        email: userData.email,
        name: userData.name,
        avatar_url: userData.avatar_url ?? null,
        role_id: userData.role_id ?? null,
      }),
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const msg =
        body &&
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof (body as { error?: string }).error === 'string'
          ? (body as { error: string }).error
          : 'Falha ao criar usuario com Auth';
      throw new Error(msg);
    }

    const newUser = body as User;
    await fetchUsers();
    return newUser;
  };

  /** Admin: define a senha do usuário no Supabase Auth (cdt_users.id = auth user id). */
  const setUserAuthPassword = async (
    id: string,
    password: string,
    password_confirm: string,
  ) => {
    const response = await fetch(apiUrl(`/api/users/${id}/auth-password`), {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password, password_confirm }),
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const msg =
        body &&
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof (body as { error?: string }).error === 'string'
          ? (body as { error: string }).error
          : 'Falha ao definir senha no Supabase Auth';
      throw new Error(msg);
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      const response = await fetch(apiUrl(`/api/users/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const msg =
          body &&
          typeof body === 'object' &&
          body !== null &&
          'error' in body &&
          typeof (body as { error?: string }).error === 'string'
            ? (body as { error: string }).error
            : 'Falha ao atualizar usuário';
        throw new Error(msg);
      }

      const updatedUser = body as User;
      await fetchUsers();
      return updatedUser;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Falha ao atualizar usuário');
    }
  };

  /** Usuários não são apagados: apenas is_active true/false no CDT. */
  const setUserActive = async (id: string, is_active: boolean) => {
    return updateUser(id, { is_active });
  };

  const assignRole = async (userId: string, roleId: string) => {
    try {
      const currentUserId = currentUser?.id || '';
      const response = await fetch(apiUrl(`/api/users/${userId}/role`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role_id: roleId, assigned_by: currentUserId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign role');
      }

      await fetchUsers();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to assign role');
    }
  };

  const removeRole = async (userId: string) => {
    try {
      const response = await fetch(apiUrl(`/api/users/${userId}/role`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to remove role');
      }

      await fetchUsers();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to remove role');
    }
  };

  const [authList, setAuthList] = useState<Array<{ id: string; email: string; name: string; created_at: string; in_cdt: boolean }>>([]);
  const [authListLoading, setAuthListLoading] = useState(false);

  const fetchAuthList = useCallback(async () => {
    try {
      setAuthListLoading(true);
      const response = await fetch(apiUrl('/api/users/auth-list'), { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Falha ao carregar usuários do Supabase Auth');
      const data = await response.json();
      setAuthList(data);
    } catch (err) {
      console.error('Error fetching auth list:', err);
      setAuthList([]);
    } finally {
      setAuthListLoading(false);
    }
  }, [getAuthHeaders]);

  const giveAccessFromAuth = async (
    authUser: { id: string; email: string; name: string },
    roleId?: string | null,
  ) => {
    const response = await fetch(apiUrl('/api/users/from-auth'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        role_id: roleId || null,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || 'Falha ao dar acesso');
    }
    await Promise.all([fetchUsers(), fetchAuthList()]);
    return response.json();
  };

  return {
    users,
    loading,
    error,
    createUser,
    createUserWithAuth,
    setUserAuthPassword,
    updateUser,
    setUserActive,
    assignRole,
    removeRole,
    refreshUsers: fetchUsers,
    authList,
    authListLoading,
    fetchAuthList,
    giveAccessFromAuth,
  };
}
