import type { Response, NextFunction } from 'express';
import { userService } from './user.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

export const userController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await userService.list(req.user!, req.query);
      res.json(result);
    } catch (err) { next(err); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await userService.getById(req.user!, req.params.id);
      res.json({ data: result });
    } catch (err) { next(err); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await userService.create(req.user!, req.body);
      res.status(201).json({ data: result });
    } catch (err) { next(err); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await userService.update(req.user!, req.params.id, req.body);
      res.json({ data: result });
    } catch (err) { next(err); }
  },

  async deactivate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await userService.deactivate(req.user!, req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await userService.remove(req.user!, req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  async canCreate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const roles = userService.canCreate(req.user!.role);
      res.json({ data: roles });
    } catch (err) { next(err); }
  },

  async bookable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await userService.bookable(req.user!, req.query);
      res.json(result);
    } catch (err) { next(err); }
  },
};
