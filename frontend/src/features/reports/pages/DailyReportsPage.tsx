import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar as CalIcon, Clock, CheckCircle, AlertCircle, FileText, Download } from 'lucide-react';
import { operationsService } from '@/features/operations/services/operations.service';
import { cn } from '@/shared/utils/cn';

export default function DailyReportsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [search, setSearch] = useState('');
  
  // Default to Today for daily, this week for weekly, etc.
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ['daily-reports', startDate, endDate, search, activeTab],
    queryFn: () => operationsService.listDailyReports({ startDate, endDate, search }),
  });

  const reports = Array.isArray(data) ? data : (data?.data || []);
  const summary = data?.summary || { totalHours: 0, completedTasks: 0, uniqueEmployees: 0, totalReports: 0 };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Daily Work Reports</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">View all employee timesheets and daily progress updates</p>
        </div>
        <button className="h-9 px-4 rounded-md border border-ink-border bg-white text-[13px] font-medium flex items-center gap-2 hover:bg-gray-50">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['daily', 'weekly', 'monthly'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  'px-6 py-1.5 rounded-md text-[13px] font-medium capitalize transition-colors',
                  activeTab === tab ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Date Range & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white border border-ink-border rounded-md px-3 h-9">
              <CalIcon className="w-4 h-4 text-ink-muted" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-[12.5px] outline-none bg-transparent" />
              <span className="text-ink-muted text-[12px]">to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-[12.5px] outline-none bg-transparent" />
            </div>
            
            <select className="h-9 px-3 border border-ink-border rounded-md text-[13px] bg-white focus:outline-none focus:border-brand">
              <option value="">All Departments</option>
              {/* Add department options dynamically later */}
            </select>

            <div className="relative w-full sm:w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search employee, task..."
                className="w-full h-9 pl-9 pr-3 border border-ink-border rounded-md text-[13px] focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Total Reports</div>
            <div className="text-xl font-bold text-ink">{summary.totalReports}</div>
          </div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Total Hours</div>
            <div className="text-xl font-bold text-ink">{summary.totalHours}</div>
          </div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Completed Tasks</div>
            <div className="text-xl font-bold text-ink">{summary.completedTasks}</div>
          </div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-brand" />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Active Employees</div>
            <div className="text-xl font-bold text-ink">{summary.uniqueEmployees}</div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[900px]">
            <thead className="bg-gray-50 border-b border-ink-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted font-semibold">
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Task</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 w-[150px]">Progress</th>
                <th className="px-5 py-3">Hours</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-border">
              {isLoading && (
                <tr><td colSpan={7} className="p-10 text-center text-ink-muted">Loading reports...</td></tr>
              )}
              {!isLoading && reports.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-ink-muted">No reports found for this date range.</td></tr>
              )}
              {(Array.isArray(reports) ? reports : []).map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center font-bold text-[12px]">
                        {r.employee?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-ink">{r.employee?.name || 'Unknown'}</div>
                        <div className="text-[11px] text-ink-muted">{r.employee?.department?.name || 'General'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-ink">{r.task?.title || 'N/A'}</div>
                  </td>
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${r.progress || 0}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold text-ink w-8 text-right">{r.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium text-ink">{r.timeSpent ? `${r.timeSpent}h` : '-'}</td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold",
                      r.progress === 100 ? "bg-green-100 text-green-700" :
                      r.workStatus === 'Blocked' ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {r.progress === 100 ? 'Completed' : (r.workStatus || 'In Progress')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
