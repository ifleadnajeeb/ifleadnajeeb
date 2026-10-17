import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { operationsService } from './operations.service.js';

export const operationsController = {
  async listProjects(req: AuthRequest, res: Response) {
    const data = await operationsService.listProjects(req.user!);
    res.json({ data });
  },
  async createProject(req: AuthRequest, res: Response) {
    const data = await operationsService.createProject(req.user!, req.body);
    res.status(201).json({ data });
  },
  async listDepartments(req: AuthRequest, res: Response) {
    const data = await operationsService.listDepartments(req.user!);
    res.json({ data });
  },
  async createDepartment(req: AuthRequest, res: Response) {
    const data = await operationsService.createDepartment(req.user!, req.body);
    res.status(201).json({ data });
  }
};
