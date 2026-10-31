import { Response, NextFunction } from 'express';
import { attendanceService } from './attendance.service.js';

export async function getAttendanceList(req: any, res: Response, next: NextFunction) {
  try {
    const data = await attendanceService.list(req);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function clockIn(req: any, res: Response, next: NextFunction) {
  try {
    const data = await attendanceService.clockIn(req);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function clockOut(req: any, res: Response, next: NextFunction) {
  try {
    const data = await attendanceService.clockOut(req);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getAttendanceSummary(req: any, res: Response, next: NextFunction) {
  try {
    const period = (req.query.period as string) || 'monthly';
    const data = await attendanceService.summary(req, period);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
