import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const CreateDepartmentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export const CreateDailyReportSchema = z.object({
  reports: z.array(z.object({ reports: z.array(z.object({ taskId: z.string(), progress: z.number() })), progress: z.number() })),.optional(),
  workCompleted: z.string().min(2),
  timeSpent: z.number().optional(),
  progress: z.number().min(0).max(100).optional(),
  blockers: z.string().optional(),
  nextPlan: z.string().optional(),
});
