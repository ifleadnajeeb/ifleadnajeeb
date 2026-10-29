import { useEffect, useState } from 'react';
import { X, CalendarPlus } from 'lucide-react';
import { appointmentsService } from '../services/appointments.service';
import { usersService, type AppUser, ROLE_LABEL } from '@/features/users/services/users.service';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultUserId?: string;
  defaultDate?: string;
  defaultHour?: number;
}

const HOURS = Array.from({ length: 8 }, (_, i) => 9 + i); // 9..16

function hourLabel(h: number) {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h > 12 ? h - 12 : h;
  return `${hh}:00 ${ampm}`;
}

export function BookingModal({
  open, onClose, onSuccess, defaultUserId, defaultDate, defaultHour,
}: Props) {
  const [title, setTitle] = useState('');
  const [forUserId, setForUserId] = useState(defaultUserId ?? '');
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [startHour, setStartHour] = useState(defaultHour ?? 10);
  const [endHour, setEndHour] = useState((defaultHour ?? 10) + 1);
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    usersService.bookable().then(setUsers).catch(() => setUsers([]));
  }, [open]);

  useEffect(() => {
    if (open) {
      setForUserId(defaultUserId ?? '');
      setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
      setStartHour(defaultHour ?? 10);
      setEndHour((defaultHour ?? 10) + 1);
    }
  }, [open, defaultUserId, defaultDate, defaultHour]);

  if (!open) return null;

  const submit = async () => {
    setError('');
    if (title.trim().length < 2) return setError('Title is required');
    if (endHour <= startHour) return setError('End must be after start');

    const startAt = new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00`).toISOString();
    const endAt = new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00`).toISOString();

    setLoading(true);
    try {
      await appointmentsService.create({
        title: title.trim(),
        description: description.trim() || undefined,
        startAt,
        endAt,
        forUserId: forUserId || undefined,
      });
      onSuccess();
      onClose();
      setTitle('');
      setDescription('');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-brand" />
            <h2 className="text-[16px] font-semibold text-ink">Book Appointment</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-ink-bg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
              placeholder="Client demo, follow-up meeting…"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" />
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Book for</label>
            <select value={forUserId} onChange={(e) => setForUserId(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white">
              <option value="">— Myself —</option>
              {(Array.isArray(users) ? users : (users?.data || [])).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {ROLE_LABEL[u.role] ?? u.role}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-ink-muted mt-1">
              Booking for someone else creates a request they must approve.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Start</label>
              <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white">
                {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">End</label>
              <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white">
                {HOURS.concat(17).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Notes</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder="Optional"
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none" />
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
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {loading ? 'Booking…' : 'Book'}
          </button>
        </div>
      </div>
    </div>
  );
}
