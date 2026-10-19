import { api } from '@/shared/api/client';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  readAt: string | null;
  createdAt: string;
}

export const notificationsService = {
  list: async (): Promise<AppNotification[]> => {
    const res = await api.get<{ data: AppNotification[] }>('/notifications');
    return res.data.data;
  },
  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },
  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  }
};
