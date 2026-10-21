import { Prisma, LeadStatus } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { leadRepository } from './lead.repository.js';
import { buildScopeFilter } from '../../middleware/scope.middleware.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors.js';
import { AuthUser, AuthRequest } from '../../middleware/auth.middleware.js';
import { notificationService } from '../notifications/notification.service.js';
import { customerService } from '../customers/customer.service.js';
import type {
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
} from './lead.schema.js';

function toDTO(lead: any, userMap?: Map<string, string>) {
  const nextFollowup = lead.followups?.[0];
  const lastActivity = lead.activities?.[0];
  const lastChangedById = lastActivity?.userId ?? null;
  const lastChangedByName = lastChangedById && userMap
    ? userMap.get(lastChangedById) ?? null
    : null;
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    source: lead.source,
    status: lead.status,
    priority: lead.priority,
    value: lead.value ? Number(lead.value) : null,
    notes: lead.notes,
    tags: lead.tags ?? [],
    assignedTo: lead.assignedTo
      ? {
          id: lead.assignedTo.id,
          name: lead.assignedTo.name,
          email: lead.assignedTo.email,
        }
      : null,
    createdBy: lead.createdBy
      ? { id: lead.createdBy.id, name: lead.createdBy.name }
      : null,
    customer: lead.customer
      ? { id: lead.customer.id, name: lead.customer.name }
      : null,
    nextFollowupAt:
      nextFollowup?.status === 'PENDING' ? nextFollowup.dueAt : null,
    lastActivityAt: lastActivity?.createdAt ?? null,
    lastChangedBy: lastActivity?.userId
      ? { id: lastActivity.userId, name: null }
      : null,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

export const leadService = {
  async create(
    req: AuthRequest,
    input: CreateLeadInput,
    actor: AuthUser
  ) {
    const dupes = await leadRepository.findDuplicates(
      actor.organizationId,
      input.email || undefined,
      input.phone || undefined
    );
    if (dupes.length) {
      throw new ConflictError(
        `Possible duplicate: ${dupes.map((d) => d.name).join(', ')}`
      );
    }

    let assignedToId = input.assignedToId;
    if (assignedToId) {
      await assertCanAssignTo(actor, assignedToId);
    } else {
      assignedToId = actor.id;
    }

    const created = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          company: input.company,
          source: input.source ?? 'manual',
          status: input.status ?? LeadStatus.NEW,
          priority: input.priority ?? 'MEDIUM',
          value: input.value,
          notes: input.notes,
          tags: input.tags ?? [],
          organizationId: actor.organizationId,
          assignedToId,
          createdById: actor.id,
        },
      });

      await tx.activity.create({
        data: {
          organizationId: actor.organizationId,
          type: 'created',
          title: `Lead "${lead.name}" created by ${actor.name}`,
          body: `Owner: ${assignedToId === actor.id ? 'self' : 'on behalf'}`,
          userId: actor.id,
          leadId: lead.id,
        },
      });

      if (assignedToId && assignedToId !== actor.id) {
        await tx.notification.create({
          data: {
            organizationId: actor.organizationId,
            userId: assignedToId,
            type: 'lead.created',
            title: `${actor.name} added "${lead.name}" to your leads`,
            data: { leadId: lead.id, actorId: actor.id, actorName: actor.name },
          },
        });
      }

      // ✅ NEW: create Followup record if nextFollowupAt provided
      if (input.nextFollowupAt) {
        await tx.followup.create({
          data: {
            organizationId: actor.organizationId,
            title: `Follow up: ${lead.name}`,
            notes: input.notes ?? null,
            dueAt: new Date(input.nextFollowupAt),
            status: 'PENDING',
            leadId: lead.id,
            assignedToId: assignedToId,
            createdById: actor.id,
          },
        });

        await tx.notification.create({
          data: {
            organizationId: actor.organizationId,
            userId: assignedToId,
            type: 'followup.created',
            title: `Follow-up scheduled for "${lead.name}"`,
            data: { leadId: lead.id, dueAt: input.nextFollowupAt },
          },
        });
      }

      return lead;
    });

    const full = await leadRepository.findById(created.id);
    return toDTO(full);
  },

  async list(req: AuthRequest, query: ListLeadsQuery) {
    const actor = req.user!;
    const scope = await buildScopeFilter(req);
    
    // FORCE HIDE WON/LOST LEADS
    let where: any = { ...scope.where };
    if (query.view === 'won') {
      where.status = 'WON';
    } else if (query.view === 'lost') {
      where.status = 'LOST';
    } else {
      where.status = { notIn: ['WON', 'LOST'] };
    }

    if (query.view === 'mine') {
      where.assignedToId = actor.id;
    } else if (query.view === 'hot') {
      where.priority = 'HOT';
    } else if (query.view === 'overdue') {
      where.followups = { some: { status: 'PENDING', dueAt: { lt: new Date() } } };
    } else if (query.view === 'user' && query.userId) {
      const allowed = await canViewUserLeads(req, query.userId);
      if (!allowed) throw new NotFoundError('User not found in your scope');
      where.assignedToId = query.userId;
    }

    if (query.search) {
      where.AND = [
        { OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search, mode: 'insensitive' } },
            { company: { contains: query.search, mode: 'insensitive' } },
        ] },
      ];
    }
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.source) where.source = query.source;
    if (query.tag) where.tags = { has: query.tag };
    if (query.from) where.createdAt = { ...where.createdAt, gte: new Date(query.from) };
    if (query.to) where.createdAt = { ...where.createdAt, lte: new Date(query.to) };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortDir ?? 'desc' },
        include: { assignedTo: { select: { id: true, name: true } }, customer: true, _count: { select: { followups: true } } },
      }),
      prisma.lead.count({ where }),
    ]);

    // Calculate counts for KPI cards
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);

    const [allCount, mineCount, hotCount, todayCount, overdueCount, wonCount, lostCount] = await Promise.all([
      prisma.lead.count({ where: { ...scope.where, status: { notIn: ['WON', 'LOST'] } } }),
      prisma.lead.count({ where: { ...scope.where, assignedToId: actor.id, status: { notIn: ['WON', 'LOST'] } } }),
      prisma.lead.count({ where: { ...scope.where, priority: 'HOT', status: { notIn: ['WON', 'LOST'] } } }),
      prisma.lead.count({ where: { ...scope.where, status: { notIn: ['WON', 'LOST'] }, followups: { some: { status: 'PENDING', dueAt: { gte: startOfToday, lt: endOfToday } } } } }),
      prisma.lead.count({ where: { ...scope.where, status: { notIn: ['WON', 'LOST'] }, followups: { some: { status: 'PENDING', dueAt: { lt: new Date() } } } } }),
      prisma.lead.count({ where: { ...scope.where, status: 'WON' } }),
      prisma.lead.count({ where: { ...scope.where, status: 'LOST' } }),
    ]);

    return {
      data: data.map(d => toDTO(d)),
      meta: { 
        page, 
        pageSize, 
        total, 
        totalPages: Math.ceil(total / pageSize),
        counts: {
          all: allCount,
          mine: mineCount,
          hot: hotCount,
          today: todayCount,
          overdue: overdueCount,
          won: wonCount,
          lost: lostCount
        }
      },
    };
  },
