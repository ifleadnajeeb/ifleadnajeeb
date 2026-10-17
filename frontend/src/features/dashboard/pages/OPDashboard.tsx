import { useQuery } from '@tanstack/react-query';
import { Briefcase, CheckSquare, Users, AlertCircle } from 'lucide-react';
import { operationsService } from '@/features/operations/services/operations.service';
import { useAuth } from '@/app/providers/auth-provider';

export default function OPDashboard() {
  const { user } = useAuth();

  // Fetch Projects
  const { data: projects } = useQuery({
    queryKey: ['operations', 'projects'],
    queryFn: operationsService.listProjects,
  });

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
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Pending Tasks</p>
              <h2 className="text-3xl font-bold text-ink mt-1">0</h2>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CheckSquare className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Awaiting Review</p>
              <h2 className="text-3xl font-bold text-ink mt-1">0</h2>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertCircle className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Team Members</p>
              <h2 className="text-3xl font-bold text-ink mt-1">0</h2>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      {/* Recent Projects Table */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-border">
          <h2 className="text-base font-semibold text-ink">Active Projects & Requirements</h2>
        </div>
        {!projects || projects.length === 0 ? (
          <div className="p-8 text-center text-ink-muted">No active projects. Go to the Operations tab to create one.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-ink-bg text-[12px] uppercase tracking-wider text-brand font-semibold">
              <tr>
                <th className="px-5 py-3">Project Name</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-ink-border hover:bg-ink-bg/50">
                  <td className="px-5 py-3 font-medium text-ink">{p.name}</td>
                  <td className="px-5 py-3 text-ink-muted">{p.customer?.name || 'No Customer Linked'}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700">{p.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="text-brand hover:underline text-[13px] font-medium">Assign Work</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
