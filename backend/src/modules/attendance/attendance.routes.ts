import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { attendanceController } from './attendance.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', attendanceController.list);
router.post('/clock-out', attendanceController.clockOut);

export default router;
