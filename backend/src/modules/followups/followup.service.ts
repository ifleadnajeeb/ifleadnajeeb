import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { NotFoundError } from '../../shared/errors.js';
import { awardXpOnce } from '../missions/missions.service.js';
import type { ListFollowupsQuery, CompleteFollowupInput } from './followup.schema.js';
import { customerService } from '../customers/customer.service.js';

async function buildScope(req: AuthRequest): Promise<any> {
  const user = req.user!;
  switch (user.role) {
    case 'ADMIN':
      return {};
    case 'CEO':
      return { organizationId: user.organizationId };
    case 'BDM': {
      const ids = await collectDescendants(user.id);
      return { organizationId: user.organizationId, assignedToId: { in: ids } };
    }
    case 'SALES_HEAD': {
      if (!user.teamId) return { assignedToId: user.id };
      const members = await prisma.user.findMany({
        where: { teamId: user.teamId, organizationId: user.organizationId },
        select: { id: true },
      });
      return {
        organizationId: user.organizationId,
        assignedToId: { in: [user.id, ...members.map((m) => m.id)] },
      };
    }
    case 'BDE':
    default:
      return { organizationId: user.organizationId, assignedToId: user.id };
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
    for (const c of children) { ids.push(c.id); queue.push(c.id); }
  }
  return ids;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfTomorrow(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

export const followupService = {
  async list(req: AuthRequest, query: ListFollowupsQuery) {
    const scope = await buildScope(req);
    const now = new Date();
    const today = startOfToday();
    const tomorrow = startOfTomorrow();

    // Base filters (scope only — no group yet)
    const baseWhere: any = { ...scope };
    if (query.search) baseWhere.title = { contains: query.search, mode: 'insensitive' };
    if (query.assignedToId) baseWhere.assignedToId = query.assignedToId;
    if (query.leadId) baseWhere.leadId = query.leadId;

    // Group filter
    const where: any = { ...baseWhere };
    if (query.group === 'overdue') {
      where.status = 'PENDING';
      where.dueAt = { lt: today };
    } else if (query.group === 'today') {
      where.status = 'PENDING';
      where.dueAt = { gte: today, lt: tomorrow };
    } else if (query.group === 'upcoming') {
      where.status = 'PENDING';
      where.dueAt = { gte: tomorrow };
    } else if (query.group === 'completed') {
      where.status = 'COMPLETED';
    }

    // Counts for KPI cards (always using baseWhere, no group filter)
    const [overdue, todayCount, upcoming, completed] = await Promise.all([
      prisma.followup.count({ where: { ...baseWhere, status: 'PENDING', dueAt: { lt: today } } }),
      prisma.followup.count({ where: { ...baseWhere, status: 'PENDING', dueAt: { gte: today, lt: tomorrow } } }),
      prisma.followup.count({ where: { ...baseWhere, status: 'PENDING', dueAt: { gte: tomorrow } } }),
      prisma.followup.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
    ]);

    const [data, total] = await Promise.all([
      prisma.followup.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true, notes: true } },
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { dueAt: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.followup.count({ where }),
    ]);

    return {
      data: data.map((f) => ({
        id: f.id,
        title: f.title,
        notes: f.notes,
        dueAt: f.dueAt,
        status: f.status,
        completedAt: f.completedAt,
        result: f.result,
        lead: f.lead,
    description: (f.lead as any)?.notes,
        assignedTo: f.assignedTo,
        createdBy: f.createdBy,
        createdAt: f.createdAt,
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
        counts: { overdue, today: todayCount, upcoming, completed },
      },
    };
  },

  async complete(req: AuthRequest, id: string, input: CompleteFollowupInput) {
    const actor = req.user!;
    const scope = await buildScope(req);

    const existing = await prisma.followup.findFirst({
      where: { id, ...scope },
    });
    if (!existing) throw new NotFoundError('Follow-up not found in your scope');

    if (existing.status === 'COMPLETED') {
      return { success: true, alreadyDone: true };
    }

    await prisma.$transaction(async (tx) => {
      await tx.followup.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: input.result ?? null,
          notes: input.notes ? input.notes : existing.notes,
        },
      });

      if (existing.leadId) {
        await tx.activity.create({
          data: {
            organizationId: actor.organizationId,
            type: 'followup',
            title: `Follow-up completed: ${existing.title}`,
            body: input.result ?? null,
            metadata: {
              followupId: id,
              result: input.result ?? null,
            },
            userId: actor.id,
            leadId: existing.leadId,
          },
        });
      }
    });

    // Auto-convert lead → customer when result starts with "Converted"
    const isConverted =
      typeof input.result === 'string' &&
      /^converted/i.test(input.result.trim());

    if (isConverted && existing.leadId) {
      try {
        const lead = await prisma.lead.findUnique({
          where: { id: existing.leadId },
          select: { id: true, status: true, customerId: true, name: true },
        });
        if (lead && !lead.customerId && lead.status !== 'WON') {
          await customerService.convertFromLead(req, existing.leadId, {});
          console.log(`[followup] auto-converted lead "${lead.name}"`);
        }
      } catch (e: any) {
        console.error('[followup.auto-convert]', e?.message ?? e);
      }
    }

    // Award XP (idempotent — safe to retry)
    awardXpOnce(actor.id, 'followup.complete', id, actor.organizationId).catch((e) =>
      console.error('[xp] followup.complete failed', e),
    );

    return { success: true };
  },
};
