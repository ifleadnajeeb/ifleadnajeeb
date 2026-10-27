import { prisma } from '../../config/database.js';
import { AuthUser } from '../../middleware/auth.middleware.js';

export const operationsService = {
  async getAnalytics(actor: AuthUser) {
    const departments = await prisma.department.findMany({ where: { organizationId: actor.organizationId } });
    const tasks = await prisma.task.findMany({ 
      where: { organizationId: actor.organizationId },
      include: { dailyReports: { select: { timeSpent: true } } }
    });

    return departments.map(d => {
      const deptTasks = tasks.filter(t => t.departmentId === d.id);
      const active = deptTasks.filter(t => ['TODO', 'IN_PROGRESS'].includes(t.status)).length;
      const completed = deptTasks.filter(t => t.status === 'DONE').length;
      const totalHours = deptTasks.reduce((sum, t) => {
        return sum + (t.dailyReports?.reduce((s, r) => s + (r.timeSpent || 0), 0) || 0);
      }, 0);

      return {
        id: d.id,
        name: d.name,
        activeTasks: active,
        completedTasks: completed,
        totalHours: Math.round(totalHours * 10) / 10,
      };
    });
  },

  async listProjects(actor: AuthUser) {
    return prisma.project.findMany({
      where: { organizationId: actor.organizationId },
      include: { 
        customer: { select: { name: true } },
        tasks: { select: { id: true, status: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createProject(actor: AuthUser, input: any) {
    return prisma.project.create({
      data: {
        organizationId: actor.organizationId,
        name: input.name,
        description: input.description,
        customerId: input.customerId,
        status: input.status,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
    });
  },

  async listDepartments(actor: AuthUser) {
    return prisma.department.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { name: 'asc' },
    });
  },

  async listDailyReports(actor: AuthUser, query: any = {}) {
    const { timeframe = 'all', search = '' } = query;
    const where: any = { organizationId: actor.organizationId };

    // ✅ Bulletproof date filtering
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (timeframe === 'today') {
      where.createdAt = { gte: startOfToday };
    } else if (timeframe === 'week') {
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      where.createdAt = { gte: startOfWeek };
    } else if (timeframe === 'month') {
      const startOfMonth = new Date(startOfToday);
      startOfMonth.setMonth(startOfMonth.getMonth() - 1);
      where.createdAt = { gte: startOfMonth };
    }

    // ✅ Search filtering
    if (search) {
      where.OR = [
        { workCompleted: { contains: search, mode: 'insensitive' } },
        { task: { title: { contains: search, mode: 'insensitive' } } },
        { task: { assignedTo: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    return prisma.dailyReport.findMany({
      where,
      include: {
        task: { select: { title: true, assignedTo: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },

  async createDailyReport(actor: AuthUser, input: any) {
    return prisma.dailyReport.create({
      data: {
        organizationId: actor.organizationId,
        employeeId: actor.id,
        taskId: input.taskId,
        workCompleted: input.workCompleted,
        timeSpent: input.timeSpent,
        progress: input.progress,
        blockers: input.blockers,
        workStatus: input.workStatus || 'In Progress', // ✅ New
        nextDayPlan: input.nextDayPlan,                 // ✅ New
        attachments: input.attachments || [],           // ✅ New
      },
    });
  },

  async createDepartment(actor: AuthUser, input: any) {
    return prisma.department.create({
      data: {
        organizationId: actor.organizationId,
        name: input.name,
        description: input.description,
      },
    });
  }
};
