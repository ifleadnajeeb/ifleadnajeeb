import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Flame, TrendingUp, Calendar, CheckSquare, AlertCircle, Activity, ArrowRight } from 'lucide-react';
import { api } from '@/shared/api/client';
import EmployeeDashboard from './EmployeeDashboard';
import { operationsService } from '@/features/operations/services/operations.service';
import { tasksService } from '@/features/tasks/services/tasks.service';
import { useAuth } from '@/app/providers/auth-provider';
import { cn } from '@/shared/utils/cn';

interface Summary {
  role: string;
  range: string;
  leads: { total: number; new: number; hot: number; won: number; lost: number; conversionPct: number };
  followups: { today: number; overdue: number; upcoming: number };
  appointments: { today: number; upcoming: number };
  tasks: { open: number; today: number; overdue: number; done: number };
  activity: { callsToday: number; whatsappToday: number; totalToday: number };
  recentLeads: { id: string; name: string; status: string; priority: string; createdAt: string; assignedTo: string | null }[];
  recentActivities: { id: string; type: string; title: string; createdAt: string; actorName: string | null }[];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardHome() {
  const { user } = useAuth();

  if (['WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'].includes(user?.role || '')) {
    return <EmployeeDashboard />;
  }


  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get<Summary>('/dashboard/summary', { params: { range: 'all' } });
      return res.data;
    },
    refetchInterval: 30000,
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const KPI_ROW_1 = data ? [
    { label: 'Total Leads',       value: String(data.leads.total),           sub: `${data.leads.new} new`, icon: Users,      tint: 'bg-brand-light text-brand',    href: '/leads' },
    { label: "Today's Follow-ups", value: String(data.followups.today),       sub: `${data.followups.overdue} overdue`, icon: Clock, tint: 'bg-amber-50 text-amber-700', href: '/followups' },
    { label: 'Hot Leads',         value: String(data.leads.hot),             sub: 'High priority',              icon: Flame,      tint: 'bg-orange-50 text-orange-700', href: '/leads?view=hot' },
    { label: 'Conversion',        value: `${data.leads.conversionPct}%`,     sub: `${data.leads.won} won`,      icon: TrendingUp, tint: 'bg-emerald-50 text-emerald-700', href: '/reports' },
  ] : [];

