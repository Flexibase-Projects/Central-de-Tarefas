import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
  useRef,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Role, Permission, UserWithRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { apiUrl } from '@/lib/api';
import { fetchCentralSsoLogoutUrl } from '@/lib/central-sso';
import { isGlobalAdminRoleName } from '@/lib/global-admin';
import { buildWorkspacePath, getWorkspaceSlugFromPath } from '@/lib/workspace-routing';
import type { Session } from '@supabase/supabase-js';

type WorkspaceSummary = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  role_display_name?: string | null;
};

export type AuthContextType = {
  currentUser: User | null;
  currentWorkspace: WorkspaceSummary | null;
  userRole: Role | null;
  userPermissions: Permission[];
  isLoading: boolean;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (slug: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  refreshUserData: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  realUser: User | null;
  realUserRole: Role | null;
  isViewingAs: boolean;
  viewAsUser: UserWithRole | null;
  startViewingAs: (user: UserWithRole) => Promise<void>;
  stopViewingAs: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isRefreshTokenError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /refresh token|Refresh Token/i.test(msg);
}

/** Só limpa storage/local; evita POST /logout global (403 comum em GoTrue self-hosted / sessão já inválida). */
async function signOutLocalOnly(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}

/** Logout explícito: tenta revogar no servidor; se falhar, garante limpeza local. */
async function signOutWithServerFallback(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    await signOutLocalOnly();
  }
}

type FetchUserResult =
  | { status: 'ok'; user: User; role: Role | null; permissions: Permission[] }
  | { status: 'pending'; message: string }
  | { status: 'unauthorized'; message: string };

