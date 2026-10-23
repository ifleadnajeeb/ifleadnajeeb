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
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];

function analyzePhone(raw: string): { 
  ok: boolean; 
  e164?: string; 
  pretty?: string; 
  msg?: string 
} {
  let d = String(raw || '').trim();
  const intl = d.startsWith('+');
  d = d.replace(/\D/g, '');
  if (!d) return { ok: false, msg: 'Enter a phone number' };
  
  if (d.startsWith('00')) d = d.slice(2);
  if (!intl) {
    if (d.length === 11 && d[0] === '0') d = d.slice(1);
    if (d.length === 10) {
      if (!/^[6-9]/.test(d)) return { ok: false, msg: 'Indian mobiles start with 6, 7, 8 or 9' };
      d = '91' + d;
    } else if (!(d.length === 12 && d.startsWith('91'))) {
      return { ok: false, msg: `${d.length} digits – India needs 10 (or check International)` };
    }
  }
  if (d.startsWith('91')) {
    const n = d.slice(2);
    if (!/^[6-9]\d{9}$/.test(n)) return { ok: false, msg: 'Not a valid Indian mobile number' };
    return { ok: true, e164: '+' + d, pretty: '+91 ' + n.slice(0, 5) + ' ' + n.slice(5) };
  }
  if (d.length < 8 || d.length > 15) return { ok: false, msg: 'International numbers have 8–15 digits' };
  return { ok: true, e164: '+' + d, pretty: '+' + d };
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length <= 10) {
    if (digits.length > 5) {
      return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return digits;
  }

  const countryCode = digits.slice(0, digits.length - 10);
  const number = digits.slice(-10);
  return `+${countryCode} ${number.slice(0, 5)} ${number.slice(5)}`;
}

