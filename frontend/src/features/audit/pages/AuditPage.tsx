import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter } from 'lucide-react';
import { auditService, AuditEntry, tintFor } from '../services/audit.service';
import { cn } from '@/shared/utils/cn';

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', page, search, actionFilter],
    queryFn: () => auditService.list({
      page, pageSize: 50,
      action: actionFilter || undefined,
    }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Audit Logs</h1>
        <p className="text-[13.5px] text-ink-muted mt-0.5">
          Immutable record of every sensitive action in the system
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-ink-border rounded-xl p-3.5 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Filter by action (e.g. lead.create)…"
            className="w-full h-10 pl-9 pr-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-ink-muted" />
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
          >
            <option value="">All actions</option>
            {['lead.create', 'lead.update', 'lead.delete', 'lead.assign',
              'followup.complete', 'appointment.create', 'appointment.update',
              'customer.create', 'customer.convert_lead',
              'task.create', 'task.update', 'task.move',
              'user.create', 'org.update'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        {isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
        {error && <div className="py-12 text-center text-danger text-sm">Failed to load audit logs.</div>}
        {data && data.data.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-ink-muted text-sm">No audit entries match this filter.</p>
          </div>
        )}
        {data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-ink-bg">
                <tr className="text-left text-[12px] uppercase tracking-wider text-brand font-semibold">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">IP</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {data.(Array.isArray(data) ? data : (data?.data || [])).map(a => (
                  <tr key={a.id} className="border-t border-ink-border hover:bg-brand-light/40">
                    <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{fmt(a.createdAt)}</td>
                    <td className="px-5 py-3">
                      {a.actor ? (
                        <div>
                          <div className="text-ink font-medium text-[13px]">{a.actor.name}</div>
                          <div className="text-[11.5px] text-ink-muted">{a.actor.role}</div>
                        </div>
                      ) : (
                        <span className="text-ink-muted text-[12.5px]">system</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium font-mono', tintFor(a.action))}>
                        {a.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink-muted text-[12.5px]">
                      {a.entityType}
                      {a.entityId && <span className="ml-1.5 text-ink-muted/60">#{a.entityId.slice(-6)}</span>}
                    </td>
                    <td className="px-5 py-3 text-ink-muted text-[12px] font-mono">{a.ipAddress ?? '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setSelected(a)}
                        className="text-brand text-[12.5px] font-medium hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.meta.totalPages > 1 && (
          <div className="border-t border-ink-border px-5 py-3 flex items-center justify-between">
            <span className="text-[12px] text-ink-muted">Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} entries</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">Previous</button>
              <button disabled={page >= data.meta.totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelected(null)} />
          <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[520px] bg-white shadow-2xl flex flex-col">
            <div className="border-b border-ink-border px-5 py-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Audit detail</h2>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-[13px]">
              <Row label="ID" value={selected.id} mono />
              <Row label="Action" value={selected.action} mono />
              <Row label="Entity" value={`${selected.entityType}${selected.entityId ? ' #' + selected.entityId.slice(-8) : ''}`} />
              <Row label="When" value={fmt(selected.createdAt)} />
              <Row label="Actor" value={selected.actor ? `${selected.actor.name} (${selected.actor.email})` : 'system'} />
              <Row label="Role" value={selected.actor?.role ?? '—'} />
              <Row label="IP" value={selected.ipAddress ?? '—'} mono />
              <Row label="User Agent" value={selected.userAgent ?? '—'} />
              {selected.metadata && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1.5">Metadata</div>
                  <pre className="bg-ink-bg border border-ink-border rounded-md p-3 text-[11.5px] overflow-x-auto">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5 border-b border-ink-border last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className={cn('text-ink break-all', mono && 'font-mono text-[12px]')}>{value}</span>
    </div>
  );
}
