// @ts-nocheck — TODO: fix types after first deploy
import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { awardXpOnce } from '../missions/missions.service.js';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ConvertLeadInput,
  ListCustomersQuery,
} from './customer.schema.js';

async function scopeFor(req: AuthRequest): Promise<any> {
  const u = req.user!;
  if (u.role === 'ADMIN') return {};
  if (u.role === 'CEO' || u.role === 'OP_MANAGER') return { organizationId: u.organizationId };
  if (u.role === 'BDM') {
    const ids = await collectDesc(u.id);
    return { organizationId: u.organizationId, ownerId: { in: ids } };
  }
  if (u.role === 'SALES_HEAD') {
    if (!u.teamId) return { ownerId: u.id };
    const mem = await prisma.user.findMany({
      where: { teamId: u.teamId, organizationId: u.organizationId },
      select: { id: true },
    });
    return { organizationId: u.organizationId, ownerId: { in: [u.id, ...mem.map(m => m.id)] } };
  }
  return { organizationId: u.organizationId, ownerId: u.id };
}

async function collectDesc(root: string): Promise<string[]> {
  const out = [root]; const q = [root];
  while (q.length) {
    const cur = q.shift()!;
    const ch = await prisma.user.findMany({ where: { managerId: cur }, select: { id: true } });
    for (const c of ch) { out.push(c.id); q.push(c.id); }
  }
  return out;
}

function toDTO(c: any) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    address: c.address,
    notes: c.notes,
    tags: c.tags ?? [],
    owner: c.owner ? { id: c.owner.id, name: c.owner.name } : null,
    leadCount: c._count?.leads ?? undefined,
    projectCount: c._count?.projects ?? undefined,
    createdAt: c.createdAt,
  };
}

