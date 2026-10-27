import { useQuery } from '@tanstack/react-query';
import { Shield, Users, Key, Crown } from 'lucide-react';
import { rolesService, Role, ROLE_LABEL, ROLE_COLOR } from '../services/roles.service';
import { cn } from '@/shared/utils/cn';

export default function RolesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.list(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Roles & Permissions</h1>
        <p className="text-[13.5px] text-ink-muted mt-0.5">
          Role hierarchy and their access levels (read-only)
        </p>
      </div>

      {isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
      {error && <div className="py-12 text-center text-danger text-sm">Failed to load roles.</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(Array.isArray(data) ? data : (data?.data || [])).map(r => (
            <div key={r.id} className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg border-2 grid place-items-center',
                    ROLE_COLOR[r.name] || 'bg-gray-100 text-gray-700 border-gray-300'
                  )}>
                    {r.name === 'ADMIN' ? <Crown className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-ink">{ROLE_LABEL[r.name] || r.name}</div>
                    <div className="text-[12px] text-ink-muted">Level {r.level} · {r.name}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-ink-bg rounded-lg px-3 py-2">
                  <div className="text-[11px] text-ink-muted uppercase tracking-wider">Users</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[18px] font-bold text-ink">{r.userCount}</span>
                  </div>
                </div>
                <div className="bg-ink-bg rounded-lg px-3 py-2">
                  <div className="text-[11px] text-ink-muted uppercase tracking-wider">Permissions</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Key className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[18px] font-bold text-ink">{r.permissionCount}</span>
                  </div>
                </div>
              </div>

              {r.permissionKeys.length > 0 && (
                <details className="group">
                  <summary className="text-[12px] text-brand cursor-pointer hover:underline select-none">
                    Show permissions ({r.permissionCount})
                  </summary>
                  <div className="mt-2 max-h-[200px] overflow-y-auto flex flex-wrap gap-1">
                    {r.permissionKeys.map(k => (
                      <span key={k} className="text-[10.5px] px-1.5 py-0.5 rounded bg-ink-bg border border-ink-border font-mono text-ink-muted">
                        {k}
                      </span>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
