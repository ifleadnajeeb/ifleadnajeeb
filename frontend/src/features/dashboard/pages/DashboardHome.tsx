import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/auth-provider';
import { Link } from 'react-router-dom';
import { 
  Users, Clock, Flame, TrendingUp, AlertCircle, 
  CheckSquare, Calendar, Activity, Briefcase, CheckCircle 
} from 'lucide-react';
import { dashboardService } from '@/features/dashboard/services/dashboard.service';
import { operationsService } from '@/features/operations/services/operations.service';
import { tasksService } from '@/features/tasks/services/tasks.service';
import { customersService } from '@/features/customers/services/customers.service';
import EmployeeDashboard from './EmployeeDashboard';

export default function DashboardHome() {
  const { user } = useAuth();

  if (!user) return null;

  // Route to Employee Dashboard
  if (['WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'].includes(user.role)) {
    return <EmployeeDashboard />;
  }

  // Route to OP Manager Dashboard
  if (user.role === 'OP_MANAGER') {
    return <OPManagerDashboard />;
  }

  // Default Standard CRM Dashboard (BDE, CEO, GM, etc.)
  return <StandardDashboard />;
}

// ─────────────────────────────────────────────────────────────
// 1. STANDARD CRM DASHBOARD
// ─────────────────────────────────────────────────────────────
function StandardDashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardService.getSummary({ range: 'all' }),
  });

  if (isLoading) return <div className="p-10 text-center text-ink-muted">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Good morning, {user?.name.split(' ')[0]}</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Active Leads</p>
              <h2 className="text-3xl font-bold text-ink mt-1">{summary?.leads.total || 0}</h2>
            </div>
            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Users className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Today's Follow-ups</p>
              <h2 className="text-3xl font-bold text-ink mt-1">{summary?.followups.today || 0}</h2>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Hot Leads</p>
              <h2 className="text-3xl font-bold text-ink mt-1">{summary?.leads.hot || 0}</h2>
            </div>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Flame className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Open Tasks</p>
              <h2 className="text-3xl font-bold text-ink mt-1">{summary?.tasks.open || 0}</h2>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CheckSquare className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Recent Leads</h2>
          {!summary?.recentLeads?.length ? (
            <p className="text-sm text-ink-muted text-center py-6">No leads yet.</p>
          ) : (
            <div className="space-y-3">
              {summary.recentLeads.map((l: any) => (
                <div key={l.id} className="flex justify-between items-center border-b border-ink-border pb-2 last:border-0">
                  <div>
                    <div className="font-medium text-ink">{l.name}</div>
                    <div className="text-[12px] text-ink-muted">{l.status} · {l.priority}</div>
                  </div>
                  <Link to={`/leads`} className="text-[12px] text-brand hover:underline">View</Link>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Recent Activity</h2>
          {!summary?.recentActivities?.length ? (
            <p className="text-sm text-ink-muted text-center py-6">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {summary.recentActivities.map((a: any) => (
                <div key={a.id} className="flex gap-3 text-[13px] border-b border-ink-border pb-2 last:border-0">
                  <Activity className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <div className="text-ink">{a.title}</div>
                    <div className="text-[11px] text-ink-muted mt-0.5">{a.actorName} · {new Date(a.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. OP MANAGER DASHBOARD
// ─────────────────────────────────────────────────────────────
function OPManagerDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['daily-reports'],
    queryFn: operationsService.listDailyReports,
    enabled: ['OP_MANAGER', 'ADMIN', 'CEO'].includes(user?.role || ''),
  });

  const { data: allTasks } = useQuery({
    queryKey: ['tasks', 'all-reviews'],
    queryFn: () => tasksService.list({ pageSize: 100 }),
  });

  const { data: customersRes } = useQuery({
    queryKey: ['customers', 'count'],
    queryFn: () => customersService.list({ page: 1, pageSize: 1 }),
  });

  const allTasksList = allTasks?.data || [];
  const reviewTasks = allTasksList.filter((t: any) => t.reviewStatus === 'PENDING_REVIEW');
  const activeTasks = allTasksList.filter((t: any) => t.acceptance === 'ACCEPTED' && t.status !== 'DONE');
  const pendingTasks = allTasksList.filter((t: any) => t.acceptance === 'PENDING');

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

  // Group tasks by employee for the Workload view
  const tasksByEmployee: Record<string, { name: string, tasks: any[] }> = {};
  allTasksList.forEach((t: any) => {
    const empName = t.assignedTo?.name || 'Unassigned';
    if (!tasksByEmployee[empName]) {
      tasksByEmployee[empName] = { name: empName, tasks: [] };
    }
    tasksByEmployee[empName].tasks.push(t);
  });

  // Calculate progress for a task based on the latest daily report
  const getTaskProgress = (task: any) => {
    if (task.status === 'DONE') return 100;
    const taskReports = reports?.filter((r: any) => r.taskId === task.id) || [];
    if (taskReports.length === 0) return task.acceptance === 'ACCEPTED' ? 10 : 0;
    // Get the latest report
    const latestReport = taskReports[0]; // Assuming reports are sorted by date desc
    return latestReport.progress || 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Good morning, {user?.name.split(' ')[0]}</h1>
        <p className="text-[13.5px] text-ink-muted mt-0.5">Here is your Operations overview for today.</p>
      </div>

      {/* Ops KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Awaiting Review</p>
              <h2 className="text-3xl font-bold text-ink mt-1">{reviewTasks.length}</h2>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertCircle className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Active Works</p>
              <h2 className="text-3xl font-bold text-ink mt-1">{activeTasks.length}</h2>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Briefcase className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Pending Accept</p>
              <h2 className="text-3xl font-bold text-ink mt-1">{pendingTasks.length}</h2>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Clock className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Total Customers</p>
              <h2 className="text-3xl font-bold text-ink mt-1">{customersRes?.meta?.total || 0}</h2>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Reviews */}
        <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-ink-border flex justify-between items-center bg-amber-50">
            <h2 className="text-base font-semibold text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Work Awaiting Review
            </h2>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px] p-4 space-y-3">
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

        {/* TEAM WORKLOAD & PROGRESS */}
        <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-ink-border flex justify-between items-center bg-blue-50">
            <h2 className="text-base font-semibold text-blue-900 flex items-center gap-2">
              <Users className="w-4 h-4" /> Team Workload & Active Works
            </h2>
            <Link to="/works" className="text-[12px] text-brand hover:underline">View Works Board</Link>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px] p-4 space-y-4 bg-gray-50">
            {Object.keys(tasksByEmployee).length === 0 ? (
               <div className="text-center text-ink-muted text-sm py-4">No active works assigned yet.</div>
            ) : (
              Object.values(tasksByEmployee).map((emp) => (
                <div key={emp.name} className="bg-white border border-ink-border rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-ink-border">
                    <div className="w-6 h-6 rounded-full bg-brand-light text-brand flex items-center justify-center text-[10px] font-bold">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-ink text-[13.5px]">{emp.name}</span>
                    <span className="text-[11px] text-ink-muted ml-auto">{emp.tasks.length} Tasks</span>
                  </div>
                  <div className="space-y-3">
                    {emp.tasks.map((t: any) => {
                      const progress = getTaskProgress(t);
                      return (
                        <div key={t.id} className="text-[13px]">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-ink truncate max-w-[200px]">{t.title}</span>
                            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', t.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-brand h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                          </div>
                          <div className="text-[10px] text-ink-muted text-right mt-0.5">{progress}% done via daily report</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
