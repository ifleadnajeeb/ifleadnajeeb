import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getAttendanceList, getAttendanceSummary } from './attendance.controller.js';

const router = Router();

// ✅ Restore the auth middleware so req.user is defined
router.use(authenticate);

router.get('/', getAttendanceList);
router.get('/summary', getAttendanceSummary);

export default router;
