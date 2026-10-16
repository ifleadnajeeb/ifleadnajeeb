import { api } from '@/shared/api/client';

export interface Role {
  id: string;
  name: string;
  level: number;
  description: string | null;
  userCount: number;
  permissionCount: number;
  permissionKeys: string[];
}

export interface RoleDetail extends Role {
  permissionsByModule: Record<string, string[]>;
}

export const rolesService = {
  list: async (): Promise<Role[]> => {
    const res = await api.get<{ data: Role[] }>('/roles');
    return res.data.data;
  },
  get: async (id: string): Promise<RoleDetail> => {
    const res = await api.get<{ data: RoleDetail }>(`/roles/${id}`);
    return res.data.data;
  },
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  CEO: 'Chief Executive Officer',
  BDM: 'General Manager',
  SALES_HEAD: 'Sales Head',
  BDE: 'Business Development Executive',
};

export const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700 border-purple-300',
  CEO: 'bg-blue-100 text-blue-700 border-blue-300',
  BDM: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  SALES_HEAD: 'bg-amber-100 text-amber-700 border-amber-300',
  BDE: 'bg-gray-100 text-gray-700 border-gray-300',
};
