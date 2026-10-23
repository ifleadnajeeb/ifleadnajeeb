import { api } from '@/shared/api/client';

export interface Followup {
  description?: string;
  id: string;
  title: string;
  notes: string | null;
  dueAt: string;
  status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  completedAt: string | null;
  result: string | null;
  lead: { id: string; name: string; phone: string | null } | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface FollowupsListResponse {
  data: Followup[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    counts: { overdue: number; today: number; upcoming: number; completed: number };
  };
}

export const followupsService = {
  list: async (params: Record<string, any> = {}): Promise<FollowupsListResponse> => {
    const res = await api.get<FollowupsListResponse>('/followups', { params });
    return res.data;
  },
  complete: async (id: string, body: { result?: string; notes?: string } = {}) => {
    const res = await api.post(`/followups/${id}/complete`, body);
    return res.data;
  },
};
