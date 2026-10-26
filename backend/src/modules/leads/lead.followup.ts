import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { buildScopeFilter } from '../../middleware/scope.middleware.js';
import { NotFoundError } from '../../shared/errors.js';
import { awardXp } from '../missions/missions.service.js';

/**
 * Result → [new status, suggested next action, days until next follow-up, XP]
 * Mirrors the demo's rule table. The result drives everything.
 */
export const RESULT_RULES: Record<
  string,
  { status: string; nextAction: string; days: number; xp: number; closes: boolean }
> = {
  'No answer':              { status: 'CONTACTED',   nextAction: 'Call customer',           days: 1, xp: 10,  closes: false },
  'Call back later':        { status: 'CONTACTED',   nextAction: 'Call customer',           days: 1, xp: 10,  closes: false },
  'Interested':             { status: 'QUALIFIED',   nextAction: 'Send quotation',          days: 2, xp: 20,  closes: false },
  'Very interested':        { status: 'QUALIFIED',   nextAction: 'Send quotation',          days: 1, xp: 20,  closes: false },
  'Requested quotation':    { status: 'PROPOSAL',    nextAction: 'Send quotation',          days: 2, xp: 25,  closes: false },
  'Quotation sent':         { status: 'PROPOSAL',    nextAction: 'Check quotation status',  days: 2, xp: 25,  closes: false },
  'Negotiation':            { status: 'NEGOTIATION', nextAction: 'Follow up later',         days: 2, xp: 15,  closes: false },
  'Meeting scheduled':      { status: 'NEGOTIATION', nextAction: 'Attend meeting',          days: 3, xp: 30,  closes: false },
  'Waiting for customer':   { status: 'NEGOTIATION', nextAction: 'Follow up later',         days: 3, xp: 10,  closes: false },
  'Not interested':         { status: 'LOST',        nextAction: 'Review / close lead',     days: 0, xp: 10,  closes: true },
  'Wrong number':           { status: 'LOST',        nextAction: '',                        days: 0, xp: 10,  closes: true },
  'Converted':              { status: 'WON',         nextAction: '',                        days: 0, xp: 100, closes: true },
  'Other':                  { status: 'CONTACTED',   nextAction: 'Follow up later',         days: 2, xp: 10,  closes: false },
};

interface Body {
  method: 'Phone' | 'WhatsApp' | 'Email' | 'Meeting' | 'Other';
  result: string;
  note?: string;
  nextAction?: string;
  nextDate?: string | null;
  nextTime?: string | null;
}

export async function completeFollowup(
  req: AuthRequest,
  id: string,
  body: Body
) {
  const scope = await buildScopeFilter(req);
  const actor = req.user!;

  const lead = await prisma.lead.findFirst({
    where: { id, ...scope.where },
  });
  if (!lead) throw new NotFoundError('Lead not found in your scope');

  const rule = RESULT_RULES[body.result];
  if (!rule) {
    throw new NotFoundError(`Unknown result: ${body.result}`);
  }

  // Compute next follow-up date
  let nextDate: Date | null = null;
  if (!rule.closes && body.nextDate) {
    nextDate = new Date(body.nextDate);
    if (body.nextTime) {
      const [h, m] = body.nextTime.split(':').map(Number);
      nextDate.setHours(h, m, 0, 0);
    } else {
      nextDate.setHours(10, 30, 0, 0);
    }
  } else if (!rule.closes && rule.days > 0) {
    nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + rule.days);
    nextDate.setHours(10, 30, 0, 0);
  }

  const statusChanged = lead.status !== rule.status;

  // Apply changes in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    const updatedLead = await tx.lead.update({
      where: { id: lead.id },
      data: {
        status: rule.status as any,
        priority:
          body.result === 'Very interested' ? 'HOT' : lead.priority,
        // ✅ NEW: Save the description typed in the follow-up modal
        notes: body.note !== undefined ? body.note : lead.notes,
      },
    });

    // Activity log entry
    await tx.activity.create({
      data: {
        organizationId: actor.organizationId,
        type: `${body.method} follow-up`,
        title: `Follow-up completed — ${body.result}`,
        body: [
          body.note ? `Note: ${body.note}` : null,
          rule.closes
            ? `Lead closed (${rule.status})`
            : `Next: ${rule.nextAction} on ${nextDate?.toLocaleDateString('en-IN')}`,
        ]
          .filter(Boolean)
          .join(' · '),
        metadata: {
          result: body.result,
          method: body.method,
          oldStatus: lead.status,
          newStatus: rule.status,
          xp: rule.xp,
        },
        userId: actor.id,
        leadId: lead.id,
      },
    });

    // Mark pending follow-ups as completed
    await tx.followup.updateMany({
      where: { leadId: lead.id, status: 'PENDING' },
      data: { status: 'COMPLETED', completedAt: new Date(), result: body.result },
    });

    // Create the next follow-up if not closed
    if (!rule.closes && nextDate) {
      await tx.followup.create({
        data: {
          organizationId: actor.organizationId,
          title: rule.nextAction || 'Follow up',
          notes: body.note,
          dueAt: nextDate,
          status: 'PENDING',
          leadId: lead.id,
          assignedToId: lead.assignedToId ?? actor.id,
          createdById: actor.id,
        },
      });
    }

    return updatedLead;
  });

  await awardXp(actor.id, rule.xp);

  return {
    data: {
      id: updated.id,
      name: updated.name,
      status: updated.status,
      priority: updated.priority,
      nextFollowupAt: nextDate,
    },
    xp: rule.xp,
    closesLead: rule.closes,
    statusChanged,
    oldStatus: lead.status,
    newStatus: rule.status,
    suggestedNextAction: rule.nextAction,
    suggestedNextDate: nextDate,
  };
}
