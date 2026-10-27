import type { Response, NextFunction } from 'express';
import { leadService } from './lead.service.js';
import { completeFollowup } from './lead.followup.js';
import { getLeadFacts } from './lead.facts.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

export const leadController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await leadService.create(req, req.body, req.user!);
      res.status(201).json({ ok: true, data: result });
    } catch (err) { next(err); }
  },

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await leadService.list(req, req.query as any);
      res.json({ ok: true, data: result.data, meta: result.meta });
    } catch (err) { next(err); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await leadService.getById(req, req.params.id);
      res.json({ ok: true, data: result });
    } catch (err) { next(err); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await leadService.update(req, req.params.id, req.body);
      res.json({ ok: true, data: result });
    } catch (err) { next(err); }
  },

  async changeStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await leadService.changeStatus(req, req.params.id, req.body.status, req.body.note);
      res.json({ ok: true, data: result });
    } catch (err) { next(err); }
  },

  async assign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await leadService.assign(req, req.params.id, req.body.assignedToId);
      res.json({ ok: true, data: result });
    } catch (err) { next(err); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await leadService.remove(req, req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  // 👇 NEW METHOD FOR DUPLICATE CHECK 👇
  async checkDuplicate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await leadService.checkDuplicate(req, req.query as any);
      res.json({ ok: true, data: result });
    } catch (err) { next(err); }
  },

  async followup(req: AuthRequest, res: Response) {
    const result = await completeFollowup(req, req.params.id, req.body);
    res.json(result);
  },

  async getFacts(req: AuthRequest, res: Response) {
    const result = await getLeadFacts(req, req.params.id);
    res.json(result);
  },
};
