import { api } from '@/shared/api/client';

export const dashboardService = {
  getSummary: async (params: { range?: string } = {}) => {
    const res = await api.get<{ data: any }>('/dashboard/summary', { params });
    // The backend might return the data directly or inside a data object
    return res.data.data || res.data; 
  },
};
