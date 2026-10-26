import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, MessageCircle, User, Plus, ArrowLeft } from 'lucide-react';
import { Badge, statusColor } from '@/components/ui/Badge';
import { leadsService, Lead } from '@/features/leads/services/leads.service';
import { ClientProfile } from '@/features/leads/components/ClientProfile';
import { FollowUpModal } from '@/features/leads/components/FollowUpModal';
import { AddLeadModal } from '@/features/leads/components/AddLeadModal';
import { WhatsAppModal } from '@/features/leads/components/WhatsAppModal';
import { CanDo } from '@/shared/permissions/CanDo';
import { cn } from '@/shared/utils/cn';

type View = 'all' | 'mine' | 'hot' | 'overdue';

const TABS: { id: View; label: string; sub: string }[] = [
  { id: 'all',     label: 'Leads',              sub: 'Total leads' },
  { id: 'mine',    label: "Today's follow-ups", sub: 'Need attention today' },
  { id: 'hot',     label: 'Hot leads',          sub: 'Active & priority hot' },
  { id: 'overdue', label: 'Backlogs',           sub: 'Follow-ups overdue' },
];

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysUntil(d: string) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return Math.round((x.getTime() - t.getTime()) / 86400000);
}

export default function UserPanelPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const passedName = (location.state as any)?.userName as string | undefined;

  const [view, setView] = useState<View>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [followupLead, setFollowupLead] = useState<string | null>(null);
  const [waLead, setWaLead] = useState<{ id: string; name: string; phone: string | null } | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-panel-leads', userId, view, search, page],
    queryFn: () =>
      leadsService.list({
        view: 'user',
        userId,
        search: search || undefined,
        page,
        pageSize: 20,
      } as any),
    enabled: !!userId,
  });

  const counts = (data as any)?.meta?.counts;
  const countFor = (id: View) =>
    id === 'all' ? counts?.all ?? 0
    : id === 'mine' ? counts?.mine ?? 0
    : id === 'hot' ? counts?.hot ?? 0
    : counts?.overdue ?? 0;

  const followupLeadObj = followupLead
    ? (data as any)?.data.find((l: Lead) => l.id === followupLead) ?? null
    : null;

  const ownerName =
    passedName ||
    (data as any)?.data?.[0]?.assignedTo?.name ||
    "user's";

  return (
    <div className="space-y-4 pb-24">
      {/* Back */}
      <button
        onClick={() => navigate('/team-performance')}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-ink-border bg-white text-[13px] font-medium text-ink hover:bg-ink-bg"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Leads</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Viewing <strong>{ownerName}</strong>'s panel
          </p>
        </div>

        <CanDo permission="leads:create">
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white
                       text-[13.5px] font-medium hover:bg-brand-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
        </CanDo>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setView(t.id); setPage(1); }}
            className={cn(
              'bg-white border rounded-xl px-3.5 py-3 text-left shadow-sm transition-all',
              view === t.id
                ? 'border-brand ring-1 ring-brand'
                : 'border-ink-border hover:border-brand/40'
            )}
          >
            <span className="block text-[13px] text-ink-muted">{t.label}</span>
            <strong className="block text-[26px] font-bold text-ink leading-tight">
              {countFor(t.id)}
            </strong>
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, phone, project…"
            className="flex-1 min-w-[180px] px-3 py-2 border border-ink-border rounded-md
                       text-[14px] bg-ink-bg focus:outline-none focus:border-brand focus:bg-white"
          />
        </div>

        {isLoading && (
          <div className="py-8 text-center text-[13px] text-ink-muted">Loading leads…</div>
        )}
        {error && (
          <div className="py-6 text-center text-[13px] text-danger">Failed to load leads.</div>
        )}
        {data && (data as any).data.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[14px] text-ink-muted">No leads in this user's scope.</p>
            <CanDo permission="leads:create">
              <button
                onClick={() => setAddOpen(true)}
                className="mt-3 text-brand text-[13.5px] font-medium hover:underline"
              >
                + Add a lead for {ownerName}
              </button>
            </CanDo>
          </div>
        )}

        {data && (data as any).data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] min-w-[1050px] border-collapse">
                <thead>
                  <tr>
                    {[
                      'PRIORITY', 'NAME', 'NEXT FOLLOW-UP', 'PHONE · ACTIONS',
                      'STATUS', 'COMPANY', 'DESCRIPTION', 'SOURCE', 'CREATED', 'ACTION',
                    ].map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "text-left text-brand text-[13px] font-semibold px-2 py-2 border-b border-ink-border whitespace-nowrap",
                          h === 'ACTION' && "sticky right-0 bg-white shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)] z-10"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data as any).data.map((lead: Lead) => (
                    <PanelLeadRow
                      key={lead.id}
                      lead={lead}
                      onOpen={() => setOpenClient(lead.id)}
                      onFollowup={() => setFollowupLead(lead.id)}
                      onWhatsApp={() => setWaLead({
                        id: lead.id,
                        name: lead.name,
                        phone: lead.phone,
                      })}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {(data as any).meta.totalPages > 1 && (
              <div className="border-t border-ink-border pt-3 mt-1 flex items-center justify-between">
                <div className="text-[12px] text-ink-muted">
                  Page {(data as any).meta.page} of {(data as any).meta.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-ink-border rounded-md text-[13px] bg-white
                               hover:border-brand hover:text-brand disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= (data as any).meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 border border-ink-border rounded-md text-[13px] bg-white
                               hover:border-brand hover:text-brand disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <ClientProfile leadId={openClient} onClose={() => setOpenClient(null)} />

      <FollowUpModal
        lead={followupLeadObj}
        onClose={() => setFollowupLead(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['user-panel-leads'] });
        }}
      />

      <AddLeadModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultAssignedToId={userId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['user-panel-leads'] });
        }}
      />

      <WhatsAppModal lead={waLead} onClose={() => setWaLead(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// PanelLeadRow — with "Changed by" column
// ─────────────────────────────────────────────
function PanelLeadRow({
  lead, onOpen, onFollowup, onWhatsApp,
}: {
  lead: Lead & { lastChangedBy?: { id: string; name: string | null } | null };
  onOpen: () => void;
  onFollowup: () => void;
  onWhatsApp: () => void;
}) {
  const overdue = lead.nextFollowupAt && daysUntil(lead.nextFollowupAt) < 0;
  const isHot = lead.priority === 'HOT';
  const isClosed = lead.status === 'WON' || lead.status === 'LOST';

  const call = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.phone) return;
    window.location.href = `tel:+${lead.phone.replace(/\D/g, '')}`;
  };

  // "Changed by X" — only shows if actor differs from assignee
  const actor = lead.lastChangedBy;
  const owner = lead.assignedTo;
  const showChangedBy = actor && owner && actor.id !== owner.id;

  return (
    <tr className="group border-b border-ink-border last:border-0 hover:bg-brand-light transition-colors">
      <td className="px-2 py-2.5 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              isHot ? 'bg-orange-500'
                : lead.priority === 'HIGH' ? 'bg-red-500'
                : lead.priority === 'MEDIUM' ? 'bg-amber-400'
                : 'bg-gray-400'
            )}
          />
          <span className="text-[13px] font-medium text-ink">
            {isHot ? '🔥 Hot' : lead.priority.charAt(0) + lead.priority.slice(1).toLowerCase()}
          </span>
        </span>
      </td>

      <td className="px-2 py-2.5">
        <button
          onClick={onOpen}
          className="font-semibold text-ink text-left underline decoration-ink-border underline-offset-2 hover:decoration-brand"
        >
          {lead.name}
        </button>
      </td>

      <td className="px-2 py-2.5 whitespace-nowrap">
        {lead.nextFollowupAt ? (
          overdue ? (
            <div>
              <span className="text-danger font-semibold text-[13px]">
                🔴 Overdue by {Math.abs(daysUntil(lead.nextFollowupAt))}d
              </span>
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
          <button
            onClick={call}
            disabled={!lead.phone}
            title={`Call ${lead.name}`}
            className="w-[34px] h-[34px] rounded-full border border-ink-border bg-white
                       inline-grid place-items-center text-ink hover:bg-brand-light
                       disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            <Phone className="w-[17px] h-[17px]" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onWhatsApp(); }}
            disabled={!lead.phone}
            title={`WhatsApp ${lead.name}`}
            className="w-[34px] h-[34px] rounded-full border border-ink-border bg-white
                       inline-grid place-items-center text-wa hover:bg-brand-light
                       disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            <MessageCircle className="w-[17px] h-[17px]" />
          </button>
          <button
            onClick={onOpen}
            title="Client profile"
            className="w-[34px] h-[34px] rounded-full border border-ink-border bg-white
                       inline-grid place-items-center text-ink hover:bg-brand-light transition-colors"
          >
            <User className="w-[17px] h-[17px]" />
          </button>
        </div>
      </td>

      <td className="px-2 py-2.5">
        <Badge color={statusColor(lead.status)}>{lead.status}</Badge>
      </td>

      <td className="px-2 py-2.5 text-[13px] text-ink">{lead.company ?? '—'}</td>

      <td className="px-2 py-2.5 max-w-[160px] w-[160px]">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] text-ink" style={{ maxWidth: '130px' }}>
            {lead.notes || '—'}
          </span>
          {lead.notes && (
            <button
              onClick={onOpen}
              className="text-brand font-bold text-[10px] border border-brand rounded-full w-4 h-4 flex items-center justify-center hover:bg-brand hover:text-white transition-colors shrink-0"
            >
              i
            </button>
          )}
        </div>
      </td>

      <td className="px-2 py-2.5 text-[13px] text-ink">{lead.source ?? '—'}</td>

      <td className="px-2 py-2.5 text-ink-muted whitespace-nowrap text-[13px]">
        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-GB') : '—'}
      </td>

      <td className="px-2 py-2.5 whitespace-nowrap sticky right-0 bg-white group-hover:bg-brand-light shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)] transition-colors z-10">
        <CanDo permission="followups:create">
          <button
            onClick={onFollowup}
            disabled={isClosed}
            className={cn(
              'px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors',
              isClosed
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-brand text-white hover:bg-brand-hover shadow-sm'
            )}
          >
            {isClosed ? 'Closed' : 'Follow-up'}
          </button>
        </CanDo>
      </td>
    </tr>
  );
}
