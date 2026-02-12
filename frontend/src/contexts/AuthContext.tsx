import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role, Permission } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  userRole: Role | null;
  userPermissions: Permission[];
  isLoading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar usuário do localStorage ao iniciar
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const storedUserId = localStorage.getItem('cdt_user_id');
        if (storedUserId) {
          await refreshUserData(storedUserId);
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  const refreshUserData = async (userId?: string) => {
    const userIdToUse = userId || currentUser?.id;
    if (!userIdToUse) return;

    try {
      // Buscar dados do usuário
      const userResponse = await fetch(`/api/users/${userIdToUse}?userId=${userIdToUse}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUser(userData);

        // Buscar cargo e permissões
        if (userData.role) {
          setUserRole(userData.role);

          // Buscar permissões do cargo
          const permissionsResponse = await fetch(`/api/roles/${userData.role.id}?userId=${userIdToUse}`);
          if (permissionsResponse.ok) {
            const roleData = await permissionsResponse.json();
            setUserPermissions(roleData.permissions || []);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const login = async (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('cdt_user_id', user.id);
    localStorage.setItem('cdt_user_email', user.email);
    await refreshUserData(user.id);
  };

  const logout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setUserPermissions([]);
    localStorage.removeItem('cdt_user_id');
    localStorage.removeItem('cdt_user_email');
  };

  const hasPermission = (permission: string): boolean => {
    return userPermissions.some(p => p.name === permission);
  };

  const hasRole = (role: string): boolean => {
    return userRole?.name === role;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRole,
        userPermissions,
        isLoading,
        login,
        logout,
        hasPermission,
        hasRole,
        refreshUserData,
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
