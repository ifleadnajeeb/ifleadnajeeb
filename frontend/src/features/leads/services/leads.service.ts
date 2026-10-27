import { api } from '@/shared/api/client';

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'HOT';
  value: number | null;
  tags: string[];
  assignedTo: { id: string; name: string; email: string } | null;
  nextFollowupAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsListResponse {
  data: Lead[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    counts?: { all: number; mine: number; hot: number; overdue: number };
  };
}

export interface LeadFactsResponse {
  lead: Lead & {
    notes: string | null;
    createdBy: { id: string; name: string } | null;
    customer: { id: string; name: string } | null;
  };
  facts: {
    totalActivities: number;
    callsCount: number;
    whatsappCount: number;
    followupsCount: number;
    lastContactAt: string | null;
    lastResult: string | null;
    missing: string[];
    recommendation: { action: string; reason: string };
  };
  activities: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    createdAt: string;
  }[];
  followups: {
    id: string;
    title: string;
    dueAt: string;
    status: string;
    result: string | null;
    completedAt: string | null;
  }[];
}

export const leadsService = {
  list: async (params: Record<string, any> = {}): Promise<LeadsListResponse> => {
    const res = await api.get<LeadsListResponse>('/leads', { params });
    return res.data;
  },
  facts: async (id: string): Promise<LeadFactsResponse> => {
    const res = await api.get<LeadFactsResponse>(`/leads/${id}/facts`);
    return res.data;
  },
  bulkCreate: async (leads: any[]) => {
    const res = await api.post<{ created: number; failed: number; errors: any[] }>(
      '/leads/bulk',
      { leads }
    );
    return res.data;
  },

  exportAll: async (params: Record<string, any> = {}) => {
    const res = await api.get<LeadsListResponse>('/leads', {
      params: { ...params, page: 1, pageSize: 100 },
    });
    return res.data;
  },

};

// ─── Follow-up ───
export interface FollowupPayload {
  method: 'Phone' | 'WhatsApp' | 'Email' | 'Meeting' | 'Other';
  result: string;
  note?: string;
  nextAction?: string;
  nextDate?: string | null;
  nextTime?: string | null;
}

export interface FollowupResult {
  data: {
    id: string;
    name: string;
    status: string;
    priority: string;
    nextFollowupAt: string | null;
  };
  xp: number;
  closesLead: boolean;
  statusChanged: boolean;
  oldStatus: string;
  newStatus: string;
  suggestedNextAction: string;
  suggestedNextDate: string | null;
}

// Extend the service object
Object.assign(leadsService, {
  completeFollowup: async (
    id: string,
    payload: FollowupPayload
  ): Promise<FollowupResult> => {
    const res = await api.post<FollowupResult>(`/leads/${id}/followup`, payload);
    return res.data;
  },
});

// 👇 NEW HOOK FOR DUPLICATE CHECK 👇
import { useQuery } from '@tanstack/react-query';

export const useCheckDuplicate = (query: string) => {
  return useQuery({
    queryKey: ['leads', 'duplicate', query],
    queryFn: async () => {
      if (!query || query.length < 3) return { duplicates: [] };
      const res = await fetch(`http://localhost:4000/api/leads/check-duplicate?name=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      if (!res.ok) return { duplicates: [] };
      const json = await res.json();
      return json.data;
    },
    enabled: query.length > 2, // Only search if 3+ chars
    staleTime: 1000 * 60,
  });
};
