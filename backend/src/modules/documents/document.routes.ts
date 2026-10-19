import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { documentController } from './document.controller.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
const router = Router();

router.use(authenticate);
router.post('/upload', requirePermission('documents:create'), upload.single('file'), documentController.upload);
router.get('/customer/:customerId', requirePermission('documents:read'), documentController.listByCustomer);
router.delete('/:id', requirePermission('documents:delete'), documentController.remove);

export default router;