async function fetchUserWithRole(accessToken: string): Promise<FetchUserResult> {
  const res = await fetch(apiUrl('/api/users/me'), {
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
    const baseMsg =
      typeof body?.error === 'string'
        ? body.error
        : `Falha ao validar acesso (HTTP ${res.status}). Verifique se o backend está no ar e se o proxy /api ou a URL base estão corretos.`;
    const code = typeof body?.code === 'string' ? body.code : '';
    return {
      status: 'unauthorized',
      message: code ? `${baseMsg} (${code})` : baseMsg,
    };
  }

  const userData = body;
  const user: User = userData;
  let permissions: Permission[] = [];

  if (userData.role?.id) {
    const roleRes = await fetch(apiUrl(`/api/roles/${userData.role.id}`), {
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
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceCatalog, setWorkspaceCatalog] = useState<WorkspaceSummary[]>([]);

  // Estado do modo "Ver como usuário"
  const [viewAsUser, setViewAsUser] = useState<UserWithRole | null>(null);
  const [viewAsRole, setViewAsRole] = useState<Role | null>(null);
  const [viewAsPermissions, setViewAsPermissions] = useState<Permission[]>([]);

  /** Invalida conclusões antigas de `loadUserFromSession` quando uma carga mais nova começa. */
  const sessionLoadGen = useRef(0);
  /** Uma única requisição /users/me + /roles por access_token em voo (Strict Mode / auth duplicado). */
  const userFetchInflight = useRef(new Map<string, Promise<FetchUserResult>>());

  const clearViewAs = useCallback(() => {
    setViewAsUser(null);
    setViewAsRole(null);
    setViewAsPermissions([]);
  }, []);

  const clearLocalAuth = useCallback(() => {
    setCurrentUser(null);
    setUserRole(null);
    setUserPermissions([]);
    clearViewAs();
  }, [clearViewAs]);

  const loadUserFromSession = useCallback(
    async (s: Session | null): Promise<{ ok: boolean; message?: string; stale?: boolean }> => {
      if (!s?.access_token) {
        sessionLoadGen.current += 1;
        clearLocalAuth();
        return { ok: false };
      }

      const token = s.access_token;
      const gen = ++sessionLoadGen.current;

      const inflight = userFetchInflight.current;
      let shared = inflight.get(token);
      if (!shared) {
        shared = fetchUserWithRole(token).finally(() => {
          inflight.delete(token);
        });
        inflight.set(token, shared);
      }

      const result = await shared;

      if (gen !== sessionLoadGen.current) {
        return { ok: false, stale: true };
      }

      if (result.status === 'ok') {
        const user = result.user;
        const role = result.role;
        const permissions = result.permissions;
        setCurrentUser(user);
        setUserRole(role);
        setUserPermissions(permissions);
        return { ok: true };
      }

      clearLocalAuth();
      return { ok: false, message: result.message };
    },
    [clearLocalAuth],
  );

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const response = await fetch(apiUrl('/api/auth/public-workspaces'), {
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            ...((viewAsUser?.id ?? currentUser?.id)
              ? { 'x-user-id': viewAsUser?.id ?? currentUser?.id ?? '' }
              : {}),
          },
        });
        const body = (await response.json().catch(() => null)) as
          | { workspaces?: WorkspaceSummary[]; error?: string }
          | null;

        if (!mounted) return;

        if (!response.ok || !body?.workspaces) {
          setWorkspaceCatalog([]);
          return;
        }

        setWorkspaceCatalog(body.workspaces);
      } catch {
        if (mounted) {
          setWorkspaceCatalog([]);
        }
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [currentUser?.id, session?.access_token, viewAsUser?.id]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        return loadUserFromSession(s).then(async (result) => {
          if (result.stale) return;
          if (s && !result.ok) {
            await signOutLocalOnly();
            setSession(null);
          }
        });
      })
      .catch(async (err) => {
        if (isRefreshTokenError(err)) {
          await signOutLocalOnly();
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
        if (result.stale) return;
        if (s && !result.ok) {
          await signOutLocalOnly();
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
        await signOutLocalOnly();
        setSession(null);
        throw new Error(result.message || 'Seu acesso ainda nao foi liberado.');
      }
    },
    [loadUserFromSession],
  );

  const logout = useCallback(async () => {
    const logoutUrl = await fetchCentralSsoLogoutUrl('/workspaces').catch(() => null);
    await signOutWithServerFallback();
    setSession(null);
    clearLocalAuth();
    if (logoutUrl && typeof window !== 'undefined') {
      window.location.assign(logoutUrl);
      return;
    }
    navigate('/workspaces', { replace: true });
  }, [clearLocalAuth, navigate]);

  const refreshUserData = useCallback(async () => {
    const token = session?.access_token;
    if (!token) return;
    const result = await fetchUserWithRole(token);
    if (result.status !== 'ok') return;
    setCurrentUser(result.user);
    setUserRole(result.role);
    setUserPermissions(result.permissions);
  }, [session?.access_token]);

  const routeWorkspaceSlug = useMemo(
    () => getWorkspaceSlugFromPath(location.pathname),
    [location.pathname],
  );

  const currentWorkspace = useMemo<WorkspaceSummary | null>(() => {
    if (!routeWorkspaceSlug) return null;

    const matchedWorkspace = workspaceCatalog.find((workspace) => workspace.slug === routeWorkspaceSlug) ?? null;
    if (matchedWorkspace) return matchedWorkspace;

    return {
      id: routeWorkspaceSlug,
      slug: routeWorkspaceSlug,
      name: routeWorkspaceSlug,
      description: null,
      role_display_name: null,
    };
  }, [routeWorkspaceSlug, workspaceCatalog]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    const userIdForApi = viewAsUser?.id ?? currentUser?.id;
    if (userIdForApi) headers['x-user-id'] = userIdForApi;
    if (routeWorkspaceSlug) headers['x-workspace-slug'] = routeWorkspaceSlug;
    return headers;
  }, [session?.access_token, currentUser?.id, routeWorkspaceSlug, viewAsUser?.id]);

  const switchWorkspace = useCallback(
    async (slug: string) => {
      navigate(buildWorkspacePath(slug), { replace: true });
    },
    [navigate],
  );

  const startViewingAs = useCallback(
    async (user: UserWithRole) => {
      setViewAsUser(user);
      const role = user.role ?? null;
      setViewAsRole(role);

      if (role?.id && session?.access_token) {
        try {
          const res = await fetch(apiUrl(`/api/roles/${role.id}`), {
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
    clearViewAs();
  }, [clearViewAs]);

  const isViewingAs = viewAsUser !== null;

  // Quando em modo visualização, currentUser/role/permissions refletem o usuário visto
  const effectiveUser = isViewingAs ? (viewAsUser as User) : currentUser;
  const effectiveRole = isViewingAs ? viewAsRole : userRole;
  const effectivePermissions = isViewingAs ? viewAsPermissions : userPermissions;

  const hasPermission = (permission: string): boolean =>
    isGlobalAdminRoleName(effectiveRole?.name) || effectivePermissions.some((p) => p.name === permission);

  const hasRole = (role: string): boolean => {
    if (role === 'admin') {
      return isGlobalAdminRoleName(effectiveRole?.name);
    }

    return effectiveRole?.name === role;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser: effectiveUser,
        currentWorkspace,
        userRole: effectiveRole,
        userPermissions: effectivePermissions,
        isLoading,
        session,
        login,
        logout,
        switchWorkspace,
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