export function AddLeadModal({
  open, onClose, onSuccess, defaultAssignedToId, ownerName,
}: Props) {

  const FALLBACK_SERVICES = [
    { id: '1', name: 'Website Development' },
    { id: '2', name: 'Logo Brandkit' },
    { id: '3', name: 'Trademark Registration' },
    { id: '4', name: 'Company Registration' },
    { id: '5', name: 'Digital Marketing' },
    { id: '6', name: 'Posters' },
    { id: '7', name: '20 K Website' },
    { id: '8', name: 'If Leads' },
    { id: '9', name: 'K Swift' },
  ];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isInternational, setIsInternational] = useState(false); // 👈 NEW STATE
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<{ id: string; name: string }[]>([]);
  const [forceDuplicate, setForceDuplicate] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [source, setSource] = useState('manual');
  const [status, setStatus] = useState('NEW');
  const [tag, setTag] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [value, setValue] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [nextFollowupTime, setNextFollowupTime] = useState('');
  const [assignedToId, setAssignedToId] = useState(defaultAssignedToId ?? '');
  const [notes, setNotes] = useState('');
  const [service, setService] = useState('');
  const [services, setServices] = useState<ConfigItem[]>([]);
  const displayServices = (services && services.length > 0) ? services : FALLBACK_SERVICES;
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

  // Check for duplicate phone numbers
  useEffect(() => {
    if (!phone || !open) {
      setDuplicateMatches([]);
      return;
    }
    const check = analyzePhone(phone);
    if (!check.ok) {
      setDuplicateMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingPhone(true);
      try {
        const res = await api.get(`/leads/check-phone?phone=${check.e164}`);
        if (res.data.duplicate) {
          setDuplicateMatches(res.data.matches || []);
        } else {
          setDuplicateMatches([]);
        }
      } catch (err) {
        console.error('Failed to check phone', err);
      } finally {
        setCheckingPhone(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [phone, open]);

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
    setIsInternational(false); // Reset toggle
    setSource('manual'); setStatus('NEW'); setPriority('MEDIUM');
    setValue(''); setNextFollowupDate(''); setNextFollowupTime('');
    setAssignedToId(defaultAssignedToId ?? '');
    setNotes(''); setService(''); setError(''); setSuccess(false);
    setDuplicateMatches([]); setForceDuplicate(false); setCheckingPhone(false);
  };

  const handleSubmit = async () => {
    const dupCheck = analyzePhone(phone);
    if (phone && !dupCheck.ok) {
      setError(dupCheck.msg || 'Invalid phone number');
      return;
    }
    if (duplicateMatches.length > 0 && !forceDuplicate) {
      setError('This phone number is a duplicate. Please check the box to proceed.');
      return;
    }

    setError('');
    if (name.trim().length < 2) { setError('Name must be at least 2 characters.'); return; }

    let normalizedPhone: string | undefined;
    if (phone.trim()) {
      normalizedPhone = dupCheck.e164; 
    }

    let nextFollowupAt: string | undefined;
    if (nextFollowupDate && nextFollowupTime) {
      nextFollowupAt = new Date(`${nextFollowupDate}T${nextFollowupTime}`).toISOString();
    } else if (nextFollowupDate) {
      nextFollowupAt = new Date(`${nextFollowupDate}T09:00`).toISOString();
    }

    setSubmitting(true);
    try {
      const sanitizedPayload = {
        name: name.trim(),
        phone: normalizedPhone || undefined,
        company: projectName.trim() || undefined,
        source: source || 'manual',
        status: 'NEW',
        priority: priority,
        value: value ? Number(value) : undefined,
        notes: notes.trim() || undefined,
        assignedToId: assignedToId || undefined,
        service: service || undefined,
        tags: tag ? [tag] : [],
        nextFollowupAt: nextFollowupAt,
      };
      
      await api.post('/leads', sanitizedPayload);
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      console.error('[AddLeadModal] error:', err?.response?.data || err.message);
      const data = err?.response?.data;
      let errorMsg = 'Could not create lead.';
      
      if (data) {
        errorMsg = data.message || data.error || errorMsg;
        if (data.details && Array.isArray(data.details)) {
          errorMsg += ': ' + data.details.map((d: any) => `${d.path.join('.')} is invalid`).join(', ');
        }
      }
      
      setError(errorMsg);
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
              className={`w-full h-10 px-3 border rounded-md text-[14px] focus:outline-none focus:border-brand bg-white ${
                error && !name.trim() ? 'border-danger ring-1 ring-danger' : 'border-ink-border'
              }`} />
          </div>

          {/* Phone */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[13px] text-ink-muted">Phone</label>
              <label className="flex items-center gap-1 cursor-pointer text-[12px] font-medium text-brand hover:underline">
                <input
                  type="checkbox"
                  checked={isInternational}
                  onChange={(e) => {
                    setIsInternational(e.target.checked);
                    setPhone(''); // clear field when toggling
                  }}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand focus:ring-brand"
                />
                🌍 International
              </label>
            </div>
            
            <input 
              value={phone} 
              onChange={(e) => {
                setForceDuplicate(false);
                if (isInternational) {
                  // Allow only + and digits for international
                  setPhone(e.target.value.replace(/[^\d+]/g, ''));
                } else {
                  if (e.target.value.length < phone.length) {
                    setPhone(e.target.value);
                  } else {
                    setPhone(formatPhoneNumber(e.target.value));
                  }
                }
              }} 
              inputMode="tel" 
              maxLength={isInternational ? 18 : 15}
              placeholder={isInternational ? "+971 50 123 4567" : "98765 43210"}
              className={`w-full h-10 px-3 border rounded-md text-[14px] bg-white focus:outline-none transition-colors ${
                phone && !analyzePhone(phone).ok 
                  ? 'border-danger focus:border-danger' 
                  : 'border-ink-border focus:border-brand'
              }`} 
            />
            
            {phone && !analyzePhone(phone).ok && (
              <span className="text-[12px] text-danger mt-1 block">
                ✗ {analyzePhone(phone).msg}
              </span>
            )}
            
            {checkingPhone && (
              <span className="text-[12px] text-ink-muted mt-1 block">
                Checking availability…
              </span>
            )}
            
            {!checkingPhone && duplicateMatches.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 mt-2 text-[13px] text-amber-800">
                <div className="font-semibold mb-1">⚠️ Duplicate number detected</div>
                <div className="mb-2">
                  This number is already used by:{' '}
                  {duplicateMatches.map((m) => (
                    <span key={m.id} className="font-medium">{m.name} </span>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={forceDuplicate}
                    onChange={(e) => setForceDuplicate(e.target.checked)}
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                  />
                  <span>Add anyway (same person, new enquiry)</span>
                </label>
              </div>
            )}
          </div>

          {/* Project name */}
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Project name</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Acme website redesign"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
          </div>

          {/* Source / Status */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand capitalize">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[13px] text-ink-muted mb-1.5">Tag</label>
              <select value={tag} onChange={e => setTag(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand bg-white">
                <option value="">— Select Tag —</option>
                <option value="Hot">Hot</option>
                <option value="Very interested">Very interested</option>
                <option value="Slight interested">Slight interested</option>
                <option value="Not interested">Not interested</option>
                <option value="Busy call back">Busy call back</option>
                <option value="Pending">Pending</option>
                <option value="Work on progress">Work on progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Priority / Value */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
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
              {displayServices.map((s: any) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}</select>
            {services.length === 0 && (
              <p className="text-[12px] text-ink-muted mt-1">
                No services yet. Add them in Configuration → Service.
              </p>
            )}
          </div>

          {/* Next Follow-up */}
          <div className="border-t border-ink-border pt-4">
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink mb-2">
              <CalendarClock className="w-4 h-4 text-brand" />
              Next Follow-up
              <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-1 gap-3">
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

          {/* Assign Lead */}
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
            <label className="block text-[13px] text-ink-muted mb-1.5">Description</label>
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