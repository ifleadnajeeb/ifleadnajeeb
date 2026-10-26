import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';  // fast + free

export interface LLMReply {
  text: string;
  model: string;
  usage?: { prompt: number; completion: number };
}

/**
 * Build a compact snapshot of the user's CRM data to give the LLM context.
 * Only safe fields — no passwords, no raw Prisma models.
 */
async function buildCrmContext(req: AuthRequest, userMessage: string = ''): Promise<string> {
  const actor = req.user!;
  const orgId = actor.organizationId;

  // ── Scope: same as before ──
  let leadFilter: any = { organizationId: orgId };
  if (actor.role === 'BDE') leadFilter.assignedToId = actor.id;
  if (actor.role === 'SALES_HEAD') {
    const team = actor.teamId
      ? await prisma.user.findMany({ where: { teamId: actor.teamId }, select: { id: true } })
      : [];
    leadFilter.assignedToId = { in: [actor.id, ...team.map((t) => t.id)] };
  }
  if (actor.role === 'BDM') {
    const subs: string[] = [actor.id];
    const q = [actor.id];
    while (q.length) {
      const cur = q.shift()!;
      const kids = await prisma.user.findMany({ where: { managerId: cur }, select: { id: true } });
      for (const k of kids) { subs.push(k.id); q.push(k.id); }
    }
    leadFilter.assignedToId = { in: subs };
  }

  // ── Date markers ──
  const now = new Date();
  const today0 = new Date(now); today0.setHours(0, 0, 0, 0);
  const today24 = new Date(today0); today24.setDate(today24.getDate() + 1);
  const yesterday0 = new Date(today0); yesterday0.setDate(yesterday0.getDate() - 1);
  const yesterday24 = today0;

  // ── All-time snapshots ──
  const [leadCount, hotLeads, pendingFu, overdueFu, openTasks, apptsToday] = await Promise.all([
    prisma.lead.count({ where: leadFilter }),
    prisma.lead.findMany({
      where: { ...leadFilter, priority: 'HOT', status: { notIn: ['WON', 'LOST'] } },
      select: { name: true, company: true, status: true },
      take: 10,
    }),
    prisma.followup.count({ where: { lead: leadFilter, status: 'PENDING' } }),
    prisma.followup.count({ where: { lead: leadFilter, status: 'PENDING', dueAt: { lt: today0 } } }),
    prisma.task.count({
      where: {
        organizationId: orgId,
        ...(actor.role === 'BDE' || actor.role === 'SALES_HEAD' ? { assignedToId: actor.id } : {}),
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
    }),
    prisma.appointment.count({
      where: {
        organizationId: orgId,
        ...(actor.role === 'BDE' || actor.role === 'SALES_HEAD' ? { assignedToId: actor.id } : {}),
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        startAt: { gte: today0, lt: today24 },
      },
    }),
  ]);

  // ── TODAY'S specific activity (leads + followups + tasks created today) ──
  const [leadsToday, followupsToday, tasksToday, yesterdayLeads, yesterdayFollowups] = await Promise.all([
    prisma.lead.findMany({
      where: { ...leadFilter, createdAt: { gte: today0, lt: today24 } },
      select: {
        name: true,
        company: true,
        status: true,
        assignedTo: { select: { name: true } },
        createdBy: { select: { name: true } },
        createdAt: true,
      },
    }),
    prisma.activity.findMany({
      where: {
        organizationId: orgId,
        type: 'followup',
        createdAt: { gte: today0, lt: today24 },
      },
      select: { title: true, userId: true, createdAt: true },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: today0, lt: today24 },
        ...(actor.role === 'BDE' || actor.role === 'SALES_HEAD' ? { assignedToId: actor.id } : {}),
      },
      select: { title: true, status: true, assignedTo: { select: { name: true } } },
    }),
    prisma.lead.count({
      where: { ...leadFilter, createdAt: { gte: yesterday0, lt: yesterday24 } },
    }),
    prisma.activity.count({
      where: {
        organizationId: orgId,
        type: 'followup',
        createdAt: { gte: yesterday0, lt: yesterday24 },
      },
    }),
  ]);

  // ── Recent activity (last 10) with dates ──
  const recent = await prisma.activity.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { title: true, createdAt: true, userId: true },
  });
  const userIds = [...new Set(recent.map((r) => r.userId))];
  const actors = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const userMap = new Map(actors.map((a) => [a.id, a.name]));

  // ── Build context ──
  const todayStr = today0.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const nowTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });


  // ── NEW: Dynamic search based on user message ──
  const ignoredWords = ['what', 'is', 'the', 'about', 'tell', 'me', 'show', 'details', 'description', 'for', 'lead', 'this', 'that', 'and', 'with', 'from', 'have', 'has', 'recent', 'activity', 'today', 'yesterday', 'status', 'follow-up'];
  const searchWords = userMessage.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 2 && !ignoredWords.includes(w));
  
  let matchedLeads: any[] = [];
  if (searchWords.length > 0) {
    const orConditions = searchWords.flatMap(w => [
      { name: { contains: w, mode: 'insensitive' } },
      { company: { contains: w, mode: 'insensitive' } }
    ]);
    matchedLeads = await prisma.lead.findMany({
      where: { ...leadFilter, OR: orConditions },
      take: 5,
      include: {
        assignedTo: { select: { name: true } },
        followups: { where: { status: 'PENDING' }, orderBy: { dueAt: 'asc' }, take: 1 }
      }
    });
  }

  const lines: string[] = [];

  // ── NEW: Add dynamically matched leads to context ──
  if (matchedLeads.length > 0) {
    lines.push('=== SPECIFIC LEADS MATCHING USER QUERY ===');
    matchedLeads.forEach((l) => {
      lines.push(`Lead Name: ${l.name}`);
      lines.push(`- Project/Company: ${l.company || 'N/A'}`);
      lines.push(`- Status: ${l.status} | Priority: ${l.priority}`);
      lines.push(`- Phone: ${l.phone || 'N/A'}`);
      lines.push(`- Description/Notes: ${l.notes || 'N/A'}`);
      lines.push(`- Assigned to: ${l.assignedTo?.name || 'Unassigned'}`);
      if (l.followups && l.followups.length > 0) {
        lines.push(`- Next Follow-up Due: ${l.followups[0].dueAt.toLocaleString('en-IN')}`);
      }
      lines.push('');
    });
  }

  lines.push(`CURRENT DATE: ${todayStr}`);

  lines.push(`CURRENT TIME: ${nowTimeStr}`);
  lines.push(`User: ${actor.name} (role: ${actor.role})`);
  lines.push('');
  lines.push('=== ALL-TIME TOTALS ===');
  lines.push(`Total leads in scope: ${leadCount}`);
  lines.push(`Pending follow-ups: ${pendingFu} (${overdueFu} overdue)`);
  lines.push(`Open tasks: ${openTasks}`);
  lines.push(`Appointments scheduled today: ${apptsToday}`);
  lines.push('');

  // ═══ TODAY's specific data ═══
  lines.push(`=== TODAY (${todayStr}) ===`);
  lines.push(`Leads created TODAY: ${leadsToday.length}`);
  if (leadsToday.length > 0) {
    leadsToday.forEach((l) => {
      lines.push(`  - ${l.name}${l.company ? ` (${l.company})` : ''} · status: ${l.status} · assigned to: ${l.assignedTo?.name ?? 'unassigned'}`);
    });
  } else {
    lines.push('  (no leads created today)');
  }

  lines.push(`Follow-ups completed TODAY: ${followupsToday.length}`);
  if (followupsToday.length > 0) {
    followupsToday.forEach((f) => {
      const who = userMap.get(f.userId) ?? 'unknown';
      lines.push(`  - ${f.title} — by ${who}`);
    });
  } else {
    lines.push('  (no follow-ups completed today)');
  }

  lines.push(`Tasks created TODAY: ${tasksToday.length}`);
  if (tasksToday.length > 0) {
    tasksToday.forEach((t) => {
      lines.push(`  - ${t.title} · status: ${t.status} · assigned to: ${t.assignedTo?.name ?? 'unassigned'}`);
    });
  } else {
    lines.push('  (no tasks created today)');
  }

  lines.push('');
  lines.push('=== YESTERDAY (for comparison) ===');
  lines.push(`Leads created yesterday: ${yesterdayLeads}`);
  lines.push(`Follow-ups completed yesterday: ${yesterdayFollowups}`);
  lines.push('');

  if (hotLeads.length) {
    lines.push('=== HOT LEADS (all-time) ===');
    hotLeads.forEach((l) => lines.push(`  - ${l.name}${l.company ? ` (${l.company})` : ''} · ${l.status}`));
    lines.push('');
  }

  if (recent.length) {
    lines.push('=== RECENT ACTIVITY (last 10, with dates) ===');
    recent.forEach((a) => {
      const who = userMap.get(a.userId) ?? 'system';
      const when = a.createdAt.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      lines.push(`  [${when}] ${a.title} — ${who}`);
    });
  }

  return lines.join('\n');
}

