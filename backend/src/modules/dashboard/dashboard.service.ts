import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import type { SummaryQuery } from './dashboard.schema.js';

async function scopeFor(req: AuthRequest): Promise<any> {
  const u = req.user!;
  
  // ADMIN can see all leads for system management.
  if (u.role === 'ADMIN') return { org: u.organizationId, lead: {} };
  
  // Every other role (CEO, GM, SALES_HEAD, BDE) only sees leads assigned to them personally.
  return {
    org: u.organizationId,
    lead: { organizationId: u.organizationId, assignedToId: u.id },
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

function rangeStart(range: string): Date | null {
  const d = new Date();
  if (range === 'today') {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === 'week') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === 'month') {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}

export const dashboardService = {
  async summary(req: AuthRequest, q: SummaryQuery) {
    const actor = req.user!;
    const scope = await scopeFor(req);
    const from = rangeStart(q.range);

    const leadWhere: any = { ...scope.lead };
    if (from) leadWhere.createdAt = { gte: from };

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // ── Leads ──
    const [totalLeads, newLeads, hotLeads, wonLeads, lostLeads] = await Promise.all([
      prisma.lead.count({ where: leadWhere }),
      prisma.lead.count({ where: { ...leadWhere, status: 'NEW' } }),
      prisma.lead.count({ where: { ...leadWhere, priority: 'HOT' } }),
      prisma.lead.count({ where: { ...leadWhere, status: 'WON' } }),
      prisma.lead.count({ where: { ...leadWhere, status: 'LOST' } }),
    ]);

    // ── Follow-ups ──
    const followupScope = { lead: { ...scope.lead } };
    const [followupsToday, followupsOverdue, followupsUpcoming] = await Promise.all([
      prisma.followup.count({
        where: {
          ...followupScope,
          status: 'PENDING',
          dueAt: { gte: startOfToday, lt: endOfToday },
        },
      }),
      prisma.followup.count({
        where: {
          ...followupScope,
          status: 'PENDING',
          dueAt: { lt: startOfToday },
        },
      }),
      prisma.followup.count({
        where: {
          ...followupScope,
          status: 'PENDING',
          dueAt: { gte: endOfToday },
        },
      }),
    ]);

    // ── Appointments today ──
    const apptScope: any = { organizationId: actor.organizationId };
    if (actor.role === 'BDE' || actor.role === 'SALES_HEAD') {
      apptScope.assignedToId = actor.id;
    }
    const [appointmentsToday, appointmentsUpcoming] = await Promise.all([
      prisma.appointment.count({
        where: {
          ...apptScope,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          startAt: { gte: startOfToday, lt: endOfToday },
        },
      }),
      prisma.appointment.count({
        where: {
          ...apptScope,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          startAt: { gte: endOfToday },
        },
      }),
    ]);

    // ── Tasks ──
    const taskScope: any = { organizationId: actor.organizationId };
    if (actor.role === 'BDE' || actor.role === 'SALES_HEAD') {
      taskScope.assignedToId = actor.id;
    }
    const [tasksOpen, tasksToday, tasksOverdue, tasksDone] = await Promise.all([
      prisma.task.count({ where: { ...taskScope, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
      prisma.task.count({
        where: {
          ...taskScope,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueAt: { gte: startOfToday, lt: endOfToday },
        },
      }),
      prisma.task.count({
        where: {
          ...taskScope,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueAt: { lt: startOfToday },
        },
      }),
      prisma.task.count({ where: { ...taskScope, status: 'DONE' } }),
    ]);

    // ── Conversion rate ──
    const conversionPct = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    // ── Today's activity (calls, whatsapp, followups) ──
    const activityScope: any = { organizationId: actor.organizationId };
    if (actor.role === 'BDE' || actor.role === 'SALES_HEAD') {
      activityScope.userId = actor.id;
    }
    const [callsToday, whatsappToday, activitiesToday] = await Promise.all([
      prisma.activity.count({
        where: { ...activityScope, type: 'call', createdAt: { gte: startOfToday } },
      }),
      prisma.activity.count({
        where: { ...activityScope, type: 'whatsapp.draft', createdAt: { gte: startOfToday } },
      }),
      prisma.activity.count({
        where: { ...activityScope, createdAt: { gte: startOfToday } },
      }),
    ]);

    // ── Recent leads (for right-side card) ──
    const recentLeads = await prisma.lead.findMany({
      where: scope.lead,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, name: true, status: true, priority: true, createdAt: true,
        assignedTo: { select: { name: true } },
      },
    });

    // ── Recent activities ──
    const recentActivities = await prisma.activity.findMany({
      where: activityScope,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, type: true, title: true, createdAt: true, userId: true },
    });

    // Fetch actor names for recent activities
    const actorIds = [...new Set(recentActivities.map((a) => a.userId).filter(Boolean))];
    const users = actorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return {
      role: actor.role,
      range: q.range,
      leads: {
        total: totalLeads,
        new: newLeads,
        hot: hotLeads,
        won: wonLeads,
        lost: lostLeads,
        conversionPct,
      },
      followups: {
        today: followupsToday,
        overdue: followupsOverdue,
        upcoming: followupsUpcoming,
      },
      appointments: {
        today: appointmentsToday,
        upcoming: appointmentsUpcoming,
      },
      tasks: {
        open: tasksOpen,
        today: tasksToday,
        overdue: tasksOverdue,
        done: tasksDone,
      },
      activity: {
        callsToday,
        whatsappToday,
        totalToday: activitiesToday,
      },
      recentLeads: recentLeads.map((l) => ({
        id: l.id,
        name: l.name,
        status: l.status,
        priority: l.priority,
        createdAt: l.createdAt,
        assignedTo: l.assignedTo?.name ?? null,
      })),
      recentActivities: recentActivities.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        createdAt: a.createdAt,
        actorName: userMap.get(a.userId) ?? null,
      })),
    };
  },
};
