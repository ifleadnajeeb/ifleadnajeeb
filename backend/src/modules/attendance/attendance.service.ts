import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';

export const attendanceService = {
  async list(req: AuthRequest) {
    const actor = req.user!;

    // ✅ Scope: Admin/CEO/BDM/OP_MANAGER see all, others see only themselves
    let userFilter: any = { organizationId: actor.organizationId };
    if (!['ADMIN', 'CEO', 'BDM', 'OP_MANAGER'].includes(actor.role)) {
      userFilter.id = actor.id;
    }

    // ✅ Query from AuditLog. Filter via the user relation (no direct organizationId on AuditLog)
    const logs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['auth.login', 'auth.logout'] },
        user: userFilter,
      },
      include: {
        user: { select: { id: true, name: true, role: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Group by userId + date
    const recordsMap = new Map<string, any>();

    logs.forEach((log) => {
      const date = new Date(log.createdAt);
      const dateStr = date.toISOString().split('T')[0];
      const key = `${log.userId}-${dateStr}`;

      if (log.action === 'auth.login') {
        if (!recordsMap.has(key)) {
          recordsMap.set(key, {
            id: log.id,
            user: log.user,
            date,
            checkIn: date,
            checkOut: null,
            status: 'Active',
          });
        }
      } else if (log.action === 'auth.logout') {
        if (recordsMap.has(key)) {
          const record = recordsMap.get(key);
          if (!record.checkOut || date > record.checkOut) {
            record.checkOut = date;
            record.status = 'Completed';
          }
        }
      }
    });

    const data = Array.from(recordsMap.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    return { data };
  },

  async clockIn(req: AuthRequest) {
    // Manual clock-in = write an audit log entry
    const actor = req.user!;
    await prisma.auditLog.create({
      data: {
        action: 'auth.login',
        entityType: 'User',
        entityId: actor.id,
        userId: actor.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });
    return { success: true };
  },

  async clockOut(req: AuthRequest) {
    // Manual clock-out = write an audit log entry
    const actor = req.user!;
    await prisma.auditLog.create({
      data: {
        action: 'auth.logout',
        entityType: 'User',
        entityId: actor.id,
        userId: actor.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });
    return { success: true };
  },
};
