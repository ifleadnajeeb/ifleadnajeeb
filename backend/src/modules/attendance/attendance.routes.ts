import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { getAttendanceList, clockIn, clockOut, getAttendanceSummary } from './attendance.controller.js';;

const router = Router();

// Put specific routes BEFORE dynamic /:id routes
router.get('/summary', getAttendanceSummary);

router.use(authenticate);

router.get('/', getAttendanceList);
router.post('/clock-out', clockOut);

export default router;


