import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';

export const attendanceService = {
  async list(req: AuthRequest) {
    const actor = req.user!;
    
    // ✅ Admin, CEO, BDM, OP_MANAGER see everyone. Others see only themselves.
    const where: any = { organizationId: actor.organizationId };
    if (!['ADMIN', 'CEO', 'BDM', 'OP_MANAGER'].includes(actor.role)) {
      where.userId = actor.id;
    }

    // Fetch login and logout events from AuditLog
    const logs = await prisma.auditLog.findMany({
      where: {
        ...where,
        action: { in: ['auth.login', 'auth.logout'] }
      },
      include: {
        user: { select: { name: true, role: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Group into a map by user and date to pair logins with logouts
    const recordsMap = new Map<string, any>();

    logs.forEach(log => {
      const date = new Date(log.createdAt);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `${log.userId}-${dateStr}`;

      if (log.action === 'auth.login') {
        if (!recordsMap.has(key)) {
          recordsMap.set(key, {
            id: log.id,
            user: log.user,
            date: date,
            checkIn: date,
            checkOut: null,
            status: 'Active'
          });
        }
      } else if (log.action === 'auth.logout') {
        if (recordsMap.has(key)) {
          const record = recordsMap.get(key);
          // Only set checkout if it's the last logout of the day
          if (!record.checkOut || date > record.checkOut) {
            record.checkOut = date;
            record.status = 'Completed';
          }
        }
      }
    });

    // Convert map to array and sort by date descending
    const data = Array.from(recordsMap.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    return { data };
  },

  async clockIn(req: AuthRequest) {
    // Optional manual clock-in endpoint if they still want the buttons
    const actor = req.user!;
    await prisma.auditLog.create({
      data: {
        action: 'auth.login',
        entityType: 'User',
        entityId: actor.id,
        organizationId: actor.organizationId,
        userId: actor.id,
      }
    });
    return { success: true };
  },

  async clockOut(req: AuthRequest) {
    // Optional manual clock-out endpoint
    const actor = req.user!;
    await prisma.auditLog.create({
      data: {
        action: 'auth.logout',
        entityType: 'User',
        entityId: actor.id,
        organizationId: actor.organizationId,
        userId: actor.id,
      }
    });
    return { success: true };
  }
};
