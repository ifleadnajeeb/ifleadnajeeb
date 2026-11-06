import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle2, Calendar, Clock, FileText, AlertCircle, ChevronDown } from 'lucide-react';
import { api } from '@/shared/api/client';
import { tasksService } from '../services/tasks.service';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LogDailyReportModal({ open, onClose, onSuccess }: Props) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [workCompleted, setWorkCompleted] = useState('');
  const [timeSpent, setTimeSpent] = useState('');
  const [blockers, setBlockers] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks', 'dropdown'],
    queryFn: () => tasksService.list({ pageSize: 100 }),
    enabled: open,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setSelectedTasks([]);
      setProgressMap({});
      setWorkCompleted('');
      setTimeSpent('');
      setBlockers('');
      setError('');
      setSuccess(false);
      setIsDropdownOpen(false);
    }
  }, [open]);

  if (!open) return null;

  const handleToggleTask = (id: string) => {
    if (selectedTasks.includes(id)) {
      setSelectedTasks(prev => prev.filter(t => t !== id));
    } else {
      setSelectedTasks(prev => [...prev, id]);
      // Initialize progress to 20% for the newly selected task
      setProgressMap(prev => ({ ...prev, [id]: prev[id] ?? 20 }));
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (selectedTasks.length === 0) { setError('Please select at least one work.'); return; }
    if (workCompleted.trim().length < 5) { setError('Please describe what you did.'); return; }
    if (!timeSpent || Number(timeSpent) <= 0) { setError('Please enter valid time spent.'); return; }

    setSubmitting(true);
    try {
      const reports = selectedTasks.map(id => ({
        taskId: id,
        progress: progressMap[id] ?? 20
      }));

      const payload = {
        reports,
        workCompleted: workCompleted.trim(),
        timeSpent: Number(timeSpent),
        blockers: blockers.trim() || undefined,
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
          <p className="text-[14px] text-ink-muted mb-5">Your daily progress has been recorded successfully.</p>
          <button onClick={onClose} className="w-full h-11 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover transition-colors">Done</button>
        </div>
      </div>
    );
  }

  const tasks = tasksData?.data || [];

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[500px] w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-border">
          <div>
            <h2 className="text-[16px] font-semibold text-ink flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand" /> Log Daily Report
            </h2>
            <p className="text-[12px] text-ink-muted mt-0.5">Update progress on your active tasks</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-brand-light hover:text-brand transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div ref={dropdownRef} className="relative">
            <label className="block text-[13px] text-ink-muted mb-1.5">Select Work(s) *</label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full min-h-[40px] px-3 py-2 border border-ink-border rounded-md text-[14px] bg-white text-left focus:outline-none focus:border-brand flex items-center justify-between"
            >
              <span className="truncate text-ink">
                {selectedTasks.length === 0 ? '— Choose work(s) —' : `${selectedTasks.length} work(s) selected`}
              </span>
              <ChevronDown className="w-4 h-4 text-ink-muted" />
            </button>

            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-ink-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                <label className="flex items-center gap-2 px-3 py-2 hover:bg-brand-light cursor-pointer border-b border-ink-border">
                  <input 
                    type="checkbox" 
                    checked={selectedTasks.length === tasks.length && tasks.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTasks(tasks.map((t:any) => t.id));
                        const newMap: Record<string, number> = {};
                        tasks.forEach((t:any) => { newMap[t.id] = 20; });
                        setProgressMap(newMap);
                      } else {
                        setSelectedTasks([]);
                        setProgressMap({});
                      }
                    }}
                    className="rounded text-brand focus:ring-brand"
                  />
                  <span className="font-medium text-[13px]">Select All Works</span>
                </label>
                {tasks.map((t: any) => (
                  <label key={t.id} className="flex items-center gap-2 px-3 py-2 hover:bg-brand-light cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedTasks.includes(t.id)}
                      onChange={() => handleToggleTask(t.id)}
                      className="rounded text-brand focus:ring-brand"
                    />
                    <span className="text-[13px]">{t.title} <span className="text-ink-muted">({t.status})</span></span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ✅ DYNAMIC PROGRESS SLIDERS FOR EACH SELECTED WORK */}
          {selectedTasks.length > 0 && (
            <div className="space-y-3 border border-ink-border rounded-lg p-3 bg-ink-bg/30">
              <label className="block text-[13px] text-ink-muted font-medium">Progress per Work</label>
              {selectedTasks.map(tid => {
                const task = tasks.find((t:any) => t.id === tid);
                const val = progressMap[tid] ?? 20;
                return (
                  <div key={tid} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium text-ink truncate max-w-[250px]">{task?.title}</span>
                      <span className="text-brand font-bold">{val}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="5" value={val}
                      onChange={(e) => setProgressMap(prev => ({ ...prev, [tid]: Number(e.target.value) }))}
                      className="w-full accent-brand"
                    />
                  </div>
                );
              })}
            </div>
          )}

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
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Hours Spent *
              </label>
              <input
                type="number" step="0.5" min="0.5" value={timeSpent} onChange={(e) => setTimeSpent(e.target.value)}
                placeholder="e.g. 2.5" className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Blockers (if any)
              </label>
              <input
                type="text" value={blockers} onChange={(e) => setBlockers(e.target.value)} placeholder="Any issues?"
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] text-ink hover:bg-brand-light transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || loadingTasks} className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors">
            {submitting ? 'Saving…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
