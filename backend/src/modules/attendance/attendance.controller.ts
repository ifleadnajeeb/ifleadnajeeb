import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { attendanceService } from './attendance.service.js';

export const attendanceController = {
  async list(req: AuthRequest, res: Response) {
    res.json(await attendanceService.list(req));
  },
  async clockOut(req: AuthRequest, res: Response) {
    res.json(await attendanceService.clockOut(req));
  }
};
