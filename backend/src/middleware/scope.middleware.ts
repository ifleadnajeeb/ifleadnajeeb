import { prisma } from '../config/database.js';
import { AuthRequest } from './auth.middleware.js';

export interface ScopeFilter {
  where: Record<string, any>;
}

export async function buildScopeFilter(
  req: AuthRequest
): Promise<ScopeFilter> {
  const user = req.user!;

  switch (user.role) {
    case 'ADMIN':
      return { where: {} };

    case 'CEO':
    case 'OP_MANAGER':
      return { where: { organizationId: user.organizationId } };

    case 'BDM': {
      const ids = await getDescendantUserIds(user.id);
      return {
        where: {
          organizationId: user.organizationId,
          assignedToId: { in: ids },
        },
      };
    }

    case 'SALES_HEAD': {
      if (!user.teamId) {
        return { where: { assignedToId: user.id } };
      }
      const members = await prisma.user.findMany({
        where: {
          teamId: user.teamId,
          organizationId: user.organizationId,
        },
        select: { id: true },
      });
      return {
        where: {
          organizationId: user.organizationId,
          assignedToId: { in: [user.id, ...members.map((m) => m.id)] },
        },
      };
    }

    case 'BDE':
    default:
      return {
        where: {
          organizationId: user.organizationId,
          assignedToId: user.id,
        },
      };
  }
}

async function getDescendantUserIds(rootId: string): Promise<string[]> {
  const result: string[] = [rootId];
  const queue: string[] = [rootId];

  while (queue.length) {
    const current = queue.shift()!;
    const children = await prisma.user.findMany({
      where: { managerId: current },
      select: { id: true },
    });
    for (const c of children) {
      result.push(c.id);
      queue.push(c.id);
    }
  }
  return result;
}
