import { useEffect, useState } from 'react';
import { X, Lock } from 'lucide-react';
import { appointmentsService } from '../services/appointments.service';
import { usersService, type AppUser, ROLE_LABEL } from '@/features/users/services/users.service';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultUserId?: string;
  defaultDate?: string;
}

const HOURS = Array.from({ length: 8 }, (_, i) => 9 + i);

function hourLabel(h: number) {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h > 12 ? h - 12 : h;
  return `${hh}:00 ${ampm}`;
}

export function BlockModal({ open, onClose, onSuccess, defaultUserId, defaultDate }: Props) {
  const [forUserId, setForUserId] = useState(defaultUserId ?? '');
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [reason, setReason] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    usersService.assignable().then(setUsers).catch(() => setUsers([]));
    setForUserId(defaultUserId ?? '');
    setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
  }, [open, defaultUserId, defaultDate]);

  if (!open) return null;

  const submit = async () => {
    setError('');
    if (endHour <= startHour) return setError('End must be after start');
    setLoading(true);
    try {
      await appointmentsService.blockSlot({
        userId: forUserId || undefined,
        date,
        startHour,
        endHour,
        reason: reason.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to block');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[480px] w-full"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand" />
            <h2 className="text-[16px] font-semibold text-ink">Block Availability</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-ink-bg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Block for</label>
            <select value={forUserId} onChange={(e) => setForUserId(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white">
              <option value="">— Myself —</option>
              {(Array.isArray(users) ? users : (users?.data || [])).map((u) => (
                <option key={u.id} value={u.id}>{u.name} · {ROLE_LABEL[u.role] ?? u.role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">From</label>
              <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white">
                {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">To</label>
              <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white">
                {HOURS.concat(17).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Reason (optional)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Meeting, field work, lunch…"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" />
          </div>

          {error && (
            <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose}
            className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-ink-bg">
            Cancel
          </button>
          <button onClick={submit} disabled={loading}
            className="h-10 px-5 rounded-md bg-ink text-white text-[13.5px] font-medium hover:bg-ink/90 disabled:opacity-50">
            {loading ? 'Blocking…' : 'Block'}
          </button>
        </div>
      </div>
    </div>
  );
}
