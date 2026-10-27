import { z } from 'zod';
import { LeadStatus, LeadPriority } from '@prisma/client';

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────
export const CreateLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable().or(z.literal('')),
  company: z.string().max(100).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(LeadPriority).optional(),
  value: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional().nullable(),
  nextFollowupAt: z.string().datetime().optional().nullable(),
  
  // 👇 THIS IS THE NEW FLAG 👇
  forceCreate: z.boolean().optional().default(false), 
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────
export const UpdateLeadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable().or(z.literal('')),
  company: z.string().max(100).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(LeadPriority).optional(),
  value: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional().nullable(),
});

export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;

// ─────────────────────────────────────────────
// LIST / QUERY
// ─────────────────────────────────────────────
export const ListLeadsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  view: z.enum(['all', 'mine', 'hot', 'today', 'overdue', 'won', 'lost', 'user']).optional(),
  userId: z.string().optional(), // Used when view === 'user'
  tab: z.string().optional(), // Used inside user panel
});

export type ListLeadsQuery = z.infer<typeof ListLeadsSchema>;

// ─────────────────────────────────────────────
// STATUS CHANGE
// ─────────────────────────────────────────────
export const ChangeStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  note: z.string().optional(),
});

// ─────────────────────────────────────────────
// ASSIGN
// ─────────────────────────────────────────────
export const AssignLeadSchema = z.object({
  assignedToId: z.string().nullable(), // null means unassign
});

// ─────────────────────────────────────────────
// BULK ACTIONS
// ─────────────────────────────────────────────
export const BulkActionSchema = z.object({
  leadIds: z.array(z.string()).min(1, 'Select at least one lead'),
  assignedToId: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
});

export const BulkCreateSchema = z.object({
  leads: z.array(z.any()).min(1, 'No leads provided'),
});
