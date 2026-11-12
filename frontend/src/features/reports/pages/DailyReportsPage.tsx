import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, Calendar as CalIcon, Clock, CheckCircle, AlertCircle, 
  FileText, Download, LayoutList, Users, X 
} from 'lucide-react';
import { operationsService } from '@/features/operations/services/operations.service';
import { cn } from '@/shared/utils/cn';

export default function DailyReportsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [viewMode, setViewMode] = useState<'detailed' | 'employee'>('detailed');
  const [search, setSearch] = useState('');
  
  // 👇 State for the Dropdowns 👇
  const [selectedWork, setSelectedWork] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const [selectedReport, setSelectedReport] = useState<any>(null);

  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const handleTabChange = (tab: 'daily' | 'weekly' | 'monthly') => {
    setActiveTab(tab);
    const now = new Date();
    
    if (tab === 'daily') {
      const d = new Date().toISOString().split('T')[0];
      setStartDate(d);
      setEndDate(d);
    } else if (tab === 'weekly') {
      const lastWeek = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
      setStartDate(lastWeek);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else if (tab === 'monthly') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(new Date().toISOString().split('T')[0]);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['daily-reports', startDate, endDate, search, activeTab],
    queryFn: () => operationsService.listDailyReports({ startDate, endDate, search }),
  });

  const rawReports = Array.isArray(data?.data) ? data.data : [];

  // Extract unique work names
  const uniqueWorks = Array.from(new Set(
    rawReports.map((r: any) => r.task?.title).filter(Boolean)
  )).sort();

  // Extract unique employees
  const uniqueEmployees = Array.from(new Map(
    rawReports.map((r: any) => [r.employeeId, { id: r.employeeId, name: r.employee?.name || 'Unknown' }])
  ).values()).sort((a: any, b: any) => a.name.localeCompare(b.name));

  // Filter reports based on BOTH dropdowns
  const filteredReports = rawReports.filter((r: any) => {
    const matchesWork = selectedWork === 'all' || r.task?.title === selectedWork;
    const matchesEmployee = selectedEmployee === 'all' || r.employeeId === selectedEmployee;
    return matchesWork && matchesEmployee;
  });

  // Recalculate summary based on filtered reports
  const summary = {
    totalReports: filteredReports.length,
    totalHours: filteredReports.reduce((sum: number, r: any) => sum + (r.timeSpent || 0), 0),
    completedTasks: filteredReports.filter((r: any) => r.progress === 100 || r.workStatus === 'Completed').length,
    uniqueEmployees: new Set(filteredReports.map((r: any) => r.employeeId)).size
  };

  // Aggregate data for Employee Summary
  const employeeSummaries = filteredReports.reduce((acc: any, report: any) => {
    const empId = report.employeeId;
    if (!acc[empId]) {
      acc[empId] = {
        name: report.employee?.name || 'Unknown',
        department: report.employee?.department?.name || 'General',
        totalReports: 0,
        totalHours: 0,
        completedTasks: 0,
        inProgress: 0,
      };
    }
    acc[empId].totalReports += 1;
    acc[empId].totalHours += (report.timeSpent || 0);
    if (report.progress === 100 || report.workStatus === 'Completed') {
      acc[empId].completedTasks += 1;
    } else {
      acc[empId].inProgress += 1;
    }
    return acc;
  }, {});

  const employeeList = Object.values(employeeSummaries);

  const handleExport = () => {
    if (!filteredReports || filteredReports.length === 0) {
      alert("No reports to export");
      return;
    }

    const headers = ['Employee', 'Department', 'Task', 'Work Completed', 'Date', 'Progress', 'Hours', 'Status', 'Submitted'];
    
    const csvRows = filteredReports.map((r: any) => [
      `"${r.employee?.name || 'Unknown'}"`,
      `"${r.employee?.department?.name || 'General'}"`,
      `"${r.task?.title || 'N/A'}"`,
      `"${(r.workCompleted || '').replace(/"/g, '""')}"`, 
      `"${new Date(r.createdAt).toLocaleDateString('en-GB')}"`,
      `"${r.progress || 0}%"`,
      `"${r.timeSpent || 0}h"`,
      `"${r.progress === 100 ? 'Completed' : (r.workStatus || 'In Progress')}"`,
      `"${new Date(r.createdAt).toLocaleTimeString('en-IN')}"`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reports-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Daily Work Reports</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">View all employee timesheets and daily progress updates</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-ink-bg p-1 rounded-lg border border-ink-border">
            <button
              onClick={() => setViewMode('detailed')}
              className={cn('px-3 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors', viewMode === 'detailed' ? 'bg-white shadow-sm text-ink' : 'text-ink-muted hover:text-ink')}
            >
              <LayoutList className="w-3.5 h-3.5" /> Detailed
            </button>
            <button
              onClick={() => setViewMode('employee')}
              className={cn('px-3 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors', viewMode === 'employee' ? 'bg-white shadow-sm text-ink' : 'text-ink-muted hover:text-ink')}
            >
              <Users className="w-3.5 h-3.5" /> Employee Summary
            </button>
          </div>
          
          <button 
            onClick={handleExport}
            className="h-9 px-4 rounded-md border border-ink-border bg-white text-[13px] font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['daily', 'weekly', 'monthly'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab as any)}
                className={cn(
                  'px-6 py-1.5 rounded-md text-[13px] font-medium capitalize transition-colors',
                  activeTab === tab ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white border border-ink-border rounded-md px-3 h-9">
              <CalIcon className="w-4 h-4 text-ink-muted" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-[12.5px] outline-none bg-transparent" />
              <span className="text-ink-muted text-[12px]">to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-[12.5px] outline-none bg-transparent" />
            </div>
            
            {/* 👇 NEW: Employees Dropdown 👇 */}
            <select 
              value={selectedEmployee} 
              onChange={e => setSelectedEmployee(e.target.value)}
              className="h-9 px-3 border border-ink-border rounded-md text-[13px] bg-white focus:outline-none focus:border-brand max-w-[160px]"
            >
              <option value="all">All Employees</option>
              {uniqueEmployees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>

            {/* Works Dropdown */}
            <select 
              value={selectedWork} 
              onChange={e => setSelectedWork(e.target.value)}
              className="h-9 px-3 border border-ink-border rounded-md text-[13px] bg-white focus:outline-none focus:border-brand max-w-[160px]"
            >
              <option value="all">All Works</option>
              {uniqueWorks.map((work: any) => (
                <option key={work} value={work}>{work}</option>
              ))}
            </select>

            <div className="relative w-full sm:w-[200px]">
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
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-blue-600" /></div>
          <div><div className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Total Reports</div><div className="text-xl font-bold text-ink">{summary.totalReports}</div></div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div><div className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Total Hours</div><div className="text-xl font-bold text-ink">{summary.totalHours}</div></div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0"><CheckCircle className="w-5 h-5 text-green-600" /></div>
          <div><div className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Completed Tasks</div><div className="text-xl font-bold text-ink">{summary.completedTasks}</div></div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center shrink-0"><AlertCircle className="w-5 h-5 text-brand" /></div>
          <div><div className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Active Employees</div><div className="text-xl font-bold text-ink">{summary.uniqueEmployees}</div></div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          
          {viewMode === 'detailed' && (
            <table className="w-full text-[13px] min-w-[900px]">
              <thead className="bg-gray-50 border-b border-ink-border">
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted font-semibold">
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Task</th>
                  <th className="px-5 py-3 text-left font-semibold text-ink-muted">Work Completed</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 w-[150px]">Progress</th>
                  <th className="px-5 py-3">Hours</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-border">
                {isLoading && <tr><td colSpan={8} className="p-10 text-center text-ink-muted">Loading reports...</td></tr>}
                {!isLoading && filteredReports.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-ink-muted">No reports found for this selection.</td></tr>}
                
                {filteredReports.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center font-bold text-[12px]">{r.employee?.name?.charAt(0) || 'U'}</div>
                        <div>
                          <div className="font-semibold text-ink">{r.employee?.name || 'Unknown'}</div>
                          <div className="text-[11px] text-ink-muted">{r.employee?.department?.name || 'General'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-ink">{r.task?.title || 'N/A'}</td>
                    <td className="px-5 py-3 text-left max-w-[200px]">
                      <div className="flex items-center gap-1 text-[13px] text-ink-muted">
                        <span className="truncate" title={r.workCompleted}>{r.workCompleted || '—'}</span>
                        {r.workCompleted && r.workCompleted.length > 20 && (
                          <button 
                            onClick={() => setSelectedReport(r)} 
                            className="text-brand text-[11px] font-medium hover:underline shrink-0"
                          >
                            [View]
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${r.progress || 0}%` }} /></div>
                        <span className="text-[11px] font-semibold text-ink w-8 text-right">{r.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-ink">{r.timeSpent ? `${r.timeSpent}h` : '-'}</td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", r.progress === 100 ? "bg-green-100 text-green-700" : r.workStatus === 'Blocked' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700")}>
                        {r.progress === 100 ? 'Completed' : (r.workStatus || 'In Progress')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{new Date(r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {viewMode === 'employee' && (
            <table className="w-full text-[13px] min-w-[800px]">
              <thead className="bg-gray-50 border-b border-ink-border">
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted font-semibold">
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3 text-center">Total Reports</th>
                  <th className="px-5 py-3 text-center">Total Hours</th>
                  <th className="px-5 py-3 text-center">Completed Tasks</th>
                  <th className="px-5 py-3 text-center">In Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-border">
                {isLoading && <tr><td colSpan={5} className="p-10 text-center text-ink-muted">Loading...</td></tr>}
                {!isLoading && employeeList.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-ink-muted">No reports found for this selection.</td></tr>}
                
                {employeeList.map((emp: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center font-bold text-[12px]">{emp.name.charAt(0)}</div>
                        <div>
                          <div className="font-semibold text-ink">{emp.name}</div>
                          <div className="text-[11px] text-ink-muted">{emp.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-ink">{emp.totalReports}</td>
                    <td className="px-5 py-3 text-center font-bold text-brand">{emp.totalHours} hrs</td>
                    <td className="px-5 py-3 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-700">{emp.completedTasks} Done</span></td>
                    <td className="px-5 py-3 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700">{emp.inProgress} Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      </div>

      {/* VIEW REPORT MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedReport(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[500px] w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">Report Details</h2>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Employee</p>
                <p className="font-medium text-ink">{selectedReport.employee?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Task</p>
                <p className="font-medium text-ink">{selectedReport.task?.title || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Work Completed</p>
                <p className="text-[14px] bg-gray-50 p-3 rounded-md border border-gray-100 whitespace-pre-wrap text-ink mt-1">
                  {selectedReport.workCompleted || 'No description provided.'}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-sm text-gray-500">Hours</p>
                  <p className="font-medium text-ink">{selectedReport.timeSpent || 0}h</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Progress</p>
                  <p className="font-medium text-ink">{selectedReport.progress || 0}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={cn("font-medium", selectedReport.progress === 100 ? "text-green-600" : "text-blue-600")}>
                    {selectedReport.progress === 100 ? 'Completed' : (selectedReport.workStatus || 'In Progress')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setSelectedReport(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-[14px] font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
