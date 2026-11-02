import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { attendanceService } from './attendance.service.js';

export const attendanceController = {
  async list(req: AuthRequest, res: Response) {
    // ✅ Pass req.query so mode/date work correctly
    const result = await attendanceService.list(req, req.query);
    res.json(result);
  },
  async getUserLogs(req: AuthRequest, res: Response) {
    const result = await attendanceService.getUserLogs(req, req.params.userId, req.query.date as string);
    res.json(result);
  },
  async summary(req: AuthRequest, res: Response) {
    // Dummy summary handler if the frontend calls it
    res.json({ data: [] });
  }
};
