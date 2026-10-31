import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Shield, User, Calendar, Filter } from 'lucide-react';
import { auditService } from '../services/audit.service';

function fmt(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function actionColor(action: string) {
  if (action.includes('login')) return 'bg-green-100 text-green-700';
  if (action.includes('logout')) return 'bg-gray-100 text-gray-700';
  if (action.includes('delete')) return 'bg-red-100 text-red-700';
  if (action.includes('create') || action.includes('add')) return 'bg-blue-100 text-blue-700';
  if (action.includes('update') || action.includes('edit')) return 'bg-amber-100 text-amber-700';
  return 'bg-purple-100 text-purple-700';
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: actionsList } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: auditService.actions,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, action, from, to],
    queryFn: () => auditService.list({ page, pageSize: 50, action: action || undefined, from: from || undefined, to: to || undefined }),
  });

  const logs = data?.data || [];
  const meta = data?.meta;

  const filtered = search
    ? logs.filter((l: any) =>
        (l.actor?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.entityType || '').toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Audit Logs</h1>
        <p className="text-[13.5px] text-ink-muted mt-0.5">Complete activity trail of every action across your CRM</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, action..."
              className="w-full h-9 pl-9 pr-3 border border-ink-border rounded-md text-[13px] focus:outline-none focus:border-brand"
            />
          </div>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="h-9 px-3 border border-ink-border rounded-md text-[13px] bg-white focus:outline-none focus:border-brand"
          >
            <option value="">All Actions</option>
            {actionsList?.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="h-9 px-3 border border-ink-border rounded-md text-[13px] focus:outline-none focus:border-brand"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="h-9 px-3 border border-ink-border rounded-md text-[13px] focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[900px]">
            <thead className="bg-gray-50 border-b border-ink-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted font-semibold">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Who</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-border">
              {isLoading && (
                <tr><td colSpan={5} className="p-8 text-center text-ink-muted">Loading audit logs...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-ink-muted">No audit logs found.</td></tr>
              )}
              {filtered.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{fmt(log.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-light text-brand flex items-center justify-center text-[11px] font-bold">
                        {(log.actor?.name || 'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-ink">{log.actor?.name || 'System'}</div>
                        <div className="text-[11px] text-ink-muted">{log.actor?.role || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">
                    {log.entityType ? (
                      <span className="text-[12px]">
                        <strong className="text-ink">{log.entityType}</strong>
                        {log.entityId && <span className="opacity-60"> · {log.entityId.slice(0, 8)}</span>}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-ink-muted font-mono text-[11.5px]">
                    {log.ipAddress || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="border-t border-ink-border px-5 py-3 flex items-center justify-between">
            <span className="text-[12px] text-ink-muted">
              Page {meta.page} of {meta.totalPages} · {meta.total} total events
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
