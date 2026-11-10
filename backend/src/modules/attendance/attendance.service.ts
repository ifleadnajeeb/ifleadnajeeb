import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';

async function getUserScope(actor: any) {
  if (actor.role === 'ADMIN' || actor.role === 'CEO' || actor.role === 'GM' || actor.role === 'BDM') return {};
  if (actor.role === 'BDE') return { userId: actor.id };
  const ids = [actor.id];
  const queue = [actor.id];
  while (queue.length) {
    const current = queue.shift()!;
    const children = await prisma.user.findMany({ where: { managerId: current }, select: { id: true } });
    for (const c of children) { ids.push(c.id); queue.push(c.id); }
  }
  return { userId: { in: ids } };
}

function pairSessions(logs: any[]) {
  const sessions: any[] = [];
  const openLogins: Record<string, { checkIn: Date; user: any; id: string }> = {};

  for (const log of logs) {
    const logDate = new Date(log.createdAt);
    
    if (log.action === 'auth.login') {
      const open = openLogins[log.userId!];
      if (open) {
        // Auto-close previous open session
        const autoCheckout = new Date(open.checkIn);
        // 7:00 PM IST = 13:30 UTC
        autoCheckout.setUTCHours(13, 30, 0, 0); 
        
        // If they logged in after 7 PM, close at 11:59 PM IST (18:29 UTC)
        if (open.checkIn > autoCheckout) {
          autoCheckout.setUTCHours(18, 29, 59, 999);
        }

        if (autoCheckout > open.checkIn) {
          const totalHours = (autoCheckout.getTime() - open.checkIn.getTime()) / (1000 * 60 * 60);
          sessions.push({
            id: open.id, userId: log.userId, user: open.user, date: open.checkIn,
            checkIn: open.checkIn, checkOut: autoCheckout, totalHours,
          });
        }
        delete openLogins[log.userId!];
      }
      openLogins[log.userId!] = { id: log.id, checkIn: logDate, user: log.user };
      
    } else if (log.action === 'auth.logout') {
      const open = openLogins[log.userId!];
      if (open) {
        const checkOut = new Date(log.createdAt);
        const totalHours = (checkOut.getTime() - open.checkIn.getTime()) / (1000 * 60 * 60);
        sessions.push({
          id: open.id, userId: log.userId, user: open.user, date: open.checkIn,
          checkIn: open.checkIn, checkOut, totalHours,
        });
        delete openLogins[log.userId!]; 
      }
    }
  }

  // Handle remaining active sessions at the end of the day
  const now = new Date();
  for (const [userId, open] of Object.entries(openLogins)) {
    const autoCheckout = new Date(open.checkIn);
    // 7:00 PM IST = 13:30 UTC
    autoCheckout.setUTCHours(13, 30, 0, 0); 
    
    if (open.checkIn > autoCheckout) {
      autoCheckout.setUTCHours(18, 29, 59, 999);
    }

    if (now > autoCheckout && autoCheckout > open.checkIn) {
       const totalHours = (autoCheckout.getTime() - open.checkIn.getTime()) / (1000 * 60 * 60);
       sessions.push({
         id: open.id, userId, user: open.user, date: open.checkIn,
         checkIn: open.checkIn, checkOut: autoCheckout, totalHours,
       });
    } else {
       sessions.push({
         id: open.id, userId, user: open.user, date: open.checkIn,
         checkIn: open.checkIn, checkOut: null, totalHours: 0,
       });
    }
  }

  return sessions;
}

