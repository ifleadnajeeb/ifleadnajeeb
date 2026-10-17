import { z } from 'zod';

export const CreateCustomerSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(6).max(20).optional().or(z.literal('')),
  company: z.string().max(200).optional(),
  serviceType: z.string().optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  ownerId: z.string().optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

export const ConvertLeadSchema = z.object({
  serviceType: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  createProject: z.boolean().optional(),
});

export const ListCustomersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  ownerId: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type ConvertLeadInput = z.infer<typeof ConvertLeadSchema>;
export type ListCustomersQuery = z.infer<typeof ListCustomersQuerySchema>;
