import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, UserPlus } from 'lucide-react';
import { useAuth } from '@/app/providers/auth-provider';
import { usersService, AppUser, ROLE_LABEL, ROLE_COLOR } from '../services/users.service';
import { cn } from '@/shared/utils/cn';
import { CanDo } from '@/shared/permissions/CanDo';
import { AccessDenied } from '@/shared/permissions/AccessDenied';

export default function UsersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersService.list({ search: search || undefined }),
  });

  const { data: canCreateRoles } = useQuery({
    queryKey: ['can-create-roles'],
    queryFn: usersService.canCreate,
  });

  // If backend returns 403, show Access Denied
  const isForbidden = (error as any)?.response?.status === 403;
  if (isForbidden) {
    return <AccessDenied module="Users" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Users</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">
            Manage your team — {data?.meta.total ?? 0} users
          </p>
        </div>

        {/* "+ New User" gated by users:create permission */}
        <CanDo permission="users:create">
          {canCreateRoles && canCreateRoles.length > 0 ? (
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white
                         text-[13.5px] font-medium hover:bg-brand-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              New User
            </button>
          ) : (
            <div className="text-[13px] text-ink-muted italic">
              Your role cannot create new users
            </div>
          )}
        </CanDo>
      </div>

      <div className="bg-white border border-ink-border rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-wrap gap-2.5 mb-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="w-full pl-9 pr-3 py-2 border border-ink-border rounded-md text-[14px]
                         bg-ink-bg focus:outline-none focus:border-brand focus:bg-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-[13px] text-ink-muted">
            Loading users…
          </div>
        ) : data && data.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] min-w-[700px] border-collapse">
              <thead>
                <tr className="bg-white">
                  {['NAME', 'EMAIL', 'ROLE', 'STATUS', 'MANAGER', 'LAST LOGIN', ''].map((h) => (
                    <th
                      key={h || 'actions'}
                      className="text-left text-brand text-[12px] font-semibold px-3 py-2.5
                                 border-b border-ink-border whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-ink-border last:border-0 hover:bg-brand-light transition-colors"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center text-[11px] font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <span className="font-medium text-ink">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{u.email}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide',
                          ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'text-[12px] font-medium',
                          u.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-500'
                        )}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">
                      {u.managerName ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-ink-muted text-[12px]">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString('en-IN')
                        : 'Never'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <CanDo permission="users:delete">
                        {u.role !== 'ADMIN' && u.id !== user?.id ? (
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => {
                                if (confirm('Deactivate ' + u.name + '?')) {
                                  usersService.deactivate(u.id).then(() => {
                                    qc.invalidateQueries({ queryKey: ['users'] });
                                  });
                                }
                              }}
                              className="text-[12px] text-amber-600 hover:underline"
                            >
                              Deactivate
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `PERMANENTLY DELETE "${u.name}"?\n\nThis cannot be undone.\nTheir leads will be unassigned, and their reports will be reassigned to you.`
                                  )
                                ) {
                                  usersService
                                    .remove(u.id)
                                    .then(() => {
                                      qc.invalidateQueries({ queryKey: ['users'] });
                                      alert(u.name + ' has been deleted.');
                                    })
                                    .catch((err: any) => {
                                      alert(
                                        err?.response?.data?.message ||
                                          'Could not delete user'
                                      );
                                    });
                                }
                              }}
                              className="text-[12px] text-danger font-medium hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </CanDo>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-14 text-center">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-[14px] text-ink-muted">No users found.</p>
          </div>
        )}
      </div>

      {createOpen && canCreateRoles && (
        <CreateUserModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          allowedRoles={canCreateRoles}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CreateUserModal
// ─────────────────────────────────────────────
function CreateUserModal({
  open,
  onClose,
  allowedRoles,
}: {
  open: boolean;
  onClose: () => void;
  allowedRoles: string[];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(allowedRoles[0] ?? 'BDE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole(allowedRoles[0] ?? 'BDE');
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (!email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      await usersService.create({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        role: role as any,
      });
      qc.invalidateQueries({ queryKey: ['users'] });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not create user');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-1">User Created!</h2>
          <p className="text-[14px] text-ink-muted mb-5">
            <strong>{name}</strong> ({ROLE_LABEL[role]})
          </p>
          <button
            onClick={handleClose}
            className="w-full h-11 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">New User</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-brand-light hover:text-brand"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">
              Name <span className="text-danger">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="John Smith"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]
                         bg-white focus:outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">
                Email <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="new@user.com"
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]
                           bg-white focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]
                           bg-white focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">
              Password <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]
                         bg-white focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">
              Role <span className="text-danger">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]
                         bg-white focus:outline-none focus:border-brand"
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r] || r}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-ink-muted mt-1">
              your role can create:{' '}
              {allowedRoles.map((r) => ROLE_LABEL[r]).join(', ')}
            </p>
          </div>

          {error && (
            <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button
            onClick={handleClose}
            className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] text-ink hover:bg-brand-light transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}