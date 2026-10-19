import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';

export const documentController = {
  async upload(req: AuthRequest, res: Response) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { customerId } = req.body;
    const actor = req.user!;

    const doc = await prisma.document.create({
      data: {
        organizationId: actor.organizationId,
        name: req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
        customerId: customerId || null,
      }
    });

    res.status(201).json({ data: doc });
  },

  async listByCustomer(req: AuthRequest, res: Response) {
    const { customerId } = req.params;
    const docs = await prisma.document.findMany({
      where: { 
        customerId,
        organizationId: req.user!.organizationId 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: docs });
  },

  async remove(req: AuthRequest, res: Response) {
    const { id } = req.params;
    await prisma.document.deleteMany({
      where: { id, organizationId: req.user!.organizationId }
    });
    res.status(204).end();
  }
};
