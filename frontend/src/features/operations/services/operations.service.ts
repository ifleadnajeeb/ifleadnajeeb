import { api } from '@/shared/api/client';

export const operationsService = {
  listDailyReports: async (): Promise<any[]> => {
    const res = await api.get<{ data: any[] }>('/operations/reports');
    return res.data.data;
  },
  createDailyReport: async (input: any): Promise<any> => {
    const res = await api.post<{ data: any }>('/operations/reports', input);
    return res.data.data;
  }
};
