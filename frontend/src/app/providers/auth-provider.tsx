import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

interface AuthContextType {
  user: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [initialLoading, setInitialLoading] = useState(true);

  const { data: user, isLoading, isFetching } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/me');
        const fetchedUser = res.data.user;
        
        // ✅ Extract permissions safely whether they are at the root or inside the role object
        let perms: string[] = [];
        if (fetchedUser.role && fetchedUser.role.permissions) {
          perms = fetchedUser.role.permissions.map((p: any) => p.permission?.action || p.action);
        } else if (fetchedUser.permissions) {
          perms = fetchedUser.permissions;
        }

        return {
          ...fetchedUser,
          role: typeof fetchedUser.role === 'object' ? fetchedUser.role.name : fetchedUser.role,
          permissions: perms,
        };
      } catch (err) {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!isLoading && !isFetching) {
      setInitialLoading(false);
    }
  }, [isLoading, isFetching]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.refreshToken) {
      localStorage.setItem('refreshToken', res.data.refreshToken);
    }
    
    // Same normalization for login
    const fetchedUser = res.data.user;
    let perms: string[] = [];
    if (fetchedUser.role && fetchedUser.role.permissions) {
      perms = fetchedUser.role.permissions.map((p: any) => p.permission?.action || p.action);
    } else if (fetchedUser.permissions) {
      perms = fetchedUser.permissions;
    }

    const normalizedUser = {
      ...fetchedUser,
      role: typeof fetchedUser.role === 'object' ? fetchedUser.role.name : fetchedUser.role,
      permissions: perms,
    };

    queryClient.setQueryData(['me'], normalizedUser);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('accessToken');
      queryClient.setQueryData(['me'], null);
      queryClient.clear();
      window.location.href = '/login'; 
    }
  };

  const can = (permission: string) => {
    return user?.permissions?.includes(permission) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user: user || null, loading: initialLoading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
