import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { buildScopeFilter } from '../../middleware/scope.middleware.js';

const LEVELS: [number, string][] = [
  [0, 'New Starter'],
  [250, 'Lead Explorer'],
  [500, 'Follow-up Pro'],
  [1000, 'Customer Builder'],
  [2000, 'Sales Master'],
];

const DAILY_GOAL = 8;

function levelInfo(xp: number) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i][0]) idx = i;
  }
  const [lo, name] = LEVELS[idx];
  const next = LEVELS[idx + 1];
  const hi = next ? next[0] : null;
  const pct = hi ? Math.round(((xp - lo) / (hi - lo)) * 100) : 100;
  return { n: idx + 1, name, lo, hi, pct };
}

export const missionsService = {
  async today(req: AuthRequest) {
    const actor = req.user!;
    const scope = await buildScopeFilter(req);

    // ── User stats ──
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { xp: true, streak: true, lastActiveDate: true },
    });

    const xp = user?.xp ?? 0;
    const streak = user?.streak ?? 0;
    const level = levelInfo(xp);

    // ── Missions (overdue + today + hot leads) ──
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const endOfToday = new Date(endOfDay);

    // 👇 NEW: Force CEO to only see their own assigned leads 👇
    const ceoFilter = actor.role === 'CEO' ? { assignedToId: actor.id } : {};

    const [overdueLeads, todayLeads] = await Promise.all([
      prisma.lead.findMany({
        where: {
          ...scope.where,
          ...ceoFilter, // Apply the CEO filter here
          status: { notIn: ['WON', 'LOST'] },
          followups: {
            some: { dueAt: { lt: startOfDay }, status: 'PENDING' },
          },
        },
        take: 10,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        include: {
          followups: {
            where: { status: 'PENDING' },
            orderBy: { dueAt: 'asc' },
            take: 1,
          },
        },
      }),
      prisma.lead.findMany({
        where: {
          ...scope.where,
          ...ceoFilter, // Apply the CEO filter here
          status: { notIn: ['WON', 'LOST'] },
          followups: {
            some: {
              dueAt: { gte: startOfDay, lt: endOfDay },
              status: 'PENDING',
            },
          },
        },
        take: 10,
        include: {
          followups: {
            where: { status: 'PENDING' },
            orderBy: { dueAt: 'asc' },
            take: 1,
          },
        },
      })
    ]);

    // Dedup by lead id, keeping first occurrence (overdue > today > hot)
    const seen = new Set<string>();
    const missions: any[] = [];
    for (const [kind, list] of [
      ['overdue', overdueLeads],
      ['today', todayLeads],
    ] as const) {
      for (const l of list) {
        if (seen.has(l.id)) continue;
        seen.add(l.id);
        missions.push({
          id: l.id,
          name: l.name,
          phone: l.phone,
          priority: l.priority,
          status: l.status,
          kind,
          nextFollowupAt: l.followups[0]?.dueAt ?? null,
          nextAction: l.followups[0]?.title ?? 'Call customer',
        });
      }
    }

    return {
      stats: {
        xp,
        streak,
        level: level.n,
        levelName: level.name,
        levelNextXp: level.hi,
        levelPct: level.pct,
        dailyGoal: DAILY_GOAL,
      },
      missions,
      counts: {
        overdue: overdueLeads.length,
        today: todayLeads.length,
        hot: 0,
      },
    };
  },

  async stats(req: AuthRequest) {
    const actor = req.user!;
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { xp: true, streak: true, lastActiveDate: true },
    });
    const xp = user?.xp ?? 0;
    const level = levelInfo(xp);

    // Count follow-ups completed today (from Activity log)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const doneToday = await prisma.activity.count({
      where: {
        userId: actor.id,
        type: { contains: 'follow-up' },
        createdAt: { gte: startOfDay },
      },
    });

    return {
      xp,
      streak: user?.streak ?? 0,
      level: level.n,
      levelName: level.name,
      levelNextXp: level.hi,
      levelPct: level.pct,
      dailyGoal: DAILY_GOAL,
      doneToday,
    };
  },
};

// ── XP award helper (called from follow-up handler) ──
export async function awardXp(userId: string, xp: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, streak: true, lastActiveDate: true },
  });
  if (!user) return;

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let streak = user.streak;
  const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;

  if (!last) {
    streak = 1;
  } else {
    const lastDay = new Date(last);
    lastDay.setHours(0, 0, 0, 0);
    if (lastDay.getTime() === today.getTime()) {
      // Already logged today — keep streak
    } else if (lastDay.getTime() === yesterday.getTime()) {
      streak += 1;
    } else {
      streak = 1;
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: { increment: xp },
      streak,
      lastActiveDate: now,
    },
  });
}

// ═══════════════════════════════════════════════════════════
// XP REWARDS — canonical amounts (from master prompt)
// ═══════════════════════════════════════════════════════════
export const XP_REWARDS = {
  'followup.complete':      10,
  'contact.phone':          15,
  'lead.interested':        20,
  'quotation.sent':         25,
  'meeting.scheduled':      30,
  'meeting.completed':      40,
  'lead.convert':          100,
} as const;

export type XpReason = keyof typeof XP_REWARDS;

/**
 * Award XP exactly once per (userId, reason, entityId).
 * Uses the Activity table as the idempotency guard — if an
 * 'xp.awarded' Activity already exists with matching title, we skip.
 */
export async function awardXpOnce(
  userId: string,
  reason: XpReason,
  entityId: string,
  organizationId: string,
): Promise<boolean> {
  const amount = XP_REWARDS[reason];
  if (!amount) return false;

  // Idempotency: encode reason+entity in title for a simple unique lookup
  const title = `xp:${reason}:${entityId}`;

  const existing = await prisma.activity.findFirst({
    where: { userId, type: 'xp.awarded', title },
  });
  if (existing) return false;

  // Award + log in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.activity.create({
      data: {
        organizationId,
        userId,
        type: 'xp.awarded',
        title,
        body: `+${amount} XP (${reason})`,
        metadata: { reason, amount, entityId },
      },
    });
  });

  // Update user XP (handles streak via awardXp)
  await awardXp(userId, amount);
  return true;
}

export const missionsServiceExtra = {
  async leaderboard(req: AuthRequest) {
    const actor = req.user!;

    // Scope: show top performers in the same organization
    const where: any = { organizationId: actor.organizationId };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        xp: true,
        streak: true,
        role: { select: { name: true } },
        team: { select: { name: true } },
      },
      orderBy: { xp: 'desc' },
      take: 10,
    });

    return users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      name: u.name,
      xp: u.xp,
      streak: u.streak,
      role: u.role.name,
      teamName: u.team?.name ?? null,
      isMe: u.id === actor.id,
    }));
  },

  async xpHistory(req: AuthRequest) {
    const actor = req.user!;
    const rows = await prisma.activity.findMany({
      where: { userId: actor.id, type: 'xp.awarded' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      reason: (r.metadata as any)?.reason ?? '',
      amount: (r.metadata as any)?.amount ?? 0,
      createdAt: r.createdAt,
    }));
  },
};
