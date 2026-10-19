import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { NotFoundError } from '../../shared/errors.js';
import type { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from './task.schema.js';

async function scopeFor(req: AuthRequest): Promise<any> {
  const u = req.user!;
  if (u.role === 'ADMIN') return {};
  if (u.role === 'CEO' || u.role === 'OP_MANAGER') return { organizationId: u.organizationId };
  if (u.role === 'BDM') {
    const ids = await collectDesc(u.id);
    return { organizationId: u.organizationId, assignedToId: { in: ids } };
  }
  if (u.role === 'SALES_HEAD') {
    if (!u.teamId) return { assignedToId: u.id };
    const mem = await prisma.user.findMany({
      where: { teamId: u.teamId, organizationId: u.organizationId },
      select: { id: true },
    });
    return { organizationId: u.organizationId, assignedToId: { in: [u.id, ...mem.map(m => m.id)] } };
  }
  return { organizationId: u.organizationId, assignedToId: u.id };
}

async function collectDesc(root: string): Promise<string[]> {
  const out = [root]; const q = [root];
  while (q.length) {
    const cur = q.shift()!;
    const ch = await prisma.user.findMany({ where: { managerId: cur }, select: { id: true } });
    for (const c of ch) { out.push(c.id); q.push(c.id); }
  }
  return out;
}

function toDTO(t: any) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt,
    reminderAt: t.reminderAt,
    completedAt: t.completedAt,
    assignedTo: t.assignedTo,
    createdBy: t.createdBy,
    createdAt: t.createdAt,
  };
}

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;

