import { z } from 'zod';

export const ListFollowupsQuerySchema = z.object({
  group: z.enum(['overdue', 'today', 'upcoming', 'completed', 'all']).default('today'),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  assignedToId: z.string().optional(),
  leadId: z.string().optional(),
});

export const CompleteFollowupSchema = z.object({
  result: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  nextFollowupAt: z.string().datetime().optional(),
  nextAction: z.string().optional(),
});

export type ListFollowupsQuery = z.infer<typeof ListFollowupsQuerySchema>;
export type CompleteFollowupInput = z.infer<typeof CompleteFollowupSchema>;
