import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { userService } from './user.service.js';

export const userController = {
  async create(req: AuthRequest, res: Response) {
    const user = await userService.create(req.user!, req.body);
    res.status(201).json({ data: user });
  },

  async bookable(req: AuthRequest, res: Response) {
    // Return ALL active users in the caller's organization
    // (used for booking appointments for anyone, regardless of hierarchy)
    const r = await userService.bookable(req.user!, req.query as any);
    res.json(r);
  },

  async list(req: AuthRequest, res: Response) {
    const result = await userService.list(req.user!, req.query as any);
    res.json(result);
  },

  async update(req: AuthRequest, res: Response) {
    const user = await userService.update(req.user!, req.params.id, req.body);
    res.json({ data: user });
  },

  async deactivate(req: AuthRequest, res: Response) {
    await userService.deactivate(req.user!, req.params.id);
    res.status(204).end();
  },

  async remove(req: AuthRequest, res: Response) {
    await userService.remove(req.user!, req.params.id);
    res.status(204).end();
  },

  async canCreate(req: AuthRequest, res: Response) {
    const roles = userService.canCreate(req.user!.role);
    res.json({ data: roles });
  },
};
