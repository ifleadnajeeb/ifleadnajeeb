import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, LogOut, CheckCircle } from 'lucide-react';
import { api } from '@/shared/api/client';
import { useState } from 'react';

export default function AttendancePage() {
  const qc = useQueryClient();
  const [clockingOut, setClockingOut] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const res = await api.get('/attendance');
      return res.data.data;
    },
  });

  const handleClockOut = async () => {
    if (!confirm('Are you sure you want to clock out for today?')) return;
    setClockingOut(true);
    try {
      await api.post('/attendance/clock-out');
      qc.invalidateQueries({ queryKey: ['attendance'] });
    } catch (e) {
      alert('Failed to clock out');
    } finally {
      setClockingOut(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Attendance</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">Track daily employee check-ins and check-outs</p>
        </div>
        <button
          onClick={handleClockOut}
          disabled={clockingOut}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] font-medium hover:bg-red-700 disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          {clockingOut ? 'Clocking out...' : 'Clock Out'}
        </button>
      </div>

      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-ink-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted font-semibold">
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Check In</th>
                <th className="px-5 py-3">Check Out</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-border">
              {isLoading && (
                <tr><td colSpan={5} className="p-8 text-center text-ink-muted">Loading attendance...</td></tr>
              )}
              {!isLoading && data?.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-ink-muted">No attendance records found.</td></tr>
              )}
              {data?.map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-ink">{record.user?.name}</div>
                    <div className="text-[11px] text-ink-muted">{record.user?.role?.name}</div>
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
