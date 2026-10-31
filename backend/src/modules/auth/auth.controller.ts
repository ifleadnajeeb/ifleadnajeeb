import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import * as service from './auth.service.js';
import { appConfig } from '../../config/app-config.js';
import { prisma } from '../../config/database.js';
import { attendanceService } from '../attendance/attendance.service.js';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const result = await service.login(email, password, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  prisma.auditLog.create({
    data: {
      userId: result.user.id,
      action: 'auth.login',
      entityType: 'Session',
      metadata: { email: result.user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  }).catch((e) => console.error('[audit.login]', e));

  res.cookie('access_token', result.accessToken, {
    ...appConfig.cookieOptions,
    maxAge: appConfig.accessTokenTtlMs,
  });
  res.cookie('refresh_token', result.refreshToken, {
    ...appConfig.cookieOptions,
    maxAge: appConfig.refreshTokenTtlMs,
    path: '/',
  });

  res.json({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
}

export async function refresh(req: Request, res: Response) {
  // ✅ Accept token from cookie OR request body
  const token = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const result = await service.refresh(token);
  res.cookie('access_token', result.accessToken, {
    ...appConfig.cookieOptions,
    maxAge: appConfig.accessTokenTtlMs,
  });
  res.json({ user: result.user });
}

export async function logout(req: AuthRequest, res: Response) {
  // ✅ AUTO CLOCK-OUT
  if (req.user) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.attendance.updateMany({
        where: { userId: req.user.id, checkOut: null, date: { gte: today } },
        data: { checkOut: new Date() }
      });
    } catch (e) {
      console.error('Failed to auto clock out', e);
    }
  }

  if (req.user) {
    prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'auth.logout',
        entityType: 'Session',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    }).catch((e) => console.error('[audit.logout]', e));
  }

  // ✅ AUTOMATIC ATTENDANCE TRACKING (LOGOUT)
  if (req.user) {
    await attendanceService.endSession(req.user.id, 'USER_LOGOUT').catch(console.error);
  }

  if (req.sessionId) await service.logout(req.sessionId);
  res.clearCookie('access_token', appConfig.cookieOptions);
  res.clearCookie('refresh_token', {
    ...appConfig.cookieOptions,
    path: '/',
  });
  res.json({ ok: true });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await service.me(req.user!.id);
  res.json(user);
}