  const KPI_ROW_2 = data ? [
    { label: 'Converted',         value: String(data.leads.won),           sub: 'Won leads',                               icon: TrendingUp,   tint: 'bg-emerald-50 text-emerald-700', href: '/leads?view=won' },
    { label: 'Lost Leads',        value: String(data.leads.lost),          sub: 'Closed as lost',                          icon: AlertCircle,  tint: 'bg-red-50 text-red-700',         href: '/leads?view=lost' },
    { label: 'Appointments Today', value: String(data.appointments.today), sub: `${data.appointments.upcoming} upcoming`, icon: Calendar,     tint: 'bg-blue-50 text-blue-700',       href: '/appointments' },
    { label: 'Open Tasks',        value: String(data.tasks.open),         sub: `${data.tasks.today} due today`,           icon: CheckSquare,  tint: 'bg-purple-50 text-purple-700',   href: '/tasks' },
    { label: 'Overdue Tasks',     value: String(data.tasks.overdue),      sub: 'Need attention',                          icon: AlertCircle,  tint: 'bg-orange-50 text-orange-700',   href: '/tasks' },
    { label: 'Activities Today',  value: String(data.activity.totalToday), sub: `${data.activity.whatsappToday} WhatsApp`, icon: Activity,   tint: 'bg-indigo-50 text-indigo-700',   href: '/audit' },
  ] : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {greeting}, {user?.name?.split(' ')[0] ?? 'User'}
          </h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/missions')}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover"
        >
          <TrendingUp className="w-4 h-4" /> My Missions
        </button>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-ink-muted text-sm">Loading dashboard…</div>
      )}

      {data && (
        <>
          {/* KPI Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {KPI_ROW_1.map((k) => (
              <button
                key={k.label}
                onClick={() => navigate(k.href)}
                className="bg-white border border-ink-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-brand/40 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{k.label}</span>
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', k.tint)}>
                    <k.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-[26px] font-bold text-ink leading-tight">{k.value}</div>
                <div className="text-[12.5px] text-ink-muted mt-0.5">{k.sub}</div>
              </button>
            ))}
          </div>

          {/* KPI Row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {KPI_ROW_2.map((k) => (
              <button
                key={k.label}
                onClick={() => navigate(k.href)}
                className="bg-white border border-ink-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-brand/40 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{k.label}</span>
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', k.tint)}>
                    <k.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-[26px] font-bold text-ink leading-tight">{k.value}</div>
                <div className="text-[12.5px] text-ink-muted mt-0.5">{k.sub}</div>
              </button>
            ))}
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Leads */}
            <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">Recent Leads</h2>
                  <p className="text-[12.5px] text-ink-muted">Latest 5 leads in your scope</p>
                </div>
                <button onClick={() => navigate('/leads')} className="text-[12.5px] text-brand font-medium hover:underline inline-flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {data.recentLeads.length === 0 && (
                  <p className="text-[13px] text-ink-muted text-center py-6">No leads yet.</p>
                )}
                {data.recentLeads.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 py-2 border-b border-ink-border last:border-0">
                    <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center text-xs font-bold shrink-0">
                      {l.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium text-ink truncate">{l.name}</div>
                      <div className="text-[12px] text-ink-muted truncate">{l.assignedTo ?? 'Unassigned'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn(
                        'text-[10.5px] px-2 py-0.5 rounded font-semibold uppercase',
                        l.status === 'NEW' ? 'bg-blue-100 text-blue-700'
                        : l.status === 'WON' ? 'bg-emerald-100 text-emerald-700'
                        : l.status === 'LOST' ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                      )}>{l.status}</span>
                      {l.priority === 'HOT' && <span className="ml-1.5 text-[10.5px]">🔥</span>}
                      <div className="text-[11px] text-ink-muted mt-0.5">{timeAgo(l.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">Recent Activity</h2>
                  <p className="text-[12.5px] text-ink-muted">Latest updates in your scope</p>
                </div>
                <button onClick={() => navigate('/audit')} className="text-[12.5px] text-brand font-medium hover:underline inline-flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {data.recentActivities.length === 0 && (
                  <p className="text-[13px] text-ink-muted text-center py-6">No activity yet.</p>
                )}
                {data.recentActivities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-2 border-b border-ink-border last:border-0">
                    <div className="w-8 h-8 rounded-full bg-ink-bg text-ink-muted flex items-center justify-center text-[10px] font-bold shrink-0 uppercase">
                      {a.type.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-ink leading-snug">{a.title}</div>
                      <div className="text-[11.5px] text-ink-muted mt-0.5">
                        {a.actorName ?? 'system'} · {timeAgo(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { label: 'Add Lead',        emoji: '👤', href: '/leads' },
                { label: 'Schedule Follow-up', emoji: '📅', href: '/followups' },
                { label: 'View Hot Leads',  emoji: '🔥', href: '/leads' },
                { label: 'Team Performance', emoji: '👥', href: '/team-performance' },
                { label: 'My Missions',     emoji: '🎯', href: '/missions' },
                { label: 'Open WhatsApp',   emoji: '💬', href: '/whatsapp' },
                { label: 'New Task',        emoji: '✓',  href: '/tasks' },
                { label: 'AI Assistant',    emoji: '✨', href: '/ai' },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.href)}
                  className="flex flex-col items-start gap-1.5 p-3.5 rounded-lg border border-ink-border bg-white hover:border-brand hover:bg-brand-light text-left transition-colors"
                >
                  <span className="text-lg">{a.emoji}</span>
                  <span className="text-[13px] font-medium text-ink">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <TeamOperationsWidget />
    </div>
  );
}


function TeamOperationsWidget() {
  const qc = useQueryClient();
  
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['daily-reports'],
    queryFn: operationsService.listDailyReports,
  });

  const { data: allTasks } = useQuery({
    queryKey: ['tasks', 'all-reviews'],
    queryFn: () => tasksService.list({ pageSize: 100 }),
  });

  const reviewTasks = allTasks?.data?.filter((t: any) => t.reviewStatus === 'PENDING_REVIEW') || [];

  const handleApprove = async (id: string) => {
    try {
      await tasksService.approve(id);
      qc.invalidateQueries({ queryKey: ['tasks'] });
    } catch { alert('Failed to approve'); }
  };

  const handleCorrect = async (id: string) => {
    const reason = prompt('Reason for correction:');
    if (!reason) return;
    try {
      await tasksService.requestCorrection(id, reason);
      qc.invalidateQueries({ queryKey: ['tasks'] });
    } catch { alert('Failed to request correction'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Pending Reviews */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-ink-border flex justify-between items-center bg-amber-50">
          <h2 className="text-base font-semibold text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Work Awaiting Review ({reviewTasks.length})
          </h2>
        </div>
        <div className="flex-1 overflow-auto max-h-[350px] p-4 space-y-3">
          {reviewTasks.length === 0 ? (
            <div className="text-center py-6 text-ink-muted text-sm">No tasks awaiting review. Great job!</div>
          ) : (
            reviewTasks.map((t: any) => (
              <div key={t.id} className="border border-ink-border rounded-lg p-4 bg-white">
                <h3 className="font-medium text-ink">{t.title}</h3>
                <p className="text-[12px] text-ink-muted mt-1">Submitted by: {t.assignedTo?.name}</p>
                {t.deliverableUrl && (
                  <a href={t.deliverableUrl} target="_blank" rel="noreferrer" className="inline-block mt-2 text-[12px] font-medium text-brand hover:underline bg-brand-light px-2 py-1 rounded">
                    🔗 View Deliverable
                  </a>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleApprove(t.id)} className="flex-1 bg-green-600 text-white rounded py-1.5 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => handleCorrect(t.id)} className="flex-1 border border-amber-300 text-amber-700 rounded py-1.5 text-sm font-medium hover:bg-amber-50 flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Correct
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Daily Reports */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-ink-border flex justify-between items-center bg-blue-50">
          <h2 className="text-base font-semibold text-blue-900 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Recent Employee Reports
          </h2>
        </div>
        <div className="flex-1 overflow-auto max-h-[350px] p-4 space-y-3 bg-gray-50">
          {reportsLoading ? (
            <div className="text-center text-ink-muted text-sm py-4">Loading reports...</div>
          ) : !reports || reports.length === 0 ? (
            <div className="text-center text-ink-muted text-sm py-4">No work reports submitted yet.</div>
          ) : (
            reports.map((r: any) => (
              <div key={r.id} className="border border-ink-border rounded-lg p-3 bg-white shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-ink text-[13.5px]">{r.task?.title || 'Unknown Task'}</div>
                  <span className="text-[11px] text-ink-muted bg-gray-100 px-2 py-0.5 rounded border border-ink-border">
                    {r.task?.assignedTo?.name || 'Employee'}
                  </span>
                </div>
                <p className="text-[12.5px] text-ink-muted mt-1 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded">{r.workCompleted}</p>
                {r.blockers && <p className="text-[11px] text-red-500 mt-2 font-medium">⚠️ Blocker: {r.blockers}</p>}
                {r.timeSpent && <p className="text-[11px] text-ink-muted mt-1">⏱ {r.timeSpent} hours spent</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