async getById(req: AuthRequest, id: string) {
    const scope = await buildScopeFilter(req);
    const lead = await prisma.lead.findFirst({
      where: { id, ...scope.where },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        followups: {
          orderBy: { dueAt: 'desc' },
          take: 1,
          select: { dueAt: true, status: true },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    if (!lead) throw new NotFoundError('Lead not found in your scope');

    const ids = new Set<string>();
    const a = (lead as any).activities?.[0];
    if (a?.userId) ids.add(a.userId);
    if (lead.assignedToId) ids.add(lead.assignedToId);
    if (lead.createdById) ids.add(lead.createdById);
    const us = ids.size
      ? await prisma.user.findMany({
          where: { id: { in: [...ids] } },
          select: { id: true, name: true },
        })
      : [];
    const map = new Map(us.map((u) => [u.id, u.name]));

    return toDTO(lead, map);
  },

  async update(req: AuthRequest, id: string, input: UpdateLeadInput) {
    const actor = req.user!;
    const scope = await buildScopeFilter(req);

    const existing = await prisma.lead.findFirst({
      where: { id, ...scope.where },
    });
    if (!existing) throw new NotFoundError('Lead not found in your scope');

    if (
      input.assignedToId !== undefined &&
      input.assignedToId !== existing.assignedToId
    ) {
      if (input.assignedToId) {
        await assertCanAssignTo(actor, input.assignedToId);
      }
    }

    const wasNotWon = existing.status !== 'WON';
    const willBeWon  = input.status === 'WON';
    console.log('[lead.update] status change:', existing.status, '→', input.status);

    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: {
          name: input.name,
          email: input.email === '' ? null : input.email,
          phone: input.phone === '' ? null : input.phone,
          company: input.company,
          source: input.source,
          status: input.status,
          priority: input.priority,
          value: input.value,
          notes: input.notes,
          tags: input.tags,
          assignedToId: input.assignedToId,
        },
      });

      await tx.activity.create({
        data: {
          organizationId: actor.organizationId,
          type: 'updated',
          title: `Lead "${lead.name}" updated by ${actor.name}`,
          metadata: { changed: Object.keys(input) },
          userId: actor.id,
          leadId: lead.id,
        },
      });

      if (existing.assignedToId && existing.assignedToId !== actor.id) {
        await tx.notification.create({
          data: {
            organizationId: actor.organizationId,
            userId: existing.assignedToId,
            type: 'lead.updated',
            title: `${actor.name} updated "${lead.name}"`,
            data: { leadId: lead.id, actorId: actor.id, actorName: actor.name },
          },
        });
      }

      return lead;
    });

    await autoConvertIfWon(req, id, existing.status, input.status);

    const full = await leadRepository.findById(updated.id);
    return toDTO(full);
  },

  async changeStatus(
    req: AuthRequest,
    id: string,
    status: LeadStatus,
    note?: string
  ) {
    const actor = req.user!;
    const scope = await buildScopeFilter(req);

    const existing = await prisma.lead.findFirst({
      where: { id, ...scope.where },
    });
    if (!existing) throw new NotFoundError('Lead not found in your scope');

    if (existing.status === status) return this.getById(req, id);

    const allowedTransitions: Record<LeadStatus, LeadStatus[]> = {
      NEW: ['CONTACTED', 'LOST'],
      CONTACTED: ['QUALIFIED', 'LOST'],
      QUALIFIED: ['PROPOSAL', 'LOST'],
      PROPOSAL: ['NEGOTIATION', 'WON', 'LOST'],
      NEGOTIATION: ['WON', 'LOST'],
      WON: [],
      LOST: ['NEW'],
    };
    if (!allowedTransitions[existing.status].includes(status)) {
      throw new ValidationError(
        `Cannot transition ${existing.status} to ${status}`
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: { status },
      });
      await tx.activity.create({
        data: {
          organizationId: actor.organizationId,
          type: 'status_change',
          title: `Status: ${existing.status} to ${status}`,
          body: note,
          metadata: { from: existing.status, to: status },
          userId: actor.id,
          leadId: lead.id,
        },
      });
      return lead;
    });

    await autoConvertIfWon(req, id, existing.status, status);

    const full = await leadRepository.findById(updated.id);
    return toDTO(full);
  },

  async assign(req: AuthRequest, id: string, assignedToId: string | null) {
    const actor = req.user!;
    const scope = await buildScopeFilter(req);

    const existing = await prisma.lead.findFirst({
      where: { id, ...scope.where },
    });
    if (!existing) throw new NotFoundError('Lead not found in your scope');

    if (assignedToId) await assertCanAssignTo(actor, assignedToId);

    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: { assignedToId },
      });
      await tx.activity.create({
        data: {
          organizationId: actor.organizationId,
          type: 'assigned',
          title: assignedToId ? 'Lead reassigned' : 'Lead unassigned',
          metadata: { from: existing.assignedToId, to: assignedToId },
          userId: actor.id,
          leadId: lead.id,
        },
      });
      return lead;
    });

    const full = await leadRepository.findById(updated.id);
    return toDTO(full);
  },

  async remove(req: AuthRequest, id: string) {
    const scope = await buildScopeFilter(req);
    const existing = await prisma.lead.findFirst({
      where: { id, ...scope.where },
    });
    if (!existing) throw new NotFoundError('Lead not found in your scope');
    await leadRepository.delete(id);
  },

  async bulkAssign(req: AuthRequest, leadIds: string[], assignedToId: string) {
    const actor = req.user!;
    await assertCanAssignTo(actor, assignedToId);
    const scope = await buildScopeFilter(req);

    const allowed = await prisma.lead.count({
      where: { id: { in: leadIds }, ...scope.where },
    });
    if (allowed !== leadIds.length) {
      throw new ForbiddenError('Some leads are outside your scope');
    }

    const result = await leadRepository.bulkAssign(leadIds, assignedToId);
    return { count: result.count };
  },

  async bulkDelete(req: AuthRequest, leadIds: string[]) {
    const scope = await buildScopeFilter(req);
    const allowed = await prisma.lead.count({
      where: { id: { in: leadIds }, ...scope.where },
    });
    if (allowed !== leadIds.length) {
      throw new ForbiddenError('Some leads are outside your scope');
    }
    const result = await leadRepository.bulkDelete(leadIds);
    return { count: result.count };
  },

  async bulkStatus(req: AuthRequest, leadIds: string[], status: LeadStatus) {
    const actor = req.user!;
    const scope = await buildScopeFilter(req);

    const allowed = await prisma.lead.count({
      where: { id: { in: leadIds }, ...scope.where },
    });
    if (allowed !== leadIds.length) {
      throw new ForbiddenError('Some leads are outside your scope');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Log activity per lead
      for (const id of leadIds) {
        await tx.activity.create({
          data: {
            organizationId: actor.organizationId,
            type: 'status_change',
            title: `Status changed to ${status} (bulk)`,
            metadata: { to: status },
            userId: actor.id,
            leadId: id,
          },
        });
      }
      return tx.lead.updateMany({
        where: { id: { in: leadIds } },
        data: { status },
      });
    });

    return { count: result.count };
  },
  async bulkCreate(req: AuthRequest, input: { leads: any[] }) {
    const actor = req.user!;
    const rows = input.leads ?? [];
    if (rows.length === 0) return { created: 0, failed: 0, errors: [] };
    const errors: { row: number; name: string; error: string }[] = [];
    let created = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        await prisma.$transaction(async (tx) => {
          const lead = await tx.lead.create({
            data: {
              organizationId: actor.organizationId,
              name: r.name.trim(),
              phone: r.phone?.toString().trim() || null,
              email: r.email?.toString().trim() || null,
              company: r.company?.toString().trim() || null,
              source: (r.source?.toString().trim().toLowerCase() as any) || 'manual',
              status: (r.status?.toString().trim().toUpperCase() as any) || 'NEW',
              priority: (r.priority?.toString().trim().toUpperCase() as any) || 'MEDIUM',
              value: r.value ?? null,
              notes: r.notes?.toString().trim() || null,
              assignedToId: actor.id,
              createdById: actor.id,
            },
          });
          await tx.activity.create({
            data: {
              organizationId: actor.organizationId,
              type: 'lead.import',
              title: `Lead imported: ${lead.name}`,
              userId: actor.id,
              leadId: lead.id,
            },
          });
        });
        created++;
      } catch (e: any) {
        errors.push({ row: i + 1, name: r.name ?? 'Unknown', error: e?.message ?? 'Failed' });
      }
    }
    return { created, failed: errors.length, errors };
  },

};

