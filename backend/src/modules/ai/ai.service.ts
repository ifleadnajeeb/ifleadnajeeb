import { prisma } from '../../config/database.js';
import { aiLlm } from './ai.llm.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';

interface Reply {
  reply: string;
  data?: any;
  intent: string;
  links?: { label: string; href: string }[];
}

// ═══════════════════════════════════════════════════════════
// Intent detection — pure string matching, no LLM needed
// ═══════════════════════════════════════════════════════════
type Intent =
  | 'greeting'
  | 'meta'
  | 'help'
  | 'count_leads'
  | 'hot_leads'
  | 'today_followups'
  | 'overdue_followups'
  | 'my_tasks'
  | 'today_tasks'
  | 'top_performer'
  | 'my_xp'
  | 'today_appointments'
  | 'count_customers'
  | 'recent_activity'
  | 'my_profile'
  | 'my_team'
  | 'count_users'
  | 'llm_fallback'
  | 'unknown';

function detectIntent(msg: string): Intent {
  const m = msg.toLowerCase().trim();

  if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(m)) return 'greeting';
  if (/\b(help|what can you do|commands|options)\b/.test(m)) return 'help';

  if (/\b(how many|count|total|number of)\b.*\blead/.test(m) || /\blead.*\b(count|total)\b/.test(m)) return 'count_leads';
  if (/\bhot\b.*\blead/.test(m) || /\blead.*\bhot\b/.test(m)) return 'hot_leads';
  if (/\b(today|todays|today's)\b.*\bfollow.?up/.test(m) || /\bfollow.?up.*\btoday\b/.test(m)) return 'today_followups';
  if (/\b(overdue|late|missed|backlog)\b.*\bfollow/.test(m) || /\bfollow.*\b(overdue|late)\b/.test(m)) return 'overdue_followups';
  if (/\bmy tasks?\b/.test(m) || /\btasks?\b.*\bassigned\b/.test(m)) return 'my_tasks';
  if (/\b(today|due today)\b.*\btask/.test(m)) return 'today_tasks';
  if (/\b(top|best|highest)\b.*\b(performer|sales|rep|bde|bdm)/.test(m) || /\bleaderboard\b/.test(m)) return 'top_performer';
  if (/\b(my|how much)\b.*\bxp\b/.test(m) || /\b(level|streak)\b/.test(m)) return 'my_xp';
  if (/\b(appointment|meeting)s?\b.*\btoday\b/.test(m) || /\btoday.*\bappointment/.test(m)) return 'today_appointments';
  if (/\b(how many|count|total)\b.*\bcustomer/.test(m)) return 'count_customers';
  if (/\b(recent|latest|last)\b.*\b(activity|activities|action)/.test(m)) return 'recent_activity';

  if (/\b(my|what('s| is)? my)\b.*\b(role|profile|email|name|designation)\b/.test(m) || /\bwho am i\b/.test(m)) return 'my_profile';
  if (/\bmy team\b/.test(m) || /\bwho('s| is)\b.*\bmy team\b/.test(m) || /\bteam members?\b/.test(m)) return 'my_team';
  if (/\b(how many|count|total|number of)\b.*\busers?\b/.test(m) || /\busers?\b.*\b(count|total)\b/.test(m)) return 'count_users';

  // Meta questions about THIS assistant specifically (narrower — lets general
  // "what is AI" flow through to the LLM for a real answer)
  if (/\bwho\s+are\s+you\b/.test(m)) return 'meta';
  if (/\bwhat\s+are\s+you\b/.test(m)) return 'meta';
  if (/\bwhat\s+can\s+you\s+do\b/.test(m)) return 'meta';
  if (/\bhow\s+do\s+you\s+work\b/.test(m)) return 'meta';
  if (/^\s*(ai\s+assistant|chatbot|this\s+bot|the\s+assistant)\s*[?!.]?\s*$/.test(m)) return 'meta';

  return 'unknown';
}

// ═══════════════════════════════════════════════════════════
// Scope helper
// ═══════════════════════════════════════════════════════════
async function collectDescendants(rootId: string): Promise<string[]> {
  const out: string[] = [rootId];
  const q = [rootId];
  while (q.length) {
    const cur = q.shift()!;
    const ch = await prisma.user.findMany({ where: { managerId: cur }, select: { id: true } });
    for (const c of ch) { out.push(c.id); q.push(c.id); }
  }
  return out;
}

async function getScope(req: AuthRequest) {
  const u = req.user!;
  if (u.role === 'ADMIN') return {};
  if (u.role === 'CEO') return { organizationId: u.organizationId };
  if (u.role === 'BDM') {
    const ids = await collectDescendants(u.id);
    return { organizationId: u.organizationId, assignedToId: { in: ids } };
  }
  if (u.role === 'SALES_HEAD') {
    if (!u.teamId) return { organizationId: u.organizationId, assignedToId: u.id };
    const mem = await prisma.user.findMany({
      where: { teamId: u.teamId, organizationId: u.organizationId },
      select: { id: true },
    });
    return {
      organizationId: u.organizationId,
      assignedToId: { in: [u.id, ...mem.map((m) => m.id)] },
    };
  }
  return { organizationId: u.organizationId, assignedToId: u.id };
}

// ═══════════════════════════════════════════════════════════
// Handlers per intent
// ═══════════════════════════════════════════════════════════
async function handle(req: AuthRequest, intent: Intent): Promise<Reply> {
  const actor = req.user!;
  const scope = await getScope(req);

  switch (intent) {
    case 'greeting':
      return {
        intent,
        reply: `Hi ${actor.name.split(' ')[0]}! 👋 I can answer questions about your leads, follow-ups, tasks, appointments, and team performance. Try "how many leads do I have?" or "show me hot leads".`,
      };

    case 'meta':
      return {
        intent,
        reply: `I'm your **CRM Assistant** — a hybrid AI that blends two modes:

**1. Instant answers (rules engine)**
Fast, accurate, free. I read directly from your CRM database for:
• Count and list your leads, customers, tasks
• Show today's / overdue follow-ups
• Report your XP, streak, and level
• Identify top performers on your team
• Show today's appointments

**2. Smart answers (Groq LLM)**
For free-form questions I use a live LLM (Llama via Groq) with a snapshot of your CRM data:
• Write WhatsApp messages, emails, or follow-ups
• Analyze trends and give business advice
• Translate to Malayalam, Hindi, or any language
• Summarize activity and suggest next actions

**Privacy:** Only a compact snapshot (counts + lead names + recent activity) is sent — never passwords, tokens, or other people's private data.

**I respect your permissions** — I only see what you're allowed to see.

Try: *"how many leads do I have?"* or *"write a WhatsApp message to John Doe"*.`,
      };

    case 'help':
      return {
        intent,
        reply: `Here's what I can help with:

• **Leads**: "how many leads", "show hot leads", "leads from website"
• **Follow-ups**: "today's follow-ups", "overdue follow-ups"
• **Tasks**: "my tasks", "tasks due today"
• **Appointments**: "appointments today"
• **Team**: "top performer", "leaderboard"
• **XP**: "my xp", "my level"
• **Activity**: "recent activity"

Just ask in plain English.`,
      };

    case 'count_leads': {
      const total = await prisma.lead.count({ where: scope });
      const byStatus = await prisma.lead.groupBy({
        by: ['status'],
        where: scope,
        _count: { _all: true },
      });
      const breakdown = byStatus.map((g) => `${g._count._all} ${g.status}`).join(', ');
      return {
        intent,
        reply: `You have **${total} leads** in your scope.\n\nBreakdown: ${breakdown || 'no data'}.`,
        data: { total, breakdown: byStatus },
        links: [{ label: 'View all leads', href: '/leads' }],
      };
    }

    case 'hot_leads': {
      const leads = await prisma.lead.findMany({
        where: { ...scope, priority: 'HOT', status: { notIn: ['WON', 'LOST'] } },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, phone: true, status: true, company: true },
      });
      if (leads.length === 0) {
        return { intent, reply: 'No hot leads right now. 🎉', links: [{ label: 'View all leads', href: '/leads' }] };
      }
      const list = leads.map((l) => `• **${l.name}**${l.company ? ` (${l.company})` : ''} — ${l.status}${l.phone ? ` · ${l.phone}` : ''}`).join('\n');
      return {
        intent,
        reply: `You have **${leads.length} hot lead${leads.length > 1 ? 's' : ''}**:\n\n${list}`,
        data: leads,
        links: [{ label: 'Open hot leads', href: '/leads?view=hot' }],
      };
    }

    case 'today_followups': {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const followups = await prisma.followup.findMany({
        where: {
          status: 'PENDING',
          dueAt: { gte: start, lt: end },
          lead: { ...scope },
        },
        include: { lead: { select: { name: true, phone: true } } },
        take: 20,
        orderBy: { dueAt: 'asc' },
      });
      if (followups.length === 0) {
        return { intent, reply: "No follow-ups due today. You're on track! ✅" };
      }
      const list = followups.map((f) => `• **${f.lead?.name ?? 'Unknown'}** — ${f.title}${f.lead?.phone ? ` · ${f.lead.phone}` : ''}`).join('\n');
      return {
        intent,
        reply: `**${followups.length}** follow-up${followups.length > 1 ? 's' : ''} due today:\n\n${list}`,
        data: followups,
        links: [{ label: 'Open follow-ups', href: '/followups' }],
      };
    }

    case 'overdue_followups': {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const followups = await prisma.followup.findMany({
        where: {
          status: 'PENDING',
          dueAt: { lt: start },
          lead: { ...scope },
        },
        include: { lead: { select: { name: true, phone: true } } },
        take: 20,
        orderBy: { dueAt: 'asc' },
      });
      if (followups.length === 0) {
        return { intent, reply: 'No overdue follow-ups. Great work! 🎉' };
      }
      const list = followups.slice(0, 10).map((f) => {
        const days = Math.round((start.getTime() - f.dueAt.getTime()) / 86400000);
        return `• **${f.lead?.name ?? 'Unknown'}** — ${f.title} (${days}d overdue)`;
      }).join('\n');
      return {
        intent,
        reply: `⚠️ **${followups.length} overdue** follow-up${followups.length > 1 ? 's' : ''}:\n\n${list}${followups.length > 10 ? `\n\n…and ${followups.length - 10} more.` : ''}`,
        data: followups,
        links: [{ label: 'Open follow-ups', href: '/followups' }],
      };
    }

    case 'my_tasks': {
      const tasks = await prisma.task.findMany({
        where: {
          organizationId: actor.organizationId,
          assignedToId: actor.id,
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
        take: 20,
        orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
        select: { id: true, title: true, priority: true, status: true, dueAt: true },
      });
      if (tasks.length === 0) {
        return { intent, reply: 'No open tasks assigned to you. 🎉', links: [{ label: 'Open tasks', href: '/tasks' }] };
      }
      const list = tasks.map((t) => {
        const due = t.dueAt ? ` · due ${t.dueAt.toLocaleDateString('en-GB')}` : '';
        return `• **${t.title}** [${t.priority}]${due}`;
      }).join('\n');
      return {
        intent,
        reply: `You have **${tasks.length} open task${tasks.length > 1 ? 's' : ''}**:\n\n${list}`,
        data: tasks,
        links: [{ label: 'Open tasks', href: '/tasks' }],
      };
    }

    case 'today_tasks': {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const tasks = await prisma.task.findMany({
        where: {
          organizationId: actor.organizationId,
          assignedToId: actor.id,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueAt: { gte: start, lt: end },
        },
        select: { id: true, title: true, priority: true },
      });
      if (tasks.length === 0) {
        return { intent, reply: 'No tasks due today. 🎉' };
      }
      const list = tasks.map((t) => `• **${t.title}** [${t.priority}]`).join('\n');
      return {
        intent,
        reply: `**${tasks.length} task${tasks.length > 1 ? 's' : ''}** due today:\n\n${list}`,
        data: tasks,
        links: [{ label: 'Open tasks', href: '/tasks' }],
      };
    }

    case 'top_performer': {
      const top = await prisma.user.findMany({
        where: { organizationId: actor.organizationId },
        orderBy: { xp: 'desc' },
        take: 3,
        select: { name: true, xp: true, role: { select: { name: true } } },
      });
      if (top.length === 0) return { intent, reply: 'No team members found.' };
      const medals = ['🥇', '🥈', '🥉'];
      const list = top.map((u, i) => `${medals[i]} **${u.name}** (${u.role.name}) — ${u.xp} XP`).join('\n');
      return {
        intent,
        reply: `Top performers:\n\n${list}`,
        data: top,
        links: [{ label: 'Full leaderboard', href: '/missions' }],
      };
    }

    case 'my_xp': {
      const u = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { xp: true, streak: true },
      });
      const xp = u?.xp ?? 0;
      const levels = [
        [0, 'New Starter'], [250, 'Lead Explorer'], [500, 'Follow-up Pro'],
        [1000, 'Customer Builder'], [2000, 'Sales Master'],
      ] as const;
      let name = 'New Starter'; let next: number | null = 250;
      for (let i = 0; i < levels.length; i++) {
        if (xp >= levels[i][0]) {
          name = levels[i][1];
          next = i + 1 < levels.length ? levels[i + 1][0] : null;
        }
      }
      const toNext = next ? next - xp : 0;
      return {
        intent,
        reply: `You have **${xp} XP** (level: **${name}**).\nStreak: 🔥 **${u?.streak ?? 0} day${(u?.streak ?? 0) === 1 ? '' : 's'}**.\n${next ? `Next level in **${toNext} XP**.` : 'Max level reached!'}`,
        data: { xp, streak: u?.streak ?? 0, levelName: name, nextXp: next },
        links: [{ label: 'My Missions', href: '/missions' }],
      };
    }

    case 'today_appointments': {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const appts = await prisma.appointment.findMany({
        where: {
          organizationId: actor.organizationId,
          startAt: { gte: start, lt: end },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        include: { lead: { select: { name: true } }, customer: { select: { name: true } } },
        orderBy: { startAt: 'asc' },
      });
      if (appts.length === 0) return { intent, reply: 'No appointments today.' };
      const list = appts.map((a) => {
        const who = a.lead?.name || a.customer?.name || '—';
        const time = a.startAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        return `• **${time}** — ${a.title} with *${who}*`;
      }).join('\n');
      return {
        intent,
        reply: `**${appts.length}** appointment${appts.length > 1 ? 's' : ''} today:\n\n${list}`,
        data: appts,
        links: [{ label: 'Open appointments', href: '/appointments' }],
      };
    }

    case 'count_customers': {
      const total = await prisma.customer.count({ where: { organizationId: actor.organizationId } });
      return {
        intent,
        reply: `You have **${total} customer${total === 1 ? '' : 's'}** in the system.`,
        data: { total },
        links: [{ label: 'View customers', href: '/customers' }],
      };
    }

    case 'recent_activity': {
      const acts = await prisma.activity.findMany({
        where: { organizationId: actor.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      const userIds = [...new Set(acts.map((a) => a.userId))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      const nameMap = new Map(users.map((u) => [u.id, u.name]));
      const list = acts.map((a) => `• ${a.title} — *${nameMap.get(a.userId) ?? 'system'}*`).join('\n');
      return {
        intent,
        reply: `Recent activity:\n\n${list}`,
        links: [{ label: 'Full audit log', href: '/audit' }],
      };
    }

    case 'my_profile': {
      return {
        intent,
        reply: `👤 **Your Profile**\n\n• **Name:** ${actor.name}\n• **Email:** ${actor.email}\n• **Role:** ${actor.role}\n• **Role Level:** ${actor.roleLevel}`,
        data: { name: actor.name, email: actor.email, role: actor.role, roleLevel: actor.roleLevel },
      };
    }

    case 'my_team': {
      const members = await prisma.user.findMany({
        where: { managerId: actor.id, organizationId: actor.organizationId },
        select: { id: true, name: true, email: true, role: { select: { name: true } } },
        orderBy: { name: 'asc' },
      });
      if (members.length === 0) {
        return { intent, reply: 'You have no direct team members assigned to you. 👥' };
      }
      const list = members.map((u) => `• **${u.name}** (${u.role.name}) — ${u.email}`).join('\n');
      return {
        intent,
        reply: `👥 **Your team (${members.length})**:\n\n${list}`,
        data: members,
        links: [{ label: 'Team performance', href: '/team-performance' }],
      };
    }

    case 'count_users': {
      if (actor.role !== 'ADMIN' && actor.role !== 'CEO') {
        return { intent, reply: 'You do not have permission to see the full user list.' };
      }
      const total = await prisma.user.count({
        where: { organizationId: actor.organizationId },
      });
      return {
        intent,
        reply: `There are **${total} user${total === 1 ? '' : 's'}** in your organization.`,
        data: { total },
        links: [{ label: 'View users', href: '/users' }],
      };
    }

    case 'unknown':
    default:
      return {
        intent: 'unknown',
        reply: `I didn't understand that. Try one of these:\n\n• how many leads do I have?\n• show me hot leads\n• what are my tasks?\n• today's follow-ups\n• overdue follow-ups\n• who is the top performer?\n• what is my XP?\n• appointments today\n\nYou can also ask: "what can you do?"`,
        links: [{ label: 'See what I can do', href: '/ai' }],
      };
  }
}

export const aiService = {
  async chat(req: AuthRequest, message: string): Promise<Reply> {
    const intent = detectIntent(message);

    // Fast path — rules engine handles it
    if (intent !== 'unknown') {
      return handle(req, intent);
    }

    // Slow path — hand off to Groq for free-form questions
    if (aiLlm.isEnabled()) {
      const llm = await aiLlm.ask(req, message);
      if (llm) {
        return {
          intent: 'llm',
          reply: llm.text,
          data: { model: llm.model, usage: llm.usage },
        };
      }
    }

    // Fallback — rules engine's "unknown" reply
    return handle(req, intent);
  },
};
