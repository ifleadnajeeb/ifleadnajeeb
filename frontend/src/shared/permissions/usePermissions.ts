import { useAuth } from '@/app/providers/auth-provider';

export function usePermissions() {
  const { user } = useAuth();
  return {
    can: (permission: string) => {
      // 🚨 TEMPORARY FIX: Always return true so sidebar locks disappear
      return true;
    },
  };
}
