// @ts-nocheck — TODO: fix types
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, MessageCircle, User, Plus, X, Trash2, UserPlus, Tag , Upload, Download} from 'lucide-react';
import { Badge, statusColor } from '@/components/ui/Badge';
import { leadsService, Lead } from '../services/leads.service';
import { ClientProfile } from '../components/ClientProfile';
import { FollowUpModal } from '../components/FollowUpModal';
import { AddLeadModal } from '../components/AddLeadModal';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { CanDo } from '@/shared/permissions/CanDo';
import { AccessDenied } from '@/shared/permissions/AccessDenied';
import { cn } from '@/shared/utils/cn';
import { api } from '@/shared/api/client';
import { BulkImportModal } from '../components/BulkImportModal';
import * as XLSX from 'xlsx';

type View = 'all' | 'mine' | 'hot' | 'overdue' | 'won' | 'lost';

const TABS: { id: View; label: string; sub: string }[] = [
  { id: 'all',     label: 'Leads',              sub: 'Total leads' },
  { id: 'mine',    label: 'My Leads',           sub: 'Assigned to me' },
  { id: 'today',   label: "Today's follow-ups", sub: 'Need attention today' },
  { id: 'hot',     label: 'Hot leads',          sub: 'Active & priority hot' },
  { id: 'overdue', label: 'Backlogs',           sub: 'Follow-ups overdue' },
  { id: 'won',     label: 'Converted',          sub: 'Won leads' },
  { id: 'lost',    label: 'Lost leads',         sub: 'Closed as lost' },
];

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysUntil(d: string) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return Math.round((x.getTime() - t.getTime()) / 86400000);
}

