import { useState } from 'react';
import { X, Upload, CheckCircle2, Clock } from 'lucide-react';
import { operationsService } from '../services/operations.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  task: any; // The task object being reported on
  onSuccess: () => void;
}

export function LogDailyReportModal({ isOpen, onClose, task, onSuccess }: Props) {
  const [workCompleted, setWorkCompleted] = useState('');
  const [progress, setProgress] = useState(task?.progress || 0);
  const [hoursSpent, setHoursSpent] = useState('');
  const [workStatus, setWorkStatus] = useState('In Progress');
  const [blockers, setBlockers] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = async () => {
    if (!workCompleted.trim()) {
      return setError('Please describe what was done today.');
    }
    if (!hoursSpent || Number(hoursSpent) <= 0) {
      return setError('Please enter valid hours spent.');
    }

    setSubmitting(true);
    setError('');
    try {
      await operationsService.createDailyReport({
        taskId: task.id,
        workCompleted,
        progress,
        timeSpent: Number(hoursSpent),
        workStatus,
        blockers: blockers.trim() || undefined,
        nextDayPlan: nextDayPlan.trim() || undefined,
        attachments: [], // We will add real file uploads later
      });
      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-[400px] w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Report Submitted!</h2>
          <p className="text-[14px] text-ink-muted mb-6">Your daily progress has been logged successfully.</p>
          <button onClick={onClose} className="w-full h-11 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-[600px] w-full my-8" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-ink-border">
          <h2 className="text-[17px] font-semibold text-ink">Log Daily Report</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X className="w-5 h-5" /></button>
        </div>

        {/* Task Context Card */}
        <div className="px-6 pt-5 pb-2">
          <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[15px] font-semibold text-ink">{task.title}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-brand border border-brand/20 uppercase tracking-wide">
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-[12.5px] text-ink-muted flex items-center gap-3">
                <span>Assigned by {task.createdBy?.name || 'Manager'}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> Due: {task.dueAt ? new Date(task.dueAt).toLocaleDateString('en-GB') : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="px-6 py-4 space-y-5 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-[13.5px] font-medium text-ink mb-1.5">What was done today? <span className="text-danger">*</span></label>
            <textarea 
              value={workCompleted} onChange={e => setWorkCompleted(e.target.value)}
              rows={3} placeholder="Describe your progress today..."
              className="w-full px-3.5 py-2.5 border border-ink-border rounded-lg text-[14px] focus:outline-none focus:border-brand resize-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-[13.5px] font-medium text-ink">Progress <span className="text-danger">*</span></label>
              <span className="text-[13px] font-bold text-brand">{progress}%</span>
            </div>
            <input 
              type="range" min="0" max="100" step="5"
              value={progress} onChange={e => setProgress(Number(e.target.value))}
              className="w-full accent-brand cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-ink-muted mt-1">
              <span>0%</span>
              <span>Previous: {task.progress || 0}%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13.5px] font-medium text-ink mb-1.5">Hours Spent <span className="text-danger">*</span></label>
              <input 
                type="number" step="0.5" min="0.5"
                value={hoursSpent} onChange={e => setHoursSpent(e.target.value)}
                placeholder="e.g. 4.5"
                className="w-full h-11 px-3.5 border border-ink-border rounded-lg text-[14px] focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-ink mb-1.5">Work Status <span className="text-danger">*</span></label>
              <select 
                value={workStatus} onChange={e => setWorkStatus(e.target.value)}
                className="w-full h-11 px-3.5 border border-ink-border rounded-lg text-[14px] focus:outline-none focus:border-brand bg-white"
              >
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13.5px] font-medium text-ink mb-1.5">Blockers / Issues</label>
            <textarea 
              value={blockers} onChange={e => setBlockers(e.target.value)}
              rows={2} placeholder="Any issues preventing progress?"
              className="w-full px-3.5 py-2.5 border border-ink-border rounded-lg text-[14px] focus:outline-none focus:border-brand resize-none"
            />
          </div>

          <div>
            <label className="block text-[13.5px] font-medium text-ink mb-1.5">Next Day's Plan</label>
            <textarea 
              value={nextDayPlan} onChange={e => setNextDayPlan(e.target.value)}
              rows={2} placeholder="What will you work on next?"
              className="w-full px-3.5 py-2.5 border border-ink-border rounded-lg text-[14px] focus:outline-none focus:border-brand resize-none"
            />
          </div>

          <div>
            <label className="block text-[13.5px] font-medium text-ink mb-1.5">Attachments / Evidence</label>
            <div className="border-2 border-dashed border-ink-border rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer">
              <Upload className="w-6 h-6 mx-auto text-ink-muted mb-2" />
              <div className="text-[13px] font-medium text-brand">Click to upload</div>
              <div className="text-[11.5px] text-ink-muted mt-0.5">Screenshots, documents (Max 10MB)</div>
            </div>
          </div>

          {error && <div className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</div>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink-border flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="h-10 px-5 rounded-lg border border-ink-border text-[13.5px] font-medium text-ink hover:bg-white bg-transparent">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="h-10 px-5 rounded-lg bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50 flex items-center gap-2">
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
