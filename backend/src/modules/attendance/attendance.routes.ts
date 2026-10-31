import { Router } from 'express';
import { getAttendanceList, getAttendanceSummary } from './attendance.controller.js';

const router = Router();


router.get('/', getAttendanceList);
router.get('/summary', getAttendanceSummary);

export default router;
