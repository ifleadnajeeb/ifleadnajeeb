import { useState, useEffect } from 'react';
import { api } from '@/shared/api/client';
import { Loader2 } from 'lucide-react';

export function AttendancePage() {
  const [view, setView] = useState<'logs' | 'daily' | 'weekly' | 'monthly'>('logs');
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Logs
  useEffect(() => {
    if (view !== 'logs') return;
    setLoading(true);
    api.get('/attendance')
      .then(res => setLogs(res.data.data || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [view]);

  // Fetch Summary (Daily/Weekly/Monthly)
  useEffect(() => {
    if (view === 'logs') return;
    setLoading(true);
    api.get(`/attendance/summary?period=${view}`)
      .then(res => setSummary(res.data.data || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [view]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Attendance</h1>
        <p className="text-[14px] text-ink-muted mt-1">Track employee check-ins, check-outs, and working hours</p>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-3 mb-6 bg-white p-2 rounded-lg border border-ink-border w-fit">
        <span className="text-sm font-medium text-ink-muted px-2">View:</span>
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

      <div className="bg-white border border-ink-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-brand"><Loader2 className="animate-spin w-6 h-6" /></div>
        ) : view === 'logs' ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-ink-border text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Check In</th>
                <th className="px-4 py-3 font-medium">Check Out</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-border">
              {logs.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-ink">{r.user?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">{r.user?.role || 'N/A'}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{new Date(r.checkIn).toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">
                    {new Date(r.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-red-600 font-medium">
                    {r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${r.checkOut ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                      {r.checkOut ? 'Completed' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-ink-muted">No records found.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-ink-border text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-center">Days Worked</th>
                <th className="px-4 py-3 font-medium text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-border">
              {summary.map((row) => (
                <tr key={row.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">{row.role}</span>
                  </td>
                  <td className="px-4 py-3 text-center">{row.daysWorked}</td>
                  <td className="px-4 py-3 text-right font-semibold text-brand">{row.totalHours} hrs</td>
                </tr>
              ))}
              {summary.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-ink-muted">No summary data for this period.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
