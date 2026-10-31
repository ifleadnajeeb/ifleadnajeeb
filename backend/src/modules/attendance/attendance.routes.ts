import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { getAttendanceList, getAttendanceSummary } from './attendance.controller.js';

const router = Router();

// Apply the auth middleware
router.use(authenticate);

router.get('/', getAttendanceList);
router.get('/summary', getAttendanceSummary);

export default router;
