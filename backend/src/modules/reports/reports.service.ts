import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';

async function scopeFor(req: AuthRequest): Promise<any> {
  const u = req.user!;
  if (u.role === 'ADMIN') return { org: u.organizationId, lead: {}, user: {} };
  if (u.role === 'CEO') return {
    org: u.organizationId,
    lead: { organizationId: u.organizationId },
    user: { organizationId: u.organizationId },
  };
  if (u.role === 'BDM') {
    const ids = await collectDescendants(u.id);
    return {
      org: u.organizationId,
      lead: { organizationId: u.organizationId, assignedToId: { in: ids } },
      user: { id: { in: ids } },
    };
  }
  if (u.role === 'SALES_HEAD') {
    if (!u.teamId) return {
      org: u.organizationId,
      lead: { organizationId: u.organizationId, assignedToId: u.id },
      user: { id: u.id },
    };
    const mem = await prisma.user.findMany({
      where: { teamId: u.teamId, organizationId: u.organizationId },
      select: { id: true },
    });
    const ids = [u.id, ...mem.map((m) => m.id)];
    return {
      org: u.organizationId,
      lead: { organizationId: u.organizationId, assignedToId: { in: ids } },
      user: { id: { in: ids } },
    };
  }
  return {
    org: u.organizationId,
    lead: { organizationId: u.organizationId, assignedToId: u.id },
    user: { id: u.id },
  };
}

async function collectDescendants(rootId: string): Promise<string[]> {
  const out: string[] = [rootId];
  const q = [rootId];
  while (q.length) {
    const cur = q.shift()!;
    const ch = await prisma.user.findMany({ where: { managerId: cur }, select: { id: true } });
    for (const c of ch) { out.push(c.id); q.push(c.id); }
  }
  return out;
}

function buildDateRange(q: { from?: string; to?: string }): any | undefined {
  const gte = q.from ? new Date(q.from) : undefined;
  const lte = q.to ? new Date(q.to) : undefined;
  if (!gte && !lte) return undefined;
  const r: any = {};
  if (gte) r.gte = gte;
  if (lte) r.lte = lte;
  return r;
}

export const reportsService = {
  async overview(req: AuthRequest) {
    const scope = await scopeFor(req);
    const q = req.query as { from?: string; to?: string; userId?: string };
    const dateRange = buildDateRange(q);

    const baseLead: any = { ...scope.lead };

    // If a specific userId was requested AND caller has org-wide access, narrow to that user
    const orgWide =
      req.user!.role === 'ADMIN' ||
      req.user!.role === 'CEO' ||
      req.user!.role === 'BDM';

    if (q.userId && orgWide) {
      baseLead.assignedToId = q.userId;
    }

    const leadWhere: any = dateRange
      ? { ...baseLead, createdAt: dateRange }
      : { ...baseLead };

    // Funnel
    const statusGroups = await prisma.lead.groupBy({
      by: ['status'],
      where: leadWhere,
      _count: { _all: true },
    });
    const funnel: Record<string, number> = {
      NEW: 0, CONTACTED: 0, QUALIFIED: 0, PROPOSAL: 0, NEGOTIATION: 0, WON: 0, LOST: 0,
    };
    statusGroups.forEach((g) => { funnel[g.status] = g._count._all; });

    // Sources
    const sourceGroups = await prisma.lead.groupBy({
      by: ['source'],
      where: leadWhere,
      _count: { _all: true },
    });
    const sources = sourceGroups.map((g) => ({
      source: g.source ?? 'unknown',
      count: g._count._all,
    }));

    // Priorities
    const priorityGroups = await prisma.lead.groupBy({
      by: ['priority'],
      where: leadWhere,
      _count: { _all: true },
    });
    const priorities = priorityGroups.map((g) => ({
      priority: g.priority,
      count: g._count._all,
    }));

    // Trend
    let rangeStart: Date;
    let rangeEnd: Date;
    if (dateRange?.gte) {
      rangeStart = new Date(dateRange.gte);
    } else {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 30);
    }
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = dateRange?.lte ? new Date(dateRange.lte) : new Date();
    rangeEnd.setHours(23, 59, 59, 999);

    const days = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86400000));
    const recentLeads = await prisma.lead.findMany({
      where: { ...baseLead, createdAt: { gte: rangeStart, lte: rangeEnd } },
      select: { createdAt: true },
    });
    const trendMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      trendMap.set(d.toISOString().slice(0, 10), 0);
    }
    recentLeads.forEach((l) => {
      const key = l.createdAt.toISOString().slice(0, 10);
      if (trendMap.has(key)) trendMap.set(key, trendMap.get(key)! + 1);
    });
    const leadTrend = [...trendMap.entries()].map(([date, count]) => ({ date, count }));

    // Top performers
    const topGroups = await prisma.lead.groupBy({
      by: ['assignedToId'],
      where: { ...leadWhere, assignedToId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { assignedToId: 'desc' } },
      take: q.userId && orgWide ? 1 : 10,
    });
    const userIds = topGroups.map((g) => g.assignedToId!).filter(Boolean);
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, xp: true, role: { select: { name: true } } },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const topPerformers = topGroups.map((g) => {
      const u = userMap.get(g.assignedToId!);
      return {
        userId: g.assignedToId!,
        name: u?.name ?? 'Unknown',
        role: u?.role.name ?? '—',
        xp: u?.xp ?? 0,
        leadCount: g._count._all,
      };
    });

    // Follow-ups
    const fuBase: any = { lead: { ...baseLead } };
    if (dateRange) fuBase.createdAt = dateRange;
    const [fuPending, fuCompleted] = await Promise.all([
      prisma.followup.count({ where: { ...fuBase, status: 'PENDING' } }),
      prisma.followup.count({ where: { ...fuBase, status: 'COMPLETED' } }),
    ]);

    // Tasks
    const taskWhere: any = { organizationId: scope.org };
    if (q.userId && orgWide) {
      taskWhere.assignedToId = q.userId;
    } else if (req.user!.role === 'BDE' || req.user!.role === 'SALES_HEAD') {
      taskWhere.assignedToId = req.user!.id;
    }
    // ✅ For tasks, filter by updatedAt (or completedAt) instead of createdAt
    if (dateRange) {
      taskWhere.OR = [
        { createdAt: dateRange },
        { completedAt: dateRange }
      ];
    }
    const taskGroups = await prisma.task.groupBy({
      by: ['status'],
      where: taskWhere,
      _count: { _all: true },
    });
    const tasks: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0, CANCELLED: 0 };
    taskGroups.forEach((g) => { tasks[g.status] = g._count._all; });

    // Summary
    const totalLeads = Object.values(funnel).reduce((a, b) => a + b, 0);
    const conversionPct = totalLeads > 0 ? Math.round((funnel.WON / totalLeads) * 100) : 0;
    const fuTotal = fuPending + fuCompleted;
    const fuCompletionPct = fuTotal > 0 ? Math.round((fuCompleted / fuTotal) * 100) : 0;

    return {
      range: { from: q.from ?? null, to: q.to ?? null },
      funnel, sources, priorities, leadTrend, topPerformers,
      followups: { pending: fuPending, completed: fuCompleted, completionPct: fuCompletionPct },
      tasks,
      summary: { totalLeads, conversionPct, won: funnel.WON, lost: funnel.LOST },
    };
  },
};
