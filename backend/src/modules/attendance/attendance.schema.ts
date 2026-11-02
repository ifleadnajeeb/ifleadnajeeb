import { z } from 'zod';

export const ListAttendanceQuerySchema = z.object({
  mode: z.enum(['raw', 'daily', 'weekly', 'monthly']).default('raw'),
  date: z.string().optional(), // e.g. 2026-11-02
});

export const UserLogsQuerySchema = z.object({
  date: z.string(), // e.g. 2026-11-02
});
