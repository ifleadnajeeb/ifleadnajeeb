import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, CheckSquare } from 'lucide-react';
import { tasksService, Task } from '@/features/tasks/services/tasks.service';
import { useAuth } from '@/app/providers/auth-provider';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', 'my-work', user?.id],
    queryFn: () => tasksService.list({ assignedToId: user?.id, pageSize: 50 }),
    enabled: !!user?.id,
  });

  const tasks = tasksData?.data || [];
  const pendingTasks = tasks.filter(t => t.acceptance === 'PENDING');
  const activeTasks = tasks.filter(t => t.acceptance === 'ACCEPTED');

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
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[12px] font-semibold text-ink-muted bg-gray-100 px-2 py-1 rounded">{t.status}</span>
                    <button className="text-[13px] text-brand font-medium hover:underline">Submit Daily Report</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
