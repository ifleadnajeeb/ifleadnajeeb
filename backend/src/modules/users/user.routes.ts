import { Router } from 'express';
import { userController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

const router = Router();
router.use(authenticate);

// 👇 SPECIFIC ROUTES MUST GO BEFORE /:id 👇
router.get(
  '/can-create',
  userController.canCreate
);

router.get(
  '/bookable',
  userController.bookable
);

// Standard CRUD routes
router.get('/', requirePermission('users:read'), userController.list);
router.post('/', requirePermission('users:create'), userController.create);

// Dynamic ID routes
router.get('/:id', requirePermission('users:read'), userController.getById);
router.patch('/:id', requirePermission('users:update'), userController.update);
router.patch('/:id/deactivate', requirePermission('users:update'), userController.deactivate);
router.delete('/:id', requirePermission('users:delete'), userController.remove);

export default router;