export const attendanceService = {
  async startSession(userId: string, organizationId: string) { return null; },
  async endSession(userId: string, action: string) { return null; },
  async summary() { return { data: [] }; },

  async list(req: AuthRequest, query: any) {
    const actor = req.user!;
    const targetDate = query.date ? new Date(query.date) : new Date();
    
    let start: Date, end: Date;
    if (query.mode === 'weekly') {
      const day = targetDate.getDay();
      const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(targetDate); start.setDate(diff); start.setHours(0, 0, 0, 0);
      end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
    } else if (query.mode === 'monthly') {
      start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      start = new Date(targetDate); start.setHours(0, 0, 0, 0);
      end = new Date(targetDate); end.setHours(23, 59, 59, 999);
    }

    const lookbackStart = new Date(start);
    lookbackStart.setDate(lookbackStart.getDate() - 1);

    const userScope = await getUserScope(actor);
    const logs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['auth.login', 'auth.logout'] },
        createdAt: { gte: lookbackStart, lte: end },
        user: { organizationId: actor.organizationId },
        ...userScope
      },
      include: { user: { select: { name: true, role: { select: { name: true } } } } },
      orderBy: { createdAt: 'asc' }
    });

    const sessions = pairSessions(logs);

    if (query.mode === 'daily') {
      const todaySessions = sessions.filter(s => {
        const sEnd = s.checkOut ? s.checkOut.getTime() : end.getTime();
        return s.checkIn.getTime() <= end.getTime() && sEnd >= start.getTime();
      });

      const groupedByUser: Record<string, any> = {};
      for (const session of todaySessions) {
        if (!groupedByUser[session.userId]) {
          groupedByUser[session.userId] = {
            id: session.userId, userId: session.userId, user: session.user,
            date: session.checkIn, totalHours: 0, allSessions: []
          };
        }
        groupedByUser[session.userId].allSessions.push(session);
        groupedByUser[session.userId].totalHours += session.totalHours;
      }
      
      const dailyResult = Object.values(groupedByUser).map((u: any) => {
        u.allSessions.sort((a: any, b: any) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
        
        const firstLogin = u.allSessions[0].checkIn;
        const closedSessions = u.allSessions.filter((s: any) => s.checkOut);
        const lastLogout = closedSessions.length > 0 ? closedSessions[closedSessions.length - 1].checkOut : null;
        const hasActiveSession = !u.allSessions[u.allSessions.length - 1].checkOut;
        
        const breaks: { start: Date; end: Date }[] = [];
        let totalBreakMinutes = 0;
        
        for (let i = 0; i < u.allSessions.length - 1; i++) {
          const current = u.allSessions[i];
          const next = u.allSessions[i+1];
          if (current.checkOut && next.checkIn) {
            const gapMinutes = (new Date(next.checkIn).getTime() - new Date(current.checkOut).getTime()) / (1000 * 60);
            if (gapMinutes > 20) { 
              breaks.push({ start: current.checkOut, end: next.checkIn });
              totalBreakMinutes += gapMinutes;
            }
          }
        }

        return {
          ...u,
          firstLogin,
          lastLogout: hasActiveSession ? null : lastLogout,
          hasActiveSession,
          totalHours: Math.round(u.totalHours * 10) / 10,
          breaks,
          totalBreakHours: Math.round((totalBreakMinutes / 60) * 10) / 10
        };
      });

      return { data: dailyResult, meta: { total: dailyResult.length } };
    }

    const grouped: Record<string, any> = {};
    for (const session of sessions) {
      if (!grouped[session.userId]) {
        grouped[session.userId] = { id: session.userId, userId: session.userId, user: session.user, daysPresent: new Set(), totalHours: 0 };
      }
      const g = grouped[session.userId];
      g.daysPresent.add(new Date(session.checkIn).toISOString().split('T')[0]);
      g.totalHours += session.totalHours;
    }

    const result = Object.values(grouped).map((g: any) => ({
      ...g, daysPresent: g.daysPresent.size, totalHours: Math.round(g.totalHours * 10) / 10
    }));

    return { data: result, meta: { total: result.length } };
  },

  async getUserLogs(req: AuthRequest, userId: string, date: string) {
    const actor = req.user!;
    const targetDate = new Date(date);
    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate); end.setHours(23, 59, 59, 999);

    const lookbackStart = new Date(start);
    lookbackStart.setDate(lookbackStart.getDate() - 1);

    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        action: { in: ['auth.login', 'auth.logout'] },
        createdAt: { gte: lookbackStart, lte: end },
        user: { organizationId: actor.organizationId }
      },
      include: { user: { select: { name: true, role: { select: { name: true } } } } },
      orderBy: { createdAt: 'asc' }
    });

    const sessions = pairSessions(logs)
      .filter(s => {
        const sEnd = s.checkOut ? s.checkOut.getTime() : end.getTime();
        return s.checkIn.getTime() <= end.getTime() && sEnd >= start.getTime();
      })
      .sort((a: any, b: any) => a.checkIn.getTime() - b.checkIn.getTime());

    return { data: sessions };
  }
};
