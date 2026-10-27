import { z } from 'zod';

export const CreateDailyReportSchema = z.object({
  taskId: z.string(),
  workCompleted: z.string().min(1),
  progress: z.coerce.number().min(0).max(100).default(0),
  timeSpent: z.coerce.number().min(0).optional(),
  blockers: z.string().optional(),
  workStatus: z.string().optional(),
  nextDayPlan: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});
