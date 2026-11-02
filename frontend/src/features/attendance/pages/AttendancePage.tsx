import { useState, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, Calendar as CalIcon, User } from 'lucide-react';
import { api } from '@/shared/api/client';
import { cn } from '@/shared/utils/cn';

const MODES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

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

  // ✅ Group Daily data by Employee so they get "one section"
  const groupedDaily = useMemo(() => {
    if (mode !== 'daily' || !data?.data) return [];
    const groups: Record<string, any> = {};
    
    data.data.forEach((session: any) => {
      if (!groups[session.userId]) {
        groups[session.userId] = {
          userId: session.userId,
          user: session.user,
          sessions: [],
        };
      }
      groups[session.userId].sessions.push(session);
    });
    
    // Sort sessions inside each user's group by time
    Object.values(groups).forEach((g: any) => {
      g.sessions.sort((a: any, b: any) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
    });
    
    return Object.values(groups);
  }, [data, mode]);

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
                      <th className="text-left px-5 py-3">Login Time</th>
                      <th className="text-left px-5 py-3">Logout Time</th>
                      <th className="text-left px-5 py-3">Session Hours</th>
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
                {/* ✅ DAILY MODE: Grouped by user (One section per person) */}
                {mode === 'daily' && groupedDaily.map((group: any) => (
                  <Fragment key={group.userId}>
                    {group.sessions.map((session: any, idx: number) => (
                      <tr key={session.id} className={cn("border-b border-ink-border last:border-0 hover:bg-brand-light/10 transition-colors", idx !== 0 && "bg-gray-50/30")}>
                        {idx === 0 && (
                          <td rowSpan={group.sessions.length} className="px-5 py-3 align-top border-r border-ink-border/50">
                            <button
                              onClick={() => setSelectedUser({ 
                                id: group.userId, 
                                name: group.user?.name, 
                                date: dateStr
                              })}
                              className="text-left group"
                            >
                              <p className="font-semibold text-ink group-hover:text-brand transition-colors">{group.user?.name}</p>
                              <p className="text-[11.5px] text-ink-muted uppercase mt-0.5">{group.user?.role?.name || group.user?.role}</p>
                            </button>
                          </td>
                        )}
                        <td className="px-5 py-3 text-ink-muted">
                          {session.checkIn ? format(new Date(session.checkIn), 'dd/MM/yyyy') : '—'}
                        </td>
                        <td className="px-5 py-3 text-green-600 font-medium">
                          {session.checkIn ? format(new Date(session.checkIn), 'hh:mm a') : '—'}
                        </td>
                        <td className="px-5 py-3 text-red-500 font-medium">
                          {session.checkOut 
                            ? format(new Date(session.checkOut), 'hh:mm a') 
                            : <span className="text-ink-muted text-[12px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded">Active</span>}
                        </td>
                        <td className="px-5 py-3 text-ink">
                          {session.totalHours > 0 ? `${session.totalHours.toFixed(1)} hrs` : '—'}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}

                {/* ✅ WEEKLY / MONTHLY MODE: Aggregated */}
                {(mode === 'weekly' || mode === 'monthly') && data.data.map((row: any) => (
                  <tr key={row.id} className="border-b border-ink-border last:border-0 hover:bg-brand-light/10 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-ink">{row.user?.name}</p>
                      <p className="text-[11.5px] text-ink-muted uppercase mt-0.5">{row.user?.role?.name || row.user?.role}</p>
                    </td>
                    <td className="px-5 py-3 text-ink">{row.daysPresent} days</td>
                    <td className="px-5 py-3 text-brand font-medium">{row.totalHours} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Modal (Click name to see all sessions) */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-ink-border flex items-center justify-between bg-ink-bg/50">
              <div>
                <h3 className="text-[16px] font-bold text-ink flex items-center gap-2">
                  <User className="w-4 h-4 text-brand" /> {selectedUser.name}
                </h3>
                <p className="text-[12px] text-ink-muted mt-0.5">Logs for {format(new Date(selectedUser.date), 'dd MMM yyyy')}</p>
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
                      <span className="font-semibold text-green-600">{format(new Date(log.checkIn), 'hh:mm a')}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-ink-muted uppercase">Logout</span>
                      <span className="font-semibold text-red-500">
                        {log.checkOut ? format(new Date(log.checkOut), 'hh:mm a') : 'Still In'}
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
