import { api } from '@/shared/api/client';

export const auditService = {
  list: async (params: any = {}) => {
    const res = await api.get('/audit', { params });
    return res.data;
  },
  actions: async () => {
    const res = await api.get('/audit/actions');
    return res.data.data as string[];
  },
};
