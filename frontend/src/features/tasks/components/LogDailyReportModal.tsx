import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle2, Calendar, Clock, FileText, AlertCircle, ChevronDown } from 'lucide-react';
import { api } from '@/shared/api/client';
import { tasksService } from '../services/tasks.service';
import { motion, AnimatePresence, MotionConfig, type Variants } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Animation config                                                          */
/* -------------------------------------------------------------------------- */

// Dropdown panel itself: simple fade/slide. Children are staggered via `custom` index.
const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
};

// Each row fades/slides in with a delay based on its index (capped so long lists don't drag).
const STAGGER = 0.03;
const MAX_STAGGER_STEPS = 10;

const rowVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    boxShadow: '0px 0px 0px rgba(0,0,0,0)',
    transition: { duration: 0.2, delay: 0.05 + Math.min(i, MAX_STAGGER_STEPS) * STAGGER },
  }),
};

const rowHover = {
  scale: 1.02,
  boxShadow: '0px 4px 14px rgba(0,0,0,0.08)',
  transition: { type: 'spring' as const, stiffness: 400, damping: 28 },
};

/* -------------------------------------------------------------------------- */
/*  Task row (shared by Today / Previous / Done groups)                       */
/* -------------------------------------------------------------------------- */

function TaskRow({
  task,
  index,
  checked,
  onToggle,
  done = false,
}: {
  task: any;
  index: number;
  checked: boolean;
  onToggle: () => void;
  done?: boolean;
}) {
  return (
    <motion.label
      custom={index}
      variants={rowVariants}
      whileHover={rowHover}
      // mx-1.5 + rounded keeps the scaled row and its shadow from being clipped by the scroll container
      className="relative flex items-center gap-2 px-3 py-2 mx-1.5 my-0.5 rounded-md bg-white hover:bg-brand-light cursor-pointer"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="rounded text-brand focus:ring-brand"
      />
      <span className={`text-[13px] ${done ? 'line-through text-gray-500' : ''}`}>
        {task.title} <span className="text-ink-muted no-underline">({task.status})</span>
      </span>
    </motion.label>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modal                                                                     */
/* -------------------------------------------------------------------------- */

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
    queryFn: () => tasksService.list({ view: 'mine', pageSize: 100 }),
    enabled: open,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset AFTER the exit animation finishes, so the modal content doesn't
  // flash back to the empty form while it's fading out.
  const resetForm = () => {
    setSelectedTasks([]);
    setProgressMap({});
    setWorkCompleted('');
    setTimeSpent('');
    setBlockers('');
    setError('');
    setSuccess(false);
    setIsDropdownOpen(false);
  };

  const handleToggleTask = (id: string) => {
    if (selectedTasks.includes(id)) {
      setSelectedTasks((prev) => prev.filter((t) => t !== id));
    } else {
      setSelectedTasks((prev) => [...prev, id]);
      setProgressMap((prev) => ({ ...prev, [id]: prev[id] ?? 20 }));
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (selectedTasks.length === 0) { setError('Please select at least one work.'); return; }
    if (workCompleted.trim().length < 5) { setError('Please describe what you did.'); return; }
    if (!timeSpent || Number(timeSpent) <= 0) { setError('Please enter valid time spent.'); return; }

    setSubmitting(true);
    try {
      const reports = selectedTasks.map((id) => ({
        taskId: id,
        progress: progressMap[id] ?? 20,
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

  const tasks = tasksData?.data || [];

  // Grouping
  const todayStr = new Date().toDateString();
  const getTaskDate = (t: any) => new Date(t.createdAt || t.date || new Date()).toDateString();

  const todayTasks = tasks.filter((t: any) => t.status !== 'DONE' && getTaskDate(t) === todayStr);
  const previousTasks = tasks.filter((t: any) => t.status !== 'DONE' && getTaskDate(t) !== todayStr);
  const doneTasks = tasks.filter((t: any) => t.status === 'DONE');

  // Running offsets so the stagger flows continuously across the three groups
  // (index 0 is the "Select All" row)
  const todayOffset = 1;
  const previousOffset = todayOffset + todayTasks.length;
  const doneOffset = previousOffset + previousTasks.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(tasks.map((t: any) => t.id));
      const newMap: Record<string, number> = {};
      tasks.forEach((t: any) => { newMap[t.id] = progressMap[t.id] ?? 20; });
      setProgressMap(newMap);
    } else {
      setSelectedTasks([]);
      setProgressMap({});
    }
  };

  const submitDisabled = submitting || loadingTasks;

  return (
    // reducedMotion="user": respects the OS "reduce motion" setting (transforms are skipped, fades remain)
    <MotionConfig reducedMotion="user">
      <AnimatePresence onExitComplete={resetForm}>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
            onClick={onClose}
          >
            {success ? (
              /* ------------------------- SUCCESS VIEW ------------------------- */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
                className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full p-6 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-ink mb-1">Report Logged!</h2>
                <p className="text-[14px] text-ink-muted mb-5">Your daily progress has been recorded successfully.</p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="w-full h-11 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover transition-colors"
                >
                  Done
                </motion.button>
              </motion.div>
            ) : (
              /* -------------------------- FORM VIEW --------------------------- */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                className="bg-white rounded-2xl shadow-2xl max-w-[500px] w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
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
                  {/* ------------------------ DROPDOWN ------------------------ */}
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
                      <ChevronDown className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          variants={dropdownVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="absolute z-10 w-full mt-1 bg-white border border-ink-border rounded-md shadow-lg max-h-[300px] overflow-y-auto"
                        >
                          {/* Select All (stagger index 0) */}
                          <motion.label
                            custom={0}
                            variants={rowVariants}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-brand-light cursor-pointer border-b border-ink-border bg-gray-50/50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTasks.length === tasks.length && tasks.length > 0}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="rounded text-brand focus:ring-brand"
                            />
                            <span className="font-semibold text-[13px]">Select All Works</span>
                          </motion.label>

                          {/* 1. TODAY'S WORKS */}
                          {todayTasks.length > 0 && (
                            <div className="pb-1">
                              <div className="px-3 py-1.5 bg-blue-50 text-[11px] font-bold text-blue-700 uppercase tracking-wider sticky top-0 z-10 border-b border-blue-100 mb-1">
                                Today's Works
                              </div>
                              {todayTasks.map((t: any, i: number) => (
                                <TaskRow
                                  key={t.id}
                                  task={t}
                                  index={todayOffset + i}
                                  checked={selectedTasks.includes(t.id)}
                                  onToggle={() => handleToggleTask(t.id)}
                                />
                              ))}
                            </div>
                          )}

                          {/* 2. PREVIOUS PENDING WORKS */}
                          {previousTasks.length > 0 && (
                            <div className="pb-1">
                              <div className="px-3 py-1.5 bg-amber-50 text-[11px] font-bold text-amber-700 uppercase tracking-wider sticky top-0 z-10 border-b border-amber-100 mb-1">
                                Previous Pending Works
                              </div>
                              {previousTasks.map((t: any, i: number) => (
                                <TaskRow
                                  key={t.id}
                                  task={t}
                                  index={previousOffset + i}
                                  checked={selectedTasks.includes(t.id)}
                                  onToggle={() => handleToggleTask(t.id)}
                                />
                              ))}
                            </div>
                          )}

                          {/* 3. DONE WORKS */}
                          {doneTasks.length > 0 && (
                            <div className="opacity-70 pb-1">
                              <div className="px-3 py-1.5 bg-gray-100 text-[11px] font-bold text-gray-600 uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200 mb-1">
                                Done Works
                              </div>
                              {doneTasks.map((t: any, i: number) => (
                                <TaskRow
                                  key={t.id}
                                  task={t}
                                  index={doneOffset + i}
                                  checked={selectedTasks.includes(t.id)}
                                  onToggle={() => handleToggleTask(t.id)}
                                  done
                                />
                              ))}
                            </div>
                          )}

                          {tasks.length === 0 && !loadingTasks && (
                            <div className="p-4 text-center text-[13px] text-ink-muted">No tasks found.</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ------------------ PROGRESS SLIDERS (expand) ------------------ */}
                  <AnimatePresence initial={false}>
                    {selectedTasks.length > 0 && (
                      // Outer wrapper animates height; padding/border live on the inner div
                      // so height can collapse cleanly to 0.
                      <motion.div
                        key="progress-container"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: { type: 'spring', stiffness: 260, damping: 30 },
                          opacity: { duration: 0.2 },
                        }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="space-y-3 border border-ink-border rounded-lg p-3 bg-ink-bg/30">
                          <label className="block text-[13px] text-ink-muted font-medium">Progress per Work</label>
                          <AnimatePresence initial={false}>
                            {selectedTasks.map((tid) => {
                              const task = tasks.find((t: any) => t.id === tid);
                              const val = progressMap[tid] ?? 20;
                              return (
                                <motion.div
                                  key={tid}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <div className="space-y-1 pb-1">
                                    <div className="flex items-center justify-between text-[12px]">
                                      <span className="font-medium text-ink truncate max-w-[250px]">{task?.title}</span>
                                      <span className="text-brand font-bold">{val}%</span>
                                    </div>
                                    <input
                                      type="range" min="0" max="100" step="5" value={val}
                                      onChange={(e) => setProgressMap((prev) => ({ ...prev, [tid]: Number(e.target.value) }))}
                                      className="w-full accent-brand"
                                    />
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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

                  <AnimatePresence initial={false}>
                    {error && (
                      <motion.div
                        key="error"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
                  <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] text-ink hover:bg-brand-light transition-colors">Cancel</button>

                  {/* ------------------------ SUBMIT BUTTON ------------------------ */}
                  <div className="relative">
                    {/* Pulsing halo while submitting (uses the brand colour via Tailwind, so it stays on-theme) */}
                    <AnimatePresence>
                      {submitting && (
                        <motion.span
                          key="pulse-ring"
                          aria-hidden
                          className="absolute inset-0 rounded-md bg-brand pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.45, 0], scale: [1, 1.25] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
                        />
                      )}
                    </AnimatePresence>

                    <motion.button
                      onClick={handleSubmit}
                      disabled={submitDisabled}
                      whileTap={submitDisabled ? undefined : { scale: 0.95 }}
                      animate={submitting ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                      transition={
                        submitting
                          ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
                          : { type: 'spring', stiffness: 400, damping: 25 }
                      }
                      className="relative h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Saving…' : 'Submit Report'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}