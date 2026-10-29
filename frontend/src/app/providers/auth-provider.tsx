import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/shared/api/client';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  can: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    retry: false,
    queryFn: async () => {
      try {
        const timeout = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 8000)
        );
        const request = api.get('/auth/me').then((res) => res.data?.user || null);
        return await Promise.race([request, timeout]) as any;
      } catch (error) {
        console.warn('Auth check timed out or failed.');
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // ✅ The `can` function that both sidebars depend on
  const can = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    const permissions: string[] = user.permissions || [];
    return permissions.includes(permission);
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const userData = res.data?.user || res.data;
      queryClient.setQueryData(['me'], userData);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error(err);
    }
    queryClient.setQueryData(['me'], null);
    queryClient.clear();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user: user || null, loading: isLoading, can, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
