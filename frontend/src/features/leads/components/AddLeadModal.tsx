import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle2 } from 'lucide-react';
import { api } from '@/shared/api/client';
import { usersService, type AppUser, ROLE_LABEL } from '@/features/users/services/users.service';
import { configService } from '@/features/config/services/config.service';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultAssignedToId?: string;
  ownerName?: string;
}

const SOURCES = ['manual', 'website', 'facebook', 'instagram', 'whatsapp', 'referral', 'walk-in'];
const PRIORITIES = ['COLD', 'MEDIUM', 'HOT'];
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
  const [service, setService] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [nextFollowupTime, setNextFollowupTime] = useState('');
  const [assignedToId, setAssignedToId] = useState(defaultAssignedToId ?? '');
  const [notes, setNotes] = useState('');

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: configData } = useQuery({
    queryKey: ['config-services'],
    queryFn: () => configService.list('service'),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (defaultAssignedToId) setAssignedToId(defaultAssignedToId);
    setLoadingUsers(true);
    usersService
      .list({ page: 1, pageSize: 200 })
      .then((r) => setUsers(r.data))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, [open, defaultAssignedToId]);

  if (!open) return null;

  const reset = () => {
    setName(''); setPhone(''); setProjectName(''); setSource('manual');
    setStatus('NEW'); setPriority('MEDIUM'); setValue(''); setService('');
    setNextFollowupDate(''); setNextFollowupTime('');
    setAssignedToId(defaultAssignedToId ?? ''); setNotes('');
    setError(''); setSuccess(false);
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
        company: projectName.trim() || undefined,
        source, status, priority,
        service: service || undefined,
        value: value ? Number(value) : undefined,
        notes: notes.trim() || undefined,
      };
      if (assignedToId) payload.assignedToId = assignedToId;
      if (nextFollowupAt) payload.nextFollowupAt = nextFollowupAt;

      await api.post('/leads', payload);
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
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
          <p className="text-[14px] text-ink-muted mb-5"><strong>{name}</strong> has been added.</p>
          <button onClick={handleClose} className="w-full h-11 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover">Continue</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 overflow-y-auto" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[560px] w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">Add New Lead</h2>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-brand-light hover:text-brand"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[72vh] overflow-y-auto">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Name <span className="text-danger">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="John Smith"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Project name</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Acme website redesign"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Value (Rs)</label>
              <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="50000"
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
            </div>
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Service</label>
            <select value={service} onChange={(e) => setService(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand">
              <option value="">-- Select service --</option>
              {(configData || []).map((s: any) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-ink-border pt-4">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Next Follow-up</label>
              <input type="date" value={nextFollowupDate} onChange={(e) => setNextFollowupDate(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Assign To</label>
              <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} disabled={loadingUsers}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand">
                <option value="">-- Default (Me) --</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({ROLE_LABEL[u.role]})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What did the customer ask for?"
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand resize-none" />
          </div>

          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={handleClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] text-ink hover:bg-brand-light">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {submitting ? 'Saving...' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
