import { api } from '@/shared/api/client';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  role: 'ADMIN' | 'CEO' | 'BDM' | 'SALES_HEAD' | 'BDE' | string;
  managerId?: string | null;
  managerName?: string | null;
  lastLoginAt?: string | null;
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  CEO: 'CEO',
  BDM: 'BDM',
  SALES_HEAD: 'Sales Head',
  BDE: 'BDE',
};

export const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  CEO: 'bg-purple-100 text-purple-700',
  BDM: 'bg-blue-100 text-blue-700',
  SALES_HEAD: 'bg-teal-100 text-teal-700',
  BDE: 'bg-orange-100 text-orange-700',
};

export const usersService = {
  list: async (params?: { search?: string }) => {
    const res = await api.get('/users', { params });
    return res.data;
  },

  canCreate: async () => {
    const res = await api.get('/users/can-create');
    return res.data.data;
  },

  create: async (data: any) => {
    const res = await api.post('/users', data);
    return res.data.data;
  },

  deactivate: async (id: string) => {
    const res = await api.patch(`/users/${id}/deactivate`);
    return res.data;
  },

  remove: async (id: string) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },

  update: async (id: string, data: { name: string }) => {
    const res = await api.patch(`/users/${id}`, data);
    return res.data;
  },

  // 👇 RESTORED: The function Vercel was looking for 👇
  bookable: async (): Promise<AppUser[]> => {
    const res = await api.get('/users/bookable', {
      params: { page: 1, pageSize: 200 },
    });
    return res.data.data;
  },
};
