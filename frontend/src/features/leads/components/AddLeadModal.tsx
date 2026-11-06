import { useEffect, useState } from 'react';
import { X, CheckCircle2, CalendarClock, UserCheck } from 'lucide-react';
import { api } from '@/shared/api/client';
import { usersService, type AppUser, ROLE_LABEL } from '@/features/users/services/users.service';
import { useAuth } from '@/app/providers/auth-provider';

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

export function AddLeadModal({ open, onClose, onSuccess, defaultAssignedToId, ownerName }: Props) {
  const { user } = useAuth();
  // Safely check if the current user is a BDE, whether role is a string or object
  const roleStr = typeof user?.role === 'object' ? (user?.role as any)?.name : user?.role;
  const isBDE = roleStr === 'BDE';

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
  
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load available users when modal opens
  useEffect(() => {
    if (!open) return;
    if (defaultAssignedToId) setAssignedToId(defaultAssignedToId);
    
    setLoadingUsers(true);
    usersService
      .list({ page: 1, pageSize: 200 })
      .then((r: any) => {
        // ✅ Robustly handle different response structures
        let fetchedUsers: AppUser[] = [];
        if (Array.isArray(r)) fetchedUsers = r;
        else if (r && Array.isArray(r.data)) fetchedUsers = r.data;
        
        setUsers(fetchedUsers);
      })
      .catch((err) => {
        console.error("Failed to load teammates:", err);
        setUsers([]);
      })
      .finally(() => setLoadingUsers(false));
  }, [open, defaultAssignedToId]);

  if (!open) return null;

  const reset = () => {
    setName(''); setPhone(''); setProjectName('');
    setSource('manual'); setStatus('NEW'); setPriority('MEDIUM');
    setValue(''); setNextFollowupDate(''); setNextFollowupTime('');
    setAssignedToId(defaultAssignedToId ?? '');
    setNotes(''); setError(''); setSuccess(false);
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
    if (nextFollowupDate) {
      try {
        const time = nextFollowupTime || '09:00';
        const dateObj = new Date(`${nextFollowupDate}T${time}:00`);
        if (!isNaN(dateObj.getTime())) nextFollowupAt = dateObj.toISOString();
      } catch (e) {}
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        phone: normalizedPhone,
        company: projectName.trim() || undefined,
        source, status, priority,
        value: value ? Number(value) : undefined,
        notes: notes.trim() || undefined,
      };
      
      if (!isBDE && assignedToId) payload.assignedToId = assignedToId;
      if (nextFollowupAt) payload.nextFollowupAt = nextFollowupAt;

      await api.post('/leads', payload);
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Could not create lead.');
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
            {!isBDE && assignedToId && ownerName
              ? `has been added to ${ownerName}'s leads.`
              : !isBDE && assignedToId
                ? 'has been assigned.'
                : 'has been added to your leads.'}
          </p>
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
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-brand-light hover:text-brand transition-colors">
            <X className="w-4 h-4" />
          </button>
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
              <label className="block text-[13px] text-ink-muted mb-1.5">Value (₹)</label>
              <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="50000"
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
            </div>
          </div>

          <div className="border-t border-ink-border pt-4">
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink mb-2">
              <CalendarClock className="w-4 h-4 text-brand" />
              Next Follow-up
              <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={nextFollowupDate} onChange={(e) => setNextFollowupDate(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
              <input type="time" value={nextFollowupTime} onChange={(e) => setNextFollowupTime(e.target.value)}
                disabled={!nextFollowupDate}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand disabled:bg-ink-bg" />
            </div>
          </div>

          {!isBDE && (
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
                {users.map((u) => {
                  // ✅ Safely extract the role name whether it's an object or string
                  const rName = typeof u.role === 'object' ? (u.role as any)?.name : u.role;
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} · {ROLE_LABEL[rName] ?? rName}
                    </option>
                  );
                })}
              </select>
              {loadingUsers && <p className="text-[12px] text-ink-muted mt-1">Loading teammates…</p>}
            </div>
          )}

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
