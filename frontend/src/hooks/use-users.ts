import { useState, useEffect, useCallback } from 'react';
import { User, UserWithRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useUsers() {
  const { currentUser, getAuthHeaders } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (forAssignment = false) => {
    try {
      setLoading(true);
      setError(null);
      const userId = currentUser?.id || '';
      const url = forAssignment 
        ? `${API_URL}/api/users?for_assignment=true&userId=${userId}`
        : `${API_URL}/api/users?userId=${userId}`;
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
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
  }, [currentUser, getAuthHeaders]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (userData: { email: string; name: string; avatar_url?: string }) => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      const newUser = await response.json();
      await fetchUsers();
      return newUser;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create user');
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      await fetchUsers();
      return updatedUser;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update user');
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      await fetchUsers();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete user');
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    try {
      const currentUserId = currentUser?.id || '';
      const response = await fetch(`${API_URL}/api/users/${userId}/role`, {
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
      const response = await fetch(`${API_URL}/api/users/${userId}/role`, {
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
      const response = await fetch(`${API_URL}/api/users/auth-list`, { headers: getAuthHeaders() });
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

  const giveAccessFromAuth = async (authUser: { id: string; email: string; name: string }) => {
    const response = await fetch(`${API_URL}/api/users/from-auth`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id: authUser.id, email: authUser.email, name: authUser.name }),
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
    updateUser,
    deleteUser,
    assignRole,
    removeRole,
    refreshUsers: fetchUsers,
    authList,
    authListLoading,
    fetchAuthList,
    giveAccessFromAuth,
  };
}
