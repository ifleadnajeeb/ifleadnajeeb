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
