import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle2, Calendar, Clock, FileText } from 'lucide-react';
import { api } from '@/shared/api/client';
import { tasksService } from '../services/tasks.service'; // Adjust path if needed

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LogDailyReportModal({ open, onClose, onSuccess }: Props) {
  const [taskId, setTaskId] = useState('');
  const [workCompleted, setWorkCompleted] = useState('');
  const [timeSpent, setTimeSpent] = useState('');
  const [progress, setProgress] = useState('20');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch the user's active tasks for the dropdown
  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks', 'dropdown'],
    queryFn: () => tasksService.list({ pageSize: 100 }), // Fetch up to 100 tasks
    enabled: open, // Only fetch when modal is open
  });

  useEffect(() => {
    if (!open) {
      // Reset form when closed
      setTaskId('');
      setWorkCompleted('');
      setTimeSpent('');
      setProgress('20');
      setError('');
      setSuccess(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError('');
    if (!taskId) { setError('Please select a task.'); return; }
    if (workCompleted.trim().length < 5) { setError('Please describe what you did (min 5 chars).'); return; }
    if (!timeSpent || Number(timeSpent) <= 0) { setError('Please enter valid time spent.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        taskId,
        workCompleted: workCompleted.trim(),
        timeSpent: Number(timeSpent),
        progress: Number(progress),
      };
      
      await api.post('/operations/daily-reports', payload);
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-1">Report Logged!</h2>
          <p className="text-[14px] text-ink-muted mb-5">
            Your daily progress has been recorded successfully.
          </p>
          <button onClick={onClose} className="w-full h-11 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover transition-colors">
            Done
          </button>
        </div>
      </div>
    );
  }

  const tasks = tasksData?.data || [];

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[480px] w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-border">
          <div>
            <h2 className="text-[16px] font-semibold text-ink flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand" />
              Log Daily Report
            </h2>
            <p className="text-[12px] text-ink-muted mt-0.5">Update progress on your active tasks</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-brand-light hover:text-brand transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Task Selector */}
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Select Work *</label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={loadingTasks}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand disabled:bg-ink-bg"
            >
              <option value="">— Choose a task —</option>
              {tasks.map((t: any) => (
                <option key={t.id} value={t.id}>{t.title} ({t.status})</option>
              ))}
            </select>
          </div>

          {/* Work Completed */}
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Work Completed *
            </label>
            <textarea
              value={workCompleted}
              onChange={(e) => setWorkCompleted(e.target.value)}
              rows={3}
              placeholder="What did you finish today?"
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Time Spent */}
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Time Spent (Hours) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={timeSpent}
                onChange={(e) => setTimeSpent(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
              />
            </div>

            {/* Progress */}
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Total Progress (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] text-ink hover:bg-brand-light transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting || loadingTasks}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors">
            {submitting ? 'Saving…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
