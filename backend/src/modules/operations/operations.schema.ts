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
  reports: z.array(z.object({ 
    taskId: z.string(), 
    progress: z.number() 
  })).optional(),
  workCompleted: z.string().min(1, 'Work completed is required'),
  timeSpent: z.coerce.number().min(0.1, 'Time spent must be greater than 0'),
  blockers: z.string().optional().nullable(),
});