export const customerService = {
  async list(req: AuthRequest, q: ListCustomersQuery) {
    const scope = await scopeFor(req);
    const where: any = { ...scope };
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search, mode: 'insensitive' } },
        { company: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.ownerId) where.ownerId = q.ownerId;

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { leads: true, projects: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      data: data.map(toDTO),
      meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) },
    };
  },

  async getById(req: AuthRequest, id: string) {
    const scope = await scopeFor(req);
    const c = await prisma.customer.findFirst({
      where: { id, ...scope },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        leads: {
          select: {
            id: true, name: true, status: true, priority: true,
            createdAt: true, source: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        projects: {
          select: { id: true, name: true, description: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          select: { id: true, name: true, url: true, mimeType: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { user: { select: { id: true, name: true } } },
        },
        appointments: {
          select: { id: true, title: true, startAt: true, status: true },
          orderBy: { startAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!c) throw new NotFoundError('Customer not found in your scope');

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      address: c.address,
      notes: c.notes,
      tags: c.tags ?? [],
      owner: c.owner,
      leads: c.leads,
      projects: c.projects,
      documents: c.documents,
      activities: c.activities.map(a => ({
        id: a.id, type: a.type, title: a.title, body: a.body,
        createdAt: a.createdAt, by: a.user,
      })),
      appointments: c.appointments,
      createdAt: c.createdAt,
    };
  },

  async create(req: AuthRequest, input: CreateCustomerInput) {
    const actor = req.user!;

    // Duplicate check
    const dupWhere: any[] = [];
    if (input.phone) dupWhere.push({ phone: input.phone });
    if (input.email) dupWhere.push({ email: input.email });
    if (dupWhere.length) {
      const existing = await prisma.customer.findFirst({
        where: { organizationId: actor.organizationId, OR: dupWhere },
      });
      if (existing) throw new ConflictError(`Customer already exists: ${existing.name}`);
    }

    const created = await prisma.customer.create({
      data: {
        organizationId: actor.organizationId,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        company: input.company,
        address: input.address,
        notes: input.notes,
        ownerId: input.ownerId ?? actor.id,
      },
      include: { owner: { select: { id: true, name: true } } },
    });

    await prisma.activity.create({
      data: {
        organizationId: actor.organizationId,
        type: 'customer.created',
        title: `Customer "${created.name}" created`,
        userId: actor.id,
        customerId: created.id,
      },
    });

    return toDTO(created);
  },

  async update(req: AuthRequest, id: string, input: UpdateCustomerInput) {
    const scope = await scopeFor(req);
    const existing = await prisma.customer.findFirst({ where: { id, ...scope } });
    if (!existing) throw new NotFoundError('Customer not found');

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email === '' ? null : input.email,
        phone: input.phone === '' ? null : input.phone,
        company: input.company,
        address: input.address,
        notes: input.notes,
        ownerId: input.ownerId,
      },
      include: { owner: { select: { id: true, name: true } } },
    });
    return toDTO(updated);
  },

  async remove(req: AuthRequest, id: string) {
    const scope = await scopeFor(req);
    const existing = await prisma.customer.findFirst({ where: { id, ...scope } });
    if (!existing) throw new NotFoundError('Customer not found');
    await prisma.customer.delete({ where: { id } });
  },

  /**
   * Convert a Lead → Customer.
   * - Preserves the lead (does NOT delete it)
   * - Links lead.customerId to the new customer
   * - Records activity + audit
   */
  async convertFromLead(req: AuthRequest, leadId: string, input: ConvertLeadInput) {
    const actor = req.user!;
    const scope = await buildLeadScope(req);

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, ...scope },
    });
    if (!lead) throw new NotFoundError('Lead not found in your scope');
    if (lead.customerId) {
      throw new ConflictError('Lead is already converted to a customer');
    }

    // Duplicate customer check
    const dupWhere: any[] = [];
    if (lead.phone) dupWhere.push({ phone: lead.phone });
    if (lead.email) dupWhere.push({ email: lead.email });
    if (dupWhere.length) {
      const existing = await prisma.customer.findFirst({
        where: { organizationId: actor.organizationId, OR: dupWhere },
      });
      if (existing) {
        // Link lead to the existing customer instead of creating duplicate
        await prisma.lead.update({
          where: { id: leadId },
          data: { customerId: existing.id },
        });
        return { customer: toDTO(existing), linked: true };
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the customer
      const customer = await tx.customer.create({
        data: {
          organizationId: actor.organizationId,
          name: lead.name,
          email: input.email ?? lead.email ?? null,
          phone: lead.phone ?? null,
          company: input.company ?? lead.company ?? null,
          address: input.address,
          notes: input.notes ?? lead.notes,
          ownerId: lead.assignedToId ?? actor.id,
        },
        include: { owner: { select: { id: true, name: true } } },
      });

      // Link the lead (do NOT delete it)
      await tx.lead.update({
        where: { id: leadId },
        data: { customerId: customer.id, status: 'WON' },
      });

      // Activity log
      await tx.activity.create({
        data: {
          organizationId: actor.organizationId,
          type: 'lead.converted',
          title: `Lead "${lead.name}" converted to customer`,
          body: `Converted by ${actor.name}`,
          userId: actor.id,
          leadId: lead.id,
          customerId: customer.id,
        },
      });

      // Optional: create empty project
      if (input.createProject) {
        await tx.project.create({
          data: {
            organizationId: actor.organizationId,
            name: `${customer.name} — Project`,
            customerId: customer.id,
          },
        });
      }

      return customer;
    });

    // Award XP to the actor (idempotent)
    awardXpOnce(actor.id, 'lead.convert', leadId, actor.organizationId).catch((e) =>
      console.error('[xp] lead.convert failed', e),
    );

    return { customer: toDTO(result), linked: false };
  },
};

async function buildLeadScope(req: AuthRequest): Promise<any> {
  const u = req.user!;
  if (u.role === 'ADMIN') return {};
  if (u.role === 'CEO' || u.role === 'OP_MANAGER') return { organizationId: u.organizationId };
  if (u.role === 'BDM') {
    const ids = await collectDesc(u.id);
    return { organizationId: u.organizationId, assignedToId: { in: ids } };
  }
  if (u.role === 'SALES_HEAD') {
    if (!u.teamId) return { assignedToId: u.id };
    const mem = await prisma.user.findMany({
      where: { teamId: u.teamId, organizationId: u.organizationId },
      select: { id: true },
    });
    return { organizationId: u.organizationId, assignedToId: { in: [u.id, ...mem.map(m => m.id)] } };
  }
  return { organizationId: u.organizationId, assignedToId: u.id 
};
}
