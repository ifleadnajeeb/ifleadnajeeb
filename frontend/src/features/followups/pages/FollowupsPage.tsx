import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, AlertCircle, Calendar as CalIcon, CheckCircle2 } from 'lucide-react';
import { followupsService, Followup } from '../services/followups.service';
import { cn } from '@/shared/utils/cn';

type Group = 'overdue' | 'today' | 'upcoming' | 'completed';

const TABS: { id: Group; label: string; sub: string; icon: any; tint: string }[] = [
  { id: 'overdue',   label: 'Overdue',   sub: 'Past due',   icon: AlertCircle,  tint: 'text-danger' },
  { id: 'today',     label: 'Today',     sub: 'Due today',  icon: Clock,        tint: 'text-amber-600' },
  { id: 'upcoming',  label: 'Upcoming',  sub: 'Scheduled',  icon: CalIcon,      tint: 'text-brand' },
  { id: 'completed', label: 'Completed', sub: 'Done',       icon: CheckCircle2, tint: 'text-emerald-600' },
];

export default function FollowupsPage() {
  const qc = useQueryClient();
  const [group, setGroup] = useState<Group>('today');
  const [page, setPage] = useState(1);
  const [completing, setCompleting] = useState<string | null>(null);
  const [selectedFollowup, setSelectedFollowup] = useState<Followup | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['followups', group, page],
    queryFn: () => followupsService.list({ group, page, pageSize: 20 }),
  });

  const counts = data?.meta.counts;

  const onComplete = async (f: Followup) => {
    const result = prompt(`Mark "${f.title}" as done.\n\nResult (e.g. Interested, Call back later):`);
    if (result === null) return;
    setCompleting(f.id);
    try {
      await followupsService.complete(f.id, { result: result || undefined });
      qc.invalidateQueries({ queryKey: ['followups'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to complete');
    } finally {
      setCompleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Follow-ups</h1>
        <p className="text-[13.5px] text-ink-muted mt-0.5">Track scheduled calls and reminders</p>
      </div>

      {/* KPI tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const count = counts?.[t.id] ?? 0;
          return (
            <button
              key={t.id}
              onClick={() => { setGroup(t.id); setPage(1); }}
              className={cn(
                'bg-white border rounded-xl px-3.5 py-3 text-left shadow-sm transition-all',
                group === t.id ? 'border-brand ring-1 ring-brand' : 'border-ink-border hover:border-brand/40'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] text-ink-muted">{t.label}</span>
                <Icon className={cn('w-4 h-4', t.tint)} />
              </div>
              <strong className="block text-[26px] font-bold text-ink leading-tight">{count}</strong>
              <span className="block text-[12px] text-ink-muted">{t.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        {isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
        {error && <div className="py-12 text-center text-danger text-sm">Failed to load follow-ups.</div>}

        {data && data.data.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-ink-muted text-sm">No follow-ups in this group.</p>
          </div>
        )}

        {data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-ink-bg">
                <tr className="text-left text-[12px] uppercase tracking-wider text-brand font-semibold">
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Lead</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Due</th>
                  <th className="px-5 py-3">Assigned to</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((f) => {
                  const overdue = f.status === 'PENDING' && new Date(f.dueAt) < new Date();
                  return (
                    <tr key={f.id} className="border-t border-ink-border hover:bg-brand-light/40">
                      <td className="px-5 py-3 font-medium text-ink">{f.title}</td>
                      <td className="px-5 py-3 text-ink-muted">{f.lead?.name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 max-w-[140px]" title={f.description || ''}>
                          <span className="truncate text-[13px] text-ink-muted">{f.description || '—'}</span>
                          {f.description && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedFollowup(f); }}
                              className="text-brand font-bold text-[10px] border border-brand rounded-full w-4 h-4 flex items-center justify-center hover:bg-brand hover:text-white transition-colors shrink-0"
                            >
                              i
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={cn('px-5 py-3 whitespace-nowrap', overdue ? 'text-danger font-medium' : 'text-ink-muted')}>
                        {new Date(f.dueAt).toLocaleDateString('en-GB')}{' '}
                        {new Date(f.dueAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{f.assignedTo?.name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-medium',
                          f.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700'
                          : overdue ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                        )}>
                          {overdue && f.status === 'PENDING' ? 'OVERDUE' : f.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {f.status === 'PENDING' ? (
                          <button
                            onClick={() => onComplete(f)}
                            disabled={completing === f.id}
                            className="px-3 py-1.5 rounded-md bg-brand text-white text-[13px] font-medium hover:bg-brand-hover disabled:opacity-50"
                          >
                            {completing === f.id ? 'Saving…' : 'Mark done'}
                          </button>
                        ) : (
                          <span className="text-[12px] text-ink-muted">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.meta.totalPages > 1 && (
          <div className="border-t border-ink-border px-5 py-3 flex items-center justify-between">
            <span className="text-[12px] text-ink-muted">Page {data.meta.page} of {data.meta.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">Previous</button>
              <button disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {selectedFollowup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedFollowup(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-[420px] w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-blue-600 text-center">
              <h3 className="font-semibold text-white text-[16px]">Description</h3>
            </div>
            <div className="p-6">
              <div className="bg-[#e0f7f4] border border-[#b2e6dd] rounded-lg p-5 relative overflow-hidden">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-300"></div>
                <div className="absolute left-[13px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-400 border border-white"></div>
                
                <div className="ml-6">
                  <p className="text-[14px] font-bold text-blue-800 mb-3 leading-snug">
                    {selectedFollowup.description || 'No description provided.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="bg-teal-700 text-white px-2 py-0.5 rounded-full font-medium">Assigned</span>
                    <span className="text-teal-800 font-bold">{selectedFollowup.assignedTo?.name || 'Unassigned'}</span>
                    <span className="text-gray-500 font-medium">{new Date(selectedFollowup.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 flex justify-end">
              <button onClick={() => setSelectedFollowup(null)} className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
