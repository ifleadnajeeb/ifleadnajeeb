import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import {
  UnauthorizedError,
  ForbiddenError,
} from '../../shared/errors.js';

const DUMMY_HASH =
  '$2a$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN';

export async function login(
  email: string,
  password: string,
  meta: { userAgent?: string; ipAddress?: string }
) {
  const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        },
        organization: true
      }
    });

  const valid = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, DUMMY_HASH);

  if (!user || !valid) {
    if (user) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= env.LOGIN_MAX_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60_000)
            : user.lockedUntil,
        },
      });
    }
    throw new UnauthorizedError('Invalid credentials');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ForbiddenError('Account temporarily locked');
  }
  if (user.status !== 'ACTIVE') {
    throw new ForbiddenError(`Account ${user.status.toLowerCase()}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const refreshToken = crypto.randomBytes(48).toString('hex');
  const refreshHash = await bcrypt.hash(refreshToken, 10);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = jwt.sign(
    { sub: user.id, sid: session.id },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL as any }
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.key),
    },
  };
}

export async function refresh(refreshToken: string) {
  const sessions = await prisma.session.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  let matched: (typeof sessions)[number] | null = null;
  for (const s of sessions) {
    if (await bcrypt.compare(refreshToken, s.refreshHash)) {
      matched = s;
      break;
    }
  }

  if (!matched) throw new UnauthorizedError('Invalid refresh token');

  const user = await prisma.user.findUnique({
    where: { id: matched.userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedError('User invalid');
  }

  const accessToken = jwt.sign(
    { sub: user.id, sid: matched.id },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL as any }
  );

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.key),
    },
  };
}

export async function logout(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  if (!user) throw new UnauthorizedError();
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  };
}
