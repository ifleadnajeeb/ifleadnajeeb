import { api } from '@/shared/api/client';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  customerId: string | null;
  customer?: { name: string };
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
}

export const operationsService = {
  listProjects: async (): Promise<Project[]> => {
    const res = await api.get<{ data: Project[] }>('/operations/projects');
    return res.data.data;
  },
  createProject: async (input: Partial<Project>): Promise<Project> => {
    const res = await api.post<{ data: Project }>('/operations/projects', input);
    return res.data.data;
  },
  listDepartments: async (): Promise<Department[]> => {
    const res = await api.get<{ data: Department[] }>('/operations/departments');
    return res.data.data;
  },
  listDailyReports: async (): Promise<any[]> => {
    const res = await api.get<{ data: any[] }>('/operations/reports');
    return res.data.data;
  },
  createDailyReport: async (input: any): Promise<any> => {
    const res = await api.post<{ data: any }>('/operations/reports', input);
    return res.data.data;
  },
  createDepartment: async (input: Partial<Department>): Promise<Department> => {
    const res = await api.post<{ data: Department }>('/operations/departments', input);
    return res.data.data;
  },
};
