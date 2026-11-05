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
  
  // By default, we set loading to true so the router waits before redirecting
  const [initialLoading, setInitialLoading] = useState(true);

  const { data: user, isLoading, isFetching } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/me');
        const user = res.data.user;
        
        // ✅ Flatten role and extract permissions safely
        if (user) {
          if (user.role && typeof user.role === 'object') {
            // If permissions are nested inside the role, move them to the user object
            if (user.role.permissions && !user.permissions) {
              user.permissions = user.role.permissions.map((p: any) => p.permission?.action || p.action);
            }
            user.role = user.role.name;
          }
          if (!user.permissions) user.permissions = [];
        }
        return user;
      } catch (err) {
        // If the token is invalid, we just return null instead of crashing
        return null;
      }
    },
    retry: false, // Don't retry endlessly if unauthorized
    refetchOnWindowFocus: false, // Don't refetch every time you click the window
    staleTime: 1000 * 60 * 5, // Cache user for 5 minutes so refresh is instant
  });

  // Once the query finishes (success or fail), we turn off the loading screen
  useEffect(() => {
    if (!isLoading && !isFetching) {
      setInitialLoading(false);
    }
  }, [isLoading, isFetching]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.user && res.data.user.role && typeof res.data.user.role === 'object') {
      res.data.user.role = res.data.user.role.name;
    }
    if (res.data.refreshToken) {
      localStorage.setItem('refreshToken', res.data.refreshToken);
    }
    // Immediately update the cache so the user is logged in
    queryClient.setQueryData(['me'], { ...res.data.user, permissions: res.data.user.permissions || [] });
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
