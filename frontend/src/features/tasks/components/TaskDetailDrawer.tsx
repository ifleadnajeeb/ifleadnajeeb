import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Edit, TrendingUp, MessageSquare, CheckSquare, Calendar, User, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  tasksService, TaskStatus,
  STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR,
} from '../services/tasks.service';
import { cn } from '@/shared/utils/cn';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/features/users/services/users.service';
import { operationsService } from '@/features/operations/services/operations.service';
import { useAuth } from '@/app/providers/auth-provider';

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
const DEV_ROLES = ['WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR'];

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function TaskDetailDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [newChecklist, setNewChecklist] = useState('');
  const [newComment, setNewComment] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: () => tasksService.detail(taskId!),
    enabled: !!taskId,
  });

  if (!taskId) return null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['task-detail', taskId] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
  };

  const changeStatus = async (status: TaskStatus) => {
    if (!task) return;
    setBusy(true);
    try {
      await tasksService.move(task.id, status);
      invalidate();
    } catch (err: any) {
      console.error(err);
      alert('Failed to update status: ' + (err?.response?.data?.message || err.message));
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!task) return;
    setBusy(true);
    try {
      await tasksService.accept(task.id);
      window.location.reload(); // Hard reload to guarantee UI update
    } catch (err: any) {
      console.error(err);
      alert('Failed to accept: ' + (err?.response?.data?.message || err.message));
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!task) return;
    const reason = prompt('Why are you rejecting this task?');
    if (!reason) return;
    setBusy(true);
    try {
      await tasksService.reject(task.id, reason);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert('Failed to reject: ' + (err?.response?.data?.message || err.message));
      setBusy(false);
    }
  };



  const handleApprove = async () => {
    if (!task) return;
    setBusy(true);
    await tasksService.approve(task.id);
    invalidate();
    setBusy(false);
  };

  const handleCorrect = async () => {
    if (!task) return;
    const reason = prompt('Reason for correction:');
    if (!reason) return;
    setBusy(true);
    await tasksService.requestCorrection(task.id, reason);
    invalidate();
    setBusy(false);
  };

  const addChecklist = async () => {
    if (!newChecklist.trim() || !task) return;
    setBusy(true);
    try {
      await tasksService.addChecklistItem(task.id, newChecklist.trim());
      setNewChecklist('');
      invalidate();
    } finally { setBusy(false); }
  };

  const toggleCheck = async (itemId: string, done: boolean) => {
    await tasksService.toggleChecklistItem(itemId, done);
    invalidate();
  };

  const deleteCheck = async (itemId: string) => {
    await tasksService.deleteChecklistItem(itemId);
    invalidate();
  };

  const postComment = async () => {
    if (!newComment.trim() || !task) return;
    setBusy(true);
    try {
      await tasksService.addComment(task.id, newComment.trim());
      setNewComment('');
      invalidate();
    } finally { setBusy(false); }
  };

  const isDev = DEV_ROLES.includes(user?.role || '');
  const isOp = user?.role === 'OP_MANAGER' || user?.role === 'ADMIN' || user?.role === 'CEO';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[640px] bg-ink-bg shadow-2xl flex flex-col">
        <div className="bg-white border-b border-ink-border px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-brand" />
            <span className="text-[13px] font-semibold text-ink-muted uppercase tracking-wider">Work / Task</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>

        {isLoading && <div className="p-10 text-center text-sm text-ink-muted">Loading…</div>}

        {task && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* Header & Workflow Actions */}
            <div className="bg-white border border-ink-border rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <h1 className="text-xl font-bold text-ink">{task.title}</h1>
                {isDev && (
                  <button onClick={() => setReportModalOpen(true)} className="inline-flex items-center gap-1 text-[12px] text-blue-600 font-medium hover:underline bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                    <Calendar className="w-3.5 h-3.5" /> Log Daily Report
                  </button>
                )}
                {isOp && (
                  <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1 text-[12px] text-brand font-medium hover:underline bg-brand-light px-2.5 py-1 rounded">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>
              
              {/* Workflow Buttons */}
              <div className="mb-4 pb-4 border-b border-ink-border">
                {isDev && task.acceptance === 'PENDING' && (
                  <div className="flex gap-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <div className="flex-1 text-[13px] text-amber-800 font-medium flex items-center">New Work Assigned</div>
                    <button onClick={handleAccept} disabled={busy} className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Accept</button>
                    <button onClick={handleReject} disabled={busy} className="px-4 py-1.5 border border-red-300 text-red-600 rounded text-sm font-medium hover:bg-red-50 flex items-center gap-1"><XCircle className="w-4 h-4"/> Reject</button>
                  </div>
                )}

                

                {task.reviewStatus === 'CORRECTION_REQUESTED' && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-3">
                    <div className="text-[12px] text-red-800 font-bold mb-1 flex items-center gap-1"><AlertCircle className="w-4 h-4"/> Correction Requested</div>
                    <p className="text-[13px] text-red-700">{task.rejectionReason || 'Please review the requirements again.'}</p>
                  </div>
                )}

                {isOp && task.reviewStatus === 'PENDING_REVIEW' && (
                  <div className="flex gap-2 bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <div className="flex-1 text-[13px] text-purple-800 font-medium flex items-center">Work ready for review</div>
                    <button onClick={handleApprove} disabled={busy} className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700">Approve</button>
                    <button onClick={handleCorrect} disabled={busy} className="px-4 py-1.5 border border-amber-300 text-amber-700 rounded text-sm font-medium hover:bg-amber-50">Correct</button>
                  </div>
                )}
              </div>

              {/* OP MANAGER WORK PROGRESS GRAPH */}
              {isOp && (
                <div className="bg-gradient-to-br from-gray-50 to-white border border-ink-border rounded-xl p-4 mb-4 shadow-sm">
                  <h3 className="text-[13px] font-bold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand" /> Work Progress Overview
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-6 items-center">
                    {/* Circular / Visual Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[12px] font-medium text-ink mb-1">
                        <span>Current Progress</span>
                        <span className="text-brand font-bold text-[14px]">
                          {task.status === 'DONE' ? '100' : (task.dailyReports?.[0]?.progress || (task.acceptance === 'ACCEPTED' ? 10 : 0))}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                        <div 
                          className={cn("h-3 rounded-full transition-all duration-500", 
                            task.status === 'DONE' ? 'bg-green-500' : 'bg-brand'
                          )} 
                          style={{ width: `${task.status === 'DONE' ? 100 : (task.dailyReports?.[0]?.progress || (task.acceptance === 'ACCEPTED' ? 10 : 0))}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Workflow Status Badges */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="text-ink-muted">Acceptance:</span>
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', 
                          task.acceptance === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          task.acceptance === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        )}>
                          {task.acceptance || 'ACCEPTED'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="text-ink-muted">Review Status:</span>
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', 
                          task.reviewStatus === 'NOT_SUBMITTED' ? 'bg-gray-100 text-gray-700' :
                          task.reviewStatus === 'PENDING_REVIEW' ? 'bg-purple-100 text-purple-700' :
                          task.reviewStatus === 'CORRECTION_REQUESTED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        )}>
                          {task.reviewStatus?.replace('_', ' ') || 'NOT SUBMITTED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Latest Daily Report Summary */}
                  {task.dailyReports && task.dailyReports.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-ink-border">
                      <div className="text-[11px] font-semibold text-ink-muted uppercase mb-1">Latest Update (Daily Report)</div>
                      <p className="text-[12.5px] text-ink italic bg-white p-2 rounded border border-gray-100">
                        "{task.dailyReports[0].workCompleted}"
                      </p>
                      <div className="flex justify-between mt-2 text-[10px] text-ink-muted">
                        <span>Logged: {new Date(task.dailyReports[0].createdAt).toLocaleDateString()}</span>
                        <span>Hours: {task.dailyReports[0].timeSpent || 0}h</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                {COLUMNS.map(s => (
                  <button key={s} onClick={() => changeStatus(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors',
                      task.status === s
                        ? cn('border-transparent', STATUS_COLOR[s])
                        : 'bg-white border-ink-border text-ink-muted hover:border-brand'
                    )}>
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-0.5">Priority</div>
                  <span className={cn('inline-block px-2 py-0.5 rounded text-[11px] font-medium', PRIORITY_COLOR[task.priority])}>
                    {task.priority}
                  </span>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-0.5">Due</div>
                  <div className="text-ink flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                    {task.dueAt ? new Date(task.dueAt).toLocaleDateString('en-GB') : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-0.5">Assigned</div>
                  <div className="text-ink flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-ink-muted" />
                    {task.assignedTo?.name ?? '—'}
                  </div>
                </div>
                {task.deliverableUrl && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-0.5">Deliverable</div>
                    <a href={task.deliverableUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline truncate block">View Link</a>
                  </div>
                )}
              </div>
              
              {task.description && (
                <div className="mt-4 pt-4 border-t border-ink-border">
                  <div className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1.5">Description</div>
                  <p className="text-[13.5px] text-ink whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-ink-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-semibold text-ink flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-brand" /> Checklist
                </h2>
                {task.checklist.length > 0 && (
                  <span className="text-[11.5px] text-ink-muted">
                    {task.checklist.filter((i: any) => i.done).length} / {task.checklist.length}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 mb-3">
                {task.checklist.length === 0 && (
                  <p className="text-[12.5px] text-ink-muted text-center py-2">No items yet.</p>
                )}
                {task.checklist.map((item: any) => (
                  <div key={item.id} className="group flex items-center gap-2 py-1">
                    <input type="checkbox" checked={item.done}
                      onChange={e => toggleCheck(item.id, e.target.checked)}
                      className="w-4 h-4 accent-brand cursor-pointer" />
                    <span className={cn('flex-1 text-[13.5px]', item.done && 'line-through text-ink-muted')}>
                      {item.text}
                    </span>
                    <button onClick={() => deleteCheck(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-danger transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newChecklist} onChange={e => setNewChecklist(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addChecklist()}
                  placeholder="Add item…"
                  className="flex-1 h-9 px-3 border border-ink-border rounded-md text-[13px] bg-white focus:outline-none focus:border-brand" />
                <button onClick={addChecklist} disabled={busy || !newChecklist.trim()}
                  className="h-9 px-3 rounded-md bg-brand text-white text-[12.5px] font-medium hover:bg-brand-hover disabled:opacity-40">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-white border border-ink-border rounded-xl p-5">
              <h2 className="text-[14px] font-semibold text-ink flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-brand" /> Comments ({task.comments.length})
              </h2>
              <div className="space-y-3 mb-4">
                {task.comments.length === 0 && (
                  <p className="text-[12.5px] text-ink-muted text-center py-2">No comments yet.</p>
                )}
                {task.comments.map((c: any) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-brand-light text-brand flex items-center justify-center text-[11px] font-bold shrink-0">
                      {c.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12.5px] font-medium text-ink">{c.user.name}</span>
                        <span className="text-[11px] text-ink-muted">{fmt(c.createdAt)}</span>
                      </div>
                      <p className="text-[13px] text-ink whitespace-pre-wrap break-words">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-3 border-t border-ink-border">
                <div className="w-7 h-7 rounded-full bg-brand-light text-brand flex items-center justify-center text-[11px] font-bold shrink-0">
                  {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                </div>
                <input value={newComment} onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && postComment()}
                  placeholder="Write a comment…"
                  className="flex-1 h-9 px-3 border border-ink-border rounded-md text-[13px] bg-white focus:outline-none focus:border-brand" />
                <button onClick={postComment} disabled={busy || !newComment.trim()}
                  className="h-9 px-3 rounded-md bg-brand text-white hover:bg-brand-hover disabled:opacity-40">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
      {reportModalOpen && (
        <LogReportModal 
          taskId={task.id} 
          onClose={() => setReportModalOpen(false)} 
          onSuccess={() => { setReportModalOpen(false); invalidate(); }} 
        />
      )}

      {editOpen && (
        <EditTaskModal 
          task={task} 
          onClose={() => setEditOpen(false)} 
          onSuccess={() => { setEditOpen(false); invalidate(); }} 
        />
      )}
    </>
  );
}

function EditTaskModal({ task, onClose, onSuccess }: { task: any, onClose: () => void, onSuccess: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [dueAt, setDueAt] = useState(task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : '');
  const [assignedToId, setAssignedToId] = useState(task.assignedToId || '');
  const [projectId, setProjectId] = useState(task.projectId || '');
  const [departmentId, setDepartmentId] = useState(task.departmentId || '');
  const [saving, setSaving] = useState(false);

  const { data: users } = useQuery({ queryKey: ['assignable-users'], queryFn: usersService.assignable });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: operationsService.listProjects });
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: operationsService.listDepartments });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await tasksService.update(task.id, {
        title, description, priority, status,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        assignedToId, projectId: projectId || undefined, departmentId: departmentId || undefined
      } as any);
      onSuccess();
    } catch (err) {
      alert('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-ink-border flex justify-between items-center">
          <h2 className="text-[16px] font-semibold text-ink">Edit Task</h2>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-ink-muted" /></button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div><label className="block text-[13px] text-ink-muted mb-1.5">Title</label><input required value={title} onChange={e => setTitle(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" /></div>
          <div><label className="block text-[13px] text-ink-muted mb-1.5">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Assign To</label>
              <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]">
                <option value="">— Unassigned —</option>
                {users?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Department</label>
              <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]">
                <option value="">— None —</option>
                {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]">
              <option value="">— None —</option>
              {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]">
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]">
                {['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Due Date</label>
              <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}



function LogReportModal({ taskId, onClose, onSuccess }: { taskId: string, onClose: () => void, onSuccess: () => void }) {
  const [workCompleted, setWorkCompleted] = useState('');
  const [timeSpent, setTimeSpent] = useState('');
  const [progress, setProgress] = useState(50);
  const [blockers, setBlockers] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!workCompleted.trim()) return;
    setSubmitting(true);
    try {
      await operationsService.createDailyReport({
        taskId,
        workCompleted,
        timeSpent: timeSpent ? Number(timeSpent) : undefined,
        progress: Number(progress),
        blockers
      });
      onSuccess();
    } catch (e) {
      alert('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">Log Daily Report</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5 font-medium">What was done today? *</label>
            <textarea value={workCompleted} onChange={e => setWorkCompleted(e.target.value)} rows={3} autoFocus
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none focus:outline-none focus:border-brand" />
          </div>
          
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5 font-medium">Progress: {progress}%</label>
            <input type="range" min="0" max="100" step="10" value={progress} onChange={e => setProgress(Number(e.target.value))} className="w-full accent-brand" />
            <div className="flex justify-between text-[11px] text-ink-muted mt-1">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Hours Spent</label>
              <input type="number" value={timeSpent} onChange={e => setTimeSpent(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Blockers (if any)</label>
              <input value={blockers} onChange={e => setBlockers(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={submit} disabled={submitting || !workCompleted.trim()}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