export const taskService = {
  async submitForReview(req: AuthRequest, id: string, deliverableUrl?: string) {
    const task = await prisma.task.update({
      where: { id },
      data: { status: 'DONE', reviewStatus: 'PENDING_REVIEW', deliverableUrl },
    });

    // Notify the task creator (usually OP Manager)
    if (task.createdById && task.createdById !== req.user!.id) {
      await prisma.notification.create({
        data: {
          organizationId: req.user!.organizationId,
          userId: task.createdById,
          type: 'review_pending',
          title: 'Work Submitted for Review',
          body: `${req.user!.name} submitted "${task.title}" for review.`,
          data: { taskId: task.id },
        }
      });
    }
    return task;
  },

  async approveTask(req: AuthRequest, id: string) {
    const task = await prisma.task.update({
      where: { id },
      data: { reviewStatus: 'APPROVED' },
    });

    if (task.assignedToId) {
      await prisma.notification.create({
        data: {
          organizationId: req.user!.organizationId,
          userId: task.assignedToId,
          type: 'task_approved',
          title: 'Work Approved',
          body: `Your work on "${task.title}" was approved! 🎉`,
          data: { taskId: task.id },
        }
      });
    }
    return task;
  },

  async requestCorrection(req: AuthRequest, id: string, reason: string) {
    const task = await prisma.task.update({
      where: { id },
      data: { reviewStatus: 'CORRECTION_REQUESTED', status: 'IN_PROGRESS', rejectionReason: reason },
    });

    if (task.assignedToId) {
      await prisma.notification.create({
        data: {
          organizationId: req.user!.organizationId,
          userId: task.assignedToId,
          type: 'correction_requested',
          title: 'Correction Needed',
          body: `Your work on "${task.title}" needs correction: ${reason}`,
          data: { taskId: task.id },
        }
      });
    }
    return task;
  },

  async acceptTask(req: AuthRequest, id: string) {
    return prisma.task.update({
      where: { id },
      data: { acceptance: 'ACCEPTED' },
    });
  },

  async rejectTask(req: AuthRequest, id: string, reason: string) {
    return prisma.task.update({
      where: { id },
      data: { acceptance: 'REJECTED', rejectionReason: reason },
    });
  },

  async list(req: AuthRequest, q: ListTasksQuery) {
    const scope = await scopeFor(req);
    const where: any = { ...scope };
    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.assignedToId) where.assignedToId = q.assignedToId;
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
        skip: q.view === 'kanban' ? 0 : (q.page - 1) * q.pageSize,
        take: q.view === 'kanban' ? 200 : q.pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    // Kanban: group by status
    if (q.view === 'kanban') {
      const columns: Record<string, any[]> = { TODO: [], IN_PROGRESS: [], DONE: [], CANCELLED: [] };
      data.forEach(t => {
        if (columns[t.status]) columns[t.status].push(toDTO(t));
      });
      return {
        columns,
        meta: { total },
      };
    }

    return {
      data: data.map(toDTO),
      meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) },
    };
  },

  async create(req: AuthRequest, input: CreateTaskInput) {
    const actor = req.user!;
    const created = await prisma.task.create({
      data: {
        organizationId: actor.organizationId,
        title: input.title,
        description: input.description,
        status: input.status ?? 'TODO',
        priority: input.priority ?? 'MEDIUM',
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        reminderAt: (input as any).reminderAt ? new Date((input as any).reminderAt) : null,
        assignedToId: input.assignedToId ?? actor.id,
        createdById: actor.id,
        projectId: input.projectId,
        departmentId: input.departmentId,
        customerId: input.customerId,
        acceptance: (input.projectId || input.departmentId) ? 'PENDING' : 'ACCEPTED',
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return toDTO(created);
  },

  async update(req: AuthRequest, id: string, input: UpdateTaskInput) {
    const scope = await scopeFor(req);
    const existing = await prisma.task.findFirst({ where: { id, ...scope } });
    if (!existing) throw new NotFoundError('Task not found');

    const data: any = { ...input };
    if (input.dueAt !== undefined) data.dueAt = input.dueAt ? new Date(input.dueAt) : null;
    if ((input as any).reminderAt !== undefined) {
      data.reminderAt = (input as any).reminderAt ? new Date((input as any).reminderAt) : null;
      data.reminderFiredAt = null;
    }
    if (input.status === 'DONE' && existing.status !== 'DONE') {
      data.completedAt = new Date();
    }
    if (input.status && input.status !== 'DONE') {
      data.completedAt = null;
    }

    const updated = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Auto-update project status if all tasks are done
    if (updated.projectId) {
      const projectTasks = await prisma.task.findMany({ where: { projectId: updated.projectId } });
      const allDone = projectTasks.length > 0 && projectTasks.every((t: any) => t.status === 'DONE' || t.status === 'CANCELLED');
      
      if (allDone) {
        await prisma.project.update({ where: { id: updated.projectId }, data: { status: 'COMPLETED' } });
      } else {
        await prisma.project.update({ where: { id: updated.projectId }, data: { status: 'IN_PROGRESS' } });
      }
    }

    return toDTO(updated);
  },

  async move(req: AuthRequest, id: string, status: string) {
    return this.update(req, id, { status: status as any });
  },

  async remove(req: AuthRequest, id: string) {
    const scope = await scopeFor(req);
    const existing = await prisma.task.findFirst({ where: { id, ...scope } });
    if (!existing) throw new NotFoundError('Task not found');
    await prisma.task.delete({ where: { id } });
  },

  async dueReminders(req: AuthRequest) {
    const scope = await scopeFor(req);
    const now = new Date();
    const list = await prisma.task.findMany({
      where: {
        ...scope,
        reminderAt: { lte: now },
        reminderFiredAt: null,
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { reminderAt: 'asc' },
      take: 20,
    });
    return list.map((t: any) => toDTO(t));
  },

  async markReminderFired(req: AuthRequest, id: string) {
    const scope = await scopeFor(req);
    const t = await prisma.task.findFirst({ where: { id, ...scope } });
    if (!t) throw new NotFoundError('Task not found');
    await prisma.task.update({
      where: { id },
      data: { reminderFiredAt: new Date() },
    });
    return { ok: true };
  },

  async detail(req: AuthRequest, id: string) {
    const scope = await scopeFor(req);
    const t = await prisma.task.findFirst({
      where: { id, ...scope },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true } } },
        },
        checklist: { orderBy: { order: 'asc' } },
      },
    });
    if (!t) throw new NotFoundError('Task not found');
    return {
      ...toDTO(t),
      comments: ((t as any).comments || []).map((c: any) => ({
        id: c.id, body: c.body, createdAt: c.createdAt, user: c.user,
      })),
      checklist: ((t as any).checklist || []).map((i: any) => ({
        id: i.id, text: i.text, done: i.done, order: i.order,
      })),
    };
  },

  async addComment(req: AuthRequest, taskId: string, body: string) {
    const scope = await scopeFor(req);
    const t = await prisma.task.findFirst({ where: { id: taskId, ...scope } });
    if (!t) throw new NotFoundError('Task not found');
    const actor = req.user!;
    const c = await prisma.taskComment.create({
      data: { taskId, userId: actor.id, body },
      include: { user: { select: { id: true, name: true } } },
    });
    return { id: c.id, body: c.body, createdAt: c.createdAt, user: c.user };
  },

  async addChecklistItem(req: AuthRequest, taskId: string, text: string) {
    const scope = await scopeFor(req);
    const t = await prisma.task.findFirst({ where: { id: taskId, ...scope } });
    if (!t) throw new NotFoundError('Task not found');
    const count = await prisma.taskChecklistItem.count({ where: { taskId } });
    const item = await prisma.taskChecklistItem.create({
      data: { taskId, text, order: count },
    });
    return { id: item.id, text: item.text, done: item.done, order: item.order };
  },

  async toggleChecklistItem(req: AuthRequest, itemId: string, done: boolean) {
    const item = await prisma.taskChecklistItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundError('Checklist item not found');
    const scope = await scopeFor(req);
    const t = await prisma.task.findFirst({ where: { id: item.taskId, ...scope } });
    if (!t) throw new NotFoundError('Not in your scope');
    const updated = await prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: { done },
    });
    return { id: updated.id, text: updated.text, done: updated.done, order: updated.order };
  },

  async deleteChecklistItem(req: AuthRequest, itemId: string) {
    const item = await prisma.taskChecklistItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundError('Checklist item not found');
    const scope = await scopeFor(req);
    const t = await prisma.task.findFirst({ where: { id: item.taskId, ...scope } });
    if (!t) throw new NotFoundError('Not in your scope');
    await prisma.taskChecklistItem.delete({ where: { id: itemId } });
  },
};

export const TASK_STATUSES = STATUSES;
