import { Router } from 'express';
import { leadController } from './lead.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { CreateLeadSchema, UpdateLeadSchema, ListLeadsSchema, ChangeStatusSchema, AssignLeadSchema } from './lead.schema.js';

const router = Router();

// All lead routes require authentication
router.use(authenticate);

// 👇 THIS MUST BE FIRST! 👇
router.get(
  '/check-duplicate',
  requirePermission('leads:create'),
  leadController.checkDuplicate
);

// Standard CRUD routes
router.get('/', requirePermission('leads:read'), validate(ListLeadsSchema, 'query'), leadController.list);
router.post('/', requirePermission('leads:create'), validate(CreateLeadSchema), leadController.create);

// 👇 Dynamic ID routes come AFTER specific routes 👇
router.get('/:id', requirePermission('leads:read'), leadController.getById);
router.patch('/:id', requirePermission('leads:update'), validate(UpdateLeadSchema), leadController.update);
router.patch('/:id/status', requirePermission('leads:update'), validate(ChangeStatusSchema), leadController.changeStatus);
router.patch('/:id/assign', requirePermission('leads:assign'), validate(AssignLeadSchema), leadController.assign);
router.delete('/:id', requirePermission('leads:delete'), leadController.remove);

export default router;
