import { useState } from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { tasksService, TaskPriority, TaskStatus } from '../services/tasks.service';
import { unlockAudio } from '../lib/taskAudio';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

export function TaskFloatingButton({ inline = false }: { inline?: boolean } = {}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setTitle(''); setDescription(''); setPriority('MEDIUM'); setStatus('TODO');
    setReminderDate(''); setReminderTime(''); setError(''); setOpen(false);
  };

  const setQuick = (minutes: number) => {
    const d = new Date(Date.now() + minutes * 60 * 1000);
    setReminderDate(d.toISOString().slice(0, 10));
    setReminderTime(d.toTimeString().slice(0, 5));
    unlockAudio();
  };

  const submit = async () => {
    setError('');
    if (title.trim().length < 2) { setError('Title too short'); return; }
    const reminderAt = reminderDate
      ? new Date(`${reminderDate}T${reminderTime || '09:00'}:00`).toISOString()
      : undefined;
    if (reminderAt && new Date(reminderAt) < new Date(Date.now() - 60000)) {
      setError('Reminder must be in the future'); return;
    }
    setSubmitting(true);
    try {
      await tasksService.create({
        isPrivate: true,
        title: title.trim(),
        description: description.trim() || undefined,
        priority, status, reminderAt,
      });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      close();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <button
        onClick={() => { unlockAudio(); setOpen(true); }}
        title="Quick Task"
        className={
          inline
            ? "w-9 h-9 flex items-center justify-center rounded-md text-ink-muted hover:bg-brand-light hover:text-brand-primary transition-colors"
            : "fixed bottom-4 right-[180px] z-30 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-ink-border text-ink text-[13px] font-medium shadow-lg hover:shadow-xl hover:border-brand transition-all"
        }
      >
        <CheckSquare className="w-5 h-5" />
        {!inline && <span>Task</span>}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={close}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[500px] w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
              <h2 className="text-[16px] font-semibold text-ink">Quick Task</h2>
              <button onClick={close} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[13px] text-ink-muted mb-1.5">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
                  placeholder="What needs to be done?"
                  className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
              </div>

              <div>
                <label className="block text-[13px] text-ink-muted mb-1.5">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none focus:outline-none focus:border-brand" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] text-ink-muted mb-1.5">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}
                    className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]">
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] text-ink-muted mb-1.5">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}
                    className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-2 border-brand/30 rounded-lg p-3 bg-brand-light/40">
                <label className="block text-[12px] uppercase tracking-wider text-brand font-semibold mb-2">
                  🔔 Reminder — alert + sound
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[1, 5, 15, 60].map((m) => (
                    <button key={m} type="button" onClick={() => setQuick(m)}
                      className="px-2.5 py-1 rounded-md border border-brand/40 bg-white text-brand text-[11.5px] font-medium hover:bg-brand hover:text-white">
                      {m < 60 ? `${m} min` : '1 hr'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                    className="w-full h-9 px-2 border border-ink-border rounded-md text-[13px] bg-white" />
                  <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)}
                    className="w-full h-9 px-2 border border-ink-border rounded-md text-[13px] bg-white" />
                </div>
              </div>

              {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
              <button onClick={close} className="h-10 px-4 rounded-md border border-ink-border hover:bg-brand-light text-[13.5px]">Cancel</button>
              <button onClick={submit} disabled={submitting}
                className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