async function assertCanAssignTo(actor: AuthUser, targetUserId: string) {
  if (targetUserId === actor.id) return;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { role: true },
  });
  if (!target) throw new ValidationError('Assignee not found');
  if (target.organizationId !== actor.organizationId) {
    throw new ForbiddenError('Cannot assign to another organization');
  }

  if (actor.role === 'ADMIN' || actor.role === 'CEO') return;
  if (actor.role === 'BDE') {
    throw new ForbiddenError('BDE cannot assign leads to others');
  }

  const subtreeIds = await collectDescendants(actor.id);
  if (!subtreeIds.includes(targetUserId)) {
    throw new ForbiddenError('Assignee is outside your management subtree');
  }
}

async function collectDescendants(rootId: string): Promise<string[]> {
  const ids: string[] = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift()!;
    const children = await prisma.user.findMany({
      where: { managerId: current },
      select: { id: true },
    });
    for (const c of children) {
      ids.push(c.id);
      queue.push(c.id);
    }
  }
  return ids;
}

async function canViewUserLeads(
  req: AuthRequest,
  targetUserId: string
): Promise<boolean> {
  const actor = req.user!;
  if (actor.id === targetUserId) return true;
  if (actor.role === 'ADMIN' || actor.role === 'CEO') return true;
  if (actor.role === 'BDE') return false;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!target || target.organizationId !== actor.organizationId) return false;

  const subtree = await collectDescendants(actor.id);
  return subtree.includes(targetUserId);
}
async function notifyOwnerOnBehalfOf(
  actor: AuthUser,
  ownerId: string | null,
  organizationId: string,
  action: string,
  leadName: string,
  leadId: string,
) {
  if (!ownerId || ownerId === actor.id) return;
  try {
    await notificationService.create({
      organizationId,
      userId: ownerId,
      type: 'lead.' + action,
      title: `${actor.name} ${action}ed "${leadName}" in your panel`,
      body: `On ${new Date().toLocaleString('en-IN')}`,
      data: { leadId, actorId: actor.id, actorName: actor.name, action },
    });
  } catch (e) {
    console.error('[notify]', e);
  }
}

// ─────────────────────────────────────────────────────────
// Shared helper — auto-convert a lead to a customer when WON
// ─────────────────────────────────────────────────────────
async function autoConvertIfWon(
  req: AuthRequest,
  leadId: string,
  oldStatus: string,
  newStatus: string,
) {
  if (oldStatus === 'WON' || newStatus !== 'WON') return;
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, name: true, customerId: true },
    });
    if (!lead) return;
    if (lead.customerId) {
      console.log(`[auto-convert] "${lead.name}" already a customer`);
      return;
    }
    const r = await customerService.convertFromLead(req, leadId, {});
    console.log(`[auto-convert] ✅ "${lead.name}" converted to customer`, r);
  } catch (e: any) {
    console.error('[auto-convert] failed:', e?.message ?? e);
  }
}
