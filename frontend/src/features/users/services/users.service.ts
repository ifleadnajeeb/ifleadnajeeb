import { api } from '@/shared/api/client';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  role: 'ADMIN' | 'CEO' | 'BDM' | 'SALES_HEAD' | 'BDE';
  roleLevel: number;
  teamId: string | null;
  teamName: string | null;
  managerId: string | null;
  managerName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UsersListResponse {
  data: AppUser[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'CEO' | 'BDM' | 'SALES_HEAD' | 'BDE';
}

export const usersService = {
  list: async (params: Record<string, any> = {}): Promise<UsersListResponse> => {
    const res = await api.get<UsersListResponse>('/users', { params });
    return res.data;
  },
  // Scoped list of users the caller can assign leads to.
  // Works for every role (no users:read permission required).
  assignable: async (): Promise<AppUser[]> => {
    const res = await api.get<UsersListResponse>('/users/assignable', {
      params: { page: 1, pageSize: 100 },
    });
    return res.data.data;
  },
  bookable: async (): Promise<AppUser[]> => {
    const res = await api.get<UsersListResponse>("/users/bookable", {
      params: { page: 1, pageSize: 100 },
    });
    return res.data.data;
  },
  create: async (input: CreateUserInput): Promise<AppUser> => {
    const res = await api.post<{ data: AppUser }>('/users', input);
    return res.data.data;
  },
  canCreate: async (): Promise<string[]> => {
    const res = await api.get<{ data: string[] }>('/users/me/can-create');
    return res.data.data;
  },
  deactivate: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}/permanent`);
  },
};

export const ROLE_LABEL: Record<string, string> = {
  OP_MANAGER: 'OP Manager',
  WEB_DEVELOPER: 'Web Dev',
  SOFTWARE_DEVELOPER: 'Software Dev',
  DIGITAL_MARKETER: 'Digital Mktg',
  CONTENT_CREATOR: 'Content Creator',
  VIDEO_EDITOR: 'Video Editor',

  ADMIN: 'Admin',
  CEO: 'CEO',
  BDM: 'GM',
  SALES_HEAD: 'Sales Head',
  BDE: 'BDE',
};

export const ROLE_COLOR: Record<string, string> = {
  OP_MANAGER: 'bg-indigo-100 text-indigo-700',
  WEB_DEVELOPER: 'bg-sky-100 text-sky-700',
  SOFTWARE_DEVELOPER: 'bg-cyan-100 text-cyan-700',
  DIGITAL_MARKETER: 'bg-teal-100 text-teal-700',
  CONTENT_CREATOR: 'bg-lime-100 text-lime-700',
  VIDEO_EDITOR: 'bg-orange-100 text-orange-700',

  ADMIN: 'bg-purple-100 text-purple-700',
  CEO: 'bg-blue-100 text-blue-700',
  BDM: 'bg-emerald-100 text-emerald-700',
  SALES_HEAD: 'bg-amber-100 text-amber-700',
  BDE: 'bg-gray-100 text-gray-700',
};
