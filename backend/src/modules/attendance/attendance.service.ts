import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';

export const attendanceService = {
  async list(req: AuthRequest) {
    const actor = req.user!;
    
    // ✅ Admin, CEO, BDM, and OP Manager see EVERYONE. Others see only themselves.
    const where: any = { organizationId: actor.organizationId };
    if (!['ADMIN', 'CEO', 'BDM', 'OP_MANAGER'].includes(actor.role)) {
      where.userId = actor.id;
    }

    const records = await prisma.attendance.findMany({
      where,
      include: { 
        user: { 
          select: { name: true, email: true, role: { select: { name: true } } } 
        } 
      },
      orderBy: { checkIn: 'desc' }, // Newest first
      take: 100,
    });

    return { data: records };
  },

  async clockIn(req: AuthRequest) {
    const actor = req.user!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findFirst({
      where: { userId: actor.id, date: { gte: today } }
    });

    if (!existing) {
      await prisma.attendance.create({
        data: {
          userId: actor.id,
          organizationId: actor.organizationId,
          date: new Date(),
          checkIn: new Date(),
        }
      });
    }
    return { success: true };
  },

  async clockOut(req: AuthRequest) {
    const actor = req.user!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.attendance.updateMany({
      where: { userId: actor.id, checkOut: null, date: { gte: today } },
      data: { checkOut: new Date() }
    });

    return { success: true };
  }
};
