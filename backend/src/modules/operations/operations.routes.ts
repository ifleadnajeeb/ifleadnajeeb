import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { CreateProjectSchema, CreateDepartmentSchema } from './operations.schema.js';
import { operationsController } from './operations.controller.js';

const router = Router();
router.use(authenticate);

// Projects
router.get('/projects', requirePermission('tasks:read'), operationsController.listProjects);
router.post('/projects', requirePermission('tasks:create'), validate(CreateProjectSchema), operationsController.createProject);

// Departments
router.get('/departments', requirePermission('tasks:read'), operationsController.listDepartments);
router.post('/departments', requirePermission('tasks:create'), validate(CreateDepartmentSchema), operationsController.createDepartment);

export default router;
