import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Clock, User } from 'lucide-react';
import { operationsService } from '@/features/operations/services/operations.service';

export default function DailyReportsPage() {
  const [search, setSearch] = useState('');

  const { data: reports, isLoading } = useQuery({
    queryKey: ['daily-reports'],
    queryFn: operationsService.listDailyReports,
  });

  const filteredReports = reports?.filter((r: any) => {
    const searchString = `${r.task?.title} ${r.task?.assignedTo?.name} ${r.workCompleted}`.toLowerCase();
    return searchString.includes(search.toLowerCase());
  }) || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Daily Work Reports</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">
            View all employee timesheets and daily progress updates
          </p>
        </div>
      </div>

      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-ink-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name, task, or content..."
              className="w-full h-10 pl-9 pr-3 border border-ink-border rounded-md text-[14px] bg-ink-bg focus:outline-none focus:border-brand focus:bg-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-ink-muted">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-10 text-center text-ink-muted text-sm">No work reports found.</div>
        ) : (
          <div className="divide-y divide-ink-border">
            {filteredReports.map((r: any) => (
              <div key={r.id} className="p-5 hover:bg-ink-bg/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-light text-brand flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-ink text-[14px]">
                        {r.task?.assignedTo?.name || 'Unknown Employee'}
                      </div>
                      <div className="text-[12px] text-ink-muted flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Task: {r.task?.title || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-medium text-brand bg-brand-light px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 
                      {r.timeSpent ? `${r.timeSpent} hours` : 'No hours logged'}
                    </div>
                    <div className="text-[11px] text-ink-muted mt-1">
                      Submitted: {new Date(r.createdAt).toLocaleString('en-GB')}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-[13px] text-ink whitespace-pre-wrap">
                  {r.workCompleted}
                </div>

                {r.blockers && (
                  <div className="mt-2 text-[12.5px] text-red-700 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-1">
                    ⚠️ <strong>Blocker:</strong> {r.blockers}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
