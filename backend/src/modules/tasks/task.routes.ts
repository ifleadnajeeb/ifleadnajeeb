import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { audit } from '../../services/audit.service.js';
import { CreateTaskSchema, UpdateTaskSchema, ListTasksQuerySchema, MoveTaskSchema } from './task.schema.js';
import { taskController } from './task.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', validate(ListTasksQuerySchema, 'query'), taskController.list);
router.post('/', requirePermission('tasks:create'), validate(CreateTaskSchema), audit('task.create', 'Task'), taskController.create);

// Workflow Routes
router.post('/:id/accept', requirePermission('tasks:update'), taskController.accept);
router.post('/:id/reject', requirePermission('tasks:update'), taskController.reject);
router.post('/:id/submit-review', requirePermission('tasks:update'), taskController.submitReview);
router.post('/:id/approve', requirePermission('tasks:update'), taskController.approve);
router.post('/:id/request-correction', requirePermission('tasks:update'), taskController.requestCorrection);

// Standard Routes
router.patch('/:id', requirePermission('tasks:update'), validate(UpdateTaskSchema), audit('task.update', 'Task'), taskController.update);
router.patch('/:id/move', requirePermission('tasks:update'), validate(MoveTaskSchema), audit('task.move', 'Task'), taskController.move);
router.delete('/:id', requirePermission('tasks:delete'), audit('task.delete', 'Task'), taskController.remove);

// Detail & Sub-resources
router.get('/:id', taskController.detail);
router.get('/:id/reminders/due', taskController.dueReminders);
router.post('/:id/reminder-fired', taskController.markReminderFired);
router.post('/:id/comments', taskController.addComment);
router.post('/:id/checklist', taskController.addChecklist);
router.patch('/checklist/:itemId', taskController.toggleChecklist);
router.delete('/checklist/:itemId', taskController.deleteChecklist);

export default router;
