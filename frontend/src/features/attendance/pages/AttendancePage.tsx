import { useState, useEffect } from 'react';
import { api } from '@/shared/api/client';
import { Loader2 } from 'lucide-react';

export function AttendancePage() {
  const [view, setView] = useState<'logs' | 'daily' | 'weekly' | 'monthly'>('logs');
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const endpoint = view === 'logs' ? '/attendance' : `/attendance/summary?period=${view}`;
    
    api.get(endpoint)
      .then(res => {
        const data = res.data.data || [];
        if (view === 'logs') setLogs(data);
        else setSummary(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [view]);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  };

  const calcDuration = (inStr: string, outStr: string | null) => {
    if (!outStr) return 'Active';
    const ms = new Date(outStr).getTime() - new Date(inStr).getTime();
    if (ms < 0) return 'Error'; // Prevent negative times
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Attendance</h1>
        <p className="text-[14px] text-ink-muted mt-1">Track employee check-ins, check-outs, and working hours</p>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-3 mb-6 bg-white p-2 rounded-lg border border-ink-border w-fit">
        <span className="text-sm font-medium text-ink-muted px-2">Report Mode:</span>
        {['logs', 'daily', 'weekly', 'monthly'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              view === v ? 'bg-brand text-white' : 'text-ink hover:bg-gray-100'
            }`}
          >
            {v === 'logs' ? 'Raw Logs' : v}
          </button>
        ))}
      </div>

      <div className="bg-white border border-ink-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center text-brand"><Loader2 className="animate-spin w-6 h-6" /></div>
        ) : view === 'logs' ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-ink-border text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Login</th>
                <th className="px-4 py-3 font-medium">Logout</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-border">
              {logs.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{r.user?.name || 'Unknown'}</div>
                    <div className="text-xs text-ink-muted">{r.user?.role?.name || r.user?.role}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatDate(r.checkIn)}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">{formatTime(r.checkIn)}</td>
                  <td className="px-4 py-3 text-red-500 font-medium">{formatTime(r.checkOut)}</td>
                  <td className="px-4 py-3 font-medium">{calcDuration(r.checkIn, r.checkOut)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      r.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 
                      r.status === 'TIMED_OUT' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {r.status || 'COMPLETED'}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-ink-muted">No attendance logs found.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-ink-border text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium text-center">Days Worked</th>
                <th className="px-4 py-3 font-medium text-center">Sessions</th>
                <th className="px-4 py-3 font-medium text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-border">
              {summary.map((row) => (
                <tr key={row.userId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{row.name}</div>
                    <div className="text-xs text-ink-muted">{row.role?.name || row.role}</div>
                  </td>
                  <td className="px-4 py-3 text-center">{row.daysWorked}</td>
                  <td className="px-4 py-3 text-center">{row.sessions}</td>
                  <td className="px-4 py-3 text-right font-semibold text-brand">{row.totalHours} hrs</td>
                </tr>
              ))}
              {summary.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-ink-muted">No summary data found for this period.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


export default AttendancePage;
