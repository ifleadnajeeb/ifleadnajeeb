import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, Calendar as CalIcon, User, Coffee } from 'lucide-react';
import { api } from '@/shared/api/client';
import { cn } from '@/shared/utils/cn';

const MODES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const formatIST = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(dateStr));
};

export default function AttendancePage() {
  const [mode, setMode] = useState('daily');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; date: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', mode, dateStr],
    queryFn: async () => {
      const res = await api.get('/attendance', { params: { mode, date: dateStr } });
      return res.data;
    },
  });

  const { data: userLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['attendance-user', selectedUser?.id, selectedUser?.date],
    queryFn: async () => {
      if (!selectedUser) return null;
      const res = await api.get(`/attendance/user/${selectedUser.id}`, { params: { date: selectedUser.date } });
      return res.data.data;
    },
    enabled: !!selectedUser,
  });

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Attendance</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">Track employee check-ins, check-outs, and working hours</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="h-10 px-3 border border-ink-border rounded-md text-[13.5px] bg-white focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="bg-white border border-ink-border rounded-xl p-2 shadow-sm inline-flex flex-wrap gap-1">
        <span className="px-3 py-2 text-[13.5px] text-ink-muted font-medium">Report Mode:</span>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-[13.5px] font-medium transition-colors',
              mode === m.id ? 'bg-brand text-white shadow-sm' : 'text-ink hover:bg-ink-bg'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        {isLoading && <div className="p-12 text-center text-ink-muted text-sm">Loading attendance data...</div>}
        
        {!isLoading && data?.data?.length === 0 && (
          <div className="p-16 text-center text-ink-muted text-sm">
            <CalIcon className="w-8 h-8 mx-auto mb-3 opacity-30" />
            No records found for this period.
          </div>
        )}

        {!isLoading && data?.data?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f9fa] text-[11.5px] uppercase tracking-wider text-ink-muted font-semibold border-b border-ink-border">
                <tr>
                  <th className="text-left px-5 py-3">Employee</th>
                  {mode === 'daily' ? (
                    <>
                      <th className="text-left px-5 py-3">Date</th>
                      <th className="text-left px-5 py-3">First Login</th>
                      <th className="text-left px-5 py-3">Last Logout</th>
                      <th className="text-left px-5 py-3">Break Times</th>
                      <th className="text-left px-5 py-3">Total Break</th>
                      <th className="text-left px-5 py-3">Total Hours</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-5 py-3">Days Worked</th>
                      <th className="text-left px-5 py-3">Total Hours</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.data.map((row: any, i: number) => (
                  <tr key={row.id || i} className="border-b border-ink-border last:border-0 hover:bg-brand-light/10 transition-colors">
                    <td className="px-5 py-3 align-top">
                      <button
                        onClick={() => setSelectedUser({ 
                          id: row.userId, 
                          name: row.user?.name, 
                          date: row.date ? new Date(row.date).toISOString().split('T')[0] : dateStr 
                        })}
                        className="text-left group"
                      >
                        <p className="font-semibold text-ink group-hover:text-brand transition-colors">{row.user?.name}</p>
                        <p className="text-[11.5px] text-ink-muted uppercase mt-0.5">{row.user?.role?.name || row.user?.role}</p>
                      </button>
                    </td>

                    {mode === 'daily' ? (
                      <>
                        <td className="px-5 py-3 text-ink-muted align-top">
                          {row.firstLogin ? format(new Date(row.firstLogin), 'dd/MM/yyyy') : '—'}
                        </td>
                        <td className="px-5 py-3 text-green-600 font-medium align-top">
                          {row.firstLogin ? formatIST(row.firstLogin) : '—'}
                        </td>
                        <td className="px-5 py-3 text-red-500 font-medium align-top">
                          {row.lastLogout 
                            ? formatIST(row.lastLogout) 
                            : <span className="text-ink-muted text-[12px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded">Active</span>}
                        </td>
                        
                        {/* Break Times */}
                        <td className="px-5 py-3 align-top">
                          {row.breaks && row.breaks.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {row.breaks.map((b: any, idx: number) => (
                                <span key={idx} className="text-[11.5px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 inline-flex items-center gap-1.5 w-fit">
                                  <Coffee className="w-3 h-3" /> {formatIST(b.start)} - {formatIST(b.end)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>

                        <td className="px-5 py-3 text-amber-700 font-medium align-top">
                          {row.totalBreakHours > 0 ? `${row.totalBreakHours} hrs` : '—'}
                        </td>

                        <td className="px-5 py-3 text-brand font-medium align-top">
                          {row.totalHours > 0 ? `${row.totalHours.toFixed(1)} hrs` : '—'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 text-ink align-top">{row.daysPresent} days</td>
                        <td className="px-5 py-3 text-brand font-medium align-top">{row.totalHours} hrs</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-ink-border flex items-center justify-between bg-ink-bg/50">
              <div>
                <h3 className="text-[16px] font-bold text-ink flex items-center gap-2">
                  <User className="w-4 h-4 text-brand" /> {selectedUser.name}
                </h3>
                <p className="text-[12px] text-ink-muted mt-0.5">All Sessions for {format(new Date(selectedUser.date), 'dd MMM yyyy')}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-1.5 hover:bg-white rounded-md text-ink-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {loadingLogs && <p className="text-center text-sm text-ink-muted py-4">Loading details...</p>}
              
              {!loadingLogs && userLogs?.length === 0 && (
                <p className="text-center text-sm text-ink-muted py-4">No punches recorded for this day.</p>
              )}

              {!loadingLogs && userLogs?.map((log: any, idx: number) => (
                <div key={log.id} className="flex items-center gap-3 p-3 bg-[#f8f9fa] rounded-lg mb-2 border border-[#eee]">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#eee] flex items-center justify-center text-[12px] font-bold text-ink-muted shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="block text-[11px] text-ink-muted uppercase">Login</span>
                      <span className="font-semibold text-green-600">{formatIST(log.checkIn)}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-ink-muted uppercase">Logout</span>
                      <span className="font-semibold text-red-500">
                        {log.checkOut ? formatIST(log.checkOut) : 'Still In'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
