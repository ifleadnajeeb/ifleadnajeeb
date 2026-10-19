import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, MessageSquare, CheckSquare, Calendar, User, Send, CheckCircle, XCircle, AlertCircle, Link as LinkIcon } from 'lucide-react';
import {
  tasksService, TaskStatus,
  STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR,
} from '../services/tasks.service';
import { cn } from '@/shared/utils/cn';
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
  const [deliverableUrl, setDeliverableUrl] = useState('');
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
    await tasksService.move(task.id, status);
    invalidate();
  };

  const handleAccept = async () => {
    if (!task) return;
    setBusy(true);
    await tasksService.accept(task.id);
    invalidate();
    setBusy(false);
  };

  const handleReject = async () => {
    if (!task) return;
    const reason = prompt('Why are you rejecting this task?');
    if (!reason) return;
    setBusy(true);
    await tasksService.reject(task.id, reason);
    invalidate();
    setBusy(false);
  };

  const handleSubmit = async () => {
    if (!task) return;
    setBusy(true);
    await tasksService.submitForReview(task.id, deliverableUrl);
    invalidate();
    setBusy(false);
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
              <h1 className="text-xl font-bold text-ink mb-3">{task.title}</h1>
              
              {/* Workflow Buttons */}
              <div className="mb-4 pb-4 border-b border-ink-border">
                {isDev && task.acceptance === 'PENDING' && (
                  <div className="flex gap-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <div className="flex-1 text-[13px] text-amber-800 font-medium flex items-center">New Work Assigned</div>
                    <button onClick={handleAccept} disabled={busy} className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Accept</button>
                    <button onClick={handleReject} disabled={busy} className="px-4 py-1.5 border border-red-300 text-red-600 rounded text-sm font-medium hover:bg-red-50 flex items-center gap-1"><XCircle className="w-4 h-4"/> Reject</button>
                  </div>
                )}

                {isDev && task.acceptance === 'ACCEPTED' && task.reviewStatus === 'NOT_SUBMITTED' && (
                  <div className="flex gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex-1 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-blue-500" />
                      <input value={deliverableUrl} onChange={e => setDeliverableUrl(e.target.value)} placeholder="Paste deliverable link (GitHub, Figma...)" className="flex-1 h-8 px-2 border border-blue-200 rounded text-sm" />
                    </div>
                    <button onClick={handleSubmit} disabled={busy} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">Submit for Review</button>
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
    </>
  );
}
