import { z } from 'zod';

export const CreateTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueAt: z.string().optional(),
  reminderAt: z.string().optional(),
  assignedToId: z.string().optional(),
  projectId: z.string().optional(),
  departmentId: z.string().optional(),
  customerId: z.string().optional(),
  customerId: z.string().optional(),
  deliverableUrl: z.string().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const MoveTaskSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']),
});

export const ListTasksQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(50),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().optional(),
  projectId: z.string().optional(),
  departmentId: z.string().optional(),
  customerId: z.string().optional(),
  customerId: z.string().optional(),
  deliverableUrl: z.string().optional(),
  search: z.string().optional(),
  view: z.enum(['list', 'kanban']).default('list'),
  isOperations: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;
