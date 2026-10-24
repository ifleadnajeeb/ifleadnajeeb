import { z } from 'zod';
import { LeadStatus, LeadPriority } from '@prisma/client';

export const CreateLeadSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(6).max(20).optional().or(z.literal('')),
  company: z.string().max(120).optional(),
  source: z.string().max(40).optional(),
  projectName: z.string().max(200).optional(),
  service: z.string().max(100).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(LeadPriority).optional(),
  value: z.coerce.number().nonnegative().optional().nullable(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional(),
  createdById: z.string().optional(),
  nextFollowupAt: z.string().optional().nullable(),
});

export const UpdateLeadSchema = CreateLeadSchema.partial();

export const AssignLeadSchema = z.object({
  assignedToId: z.string().nullable(),
});

export const UpdateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  note: z.string().max(1000).optional(),
});

export const BulkAssignSchema = z.object({
  leadIds: z.array(z.string()).min(1),
  assignedToId: z.string(),
});

export const BulkDeleteSchema = z.object({
  leadIds: z.array(z.string()).min(1),
});

export const BulkStatusSchema = z.object({
  leadIds: z.array(z.string()).min(1),
  status: z.nativeEnum(LeadStatus),
});

export const ListLeadsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(LeadPriority).optional(),
  source: z.string().optional(),
  assignedToId: z.string().optional(),
  customerId: z.string().optional(),
  tag: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'value', 'name', 'priority'])
    .default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  view: z.enum(['all', 'mine', 'hot', 'overdue', 'user', 'won', 'lost', 'today']).default('all'),
  userId: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof ListLeadsQuerySchema>;

export const CompleteFollowupSchema = z.object({
  method: z.enum(['Phone', 'WhatsApp', 'Email', 'Meeting', 'Other']),
  result: z.string().min(1),
  note: z.string().max(2000).optional(),
  nextAction: z.string().max(120).optional(),
  nextDate: z.string().optional().nullable(),
  nextTime: z.string().optional().nullable(),
});

export type CompleteFollowupInput = z.infer<typeof CompleteFollowupSchema>;
export const BulkCreateLeadsSchema = z.object({
  leads: z.array(
    z.object({
      name: z.string().min(2).max(120),
      phone: z.string().max(30).optional(),
      email: z.union([z.string().email().max(200), z.literal('')]).optional(),
      company: z.string().max(200).optional(),
      source: z.string().max(50).optional(),
      status: z.string().max(50).optional(),
      priority: z.string().max(20).optional(),
      value: z.coerce.number().nonnegative().optional().nullable(),
      notes: z.string().max(2000).optional(),
    })
  ).min(1).max(1000),
});
