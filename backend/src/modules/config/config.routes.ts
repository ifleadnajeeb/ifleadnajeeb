import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { ListQuerySchema, CreateSchema, UpdateSchema } from './config.schema.js';
import { configController } from './config.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', validate(ListQuerySchema, 'query'), configController.list);
router.post('/', requirePermission('settings:create'), validate(CreateSchema), configController.create);
router.patch('/:id', requirePermission('settings:update'), validate(UpdateSchema), configController.update);
router.delete('/:id', requirePermission('settings:delete'), configController.remove);

export default router;