export const aiLlm = {
  isEnabled(): boolean {
    return !!env.GROQ_API_KEY && env.GROQ_API_KEY.startsWith('gsk_');
  },

  async ask(req: AuthRequest, userMessage: string): Promise<LLMReply | null> {
    if (!this.isEnabled()) return null;

    const ctx = await buildCrmContext(req, userMessage);

    const systemPrompt = `You are "CRM Assistant" inside a business CRM called iF LEADS.

You answer concisely in plain English. Use bullet points where helpful.
You can answer ANY question, just like ChatGPT:

1. CRM & data questions - use the DATA SNAPSHOT below.
2. General knowledge - science, tech, business, marketing, history, definitions. Use your training knowledge.
3. Writing help - emails, messages, WhatsApp, proposals, summaries, translations.
4. Business advice - sales tips, marketing ideas, follow-up strategy.
5. Explanations - "what is X", "how does Y work", "explain Z like I am 5".
6. Math, code, translations - anything the user asks.


${ctx}

Rules:
- For CRM questions (leads, tasks, follow-ups): use ONLY the data above. Never invent names or numbers.
- If the user asks about a specific lead by name, ALWAYS look at the 'SPECIFIC LEADS MATCHING USER QUERY' section first. If they are there, use that data to answer.
- For everything else: use your full knowledge - like ChatGPT.
- If you genuinely do not know, say so honestly.
- Match the user language (English, Malayalam, Hindi, etc.).
- Never invent customer names, phone numbers, or metrics not in the snapshot.
- If asked to write a message or email, produce clean ready-to-send text.`;

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.4,
          max_tokens: 1000,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('[groq] HTTP', res.status, err.slice(0, 200));
        return null;
      }

      const json: any = await res.json();
      const text = json?.choices?.[0]?.message?.content?.trim();
      if (!text) return null;

      return {
        text,
        model: json.model ?? MODEL,
        usage: json.usage
          ? {
              prompt: json.usage.prompt_tokens ?? 0,
              completion: json.usage.completion_tokens ?? 0,
            }
          : undefined,
      };
    } catch (e) {
      console.error('[groq] request failed', e);
      return null;
    }
  },
};
