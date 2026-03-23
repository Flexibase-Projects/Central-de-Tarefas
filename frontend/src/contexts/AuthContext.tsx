import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Role, Permission, UserWithRole } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

const API_URL = import.meta.env.VITE_API_URL || '';

function isRefreshTokenError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /refresh token|Refresh Token/i.test(msg);
}

interface AuthContextType {
  currentUser: User | null;
  userRole: Role | null;
  userPermissions: Permission[];
  isLoading: boolean;
  session: Session | null;
  /** Login com email e senha via Supabase Auth */
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  refreshUserData: () => Promise<void>;
  /** Headers para requisicoes a API (Authorization Bearer + x-user-id) */
  getAuthHeaders: () => Record<string, string>;
  /** Usuário real autenticado (nunca muda no modo visualização) */
  realUser: User | null;
  realUserRole: Role | null;
  /** Modo "Ver como usuário" — apenas para administradores */
  isViewingAs: boolean;
  viewAsUser: UserWithRole | null;
  startViewingAs: (user: UserWithRole) => Promise<void>;
  stopViewingAs: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type FetchUserResult =
  | { status: 'ok'; user: User; role: Role | null; permissions: Permission[] }
  | { status: 'pending'; message: string }
  | { status: 'unauthorized'; message: string };

async function fetchUserWithRole(accessToken: string): Promise<FetchUserResult> {
  const res = await fetch(`${API_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    if (res.status === 403 && body?.code === 'ACCESS_PENDING') {
      return {
        status: 'pending',
        message: body?.error || 'Seu acesso ainda nao foi liberado por um administrador.',
      };
    }
    return {
      status: 'unauthorized',
      message: body?.error || 'Falha ao validar acesso do usuario.',
    };
  }

  const userData = body;
  const user: User = userData;
  let permissions: Permission[] = [];

  if (userData.role?.id) {
    const roleRes = await fetch(`${API_URL}/api/roles/${userData.role.id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (roleRes.ok) {
      const roleData = await roleRes.json();
      permissions = roleData.permissions || [];
    }
  }

  return {
    status: 'ok',
    user,
    role: userData.role || null,
    permissions,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado do modo "Ver como usuário"
  const [viewAsUser, setViewAsUser] = useState<UserWithRole | null>(null);
  const [viewAsRole, setViewAsRole] = useState<Role | null>(null);
  const [viewAsPermissions, setViewAsPermissions] = useState<Permission[]>([]);

  const clearLocalAuth = useCallback(() => {
    setCurrentUser(null);
    setUserRole(null);
    setUserPermissions([]);
  }, []);

  const loadUserFromSession = useCallback(
    async (s: Session | null): Promise<{ ok: boolean; message?: string }> => {
      if (!s?.access_token) {
        clearLocalAuth();
        return { ok: false };
      }

      const result = await fetchUserWithRole(s.access_token);
      if (result.status === 'ok') {
        setCurrentUser(result.user);
        setUserRole(result.role);
        setUserPermissions(result.permissions);
        return { ok: true };
      }

      clearLocalAuth();
      return { ok: false, message: result.message };
    },
    [clearLocalAuth],
  );

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        return loadUserFromSession(s).then(async (result) => {
          if (s && !result.ok) {
            await supabase.auth.signOut();
            setSession(null);
          }
        });
      })
      .catch(async (err) => {
        if (isRefreshTokenError(err)) {
          await supabase.auth.signOut();
        }
        setSession(null);
        clearLocalAuth();
      })
      .finally(() => setIsLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      loadUserFromSession(s).then(async (result) => {
        if (s && !result.ok) {
          await supabase.auth.signOut();
          setSession(null);
        }
      });
    });

    return () => subscription.unsubscribe();
  }, [clearLocalAuth, loadUserFromSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error('Login sem sessao');

      setSession(data.session);
      const result = await loadUserFromSession(data.session);
      if (!result.ok) {
        await supabase.auth.signOut();
        setSession(null);
        throw new Error(result.message || 'Seu acesso ainda nao foi liberado.');
      }
    },
    [loadUserFromSession],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    clearLocalAuth();
  }, [clearLocalAuth]);

  const refreshUserData = useCallback(async () => {
    if (session?.access_token) await loadUserFromSession(session);
  }, [session, loadUserFromSession]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    if (currentUser?.id) headers['x-user-id'] = currentUser.id;
    return headers;
  }, [session?.access_token, currentUser?.id]);

  const startViewingAs = useCallback(
    async (user: UserWithRole) => {
      setViewAsUser(user);
      const role = user.role ?? null;
      setViewAsRole(role);

      if (role?.id && session?.access_token) {
        try {
          const res = await fetch(`${API_URL}/api/roles/${role.id}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });
          if (res.ok) {
            const data = await res.json();
            setViewAsPermissions(data.permissions || []);
            return;
          }
        } catch {
          // silently fall through
        }
      }
      setViewAsPermissions(user.permissions || []);
    },
    [session?.access_token],
  );

  const stopViewingAs = useCallback(() => {
    setViewAsUser(null);
    setViewAsRole(null);
    setViewAsPermissions([]);
  }, []);

  const isViewingAs = viewAsUser !== null;

  // Quando em modo visualização, currentUser/role/permissions refletem o usuário visto
  const effectiveUser = isViewingAs ? (viewAsUser as User) : currentUser;
  const effectiveRole = isViewingAs ? viewAsRole : userRole;
  const effectivePermissions = isViewingAs ? viewAsPermissions : userPermissions;

  const hasPermission = (permission: string): boolean =>
    effectivePermissions.some((p) => p.name === permission);

  const hasRole = (role: string): boolean => effectiveRole?.name === role;

  return (
    <AuthContext.Provider
      value={{
        currentUser: effectiveUser,
        userRole: effectiveRole,
        userPermissions: effectivePermissions,
        isLoading,
        session,
        login,
        logout,
        hasPermission,
        hasRole,
        refreshUserData,
        getAuthHeaders,
        realUser: currentUser,
        realUserRole: userRole,
        isViewingAs,
        viewAsUser,
        startViewingAs,
        stopViewingAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
