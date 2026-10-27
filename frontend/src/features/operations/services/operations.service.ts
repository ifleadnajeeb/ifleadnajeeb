import { api } from '@/shared/api/client';

export const operationsService = {
  getAnalytics: async (): Promise<any[]> => {
    const res = await api.get<{ data: any[] }>('/operations/analytics');
    return res.data.data;
  },

  listDepartments: async (): Promise<any[]> => {
    const res = await api.get<{ data: any[] }>('/operations/departments');
    return res.data.data;
  },
  listDailyReports: async (params?: any): Promise<any> => {
    const res = await api.get<any>('/operations/reports', { params });
    return res.data; // ✅ Return the full object { data, summary }
  },
  createDailyReport: async (input: any): Promise<any> => {
    const res = await api.post<{ data: any }>('/operations/reports', input);
    return res.data.data;
  }
};
