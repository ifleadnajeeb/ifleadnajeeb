import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, Target, CheckCircle, PieChart as PieIcon, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { reportsService, FUNNEL_COLORS, SOURCE_COLORS, PRIORITY_COLORS, TASK_COLORS } from '../services/reports.service';
import html2canvas from 'html2canvas';
import { usersService, type AppUser, ROLE_LABEL } from '@/features/users/services/users.service';
import { useAuth } from '@/app/providers/auth-provider';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { cn } from '@/shared/utils/cn';

type Range = 'today' | 'week' | 'month' | 'all';

function rangeToDates(r: Range): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString();
  if (r === 'all') return {};
  const from = new Date();
  if (r === 'today') from.setHours(0, 0, 0, 0);
  if (r === 'week') from.setDate(now.getDate() - 7);
  if (r === 'month') from.setDate(now.getDate() - 30);
  return { from: from.toISOString(), to };
}

const RANGES: { id: Range; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
];

function Card({ title, sub, children, icon: Icon }: { title: string; sub?: string; children: React.ReactNode; icon?: any }) {
  return (
    <div className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-brand-light text-brand flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div>
          <h3 className="text-[14.5px] font-semibold text-ink">{title}</h3>
          {sub && <p className="text-[12px] text-ink-muted mt-0.5">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState<Range>('month');
  const { userId: urlUserId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const [targetUserId, setTargetUserId] = useState<string>(urlUserId ?? '');

  useEffect(() => {
    setTargetUserId(urlUserId ?? '');
  }, [urlUserId]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const canPickUser =
    user?.role === 'ADMIN' ||
    user?.role === 'CEO' ||
    user?.role === 'BDM';

  useEffect(() => {
    if (!canPickUser) return;
    usersService.bookable().then(setUsers).catch(() => setUsers([]));
  }, [canPickUser]);

  const { from, to } = rangeToDates(range);

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'overview', range, targetUserId],
    queryFn: () => reportsService.overview({ from, to, userId: targetUserId || undefined }),
    refetchInterval: 60000,
  });

  const handlePDF = async () => {
    if (!pageRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(pageRef.current, {
        scale: 2,
        backgroundColor: '#f9fafb',
      });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = pdfW - 40;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 20;
      let remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(img, 'PNG', 20, y, imgW, imgH);
        remaining -= (pdfH - 40);
        if (remaining > 0) pdf.addPage();
      }
      pdf.save(`report-${range}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDF export failed');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center text-ink-muted text-sm">Loading reports…</div>;
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-danger text-sm">Failed to load reports.</p>
      </div>
    );
  }

  const funnelData = Object.entries(data.funnel).map(([name, value]) => ({
    name,
    value,
    fill: FUNNEL_COLORS[name] ?? '#94a3b8',
  }));

  const sourceData = data.sources.map((s, i) => ({
    name: s.source,
    value: s.count,
    fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
  }));

  const priorityData = data.priorities.map((p) => ({
    name: p.priority,
    value: p.count,
    fill: PRIORITY_COLORS[p.priority] ?? '#94a3b8',
  }));

  const trendData = data.leadTrend.map((t) => ({
    date: new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    count: t.count,
  }));

  const taskData = Object.entries(data.tasks).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
    fill: TASK_COLORS[name] ?? '#94a3b8',
  }));

  return (
    <div className="space-y-5" ref={pageRef}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reports</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">Live business intelligence from your data</p>
        </div>
        <button
          onClick={handlePDF}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Generating…' : 'Download PDF'}
        </button>
      </div>

      {/* User picker (org-wide roles only) */}
      {canPickUser && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-[13px] text-ink-muted font-medium">
            View report for:
          </label>
          <select
            value={targetUserId}
            onChange={(e) => {
              const v = e.target.value;
              setTargetUserId(v);
              if (v) navigate(`/reports/user/${v}`);
              else navigate('/reports');
            }}
            className="h-9 px-3 border border-ink-border rounded-md text-[13px] bg-white focus:outline-none focus:border-brand"
          >
            <option value="">— Entire organization —</option>
            {(Array.isArray(users) ? users : (users?.data || [])).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {ROLE_LABEL[u.role] ?? u.role}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Range toggle */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              'px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors',
              range === r.id
                ? 'bg-ink text-white'
                : 'bg-white border border-ink-border text-ink hover:bg-ink-bg'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">Total Leads</span>
            <Users className="w-4 h-4 text-brand" />
          </div>
          <div className="text-[26px] font-bold text-ink leading-tight">{data.summary.totalLeads}</div>
          <div className="text-[12px] text-ink-muted mt-0.5">{RANGES.find((r) => r.id === range)?.label}</div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">Conversion</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-[26px] font-bold text-ink leading-tight">{data.summary.conversionPct}%</div>
          <div className="text-[12px] text-ink-muted mt-0.5">{data.summary.won} won</div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">Follow-ups</span>
            <Target className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-[26px] font-bold text-ink leading-tight">{data.followups.completionPct}%</div>
          <div className="text-[12px] text-ink-muted mt-0.5">{data.followups.completed} completed</div>
        </div>
        <div className="bg-white border border-ink-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">Tasks Done</span>
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-[26px] font-bold text-ink leading-tight">{data.tasks.DONE ?? 0}</div>
          <div className="text-[12px] text-ink-muted mt-0.5">Completed</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <Card title="Sales Funnel" sub="Leads by status" icon={TrendingUp}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Lead Sources" sub="Where leads come from" icon={PieIcon}>
          <div className="h-[300px]">
            {sourceData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] text-ink-muted">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {sourceData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card title="Lead Trend" sub="New leads in the last 30 days" icon={TrendingUp}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Priorities" sub="Lead priority breakdown" icon={Target}>
          <div className="h-[260px]">
            {priorityData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] text-ink-muted">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} label>
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Task Status" sub="Team tasks by state" icon={CheckCircle}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {taskData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Top Performers" sub="By leads assigned in your scope" icon={Users}>
        {data.topPerformers.length === 0 ? (
          <p className="text-center text-[13px] text-ink-muted py-8">No assigned leads yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-bg">
                <tr className="text-left text-[12px] uppercase tracking-wider text-brand font-semibold">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5 text-right">Leads</th>
                  <th className="px-4 py-2.5 text-right">XP</th>
                </tr>
              </thead>
              <tbody>
                {data.topPerformers.map((p, i) => (
                  <tr key={p.userId} className="border-t border-ink-border hover:bg-brand-light/30">
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'inline-flex w-6 h-6 rounded-full items-center justify-center text-[11px] font-bold',
                        i === 0 ? 'bg-amber-100 text-amber-700'
                        : i === 1 ? 'bg-gray-200 text-gray-700'
                        : i === 2 ? 'bg-orange-100 text-orange-700'
                        : 'bg-ink-bg text-ink-muted'
                      )}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-ink">{p.name}</td>
                    <td className="px-4 py-2.5 text-ink-muted text-[12.5px]">{p.role}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-ink">{p.leadCount}</td>
                    <td className="px-4 py-2.5 text-right text-ink-muted">{p.xp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
