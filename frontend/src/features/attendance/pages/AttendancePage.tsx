import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, CheckCircle } from 'lucide-react';
import { api } from '@/shared/api/client';
import { useState } from 'react';

export default function AttendancePage() {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const res = await api.get('/attendance');
      return res.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleClockIn = async () => {
    setLoading(true);
    try {
      await api.post('/attendance/clock-in');
      qc.invalidateQueries({ queryKey: ['attendance'] });
    } catch (e) { alert('Failed to clock in'); }
    finally { setLoading(false); }
  };

  const handleClockOut = async () => {
    if (!confirm('Are you sure you want to clock out for today?')) return;
    setLoading(true);
    try {
      await api.post('/attendance/clock-out');
      qc.invalidateQueries({ queryKey: ['attendance'] });
    } catch (e) { alert('Failed to clock out'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Attendance</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">Track employee check-ins, check-outs, and working hours</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-[13px] font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" /> Clock In
          </button>
          <button
            onClick={handleClockOut}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] font-medium hover:bg-red-700 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" /> Clock Out
          </button>
        </div>
      </div>

      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[800px]">
            <thead className="bg-gray-50 border-b border-ink-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted font-semibold">
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Check In</th>
                <th className="px-5 py-3">Check Out</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-border">
              {isLoading && (
                <tr><td colSpan={6} className="p-8 text-center text-ink-muted">Loading records...</td></tr>
              )}
              {!isLoading && data?.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-ink-muted">No attendance records found. Click "Clock In" to start.</td></tr>
              )}
              {data?.map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-semibold text-ink">{record.user?.name}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium">
                      {record.user?.role?.name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">
                    {new Date(record.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-5 py-3 font-medium text-green-600">
                    {new Date(record.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-3 font-medium text-red-600">
                    {record.checkOut 
                      ? new Date(record.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      record.checkOut ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {record.checkOut ? 'Completed' : 'Active'}
                    </span>
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