export default function LeadsPage() {
  const queryClient = useQueryClient();
  
  // 👇 DEFAULT CHANGED TO 'mine' SO IT OPENS ON YOUR LEADS
  const [view, setView] = useState<View>('mine');
  
  const [search, setSearch] = useState('');
  const [selectedLeadForDesc, setSelectedLeadForDesc] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [followupLead, setFollowupLead] = useState<string | null>(null);
  const [waLead, setWaLead] = useState<{ id: string; name: string; phone: string | null } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', view, search, page],
    queryFn: () => leadsService.list({ view, search: search || undefined, page, pageSize: 20 }),
  });

  const isForbidden = (error as any)?.response?.status === 403;
  if (isForbidden) return <AccessDenied module="Leads" />;

  const counts = data?.meta?.counts;
  const countFor = (id: View) =>
    id === 'all' ? counts?.all ?? 0
    : id === 'today' ? counts?.today ?? 0
    : id === 'hot' ? counts?.hot ?? 0
    : id === 'overdue' ? counts?.overdue ?? 0
    : id === 'won' ? counts?.won ?? 0
    : id === 'mine' ? counts?.mine ?? 0
    : counts?.lost ?? 0;

  const followupLeadObj = followupLead
    ? data?.data.find((l) => l.id === followupLead) ?? null
    : null;

  const allIds = useMemo(() => data?.data.map((l) => l.id) ?? [], [data]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await leadsService.list({ page: 1, pageSize: 100 });
      const allLeads: any[] = res.data ?? [];
      let page = 2;
      while (page <= (res.meta?.totalPages ?? 1) && allLeads.length < 5000) {
        const next = await leadsService.list({ page, pageSize: 100 });
        allLeads.push(...(next.data ?? []));
        page++;
      }
      if (allLeads.length === 0) {
        alert('No leads to export');
        return;
      }
      const rows = allLeads.map((l: any) => ({
        Name: l.name ?? '',
        Phone: l.phone ?? '',
        'Project Name': l.company ?? '',
        Service: l.service ?? '',
        Source: l.source ?? '',
        Status: l.status ?? '',
        Priority: l.priority ?? '',
        Value: l.value ?? '',
        'Next Follow-up': l.nextFollowupAt ? new Date(l.nextFollowupAt).toISOString().slice(0, 10) : '',
        Notes: l.notes ?? '',
        'Assigned To': l.assignedTo?.name ?? '',
        Created: l.createdAt ? new Date(l.createdAt).toISOString().slice(0, 10) : '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, `leads-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const clearSelection = () => setSelected(new Set());

  // ── Bulk actions ──
  const doBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected leads? This cannot be undone.`)) return;
    try {
      await api.post('/leads/bulk/delete', { leadIds: [...selected] });
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed');
    }
  };

  const doBulkStatus = async (status: string) => {
    try {
      await api.post('/leads/bulk/status', { leadIds: [...selected], status });
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Leads</h1>
        <CanDo permission="leads:create">
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> New Lead
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-ink-border bg-white text-ink text-[13.5px] font-medium hover:bg-brand-light hover:border-brand transition-colors"
          >
            <Upload className="w-4 h-4" /> Bulk Lead
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-ink-border bg-white text-ink text-[13.5px] font-medium hover:bg-brand-light hover:border-brand transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export'}
          </button>
        </CanDo>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setView(t.id); setPage(1); clearSelection(); }}
            className={cn(
              'bg-white border rounded-xl px-3.5 py-3 text-left shadow-sm transition-all',
              view === t.id ? 'border-brand ring-1 ring-brand' : 'border-ink-border hover:border-brand/40'
            )}
          >
            <span className="block text-[13px] text-ink-muted">{t.label}</span>
            <strong className="block text-[26px] font-bold text-ink leading-tight">{countFor(t.id)}</strong>
            <span className="block text-[12px] text-ink-muted">{t.sub}</span>
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="bg-white border border-ink-border rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-wrap gap-2.5 mb-3">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); clearSelection(); }}
            placeholder="Search name, phone, project…"
            className="flex-1 min-w-[180px] px-3 py-2 border border-ink-border rounded-md text-[14px] bg-ink-bg focus:outline-none focus:border-brand focus:bg-white"
          />
        </div>

        {isLoading && <div className="py-8 text-center text-[13px] text-ink-muted">Loading leads…</div>}
        {error && !isForbidden && <div className="py-6 text-center text-[13px] text-danger">Failed to load leads.</div>}
        {data && data.data.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[14px] text-ink-muted">No leads available.</p>
          </div>
        )}

        {data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] min-w-[1100px] border-collapse">
                <thead>
                  <tr>
                    <th className="w-10 px-2 py-2 border-b border-ink-border">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="w-4 h-4 accent-brand cursor-pointer"
                        aria-label="Select all"
                      />
                    </th>
                    {[
                      'PRIORITY', 'NAME', 'NEXT FOLLOW-UP', 'PHONE · ACTIONS',
                      'STATUS', 'COMPANY', 'DESCRIPTION', 'SOURCE', 'ACTION',
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-brand text-[13px] font-semibold px-2 py-2 border-b border-ink-border whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      isSelected={selected.has(lead.id)}
                      onToggleSelect={() => toggleOne(lead.id)}
                      onOpen={() => setOpenClient(lead.id)}
                      onFollowup={() => setFollowupLead(lead.id)}
                      onWhatsApp={() => setWaLead({ id: lead.id, name: lead.name, phone: lead.phone })}
                    onDescClick={setSelectedLeadForDesc} />
                  ))}
                </tbody>
              </table>
            </div>

            {data.meta.totalPages > 1 && (
              <div className="border-t border-ink-border pt-3 mt-1 flex items-center justify-between">
                <div className="text-[12px] text-ink-muted">Page {data.meta.page} of {data.meta.totalPages}</div>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); clearSelection(); }}
                    className="px-3 py-1.5 border border-ink-border rounded-md text-[13px] bg-white hover:border-brand hover:text-brand disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= data.meta.totalPages}
                    onClick={() => { setPage((p) => p + 1); clearSelection(); }}
                    className="px-3 py-1.5 border border-ink-border rounded-md text-[13px] bg-white hover:border-brand hover:text-brand disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ FLOATING BULK ACTION BAR ═══ */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-ink-border rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap max-w-[90vw]">
          <div className="flex items-center gap-2 pr-3 border-r border-ink-border">
            <span className="text-[13px] font-medium text-ink">{selected.size} selected</span>
            <button
              onClick={clearSelection}
              className="w-6 h-6 rounded-md text-ink-muted hover:bg-brand-light grid place-items-center"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <CanDo permission="leads:assign">
            <button
              onClick={() => setAssignOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-ink-border text-[12.5px] text-ink hover:border-brand hover:text-brand transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Assign
            </button>
          </CanDo>

          <CanDo permission="leads:update">
            <div className="relative">
              <select
                onChange={(e) => e.target.value && doBulkStatus(e.target.value)}
                defaultValue=""
                className="appearance-none pl-7 pr-3 py-1.5 rounded-md border border-ink-border text-[12.5px] text-ink hover:border-brand cursor-pointer bg-white"
              >
                <option value="" disabled>Change status</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <Tag className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
            </div>
          </CanDo>

          <CanDo permission="leads:delete">
            <button
              onClick={doBulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 border border-red-200 text-[12.5px] text-danger hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </CanDo>
        </div>
      )}

      {/* Modals */}
      <ClientProfile leadId={openClient} onClose={() => setOpenClient(null)} />
      <FollowUpModal
        lead={followupLeadObj}
        onClose={() => setFollowupLead(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
      />
      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => { setImportOpen(false); queryClient.invalidateQueries({ queryKey: ['leads'] }); }}
      />

      <AddLeadModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
      />
      <WhatsAppModal lead={waLead} onClose={() => setWaLead(null)} />

      {assignOpen && (
        <BulkAssignModal
          leadIds={[...selected]}
          onClose={() => setAssignOpen(false)}
          onSuccess={() => {
            setAssignOpen(false);
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }}
        />
      )}

      {selectedLeadForDesc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedLeadForDesc(null)}>
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
                    {selectedLeadForDesc.notes || 'No description provided.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="bg-teal-700 text-white px-2 py-0.5 rounded-full font-medium">Assigned</span>
                    <span className="text-teal-800 font-bold">{selectedLeadForDesc.assignedTo?.name || 'Unassigned'}</span>
                    <span className="text-gray-500 font-medium">{new Date(selectedLeadForDesc.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 flex justify-end">
              <button onClick={() => setSelectedLeadForDesc(null)} className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─────────── LeadRow ───────────
function LeadRow({
  lead, isSelected, onToggleSelect, onOpen, onFollowup, onWhatsApp,
  onDescClick,
}: {
  lead: Lead;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onFollowup: () => void;
  onWhatsApp: () => void;
  onDescClick: (lead: any) => void;
}) {
  const overdue = lead.nextFollowupAt && daysUntil(lead.nextFollowupAt) < 0;
  const isHot = lead.priority === 'HOT';
  const isClosed = lead.status === 'WON' || lead.status === 'LOST';

  const call = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.phone) return;
    window.location.href = `tel:+${lead.phone.replace(/\D/g, '')}`;
  };

  return (
    <tr className={cn('border-b border-ink-border last:border-0 hover:bg-brand-light transition-colors', isSelected && 'bg-brand-light/50')}>
      <td className="px-2 py-2.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 accent-brand cursor-pointer"
        />
      </td>
      <td className="px-2 py-2.5 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('w-2.5 h-2.5 rounded-full',
            isHot ? 'bg-orange-500'
            : lead.priority === 'HIGH' ? 'bg-red-500'
            : lead.priority === 'MEDIUM' ? 'bg-amber-400'
            : 'bg-gray-400'
          )} />
          <span className="text-[13px] font-medium text-ink">
            {isHot ? '🔥 Hot' : lead.priority.charAt(0) + lead.priority.slice(1).toLowerCase()}
          </span>
        </span>
      </td>
      <td className="px-2 py-2.5">
        <button onClick={onOpen} className="font-semibold text-ink text-left underline decoration-ink-border underline-offset-2 hover:decoration-brand">
          {lead.name}
        </button>
      </td>
      <td className="px-2 py-2.5 whitespace-nowrap">
        {lead.nextFollowupAt ? (
          overdue ? (
            <div>
              <span className="text-danger font-semibold text-[13px]">🔴 Overdue by {Math.abs(daysUntil(lead.nextFollowupAt))}d</span>
              <br />
              <small className="text-ink-muted">{fmtDate(lead.nextFollowupAt)}</small>
            </div>
          ) : (
            <span className="text-[13px] text-ink">{fmtDate(lead.nextFollowupAt)}</span>
          )
        ) : (
          <span className="text-[13px] text-danger">No follow-up set</span>
        )}
      </td>
      <td className="px-2 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-ink">{lead.phone ?? '—'}</span>
          <button onClick={call} disabled={!lead.phone} title={`Call ${lead.name}`}
            className="w-[34px] h-[34px] rounded-full border border-ink-border bg-white inline-grid place-items-center text-ink hover:bg-brand-light disabled:opacity-35 disabled:cursor-not-allowed transition-colors">
            <Phone className="w-[17px] h-[17px]" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onWhatsApp(); }} disabled={!lead.phone} title={`WhatsApp ${lead.name}`}
            className="w-[34px] h-[34px] rounded-full border border-ink-border bg-white inline-grid place-items-center text-wa hover:bg-brand-light disabled:opacity-35 disabled:cursor-not-allowed transition-colors">
            <MessageCircle className="w-[17px] h-[17px]" />
          </button>
          <button onClick={onOpen} title="Client profile"
            className="w-[34px] h-[34px] rounded-full border border-ink-border bg-white inline-grid place-items-center text-ink hover:bg-brand-light transition-colors">
            <User className="w-[17px] h-[17px]" />
          </button>
        </div>
      </td>
      <td className="px-2 py-2.5">
        <Badge color={statusColor(lead.status)}>{lead.status}</Badge>
      </td>
      <td className="px-2 py-2.5 text-[13px] text-ink">{lead.company ?? '—'}</td>
      <td className="px-2 py-2.5 max-w-[160px] w-[160px]">
        <div className="flex items-center justify-between gap-1.5">
          <span className="truncate text-[13px] text-ink flex-1">{lead.notes || '—'}</span>
          {lead.notes && (
            <button
              onClick={(e) => { e.stopPropagation(); onDescClick(lead); }}
              className="text-brand font-bold text-[10px] border border-brand rounded-full w-4 h-4 flex items-center justify-center hover:bg-brand hover:text-white transition-colors shrink-0"
            >
              i
            </button>
          )}
        </div>
      </td>
      
      <td className="px-2 py-2.5 text-[13px] text-ink">{lead.source ?? '—'}</td>
      <td className="px-2 py-2.5 whitespace-nowrap">
        <CanDo permission="followups:create">
          <button
            onClick={onFollowup}
            disabled={isClosed}
            className={cn(
              'px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors',
              isClosed ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-brand text-white hover:bg-brand-hover'
            )}
          >
            {isClosed ? 'Closed' : 'Follow-up'}
          </button>
        </CanDo>
      </td>
    </tr>
  );
}

// ─────────── BulkAssignModal ───────────
function BulkAssignModal({
  leadIds, onClose, onSuccess,
}: {
  leadIds: string[]; onClose: () => void; onSuccess: () => void }) {
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useState(() => {
    api.get('/users?pageSize=200')
      .then((r) => setUsers(r.data.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  });

  const submit = async () => {
    if (!userId) { setError('Pick a user'); return; }
    try {
      await api.post('/leads/bulk/assign', { leadIds, assignedToId: userId });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[440px] w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">Assign {leadIds.length} lead{leadIds.length > 1 ? 's' : ''}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        <div className="px-5 py-4">
          {loading ? (
            <div className="py-6 text-center text-[13px] text-ink-muted">Loading users…</div>
          ) : (
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand"
            >
              <option value="">— Pick a user —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          )}
          {error && <div className="mt-3 text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={submit} disabled={!userId}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}