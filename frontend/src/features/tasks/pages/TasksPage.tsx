import { LogDailyReportModal } from '../components/LogDailyReportModal';
import { usersService } from '@/features/users/services/users.service';
import { useAuth } from '@/app/providers/auth-provider';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List as ListIcon, X, Calendar, PieChart, CheckCircle2, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  tasksService, Task, TaskStatus, TaskPriority,
  STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR,
} from '../services/tasks.service';
import { cn } from '@/shared/utils/cn';
import { CanDo } from '@/shared/permissions/CanDo';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB');
}
function isOverdue(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  return d < today;
}

export default function TasksPage() {
  const [dailyReportOpen, setDailyReportOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<'all' | 'mine' | 'review'>('all');
  const { data: users } = useQuery({ queryKey: ['assignable-users'], queryFn: usersService.assignable });
  
  const qc = useQueryClient();
  const isOpsRole = ['OP_MANAGER', 'WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR', 'GRAPHIC_DESIGNER'].includes(user?.role || '');
  const pageTitle = isOpsRole ? 'Works' : 'Tasks';
  const opsFilter = isOpsRole ? 'true' : 'false';
  
  const [searchParams] = useSearchParams();
  const customerName = searchParams.get('customerName');
  const filterUserId = searchParams.get('userId');
  const filterUserName = searchParams.get('userName');
  
  const [view, setView] = useState<'kanban' | 'list' | 'reports'>('kanban');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(!!customerName);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (customerName) setCreateOpen(true);
  }, [customerName]);

  const kanbanQ = useQuery({
    refetchOnMount: 'always',
    queryKey: ['tasks', 'kanban', search],
    queryFn: () => tasksService.list({ search: search || undefined, pageSize: 100 }),
    enabled: view === 'kanban' || view === 'reports',
  });
  
  const listQ = useQuery({
    queryKey: ['tasks', 'list', search, page],
    queryFn: () => tasksService.list({ search: search || undefined, page, pageSize: 30, isOperations: opsFilter, assignedToId: (isOpsRole || user?.role === 'DIGITAL_MARKETER') ? undefined : user?.id }),
    enabled: view === 'list',
  });

  const moveTask = async (task: Task, target: TaskStatus) => {
    if (task.status === target) return;
    try {
      await tasksService.move(task.id, target);
      qc.invalidateQueries({ queryKey: ['tasks'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to move task');
    }
  };

  const deleteTask = async (task: Task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await tasksService.remove(task.id);
      qc.invalidateQueries({ queryKey: ['tasks'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed');
    }
  };

  const extractTasks = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    return [];
  };

  const rawTasks = view === 'list' ? extractTasks(listQ.data) : extractTasks(kanbanQ.data);

  const displayTasks = Array.isArray(rawTasks) ? rawTasks.filter((task: any) => {
    if (filterUserId && task.assignedToId !== filterUserId) return false;
    if (viewMode === 'mine' && task.assignedToId !== user?.id) return false;
    if (viewMode === 'review' && task.reviewStatus !== 'PENDING_REVIEW') return false;
    return true; 
  }) : [];

  const totalTasks = displayTasks.length;
  const completedTasksList = displayTasks.filter((t: any) => t.status === 'DONE');
  const doneTasks = completedTasksList.length;
  const pendingTasks = displayTasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'CANCELLED').length;
  const reviewTasks = displayTasks.filter((t: any) => t.reviewStatus === 'PENDING_REVIEW').length;
  
  const employeeStats = displayTasks.reduce((acc: any, task: any) => {
    const empId = task.assignedToId || 'unassigned';
    const empName = task.assignedTo?.name || 'Unassigned';
    if (!acc[empId]) {
      acc[empId] = { name: empName, total: 0, done: 0, pending: 0 };
    }
    acc[empId].total += 1;
    if (task.status === 'DONE') acc[empId].done += 1;
    else if (task.status !== 'CANCELLED') acc[empId].pending += 1;
    return acc;
  }, {});
  
  const statsArray = Object.values(employeeStats).sort((a: any, b: any) => b.total - a.total);

  return (
    <div className="space-y-4">
      {filterUserId && (
        <div className="bg-brand-light p-3 rounded-lg flex justify-between items-center text-ink border border-brand/20 mb-2">
          <span className="text-[14px]">Viewing <strong>{pageTitle.toLowerCase()}</strong> assigned to <strong>{filterUserName || 'this user'}</strong></span>
          <button onClick={() => navigate('/tasks')} className="text-brand underline text-[13px] font-medium flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Clear Filter
          </button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{pageTitle}</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">Manage your {pageTitle.toLowerCase()} and assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-ink-bg p-1 rounded-lg">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${view === 'kanban' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
              <LayoutGrid className="w-3.5 h-3.5 inline mr-1" /> Kanban
            </button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${view === 'list' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
              <ListIcon className="w-3.5 h-3.5 inline mr-1" /> List
            </button>
            <button onClick={() => setView('reports')} className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${view === 'reports' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
              <PieChart className="w-3.5 h-3.5 inline mr-1" /> Reports
            </button>
          </div>
          
          <button onClick={() => setDailyReportOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-ink-border bg-white text-ink text-[13.5px] font-medium hover:bg-brand-light transition-colors">
            <Calendar className="w-4 h-4" /> Log Daily Report
          </button>
          <CanDo permission="tasks:create">
            <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover">
              <Plus className="w-4 h-4" /> New {pageTitle.slice(0, -1)}
            </button>
          </CanDo>
        </div>
      </div>
      
      {view !== 'reports' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={`Search ${isOpsRole ? 'works' : 'tasks'}…`}
            className="w-full h-10 pl-9 pr-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
          />
        </div>
      )}

      {view === 'reports' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><ListIcon className="w-6 h-6 text-blue-600" /></div>
              <div><p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Total Works</p><p className="text-2xl font-bold text-ink">{totalTasks}</p></div>
            </div>
            <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0"><CheckCircle2 className="w-6 h-6 text-green-600" /></div>
              <div><p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Completed</p><p className="text-2xl font-bold text-green-600">{doneTasks}</p></div>
            </div>
            <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0"><Clock className="w-6 h-6 text-amber-600" /></div>
              <div><p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">Pending</p><p className="text-2xl font-bold text-amber-600">{pendingTasks}</p></div>
            </div>
            <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0"><AlertCircle className="w-6 h-6 text-purple-600" /></div>
              <div><p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">In Review</p><p className="text-2xl font-bold text-purple-600">{reviewTasks}</p></div>
            </div>
          </div>

          <div className="bg-white border border-ink-border rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-ink mb-4">Employee Workload</h3>
            <div className="space-y-4">
              {statsArray.map((emp: any, i) => {
                const completionRate = emp.total > 0 ? Math.round((emp.done / emp.total) * 100) : 0;
                return (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-0">
                    <div className="w-48 shrink-0">
                      <p className="font-semibold text-ink text-sm">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.total} assigned works</p>
                    </div>
                    <div className="flex-1 max-w-xl flex items-center gap-4">
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-green-500" style={{ width: `${completionRate}%` }} title="Completed"></div>
                        <div className="h-full bg-amber-400" style={{ width: `${100 - completionRate}%` }} title="Pending"></div>
                      </div>
                      <span className="text-sm font-bold text-ink w-12 text-right">{completionRate}%</span>
                    </div>
                    <div className="flex gap-2 text-xs font-medium shrink-0">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded">{emp.done} Done</span>
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">{emp.pending} Pending</span>
                    </div>
                  </div>
                );
              })}
              {statsArray.length === 0 && <p className="text-center text-gray-500 py-6">No data available.</p>}
            </div>
          </div>

          <div className="bg-white border border-ink-border rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-ink mb-4">All Completed Works</h3>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="text-left text-[12px] uppercase tracking-wider text-ink-muted font-semibold border-b border-ink-border">
                    <th className="px-4 py-3">Task Title</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Completed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {completedTasksList.map((t: any) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-ink">{t.title}</td>
                      <td className="px-4 py-3 text-ink-muted">{t.assignedTo?.name || 'Unassigned'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', PRIORITY_COLOR[t.priority])}>{t.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{fmtDate(t.updatedAt || t.dueAt || t.createdAt)}</td>
                    </tr>
                  ))}
                  {completedTasksList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">No completed works yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {view === 'kanban' && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map(col => {
            const tasks = (displayTasks || []).filter((t: any) => {
              if (t.status !== col) return false;
              if (col === 'DONE') {
                const completionDate = t.updatedAt || t.completedAt || t.dueAt;
                if (!completionDate) return false;
                const todayStr = new Date().toDateString();
                return new Date(completionDate).toDateString() === todayStr;
              }
              return true;
            });
            
            return (
              <motion.div
                variants={itemVariants}
                key={col}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData('text/task-id');
                  const dragged = displayTasks.find((t: Task) => t.id === taskId);
                  if (dragged) moveTask(dragged, col);
                }}
                className="bg-ink-bg border border-ink-border rounded-xl p-3 min-h-[200px]"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-[13px] font-semibold text-ink">{STATUS_LABEL[col]}</h3>
                  <span className="text-[11.5px] text-ink-muted bg-white px-2 py-0.5 rounded-full border border-ink-border">
                    {tasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {(tasks || []).map(task => {
                      const latestProgressReport = task.dailyReports?.[0];
                      let progress = 0;
                      if (task.status === 'DONE') progress = 100;
                      else if (task.reviewStatus === 'PENDING_REVIEW') progress = 80;
                      else if (latestProgressReport?.progress != null) progress = latestProgressReport.progress;
                      else if (task.acceptance === 'ACCEPTED') progress = 20;

                      const latestReport = task.dailyReports?.[0]?.workCompleted;
                      const shortReport = latestReport ? (latestReport.length > 40 ? latestReport.substring(0, 40) + '...' : latestReport) : null;

                      return (
                        <motion.div
                          layout
                          variants={itemVariants}
                          whileHover={{ y: -3, boxShadow: "0px 6px 15px rgba(0,0,0,0.06)" }}
                          whileTap={{ scale: 0.98 }}
                          key={task.id}
                          draggable
                          onDragStart={e => e.dataTransfer.setData('text/task-id', task.id)}
                          className="bg-white border border-ink-border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <button onClick={() => setOpenTaskId(task.id)} className="text-[13.5px] font-medium text-ink leading-snug flex-1 text-left hover:text-brand">
                              {task.title}
                            </button>
                            <button onClick={() => deleteTask(task)} className="text-ink-muted hover:text-danger">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="mb-2 flex items-center justify-between">
                            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', 
                              task.acceptance === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                              task.reviewStatus === 'PENDING_REVIEW' ? 'bg-purple-100 text-purple-700' :
                              task.reviewStatus === 'CORRECTION_REQUESTED' ? 'bg-red-100 text-red-700' :
                              task.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            )}>
                              {task.acceptance === 'PENDING' ? 'PENDING ACCEPT' :
                               task.reviewStatus === 'PENDING_REVIEW' ? 'IN REVIEW' :
                               task.reviewStatus === 'CORRECTION_REQUESTED' ? 'NEEDS FIX' :
                               task.status === 'DONE' ? 'COMPLETED' : 'IN PROGRESS'}
                            </span>
                            <span className="text-[10px] font-semibold text-ink-muted">{progress}%</span>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={cn("h-1.5 rounded-full", progress === 100 ? "bg-green-500" : "bg-brand")} />
                          </div>

                          {shortReport && (
                            <div className="text-[10.5px] text-ink-muted italic mb-2 bg-gray-50 p-1.5 rounded border border-gray-100">
                              "{shortReport}"
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', PRIORITY_COLOR[task.priority])}>
                              {task.priority}
                            </span>
                            {task.dueAt && (
                              <span className={cn('text-[11px] inline-flex items-center gap-1', isOverdue(task.dueAt) && task.status !== 'DONE' ? 'text-danger font-medium' : 'text-ink-muted')}>
                                <Calendar className="w-3 h-3" /> {fmtDate(task.dueAt)}
                              </span>
                            )}
                          </div>
                          
                          {task.assignedTo && (
                            <div className="text-[11px] text-ink font-medium mt-1.5 pt-1.5 border-t border-ink-border flex items-center gap-1">
                              <div className="w-4 h-4 rounded-full bg-brand-light text-brand flex items-center justify-center text-[8px]">
                                {task.assignedTo.name.charAt(0).toUpperCase()}
                              </div>
                              {task.assignedTo.name}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {tasks.length === 0 && <div className="text-center py-6 text-[12px] text-ink-muted">No tasks</div>}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {view === 'list' && (
        <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
          {listQ.isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
          {listQ.data && listQ.data.data.length === 0 && <div className="py-16 text-center text-ink-muted text-sm">No tasks found.</div>}
          {listQ.data && listQ.data.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-ink-bg">
                  <tr className="text-left text-[12px] uppercase tracking-wider text-brand font-semibold">
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Priority</th>
                    <th className="px-5 py-3">Assigned to</th>
                    <th className="px-5 py-3">Due</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                  {(Array.isArray(listQ.data) ? listQ.data : (listQ.data?.data || [])).map(t => (
                    <motion.tr variants={itemVariants} whileHover={{ backgroundColor: "#f9fafb" }} key={t.id} className="border-t border-ink-border transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink">{t.title}</div>
                        {t.description && <div className="text-[12px] text-ink-muted line-clamp-1">{t.description}</div>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', STATUS_COLOR[t.status])}>{STATUS_LABEL[t.status]}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', PRIORITY_COLOR[t.priority])}>{t.priority}</span>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{t.assignedTo?.name ?? '—'}</td>
                      <td className={cn('px-5 py-3 whitespace-nowrap', isOverdue(t.dueAt) && t.status !== 'DONE' ? 'text-danger font-medium' : 'text-ink-muted')}>{fmtDate(t.dueAt)}</td>
                      <td className="px-5 py-3 text-ink-muted">{fmtDate(t.createdAt)}</td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <NewTaskModal
        open={createOpen}
        defaultCustomerName={customerName || ''}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ['tasks'] }); }}
      />

      <TaskDetailDrawer taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
      
      <LogDailyReportModal 
        open={dailyReportOpen} 
        onClose={() => setDailyReportOpen(false)} 
        onSuccess={() => { setDailyReportOpen(false); qc.invalidateQueries({ queryKey: ['tasks'] }); }}
      />
    </div>
  );
}

function NewTaskModal({ open, onClose, onSuccess, defaultCustomerName }: { open: boolean; onClose: () => void; onSuccess: () => void; defaultCustomerName?: string }) {
  const { data: users, isLoading: loadingUsers, isError } = useQuery({ queryKey: ['assignable-users'], queryFn: usersService.assignable });

  const [title, setTitle] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [dueAt, setDueAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultCustomerName) {
      setTitle(`Work for ${defaultCustomerName}`);
    }
  }, [defaultCustomerName]);

  if (!open) return null;

  const submit = async () => {
    setError('');
    if (title.trim().length < 2) { setError('Title must be at least 2 characters'); return; }
    setSubmitting(true);
    try {
      await tasksService.create({
        title: title.trim(),
        description: description.trim() || undefined,
        priority, status, assignedToId: assignedToId || undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      });
      setTitle(''); setDescription(''); setPriority('MEDIUM'); setStatus('TODO'); setDueAt('');
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">Assign Work</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Work Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
              placeholder="e.g. Work for Sebin"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Instructions / Method</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="What exactly should the staff do?"
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Assign To Staff *</label>
            <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} required
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand">
              <option value="">
                {loadingUsers ? 'Loading employees...' : isError ? 'Error loading employees' : '— Select Employee —'}
              </option>
              {(Array.isArray(users) ? users : (users?.data || [])).map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Due Date</label>
            <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={submit} disabled={submitting}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {submitting ? 'Assigning…' : 'Assign Work'}
          </button>
        </div>
      </div>
    </div>
  );
}
