import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, LockOpen, Plus } from 'lucide-react';
import { appointmentsService, type AvailabilitySlot } from '@/features/appointments/services/appointments.service';
import { usersService, type AppUser, ROLE_LABEL } from '@/features/users/services/users.service';
import { BookingModal } from '@/features/appointments/components/BookingModal';
import { BlockModal } from '@/features/appointments/components/BlockModal';
import { cn } from '@/shared/utils/cn';

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const start = new Date(first);
  const offset = (first.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  const end = new Date(last);
  const tail = 6 - ((last.getDay() + 6) % 7);
  end.setDate(end.getDate() + tail);
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const SLOT_COLORS: Record<string, string> = {
  available: 'bg-white hover:bg-emerald-50 border-ink-border cursor-pointer',
  booked: 'bg-amber-50 border-amber-200 cursor-not-allowed',
  pending: 'bg-orange-50 border-orange-200 cursor-not-allowed',
  blocked: 'bg-red-50 border-red-200 cursor-not-allowed',
};

export default function CalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => ymd(new Date()));
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [blockModal, setBlockModal] = useState(false);
  const [bookModal, setBookModal] = useState(false);
  const [bookHour, setBookHour] = useState<number | undefined>();

  // Load users (assignable scope)
  useEffect(() => {
    usersService.bookable().then((list) => {
      setUsers(list);
      if (!userId && list.length > 0) {
        // Default to self — try me endpoint
        usersService.list({ page: 1, pageSize: 1 }).then((r) => {
          if (r.data[0]) setUserId(r.data[0].id);
        });
      }
    }).catch(() => setUsers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load availability
  useEffect(() => {
    if (!userId || !selected) return;
    setLoading(true);
    appointmentsService
      .availability(userId, selected)
      .then((res) => setSlots(res.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [userId, selected]);

  const grid = buildGrid(month);

  const refresh = () => {
    if (!userId || !selected) return;
    appointmentsService.availability(userId, selected).then((res) => setSlots(res.slots));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Calendar</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">
            Book appointments and manage your team's availability
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setBlockModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-ink text-white text-[13.5px] font-medium hover:bg-ink/90">
            <Lock className="w-4 h-4" /> Block availability
          </button>
          <button onClick={() => { setBookHour(undefined); setBookModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover">
            <Plus className="w-4 h-4" /> Book appointment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* Left — Month calendar */}
        <div className="bg-white border border-ink-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => {
              const m = new Date(month);
              m.setMonth(m.getMonth() - 1);
              setMonth(m);
            }} className="w-8 h-8 rounded-md border border-ink-border flex items-center justify-center hover:bg-ink-bg">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold">
              {month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => {
              const m = new Date(month);
              m.setMonth(m.getMonth() + 1);
              setMonth(m);
            }} className="w-8 h-8 rounded-md border border-ink-border flex items-center justify-center hover:bg-ink-bg">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[12px] text-ink-muted mb-2">
            {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d) => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((d) => {
              const ds = ymd(d);
              const inMonth = d.getMonth() === month.getMonth();
              const isSelected = ds === selected;
              return (
                <button key={ds} onClick={() => setSelected(ds)}
                  className={cn(
                    'aspect-square rounded-md text-[13px] font-medium flex items-center justify-center',
                    !inMonth && 'text-ink-muted/40',
                    inMonth && !isSelected && 'hover:bg-ink-bg text-ink',
                    isSelected && 'bg-ink text-white',
                  )}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — Slot list */}
        <div className="bg-white border border-ink-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-ink-border">
            <select value={userId} onChange={(e) => setUserId(e.target.value)}
              className="w-full h-9 px-2 border border-ink-border rounded-md text-[13px] bg-white">
              <option value="">— Select a user —</option>
              {(Array.isArray(users) ? users : (users?.data || [])).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {ROLE_LABEL[u.role] ?? u.role}
                </option>
              ))}
            </select>
          </div>

          <div className="px-4 py-2 border-b border-ink-border bg-ink-bg">
            <p className="text-[12.5px] font-semibold text-ink">
              {new Date(selected).toLocaleDateString('en-GB', {
                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
          </div>

          <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
            {loading && <div className="text-center text-ink-muted text-sm py-4">Loading…</div>}
            {!loading && !userId && (
              <div className="text-center text-ink-muted text-sm py-4">Select a user</div>
            )}
            {!loading && userId && slots.length === 0 && (
              <div className="text-center text-ink-muted text-sm py-4">No slots</div>
            )}

            {!loading && slots.map((slot) => {
              const cls = SLOT_COLORS[slot.status] ?? SLOT_COLORS.available;
              const clickable = slot.status === 'available';
              return (
                <button
                  key={slot.hour}
                  disabled={!clickable}
                  onClick={() => { if (clickable) { setBookHour(slot.hour); setBookModal(true); } }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-md border text-[13px] transition-colors',
                    cls,
                  )}>
                  <span className="font-medium">{slot.label}</span>
                  <span className="text-[11.5px] text-ink-muted">
                    {slot.status === 'booked' && (slot.meta?.title ?? 'Booked')}
                    {slot.status === 'pending' && 'Awaiting approval'}
                    {slot.status === 'blocked' && (slot.meta?.reason || 'Blocked')}
                    {slot.status === 'available' && 'Available'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      <BookingModal
        open={bookModal}
        onClose={() => setBookModal(false)}
        onSuccess={refresh}
        defaultUserId={userId}
        defaultDate={selected}
        defaultHour={bookHour}
      />
      <BlockModal
        open={blockModal}
        onClose={() => setBlockModal(false)}
        onSuccess={refresh}
        defaultUserId={userId}
        defaultDate={selected}
      />
    </div>
  );
}
