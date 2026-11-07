import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List as ListIcon, CheckCircle2 } from 'lucide-react';
import { tasksService } from '../services/tasks.service';
import { useAuth } from '@/app/providers/auth-provider';
import { cn } from '@/shared/utils/cn';

const COLUMNS = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

export default function TasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const customerName = searchParams.get('customerName');

  // ✅ All states are defined cleanly here to prevent any crashes
  const [view, setView] = useState<'kanban' | 'list' | 'completed'>('kanban');
  const [search, setSearch] = useState('');
  const [dailyReportOpen, setDailyReportOpen] = useState(false);

  const isOpsRole = ['OP_MANAGER', 'WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR', 'GRAPHIC_DESIGNER'].includes(typeof user?.role === 'object' ? (user?.role as any)?.name : (user?.role || ''));
  const pageTitle = isOpsRole ? 'Works' : 'Tasks';

  // Fetch Tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', search, customerName],
    queryFn: () => tasksService.list({ search, customerName }),
  });

  const tasks = tasksData?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{pageTitle}</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">Manage your tasks and assignments</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-ink-bg p-1 rounded-lg">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${view === 'kanban' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
              <LayoutGrid className="w-3.5 h-3.5 inline mr-1" /> Kanban
            </button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${view === 'list' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
              <ListIcon className="w-3.5 h-3.5 inline mr-1" /> List
            </button>
            <button onClick={() => setView('completed')} className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${view === 'completed' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Completed
            </button>
          </div>
          
          <button onClick={() => setDailyReportOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-ink-border bg-white text-ink text-[13.5px] font-medium hover:bg-brand-light transition-colors">
            Log Daily Report
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover">
            <Plus className="w-4 h-4" /> New {pageTitle.slice(0, -1)}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${isOpsRole ? 'works' : 'tasks'}…`}
          className="w-full h-10 pl-9 pr-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
        />
      </div>

      {isLoading && <div className="p-12 text-center text-ink-muted">Loading tasks...</div>}

      {/* KANBAN VIEW */}
      {!isLoading && view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter((t: any) => t.status === col);
            return (
              <div key={col} className="flex-1 min-w-[280px] bg-[#f8f9fa] rounded-xl border border-ink-border p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-[14px] text-ink">{col.replace('_', ' ')}</h3>
                  <span className="bg-white border border-ink-border text-[12px] px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="space-y-3">
                  {colTasks.map((task: any) => (
                    <div key={task.id} className="bg-white p-3 rounded-lg border border-ink-border shadow-sm">
                      <h4 className="font-semibold text-[14px] text-ink">{task.title}</h4>
                      {/* Task details... */}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {!isLoading && view === 'list' && (
        <div className="bg-white border border-ink-border rounded-xl shadow-sm p-4 text-center text-ink-muted">
          List View goes here (standard table)
        </div>
      )}

      {/* COMPLETED VIEW */}
      {!isLoading && view === 'completed' && (
        <div className="bg-white border border-ink-border rounded-xl shadow-sm p-4 text-center text-ink-muted">
          Completed Works Table goes here
        </div>
      )}
    </div>
  );
}
