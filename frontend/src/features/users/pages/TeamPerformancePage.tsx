import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { usersService, AppUser, ROLE_LABEL, ROLE_COLOR } from '../services/users.service';
import { Users, ExternalLink, ShieldAlert, Briefcase } from 'lucide-react'; // 👈 Added Briefcase icon

// ✅ Clean mapping of tabs. No duplicates.
const TABS_BY_ROLE: Record<string, Array<string>> = {
  ADMIN:      ['SALES_HEAD', 'GM', 'BDM', 'BDE'],
  CEO:        ['SALES_HEAD', 'GM', 'BDM', 'BDE'],
  GM:         ['SALES_HEAD', 'BDM', 'BDE'],
  BDM:        ['SALES_HEAD', 'GM', 'BDE'], // BDM gets access to everyone below them
  SALES_HEAD: ['BDE'],
  BDE:        [],
};

export default function TeamPerformancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tabs = TABS_BY_ROLE[user?.role ?? ''] ?? [];
  const [active, setActive] = useState<string>(tabs[0] ?? 'BDE');
  const [rows, setRows] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    setError('');
    
    // ✅ Ensure we pass page and pageSize to avoid 422 Validation Errors
    usersService
      .list({ page: 1, pageSize: 100 })
      .then((r: any) => {
        const fetchedUsers = r?.data || r || [];
        const filtered = fetchedUsers.filter((u: AppUser) => {
          const roleName = typeof u.role === 'object' ? (u.role as any)?.name : u.role;
          return roleName === active;
        });
        setRows(filtered);
      })
      .catch((e: any) => {
        console.error("Team Performance API Error:", e);
        setError(e?.response?.data?.message || 'Failed to load team. Check permissions.');
      })
      .finally(() => setLoading(false));
  }, [active]);

  if (!user) return null;

  if (tabs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white border border-ink-border rounded-xl p-10 text-center">
        <ShieldAlert className="w-10 h-10 mx-auto text-ink-muted mb-3 opacity-50" />
        <p className="text-ink-muted text-sm">You don't have a team to view.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Team Performance</h1>
        <p className="text-[13.5px] text-ink-muted mt-0.5">Drill down into your team members' panels</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              active === t ? 'bg-ink text-white' : 'bg-white border border-ink-border text-ink hover:bg-ink-bg'
            }`}
          >
            {ROLE_LABEL[t] ?? t}
          </button>
        ))}
      </div>

      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-border flex items-center gap-2">
          <Users className="w-4 h-4 text-brand" />
          <h2 className="text-base font-semibold text-ink">{ROLE_LABEL[active] ?? active} details</h2>
          <span className="ml-auto text-[12px] text-ink-muted">{rows.length} member{rows.length === 1 ? '' : 's'}</span>
        </div>

        {loading && <div className="p-8 text-center text-ink-muted text-sm">Loading…</div>}
        {error && <div className="p-8 text-center text-danger text-sm bg-red-50">{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="p-8 text-center text-ink-muted text-sm">No members found in your scope.</div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-bg">
                <tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-muted font-semibold">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const roleName = typeof u.role === 'object' ? (u.role as any)?.name : u.role;
                  return (
                    <tr key={u.id} className="border-t border-ink-border hover:bg-ink-bg/40">
                      <td className="px-5 py-3 font-medium text-ink">{u.name}</td>
                      <td className="px-5 py-3 text-ink-muted">{u.email}</td>
                      <td className="px-5 py-3 text-ink-muted">{u.phone ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${ROLE_COLOR[roleName] ?? 'bg-gray-100 text-gray-700'}`}>
                          {ROLE_LABEL[roleName] ?? roleName}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-4">
                          {/* 👇 NEW: View Works Button 👇 */}
                          <button
                            onClick={() => navigate(`/tasks?userId=${u.id}&userName=${encodeURIComponent(u.name)}`)}
                            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
                          >
                            View Works <Briefcase className="w-3.5 h-3.5" />
                          </button>

                          {/* EXISTING: View Panel Button */}
                          <button
                            onClick={() => navigate(`/panel/${u.id}`)}
                            className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-muted hover:text-brand transition-colors"
                          >
                            View Panel <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
