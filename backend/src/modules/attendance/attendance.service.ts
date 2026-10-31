import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';

export const attendanceService = {
  async list(req: AuthRequest) {
    const user = req.user!;
    const scope = (user.role === 'ADMIN' || user.role === 'CEO' || user.role === 'GM') 
      ? { organizationId: user.organizationId }
      : { userId: user.id };
      
    return prisma.attendance.findMany({
      where: scope,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { checkIn: 'desc' },
    });
  },

  async clockIn(req: AuthRequest) {
    const user = req.user!;
    const existing = await prisma.attendance.findFirst({
      where: { userId: user.id, checkOut: null },
    });
    if (existing) return existing;
    
    return prisma.attendance.create({
      data: { checkIn: new Date(), organizationId: user.organizationId, user: { connect: { id: user.id } } },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
  },

  async clockOut(req: AuthRequest) {
    const user = req.user!;
    const record = await prisma.attendance.findFirst({
      where: { userId: user.id, checkOut: null },
      orderBy: { checkIn: 'desc' },
    });
    if (!record) throw new Error('No active clock-in found');
    
    let checkOutTime = new Date();
    if (checkOutTime.getTime() < record.checkIn.getTime()) {
      checkOutTime = new Date(record.checkIn.getTime() + 60000);
    }

    return prisma.attendance.update({
      where: { id: record.id },
      data: { checkOut: checkOutTime },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
  },

  async summary(req: AuthRequest, period: string) {
    const orgId = req.user!.organizationId;
    const now = new Date();
    let startDate = new Date();

    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate = new Date(0);
    }

    const records = await prisma.attendance.findMany({
      where: {
        user: { organizationId: orgId },
        checkIn: { gte: startDate }
      },
      include: {
        user: { select: { id: true, name: true, role: true } }
      }
    });

    const grouped: Record<string, any> = {};

    records.forEach((r) => {
      if (!grouped[r.userId]) {
        grouped[r.userId] = {
          user: r.user,
          totalMs: 0,
          daysWorked: new Set(),
        };
      }
      
      grouped[r.userId].daysWorked.add(r.checkIn.toDateString());

      if (r.checkOut) {
        const diff = r.checkOut.getTime() - r.checkIn.getTime();
        if (diff > 0) {
          grouped[r.userId].totalMs += diff;
        }
      }
    });

    return Object.values(grouped).map((g: any) => ({
      userId: g.user.id,
      name: g.user.name,
      role: g.user.role,
      totalHours: Number((g.totalMs / (1000 * 60 * 60)).toFixed(2)),
      daysWorked: g.daysWorked.size,
    })).sort((a, b) => b.totalHours - a.totalHours);
  }
};
