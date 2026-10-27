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
    const { search = '', departmentId, startDate, endDate } = query;
    const where: any = { organizationId: actor.organizationId };

    // ✅ Filter by Date Range
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    // ✅ Filter by Department (Software Dev, Graphic Dev, etc.)
    if (departmentId) {
      where.task = { 
        ...where.task,
        assignedTo: { departmentId: departmentId } 
      };
    }

    // ✅ Search filtering
    if (search) {
      where.OR = [
        { workCompleted: { contains: search, mode: 'insensitive' } },
        { task: { title: { contains: search, mode: 'insensitive' } } },
        { task: { assignedTo: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      include: {
        employee: { select: { name: true, department: { select: { name: true } } } },
        task: { 
          select: { 
            id: true,
            title: true, 
            assignedTo: { select: { name: true } } 
          } 
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // Load more for the table
    });

    // Summary Calculations
    const totalHours = reports.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    const completedTasks = reports.filter(r => r.progress === 100 || r.status === 'COMPLETED').length;
    const uniqueEmployees = new Set(reports.map(r => r.employeeId)).size;

    return {
      data: reports,
      summary: { totalHours, completedTasks, uniqueEmployees, totalReports: reports.length }
    };
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
