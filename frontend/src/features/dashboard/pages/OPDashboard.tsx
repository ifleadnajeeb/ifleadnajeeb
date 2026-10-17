import { useQuery } from '@tanstack/react-query';
import { Briefcase, CheckSquare, Users, AlertCircle, Building2 } from 'lucide-react';
import { operationsService } from '@/features/operations/services/operations.service';
import { customersService } from '@/features/customers/services/customers.service';
import { useAuth } from '@/app/providers/auth-provider';

export default function OPDashboard() {
  const { user } = useAuth();

  // Fetch Projects
  const { data: projects } = useQuery({
    queryKey: ['operations', 'projects'],
    queryFn: operationsService.listProjects,
  });

  // Fetch Converted Leads (Customers)
  const { data: customersResponse, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersService.list({ page: 1, pageSize: 10 }),
  });

  const customers = customersResponse?.data || [];

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
              <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Total Customers</p>
              <h2 className="text-3xl font-bold text-ink mt-1">{customersResponse?.meta?.total || customers.length || 0}</h2>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users className="w-5 h-5" /></div>
          </div>
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
            <a href="/tasks" className="text-[12px] text-brand hover:underline">View all</a>
          </div>
          <div className="p-8 text-center text-ink-muted text-sm flex flex-col items-center justify-center">
            <Building2 className="w-8 h-8 text-ink-muted/50 mb-2" />
            <p>Employee daily reports will appear here.</p>
            <p className="text-[12px] mt-1 text-ink-muted/70">(Coming in Phase 5)</p>
          </div>
        </div>

      </div>
    </div>
  );
}
