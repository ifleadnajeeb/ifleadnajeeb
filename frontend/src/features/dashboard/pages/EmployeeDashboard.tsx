import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, CheckSquare, X } from 'lucide-react';
import { tasksService } from '@/features/tasks/services/tasks.service';
import { operationsService } from '@/features/operations/services/operations.service';
import { useAuth } from '@/app/providers/auth-provider';
import { LogDailyReportModal } from '@/features/operations/components/LogDailyReportModal';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reportTaskId, setReportTaskId] = useState<string | null>(null);
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);

  // Fetch ALL tasks assigned to this user without strict filters
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', 'my-work', user?.id],
    queryFn: () => tasksService.list({ pageSize: 100 }), // Fetch all, we will filter below
    enabled: !!user?.id,
  });

  // Filter locally to ensure nothing is missed
  const myTasks = tasksData?.data?.filter(t => t.assignedToId === user?.id) || [];
  
  const pendingTasks = myTasks.filter(t => t.acceptance === 'PENDING' || t.acceptance === null || t.acceptance === undefined);
  const activeTasks = myTasks.filter(t => t.acceptance === 'ACCEPTED');

  const handleAccept = async (id: string) => {
    try {
      await tasksService.accept(id);
      qc.invalidateQueries({ queryKey: ['tasks'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to accept task');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Why are you rejecting this task?');
    if (!reason) return;
    try {
      await tasksService.reject(id, reason);
      qc.invalidateQueries({ queryKey: ['tasks'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to reject task');
    }
  };



  if (isLoading) return <div className="p-10 text-center text-ink-muted">Loading Workspace...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">My Workspace</h1>
        <p className="text-[13.5px] text-ink-muted mt-0.5">
          Welcome back, {user?.name}. Here are your assigned tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pending Acceptance */}
        <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-border flex justify-between items-center bg-amber-50">
            <h2 className="text-base font-semibold text-amber-900 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pending Acceptance ({pendingTasks.length})
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-4">No new tasks to accept.</p>
            ) : (
              pendingTasks.map(t => (
                <div key={t.id} className="border border-ink-border rounded-lg p-4">
                  <h3 className="font-medium text-ink">{t.title}</h3>
                  <p className="text-[13px] text-ink-muted mt-1 mb-3">{t.description || 'No description'}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleAccept(t.id)} className="flex-1 bg-green-600 text-white rounded py-1.5 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Accept
                    </button>
                    <button onClick={() => handleReject(t.id)} className="flex-1 border border-red-200 text-red-600 rounded py-1.5 text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-1">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Work */}
        <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-border flex justify-between items-center bg-blue-50">
            <h2 className="text-base font-semibold text-blue-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> Active Work ({activeTasks.length})
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {activeTasks.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-4">No active tasks right now.</p>
            ) : (
              activeTasks.map(t => (
                <div key={t.id} className="border border-ink-border rounded-lg p-4">
                  <h3 className="font-medium text-ink">{t.title}</h3>
                  {t.reviewStatus === 'CORRECTION_REQUESTED' && (
                    <p className="text-[12px] text-red-600 bg-red-50 p-2 rounded mt-1">Correction needed: {t.rejectionReason}</p>
                  )}
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[12px] font-semibold text-ink-muted bg-gray-100 px-2 py-1 rounded">{t.status}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setReportTaskId(t.id)} className="text-[13px] text-ink-muted font-medium hover:underline">Log Daily Report</button>
                      <button onClick={() => setReviewTaskId(t.id)} className="text-[13px] bg-green-600 text-white px-2 py-1 rounded font-medium hover:bg-green-700">Submit for Review</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {reviewTaskId && (
        <SubmitReviewModal
          taskId={reviewTaskId}
          onClose={() => setReviewTaskId(null)}
          onSuccess={() => { setReviewTaskId(null); qc.invalidateQueries({ queryKey: ['tasks'] }); }}
        />
      )}

      {reportTaskId && (
        <SubmitReportModal 
          taskId={reportTaskId} 
          onClose={() => setReportTaskId(null)} 
          onSuccess={() => { setReportTaskId(null); alert('Report submitted successfully!'); }} 
        />
      )}
    </div>
  );
}

function SubmitReportModal({ taskId, onClose, onSuccess }: { taskId: string, onClose: () => void, onSuccess: () => void }) {
  const [workCompleted, setWorkCompleted] = useState('');
  const [timeSpent, setTimeSpent] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextPlan, setNextPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!workCompleted.trim()) return;
    setSubmitting(true);
    try {
      await operationsService.createDailyReport({
        taskId, workCompleted,
        timeSpent: timeSpent ? Number(timeSpent) : undefined,
        blockers, nextPlan
      });
      onSuccess();
    } catch (e) {
      alert('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">Submit Daily Report</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">What did you complete today? *</label>
            <textarea value={workCompleted} onChange={e => setWorkCompleted(e.target.value)} rows={3} autoFocus
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Hours Spent</label>
            <input type="number" value={timeSpent} onChange={e => setTimeSpent(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Any Blockers?</label>
            <input value={blockers} onChange={e => setBlockers(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Plan for tomorrow</label>
            <input value={nextPlan} onChange={e => setNextPlan(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
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


function SubmitReviewModal({ taskId, onClose, onSuccess }: { taskId: string, onClose: () => void, onSuccess: () => void }) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await tasksService.submitForReview(taskId, url.trim() || undefined);
      onSuccess();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">Submit for Review</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-[13px] text-ink-muted">Provide a link to your deliverable so the OP Manager can review it.</p>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Deliverable Link (GitHub, Figma, Drive, etc.)</label>
            <input 
              type="url" 
              value={url} 
              onChange={e => setUrl(e.target.value)} 
              placeholder="https://github.com/..." 
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" 
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={submit} disabled={submitting}
            className="h-10 px-5 rounded-md bg-green-600 text-white text-[13.5px] font-medium hover:bg-green-700 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit Work'}
          </button>
        </div>
      </div>
    
      {/* ✅ New Log Daily Report Modal */}
      <LogDailyReportModal
        isOpen={!!reportTaskId}
        onClose={() => setReportTaskId(null)}
        task={{ id: reportTaskId }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }}
      />
    </div>
  );
}

// 💥 Forced safety patch applied to prevent undefined map crash
