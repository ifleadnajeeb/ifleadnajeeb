import { useAuth } from '@/app/providers/auth-provider';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List as ListIcon, X, Calendar } from 'lucide-react';
import {
  tasksService, Task, TaskStatus, TaskPriority,
  STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR,
} from '../services/tasks.service';
import { cn } from '@/shared/utils/cn';
import { CanDo } from '@/shared/permissions/CanDo';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

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
  const { user } = useAuth();
  const qc = useQueryClient();
  const isOpsRole = ['OP_MANAGER', 'WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'].includes(user?.role || '');
  const pageTitle = isOpsRole ? 'Works' : 'Tasks';
  const opsFilter = isOpsRole ? 'true' : 'false';
  const [searchParams] = useSearchParams();
  const customerName = searchParams.get('customerName');
  
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(!!customerName);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  // Auto-open modal if coming from "Assign Work"
  useEffect(() => {
    if (customerName) setCreateOpen(true);
  }, [customerName]);

  const kanbanQ = useQuery({
    queryKey: ['tasks', 'kanban', search],
    queryFn: () => tasksService.kanban({ search: search || undefined, isOperations: opsFilter, assignedToId: isOpsRole ? undefined : user?.id }),
    enabled: view === 'kanban',
  });

  const listQ = useQuery({
    queryKey: ['tasks', 'list', search, page],
    queryFn: () => tasksService.list({ search: search || undefined, page, pageSize: 30, isOperations: opsFilter, assignedToId: isOpsRole ? undefined : user?.id }),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{pageTitle}</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">{isOpsRole ? 'Manage Operations & Assigned Works' : 'Manage your team\'s work'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-ink-border rounded-md overflow-hidden bg-white">
            <button
              onClick={() => setView('kanban')}
              className={cn('px-3 py-2 inline-flex items-center gap-1.5 text-[13px]',
                view === 'kanban' ? 'bg-brand text-white' : 'text-ink hover:bg-brand-light')}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('px-3 py-2 inline-flex items-center gap-1.5 text-[13px]',
                view === 'list' ? 'bg-brand text-white' : 'text-ink hover:bg-brand-light')}
            >
              <ListIcon className="w-3.5 h-3.5" /> List
            </button>
          </div>
          <CanDo permission="tasks:create">
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover"
            >
              <Plus className="w-4 h-4" /> New {pageTitle.slice(0, -1)}
            </button>
          </CanDo>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={`Search ${isOpsRole ? 'works' : 'tasks'}…`}
          className="w-full h-10 pl-9 pr-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
        />
      </div>

      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map(col => {
            const tasks = kanbanQ.data?.columns?.[col] ?? [];
            return (
              <div
                key={col}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData('text/task-id');
                  const allTasks = Object.values(kanbanQ.data?.columns ?? {}).flat();
                  const dragged = allTasks.find((t: Task) => t.id === taskId);
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
                  {tasks.map(task => {
                    // Calculate progress based on status or latest daily report
                    let progress = 0;
                    if (task.status === 'DONE') progress = 100;
                    else if (task.reviewStatus === 'PENDING_REVIEW') progress = 80;
                    else if (task.dailyReports?.[0]?.progress) progress = task.dailyReports[0].progress;
                    else if (task.acceptance === 'ACCEPTED') progress = 20;
                    else if (task.acceptance === 'PENDING') progress = 0;

                    // Get latest report text (shortened)
                    const latestReport = task.dailyReports?.[0]?.workCompleted;
                    const shortReport = latestReport ? (latestReport.length > 40 ? latestReport.substring(0, 40) + '...' : latestReport) : null;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={e => e.dataTransfer.setData('text/task-id', task.id)}
                        className="bg-white border border-ink-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <button
                            onClick={() => setOpenTaskId(task.id)}
                            className="text-[13.5px] font-medium text-ink leading-snug flex-1 text-left hover:text-brand"
                          >
                            {task.title}
                          </button>
                          <button
                            onClick={() => deleteTask(task)}
                            className="text-ink-muted hover:text-danger"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="mb-2 flex items-center justify-between">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', 
                            task.acceptance === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            task.reviewStatus === 'PENDING_REVIEW' ? 'bg-purple-100 text-purple-700' :
                            task.reviewStatus === 'CORRECTION_REQUESTED' ? 'bg-red-100 text-red-700' :
                            task.status === 'DONE' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          )}>
                            {task.acceptance === 'PENDING' ? 'PENDING ACCEPT' :
                             task.reviewStatus === 'PENDING_REVIEW' ? 'IN REVIEW' :
                             task.reviewStatus === 'CORRECTION_REQUESTED' ? 'NEEDS FIX' :
                             task.status === 'DONE' ? 'COMPLETED' : 'IN PROGRESS'}
                          </span>
                          <span className="text-[10px] font-semibold text-ink-muted">{progress}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                          <div className={cn("h-1.5 rounded-full", progress === 100 ? "bg-green-500" : "bg-brand")} style={{ width: `${progress}%` }}></div>
                        </div>

                        {/* Latest Report Snippet */}
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
                            <span className={cn('text-[11px] inline-flex items-center gap-1',
                              isOverdue(task.dueAt) && task.status !== 'DONE' ? 'text-danger font-medium' : 'text-ink-muted')}>
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
                      </div>
                    );
                  })}
                  {tasks.length === 0 && (
                    <div className="text-center py-6 text-[12px] text-ink-muted">No tasks</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'list' && (
        <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
          {listQ.isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
          {listQ.data && listQ.data.data.length === 0 && (
            <div className="py-16 text-center text-ink-muted text-sm">No tasks found.</div>
          )}
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
                <tbody>
                  {listQ.data.data.map(t => (
                    <tr key={t.id} className="border-t border-ink-border hover:bg-brand-light/40">
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink">{t.title}</div>
                        {t.description && <div className="text-[12px] text-ink-muted line-clamp-1">{t.description}</div>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', STATUS_COLOR[t.status])}>
                          {STATUS_LABEL[t.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', PRIORITY_COLOR[t.priority])}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{t.assignedTo?.name ?? '—'}</td>
                      <td className={cn('px-5 py-3 whitespace-nowrap',
                        isOverdue(t.dueAt) && t.status !== 'DONE' ? 'text-danger font-medium' : 'text-ink-muted')}>
                        {fmtDate(t.dueAt)}
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{fmtDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {listQ.data && listQ.data.meta.totalPages > 1 && (
            <div className="border-t border-ink-border px-5 py-3 flex items-center justify-between">
              <span className="text-[12px] text-ink-muted">Page {listQ.data.meta.page} of {listQ.data.meta.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">Previous</button>
                <button disabled={page >= listQ.data.meta.totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">Next</button>
              </div>
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
    </div>
  );
}

function NewTaskModal({ open, onClose, onSuccess, defaultCustomerName }: { open: boolean; onClose: () => void; onSuccess: () => void; defaultCustomerName?: string }) {
  const [title, setTitle] = useState('');
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
        priority, status,
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
          <h2 className="text-[16px] font-semibold text-ink">New Task</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
              placeholder="Build homepage"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none focus:outline-none focus:border-brand" />
          </div>
          
          

          
          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={submit} disabled={submitting}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {submitting ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
