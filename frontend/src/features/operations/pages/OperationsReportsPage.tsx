import { useQuery } from '@tanstack/react-query';
import { Building2, Clock, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { operationsService } from '../services/operations.service';

export default function OperationsReportsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['operations-analytics'],
    queryFn: operationsService.getAnalytics,
  });

  const handleExportCSV = () => {
    if (!analytics || analytics.length === 0) return;

    const headers = ['Department', 'Active Tasks', 'Completed Tasks', 'Total Hours Logged'];
    const rows = analytics.map((d: any) => [
      `"${d.name}"`,
      d.activeTasks,
      d.completedTasks,
      d.totalHours
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `team_timesheets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Team Workload & Timesheets</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">Department-wise task distribution and hours logged</p>
        </div>
        <button 
          onClick={handleExportCSV}
          disabled={!analytics || analytics.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-border">
          <h2 className="text-base font-semibold text-ink">Department Analytics</h2>
        </div>
        
        {isLoading ? (
          <div className="p-10 text-center text-ink-muted">Loading analytics...</div>
        ) : !analytics || analytics.length === 0 ? (
          <div className="p-10 text-center text-ink-muted">No departments created yet. Go to Operations Settings to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-ink-bg text-[12px] uppercase tracking-wider text-brand font-semibold">
                <tr>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4 text-center">Active Tasks</th>
                  <th className="px-6 py-4 text-center">Completed Tasks</th>
                  <th className="px-6 py-4 text-right">Total Hours Logged</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((d: any) => (
                  <tr key={d.id} className="border-t border-ink-border hover:bg-ink-bg/50">
                    <td className="px-6 py-4 font-medium text-ink flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-brand" /> {d.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium text-[13px]">
                        <AlertCircle className="w-3.5 h-3.5" /> {d.activeTasks}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium text-[13px]">
                        <CheckCircle className="w-3.5 h-3.5" /> {d.completedTasks}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[13px]">
                        <Clock className="w-3.5 h-3.5" /> {d.totalHours} hrs
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
