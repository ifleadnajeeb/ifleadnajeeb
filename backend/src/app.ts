import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import leadRoutes from './modules/leads/lead.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes.js';
import followupRoutes from './modules/followups/followup.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import appointmentRoutes from './modules/appointments/appointment.routes.js';
import calendarRoutes from './modules/calendar/calendar.routes.js';
import customerRoutes from './modules/customers/customer.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';
import roleRoutes from './modules/roles/role.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import documentRoutes from './modules/documents/document.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import missionsRoutes from './modules/missions/missions.routes.js';
import operationsRoutes from './modules/operations/operations.routes.js';
import userRoutes from './modules/users/user.routes.js';
import metaRoutes from './modules/meta/meta.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import configRoutes from './modules/config/config.routes.js';

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.APP_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'crm-api',
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/users', userRoutes);
  app.use('/api/operations', operationsRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/config', configRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
});

app.use(errorHandler);