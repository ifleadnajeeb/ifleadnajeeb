import { prisma } from '../../config/database.js';
import { AuthUser } from '../../middleware/auth.middleware.js';

export const operationsService = {
  async listProjects(actor: AuthUser) {
    return prisma.project.findMany({
      where: { organizationId: actor.organizationId },
      include: { customer: { select: { name: true } } },
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

  async listDailyReports(actor: AuthUser) {
    return prisma.dailyReport.findMany({
      where: { organizationId: actor.organizationId },
      include: { 
        task: { select: { title: true, assignedTo: { select: { name: true } } } }
      } as any,
      orderBy: { createdAt: 'desc' },
      take: 20,
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
        blockers: input.blockers,
        nextPlan: input.nextPlan,
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
