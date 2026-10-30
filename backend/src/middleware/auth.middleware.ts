import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../shared/errors.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roleLevel: number;
  organizationId: string;
  teamId?: string;
  managerId?: string;
  permissions: Set<string>;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  sessionId?: string;
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
  const token = req.cookies?.access_token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (!token) throw new UnauthorizedError('No token');

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      sub: string;
      sid: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    if (!user) throw new UnauthorizedError('User not found');

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError(`Account ${user.status.toLowerCase()}`);
    }

    const session = await prisma.session.findUnique({
      where: { id: payload.sid },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session expired');
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      roleLevel: user.role.level,
      organizationId: user.organizationId,
      teamId: user.teamId ?? undefined,
      managerId: user.managerId ?? undefined,
      permissions: new Set(
        user.role.permissions.map((rp) => rp.permission.key)
      ),
    };
    req.sessionId = session.id;

    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Invalid token'));
    }
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Token expired'));
    }
    next(err);
  }
}
