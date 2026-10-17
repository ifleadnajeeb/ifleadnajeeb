import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, CheckSquare, Users, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { operationsService } from '@/features/operations/services/operations.service';
import { customersService } from '@/features/customers/services/customers.service';
import { tasksService } from '@/features/tasks/services/tasks.service';
import { useAuth } from '@/app/providers/auth-provider';

export default function OPDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Fetch Projects
  const { data: projects } = useQuery({
    queryKey: ['operations', 'projects'],
    queryFn: operationsService.listProjects,
  });

  // Fetch Customers
  const { data: customersResponse, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersService.list({ page: 1, pageSize: 10 }),
  });
  const customers = customersResponse?.data || [];

  // Fetch Daily Reports
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['daily-reports'],
    queryFn: operationsService.listDailyReports,
  });

  // Fetch Pending Reviews
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Operations Dashboard</h1>
        <p className="text-[13.5px] text-ink-muted mt-0.5">
          Welcome back, {user?.name}. Here is your operational overview.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Active Projects</p>
              <h2 className="text-3xl font-bold text-ink mt-1">{projects?.length || 0}</h2>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Briefcase className="w-5 h-5" /></div>
          </div>
        </div>

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
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Pending Tasks</p>
              <h2 className="text-3xl font-bold text-ink mt-1">0</h2>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CheckSquare className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Total Customers</p>
              <h2 className="text-3xl font-bold text-ink mt-1">{customersResponse?.meta?.total || customers.length || 0}</h2>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      {/* Work Review & Approvals */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-border bg-amber-50">
          <h2 className="text-base font-semibold text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Work Awaiting Review ({reviewTasks.length})
          </h2>
        </div>
        <div className="p-4">
          {reviewTasks.length === 0 ? (
            <div className="text-center py-4 text-ink-muted text-sm">No tasks awaiting review. Great job!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewTasks.map((t: any) => (
                <div key={t.id} className="border border-ink-border rounded-lg p-4">
                  <h3 className="font-medium text-ink">{t.title}</h3>
                  <p className="text-[12px] text-ink-muted mt-1">Submitted by: {t.assignedTo?.name}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApprove(t.id)} className="flex-1 bg-green-600 text-white rounded py-1.5 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => handleCorrect(t.id)} className="flex-1 border border-amber-300 text-amber-700 rounded py-1.5 text-sm font-medium hover:bg-amber-50 flex items-center justify-center gap-1">
                      <XCircle className="w-4 h-4" /> Correct
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout for Converted Leads & Work Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Converted Leads / Customers */}
        <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-ink-border flex justify-between items-center">
            <h2 className="text-base font-semibold text-ink">Converted Leads (Customers)</h2>
            <a href="/customers" className="text-[12px] text-brand hover:underline">View all</a>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px]">
            {customersLoading ? (
              <div className="p-5 text-center text-ink-muted text-sm">Loading customers...</div>
            ) : customers.length === 0 ? (
              <div className="p-8 text-center text-ink-muted text-sm">No customers found.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-ink-bg text-[11px] uppercase tracking-wider text-ink-muted font-semibold sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Company</th>
                    <th className="px-4 py-2">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c: any) => (
                    <tr key={c.id} className="border-t border-ink-border hover:bg-ink-bg/50">
                      <td className="px-4 py-2.5 font-medium text-ink">{c.name}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{c.company || '—'}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{c.owner?.name || 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Employee Work Reports */}
        <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-ink-border flex justify-between items-center">
            <h2 className="text-base font-semibold text-ink">Recent Employee Work Reports</h2>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px] p-4 space-y-3">
            {reportsLoading ? (
              <div className="text-center text-ink-muted text-sm py-4">Loading reports...</div>
            ) : !reports || reports.length === 0 ? (
              <div className="text-center text-ink-muted text-sm py-4">No work reports submitted yet.</div>
            ) : (
              reports.map((r: any) => (
                <div key={r.id} className="border border-ink-border rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium text-ink text-[13.5px]">{r.task?.title || 'Unknown Task'}</div>
                    <span className="text-[11px] text-ink-muted bg-white px-2 py-0.5 rounded border border-ink-border">
                      {r.task?.assignedTo?.name || 'Employee'}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-ink-muted mt-1">"{r.workCompleted}"</p>
                  {r.blockers && <p className="text-[11px] text-red-500 mt-1">Blocker: {r.blockers}</p>}
                  {r.timeSpent && <p className="text-[11px] text-ink-muted mt-1">{r.timeSpent} hours spent</p>}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
