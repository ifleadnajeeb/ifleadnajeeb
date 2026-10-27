import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar as CalIcon, MapPin, User, X } from 'lucide-react';
import { appointmentsService, Appointment } from '../services/appointments.service';
import { cn } from '@/shared/utils/cn';
import { CanDo } from '@/shared/permissions/CanDo';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-amber-100 text-amber-700',
};

function fmtDT(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['appointments', page],
    queryFn: () => appointmentsService.list({ page, pageSize: 30 }),
  });

  const onCancel = async (a: Appointment) => {
    if (!confirm(`Cancel "${a.title}"?`)) return;
    try {
      await appointmentsService.cancel(a.id);
      qc.invalidateQueries({ queryKey: ['appointments'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed');
    }
  };

  const onApprove = async (a: Appointment) => {
    if (!confirm(`Approve "${a.title}"?`)) return;
    try {
      await appointmentsService.approve(a.id);
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed');
    }
  };

  const onDecline = async (a: Appointment) => {
    const reason = prompt(`Decline "${a.title}"? Enter a reason (optional):`);
    if (reason === null) return; // user cancelled
    try {
      await appointmentsService.decline(a.id, reason || undefined);
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Appointments</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">Schedule and manage customer meetings</p>
        </div>
        <CanDo permission="appointments:create">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover"
          >
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </CanDo>
      </div>

      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        {isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
        {error && <div className="py-12 text-center text-danger text-sm">Failed to load appointments.</div>}
        {data && data.data.length === 0 && (
          <div className="py-16 text-center">
            <CalIcon className="w-10 h-10 mx-auto text-ink-muted mb-3" />
            <p className="text-ink-muted text-sm">No appointments yet.</p>
            <p className="text-ink-muted text-[12px] mt-1">Click "New Appointment" to schedule one.</p>
          </div>
        )}
        {data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-ink-bg">
                <tr className="text-left text-[12px] uppercase tracking-wider text-brand font-semibold">
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Lead / Customer</th>
                  <th className="px-5 py-3">For</th>
                  <th className="px-5 py-3">Requested by</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(data) ? data : (data?.data || [])).map((a) => (
                  <tr key={a.id} className="border-t border-ink-border hover:bg-brand-light/40">
                    <td className="px-5 py-3 font-medium text-ink">
                      {a.title}
                      {a.location && (
                        <div className="text-[12px] text-ink-muted flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {a.location}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-muted whitespace-nowrap">
                      {fmtDT(a.startAt)}
                      <div className="text-[11.5px]">to {fmtDT(a.endAt)}</div>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {a.lead?.name || a.customer?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {a.assignedTo?.name ?? a.forUser?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {a.requestedBy?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', STATUS_COLORS[a.status])}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {a.status === 'PENDING' ? (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => onApprove(a)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-600 text-white text-[12px] font-medium hover:bg-emerald-700"
                          >
                            Approve ✓
                          </button>
                          <button
                            onClick={() => onDecline(a)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-red-600 text-white text-[12px] font-medium hover:bg-red-700"
                          >
                            Decline ✕
                          </button>
                        </div>
                      ) : (
                        a.status !== 'CANCELLED' &&
                        a.status !== 'COMPLETED' &&
                        a.status !== 'DECLINED' && (
                          <CanDo permission="appointments:update">
                            <button
                              onClick={() => onCancel(a)}
                              className="px-2.5 py-1 rounded-md border border-ink-border text-[12px] hover:bg-red-50 hover:text-danger hover:border-red-300"
                            >
                              Cancel
                            </button>
                          </CanDo>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.meta.totalPages > 1 && (
          <div className="border-t border-ink-border px-5 py-3 flex items-center justify-between">
            <span className="text-[12px] text-ink-muted">Page {data.meta.page} of {data.meta.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">Previous</button>
              <button disabled={page >= data.meta.totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <NewAppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          qc.invalidateQueries({ queryKey: ['appointments'] });
        }}
      />
    </div>
  );
}

// ─── New Appointment Modal ───
function NewAppointmentModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async () => {
    setError('');
    if (title.trim().length < 2) { setError('Title must be at least 2 characters'); return; }

    const startAt = new Date(`${date}T${start}:00`).toISOString();
    const endAt   = new Date(`${date}T${end}:00`).toISOString();

    setSubmitting(true);
    try {
      await appointmentsService.create({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startAt, endAt,
      });
      setTitle(''); setDescription(''); setLocation('');
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">New Appointment</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder="Client meeting"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Office / Zoom / Customer site"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Start</label>
              <input type="time" value={start} onChange={e => setStart(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">End</label>
              <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
            </div>
          </div>
          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={submit} disabled={submitting}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
