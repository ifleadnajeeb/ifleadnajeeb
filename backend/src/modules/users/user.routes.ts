import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { audit } from '../../services/audit.service.js';
import { CreateUserSchema, UpdateUserSchema, ListUsersQuerySchema } from './user.schema.js';
import { userController } from './user.controller.js';

const router = Router();
router.use(authenticate);

router.get('/me/can-create', requirePermission('users:read'), userController.canCreate);

// NEW: any authenticated user — scoped by hierarchy
router.get('/assignable', validate(ListUsersQuerySchema, 'query'), userController.list);
router.get('/bookable', validate(ListUsersQuerySchema, 'query'), userController.bookable);

router.get('/', requirePermission('users:read'), validate(ListUsersQuerySchema, 'query'), userController.list);
router.post('/', requirePermission('users:create'), validate(CreateUserSchema), audit('user.create', 'User'), userController.create);
router.patch('/:id', requirePermission('users:update'), validate(UpdateUserSchema), audit('user.update', 'User'), userController.update);
router.delete('/:id', requirePermission('users:delete'), audit('user.deactivate', 'User'), userController.deactivate);
router.delete('/:id/permanent', requirePermission('users:delete'), audit('user.delete', 'User'), userController.remove);

export default router;
