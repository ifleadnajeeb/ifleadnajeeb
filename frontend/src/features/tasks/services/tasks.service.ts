import { api } from '@/shared/api/client';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  acceptance?: string;
  rejectionReason?: string;
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  reminderAt?: string | null;
  completedAt: string | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface ListResponse { data: Task[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }
export interface KanbanResponse { columns: Record<TaskStatus, Task[]>; meta: { total: number } }

export const tasksService = {
  list: async (params: Record<string, any> = {}): Promise<ListResponse> => {
    const res = await api.get<ListResponse>('/tasks', { params: { ...params, view: 'list' } });
    return res.data;
  },
  kanban: async (params: Record<string, any> = {}): Promise<KanbanResponse> => {
    const res = await api.get<KanbanResponse>('/tasks', { params: { ...params, view: 'kanban' } });
    return res.data;
  },
  create: async (input: any) => {
    const res = await api.post('/tasks', input);
    return res.data.data as Task;
  },
  move: async (id: string, status: TaskStatus) => {
    const res = await api.post(`/tasks/${id}/move`, { status });
    return res.data.data as Task;
  },
  remove: async (id: string) => { await api.delete(`/tasks/${id}`); },
  detail: async (id: string): Promise<TaskDetail> => {
    const res = await api.get<{ data: TaskDetail }>(`/tasks/${id}`);
    return res.data.data;
  },
  addComment: async (taskId: string, body: string): Promise<TaskComment> => {
    const res = await api.post<{ data: TaskComment }>(`/tasks/${taskId}/comments`, { body });
    return res.data.data;
  },
  addChecklistItem: async (taskId: string, text: string): Promise<ChecklistItem> => {
    const res = await api.post<{ data: ChecklistItem }>(`/tasks/${taskId}/checklist`, { text });
    return res.data.data;
  },
  toggleChecklistItem: async (itemId: string, done: boolean): Promise<ChecklistItem> => {
    const res = await api.patch<{ data: ChecklistItem }>(`/tasks/checklist/${itemId}`, { done });
    return res.data.data;
  },
  deleteChecklistItem: async (itemId: string): Promise<void> => {
    await api.delete(`/tasks/checklist/${itemId}`);
  },
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done', CANCELLED: 'Cancelled',
};
export const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 text-gray-700 border-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-300',
  DONE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 border-red-300',
};
export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export interface TaskComment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

export interface TaskDetail extends Task {
  comments: TaskComment[];
  checklist: ChecklistItem[];
}
