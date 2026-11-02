import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { attendanceController } from './attendance.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', attendanceController.list);
router.get('/user/:userId', attendanceController.getUserLogs);
router.get('/summary', attendanceController.summary);

export default router;
