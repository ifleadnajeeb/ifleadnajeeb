import bcrypt from 'bcryptjs';
import { Prisma, RoleName, UserStatus } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AuthUser } from '../../middleware/auth.middleware.js';

const CAN_CREATE: Record<RoleName, RoleName[]> = {
  ADMIN: ['CEO', 'BDM', 'SALES_HEAD', 'BDE', 'OP_MANAGER', 'WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'],
  CEO:   ['BDM', 'SALES_HEAD', 'BDE', 'OP_MANAGER', 'WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'],
  BDM:   ['SALES_HEAD', 'BDE', 'OP_MANAGER', 'WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'],
  SALES_HEAD: ['BDE'],
  BDE: [],
  OP_MANAGER: ['WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'],
  WEB_DEVELOPER: [],
  SOFTWARE_DEVELOPER: [],
  DIGITAL_MARKETER: [],
  CONTENT_CREATOR: [],
  VIDEO_EDITOR: [],
};

const CAN_MANAGE: Record<RoleName, RoleName[]> = {
  ADMIN: ['CEO', 'BDM', 'SALES_HEAD', 'BDE', 'OP_MANAGER', 'WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'],
  CEO:   ['BDM', 'SALES_HEAD', 'BDE', 'OP_MANAGER', 'WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'],
  BDM:   ['SALES_HEAD', 'BDE', 'OP_MANAGER', 'WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'],
  SALES_HEAD: ['BDE'],
  BDE: [],
  OP_MANAGER: ['WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'],
  WEB_DEVELOPER: [],
  SOFTWARE_DEVELOPER: [],
  DIGITAL_MARKETER: [],
  CONTENT_CREATOR: [],
  VIDEO_EDITOR: [],
};

function toDTO(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    status: u.status,
    role: u.role.name,
    roleLevel: u.role.level,
    teamId: u.teamId,
    teamName: u.team?.name ?? null,
    managerId: u.managerId ?? null,
    managerName: u.manager?.name ?? null,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

export const userService = {
  async create(actor: AuthUser, input: any) {
    const allowed = CAN_CREATE[actor.role as RoleName] ?? [];
    if (!allowed.includes(input.role)) {
      throw new Error(`${actor.role} cannot create ${input.role}`);
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new Error('Email already in use');

    const role = await prisma.role.findUnique({ where: { name: input.role } });
    if (!role) throw new Error('Invalid role');

    const passwordHash = await bcrypt.hash(input.password, 12);

    const created = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        status: UserStatus.ACTIVE,
        organizationId: actor.organizationId,
        roleId: role.id,
        managerId: input.managerId ?? actor.id,
        teamId: input.teamId ?? null,
      },
      include: { role: true, team: true, manager: true },
    });

    return toDTO(created);
  },

  async list(actor: AuthUser, query: any) {
    const where: any = { organizationId: actor.organizationId };

    // Scope based on role
    if (actor.role === 'BDE') {
      where.id = actor.id;
    } else if (actor.role === 'SALES_HEAD') {
      where.OR = [
        { id: actor.id },
        { teamId: actor.teamId ?? '__none__' },
      ];
    } else if (actor.role === 'BDM') {
      const ids = await collectDescendants(actor.id);
      where.id = { in: [actor.id, ...ids] };
    }

    if (query.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }
    if (query.role) {
      where.role = { name: query.role };
    }
    if (query.status) where.status = query.status;

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { role: true, team: true, manager: true },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: data.map(toDTO),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async update(actor: AuthUser, id: string, input: any) {
    const target = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!target) throw new Error('User not found');
    if (target.organizationId !== actor.organizationId) {
      throw new Error('Cross-organization access denied');
    }
    if (actor.role !== 'ADMIN') {
      const allowed = CAN_MANAGE[actor.role as RoleName] ?? [];
      if (!allowed.includes(target.role.name)) {
        throw new Error(`Cannot manage ${target.role.name}`);
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        phone: input.phone,
        status: input.status,
      },
      include: { role: true, team: true, manager: true },
    });

    return toDTO(updated);
  },

  async deactivate(actor: AuthUser, id: string) {
    if (id === actor.id) throw new Error('Cannot deactivate yourself');
    const target = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!target) throw new Error('User not found');
    if (target.organizationId !== actor.organizationId) {
      throw new Error('Cross-organization access denied');
    }
    if (actor.role !== 'ADMIN') {
      const allowed = CAN_MANAGE[actor.role as RoleName] ?? [];
      if (!allowed.includes(target.role.name)) {
        throw new Error(`Cannot manage ${target.role.name}`);
      }
    }
    await prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
    });
  },

  async remove(actor: AuthUser, id: string) {
    if (id === actor.id) throw new Error('Cannot delete yourself');

    const target = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!target) throw new Error('User not found');
    if (target.organizationId !== actor.organizationId) {
      throw new Error('Cross-organization access denied');
    }

    // Nobody can delete an ADMIN (including other admins)
    if (target.role.name === 'ADMIN') {
      throw new Error('Cannot delete an ADMIN');
    }

    // Hierarchy check — same rules as deactivate
    if (actor.role !== 'ADMIN') {
      const allowed = CAN_MANAGE[actor.role as RoleName] ?? [];
      if (!allowed.includes(target.role.name)) {
        throw new Error(`Cannot manage ${target.role.name}`);
      }
    }

    // Reassign direct reports so they don't become orphaned
    await prisma.user.updateMany({
      where: { managerId: id },
      data: { managerId: actor.id },
    });

    // Delete in a transaction so FK cascades run cleanly
    await prisma.$transaction([
      // Null out lead assignments so we don't lose leads
      prisma.lead.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      }),
      // Remove the user
      prisma.user.delete({ where: { id } }),
    ]);
  },

  canCreate(actorRole: string): RoleName[] {
    return CAN_CREATE[actorRole as RoleName] ?? [];
  },
  async bookable(actor: AuthUser, q: any) {
    const page = Number(q.page ?? 1);
    const pageSize = Math.min(Number(q.pageSize ?? 100), 200);
    const where: any = {
      organizationId: actor.organizationId,
      status: 'ACTIVE',
    };
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          role: { select: { name: true } },
          team: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    return {
      data: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        role: u.role?.name,
        teamId: u.team?.id ?? null,
        teamName: u.team?.name ?? null,
        managerId: u.manager?.id ?? null,
        managerName: u.manager?.name ?? null,
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

};

async function collectDescendants(rootId: string): Promise<string[]> {
  const ids: string[] = [];
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift()!;
    const children = await prisma.user.findMany({
      where: { managerId: current },
      select: { id: true },
    });
    for (const c of children) {
      ids.push(c.id);
      queue.push(c.id);
    }
  }
  return ids;
}
