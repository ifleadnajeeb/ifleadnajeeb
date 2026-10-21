import { useEffect, useState } from 'react';
import { X, CheckCircle2, CalendarClock, UserCheck } from 'lucide-react';
import { api } from '@/shared/api/client';
import { usersService, type AppUser, ROLE_LABEL } from '@/features/users/services/users.service';
import { configService, type ConfigItem } from '@/features/config/services/config.service';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultAssignedToId?: string;
  ownerName?: string;
}

const SOURCES = ['manual', 'website', 'facebook', 'instagram', 'whatsapp', 'referral', 'walk-in'];
const PRIORITIES = ['COLD', 'MEDIUM', 'HOT'];   // ✅ LOW → COLD, removed HIGH
const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];

function cleanPhone(raw: string): { ok: true; phone: string } | { ok: false; msg: string } {
  const d = raw.replace(/\D/g, '');
  if (!d) return { ok: false, msg: 'Enter a phone number' };
  if (d.length === 10 && /^[6-9]/.test(d)) return { ok: true, phone: d };
  if (d.length === 11 && d[0] === '0') return { ok: true, phone: d.slice(1) };
  if (d.length === 12 && d.startsWith('91')) return { ok: true, phone: d };
  if (d.length >= 8 && d.length <= 15) return { ok: true, phone: d };
  return { ok: false, msg: 'Invalid phone number' };
}

export function AddLeadModal({
  open, onClose, onSuccess, defaultAssignedToId, ownerName,
}: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [projectName, setProjectName] = useState('');
  const [source, setSource] = useState('manual');
  const [status, setStatus] = useState('NEW');
  const [priority, setPriority] = useState('MEDIUM');
  const [value, setValue] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [nextFollowupTime, setNextFollowupTime] = useState('');
  const [assignedToId, setAssignedToId] = useState(defaultAssignedToId ?? '');
  const [notes, setNotes] = useState('');
  const [service, setService] = useState('');
  const [services, setServices] = useState<ConfigItem[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load available users when modal opens
  useEffect(() => {
    if (!open) return;
    if (defaultAssignedToId) {
      setAssignedToId(defaultAssignedToId);
    }
    setLoadingUsers(true);
    usersService
      .assignable()
      .then((list) => setUsers(list))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, [open, defaultAssignedToId]);

  useEffect(() => {
    if (!open) return;
    configService
      .list('service')
      .then(setServices)
      .catch(() => setServices([]));
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setName(''); setPhone(''); setProjectName('');
    setSource('manual'); setStatus('NEW'); setPriority('MEDIUM');
    setValue(''); setNextFollowupDate(''); setNextFollowupTime('');
    setAssignedToId(defaultAssignedToId ?? '');
    setNotes(''); setService(''); setError(''); setSuccess(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (name.trim().length < 2) { setError('Name must be at least 2 characters.'); return; }

    let normalizedPhone: string | undefined;
    if (phone.trim()) {
      const r = cleanPhone(phone);
      if (!r.ok) { setError(r.msg); return; }
      normalizedPhone = r.phone;
    }

    // Build combined follow-up timestamp
    let nextFollowupAt: string | undefined;
    if (nextFollowupDate && nextFollowupTime) {
      nextFollowupAt = new Date(`${nextFollowupDate}T${nextFollowupTime}`).toISOString();
    } else if (nextFollowupDate) {
      nextFollowupAt = new Date(`${nextFollowupDate}T09:00`).toISOString();
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        phone: normalizedPhone,
        company: projectName.trim() || undefined,   // backend keeps "company" field, UI shows "Project name"
        source, status, priority,
        value: value ? Number(value) : undefined,
        notes: notes.trim() || undefined,
      };
      if (assignedToId) payload.assignedToId = assignedToId;
      if (service) payload.service = service;
      if (nextFollowupAt) payload.nextFollowupAt = nextFollowupAt;

      console.log('[AddLeadModal] POST /leads payload:', JSON.stringify(payload, null, 2));

      const res = await api.post('/leads', payload);
      console.log('[AddLeadModal] response:', res.data);
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      console.error('[AddLeadModal] error:', err?.response?.data || err.message);
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Could not create lead.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => { reset(); onClose(); };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={handleClose}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-1">Lead Created!</h2>
          <p className="text-[14px] text-ink-muted mb-5">
            <strong>{name}</strong>{' '}
            {assignedToId && ownerName
              ? `has been added to ${ownerName}'s leads.`
              : assignedToId
                ? 'has been assigned.'
                : 'has been added to your leads.'}
          </p>
          {nextFollowupDate && (
            <p className="text-[13px] text-amber-700 mb-4">
              📅 Follow-up scheduled for {nextFollowupDate} {nextFollowupTime || '09:00'}
            </p>
          )}
          <button onClick={handleClose} className="w-full h-11 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover transition-colors">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 overflow-y-auto" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[560px] w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Add New Lead</h2>
            {defaultAssignedToId && ownerName && (
              <p className="text-[12px] text-amber-700 mt-0.5">
                ⚡ Will be assigned to <strong>{ownerName}</strong>
              </p>
            )}
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-brand-light hover:text-brand transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[72vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Name <span className="text-danger">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="John Smith"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
          </div>

          {/* Phone — Email removed */}
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
          </div>

          {/* Project name (was Company) */}
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Project name</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Acme website redesign"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
          </div>

          {/* Source / Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand capitalize">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Priority / Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Value (₹)</label>
              <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="50000"
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Service</label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
            >
              <option value="">— Select service —</option>
              {services?.map((s: any) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}</select>
            {services.length === 0 && (
              <p className="text-[12px] text-ink-muted mt-1">
                No services yet. Add them in Configuration → Service.
              </p>
            )}
          </div>

          {/* Next Follow-up — NEW */}
          <div className="border-t border-ink-border pt-4">
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink mb-2">
              <CalendarClock className="w-4 h-4 text-brand" />
              Next Follow-up
              <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
              />
              <input
                type="time"
                value={nextFollowupTime}
                onChange={(e) => setNextFollowupTime(e.target.value)}
                disabled={!nextFollowupDate}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand disabled:bg-ink-bg disabled:text-ink-muted"
              />
            </div>
            {nextFollowupDate && (
              <p className="text-[12px] text-brand mt-1.5">
                📅 Follow-up on {new Date(nextFollowupDate).toLocaleDateString('en-GB')} at {nextFollowupTime || '09:00'}
              </p>
            )}
          </div>

          {/* Assign Lead — NEW */}
          <div className="border-t border-ink-border pt-4">
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink mb-2">
              <UserCheck className="w-4 h-4 text-brand" />
              Assign Lead
              <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              disabled={loadingUsers}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand disabled:bg-ink-bg"
            >
              <option value="">— Assign to me (default) —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {ROLE_LABEL[u.role] ?? u.role}
                </option>
              ))}
            </select>
            {loadingUsers && (
              <p className="text-[12px] text-ink-muted mt-1">Loading teammates…</p>
            )}
            {assignedToId && (
              <p className="text-[12px] text-amber-700 mt-1.5">
                ⚡ This lead will appear in <strong>{users.find((u) => u.id === assignedToId)?.name ?? ownerName ?? 'the selected user'}</strong>'s panel
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What did the customer ask for?"
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand resize-none" />
          </div>

          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={handleClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] text-ink hover:bg-brand-light transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {submitting ? 'Saving…' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
