import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';

export const attendanceService = {
  // Restored for auth module
  async startSession(userId: string, organizationId: string) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return prisma.attendance.create({
      data: {
        organizationId,
        userId,
        date,
        checkIn: now,
        lastSeenAt: now,
        status: 'PRESENT'
      }
    });
  },

  // Restored for auth module
  async endSession(userId: string, reason: string) {
    const now = new Date();
    const active = await prisma.attendance.findFirst({
      where: { userId, checkOut: null },
      orderBy: { checkIn: 'desc' }
    });
    if (active) {
      const durationSeconds = Math.floor((now.getTime() - active.checkIn.getTime()) / 1000);
      return prisma.attendance.update({
        where: { id: active.id },
        data: { checkOut: now, durationSeconds, logoutReason: reason }
      });
    }
  },

  async list(req: AuthRequest, query: any) {
    const actor = req.user!;
    const targetDate = query.date ? new Date(query.date) : new Date();
    const where: any = { organizationId: actor.organizationId };
    if (actor.role === 'BDE') where.userId = actor.id;

    if (query.mode === 'raw' || query.mode === 'daily') {
      const start = new Date(targetDate); start.setHours(0,0,0,0);
      const end = new Date(targetDate); end.setHours(23,59,59,999);
      where.date = { gte: start, lte: end };

      const logs = await prisma.attendance.findMany({
        where,
        include: { user: { select: { name: true, role: true } } },
        orderBy: { checkIn: 'desc' },
      });

      if (query.mode === 'daily') {
        const grouped = logs.reduce((acc: any, log) => {
          if (!acc[log.userId]) {
            acc[log.userId] = {
              id: log.id,
              userId: log.userId,
              user: (log as any).user, // Cast to any to bypass TS quirk
              date: log.date,
              checkIn: log.checkIn,
              checkOut: log.checkOut,
              totalHours: 0,
            };
          }
          if (log.checkIn < acc[log.userId].checkIn) acc[log.userId].checkIn = log.checkIn;
          if (log.checkOut && (!acc[log.userId].checkOut || log.checkOut > acc[log.userId].checkOut)) {
            acc[log.userId].checkOut = log.checkOut;
          }
          return acc;
        }, {});
        
        const result = Object.values(grouped).map((g: any) => {
          if (g.checkOut && g.checkIn) {
            g.totalHours = (new Date(g.checkOut).getTime() - new Date(g.checkIn).getTime()) / (1000 * 60 * 60);
          }
          return g;
        });
        return { data: result, meta: { total: result.length } };
      }
      return { data: logs, meta: { total: logs.length } };
    }

    const start = new Date(targetDate);
    if (query.mode === 'weekly') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff); start.setHours(0,0,0,0);
    } else {
      start.setDate(1); start.setHours(0,0,0,0);
    }
    const end = new Date(targetDate); end.setHours(23,59,59,999);
    where.date = { gte: start, lte: end };

    const logs = await prisma.attendance.findMany({
      where,
      include: { user: { select: { name: true, role: true } } },
    });

    const agg = logs.reduce((acc: any, log) => {
      if (!acc[log.userId]) {
        acc[log.userId] = {
          id: log.userId,
          userId: log.userId,
          user: (log as any).user, // Cast to any
          daysPresent: new Set(),
          totalHours: 0,
        };
      }
      acc[log.userId].daysPresent.add(new Date(log.date).toISOString().split('T')[0]);
      if (log.checkOut && log.checkIn) {
        acc[log.userId].totalHours += (new Date(log.checkOut).getTime() - new Date(log.checkIn).getTime()) / (1000 * 60 * 60);
      }
      return acc;
    }, {});

    const result = Object.values(agg).map((a: any) => ({
      ...a,
      daysPresent: a.daysPresent.size,
      totalHours: Math.round(a.totalHours * 10) / 10,
    }));

    return { data: result, meta: { total: result.length } };
  },

  async getUserLogs(req: AuthRequest, userId: string, date: string) {
    const actor = req.user!;
    const targetDate = new Date(date);
    const start = new Date(targetDate); start.setHours(0,0,0,0);
    const end = new Date(targetDate); end.setHours(23,59,59,999);

    const logs = await prisma.attendance.findMany({
      where: {
        organizationId: actor.organizationId,
        userId,
        date: { gte: start, lte: end },
      },
      orderBy: { checkIn: 'asc' },
    });

    return { data: logs };
  }
};
