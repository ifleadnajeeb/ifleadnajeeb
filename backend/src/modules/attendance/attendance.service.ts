import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';

export const attendanceService = {
  async list(req: AuthRequest) {
    const actor = req.user!;
    
    // If Admin/CEO, show everyone. Otherwise, only show the user's own logs.
    const where: any = { organizationId: actor.organizationId };
    if (!['ADMIN', 'CEO', 'OP_MANAGER'].includes(actor.role)) {
      where.userId = actor.id;
    }

    const records = await prisma.attendance.findMany({
      where,
      include: { user: { select: { name: true, role: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
      take: 50,
    });

    return { data: records };
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
