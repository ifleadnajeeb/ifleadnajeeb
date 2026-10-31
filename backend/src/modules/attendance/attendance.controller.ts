import { attendanceService } from './attendance.service.js';

export async function getAttendanceList(req: any, res: any, next: any) {
  try { 
    const data = await attendanceService.list(req);
    res.json({ data }); 
  } catch (error: any) { 
    console.error("ATTENDANCE API ERROR:", error);
    // Send the EXACT error to the frontend so we can see it in the Network tab
    res.status(500).json({ error: error.message, details: error.stack }); 
  }
}

export async function getAttendanceSummary(req: any, res: any, next: any) {
  try { 
    const period = req.query.period || 'monthly';
    const data = await attendanceService.summary(req, period);
    res.json({ data }); 
  } catch (error: any) { 
    console.error("ATTENDANCE SUMMARY ERROR:", error);
    res.status(500).json({ error: error.message, details: error.stack }); 
  }
}
