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

router.get('/summary', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const period = req.query.period as string || 'monthly';
    const data = await attendanceService.summary(req, period);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
