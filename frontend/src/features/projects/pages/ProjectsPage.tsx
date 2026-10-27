import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, FolderKanban, Calendar as CalIcon } from 'lucide-react';
import {
  projectsService, Project, ProjectStatus, ProjectPriority,
  STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR, ALL_STATUSES,
} from '../services/projects.service';
import { cn } from '@/shared/utils/cn';
import { CanDo } from '@/shared/permissions/CanDo';

const PRIORITIES: ProjectPriority[] = ['LOW','MEDIUM','HIGH','URGENT'];

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-GB') : '—';
}

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', search, statusFilter, page],
    queryFn: () => projectsService.list({
      search: search || undefined,
      status: statusFilter || undefined,
      page, pageSize: 20,
    }),
  });

  const openEdit = (p: Project) => { setEditing(p); setModalOpen(true); };
  const openNew = () => { setEditing(null); setModalOpen(true); };

  const deleteProject = async (p: Project) => {
    if (!confirm(`Delete project "${p.name}"?`)) return;
    try {
      await projectsService.remove(p.id);
      qc.invalidateQueries({ queryKey: ['projects'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed');
    }
  };

  const quickStatus = async (p: Project, status: ProjectStatus) => {
    try {
      await projectsService.update(p.id, { status });
      qc.invalidateQueries({ queryKey: ['projects'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Projects</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">Post-sale delivery tracking</p>
        </div>
        <CanDo permission="projects:create">
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </CanDo>
      </div>

      <div className="bg-white border border-ink-border rounded-xl p-3.5 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search projects…"
            className="w-full h-10 pl-9 pr-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
          className="h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        {isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
        {error && <div className="py-12 text-center text-danger text-sm">Failed to load projects.</div>}
        {data && data.data.length === 0 && (
          <div className="py-16 text-center">
            <FolderKanban className="w-10 h-10 mx-auto text-ink-muted mb-3" />
            <p className="text-ink-muted text-sm">No projects yet.</p>
          </div>
        )}
        {data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-ink-bg">
                <tr className="text-left text-[12px] uppercase tracking-wider text-brand font-semibold">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Start</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.(Array.isArray(data) ? data : (data?.data || [])).map(p => (
                  <tr key={p.id} className="border-t border-ink-border hover:bg-brand-light/40">
                    <td className="px-5 py-3">
                      <div className="font-medium text-ink">{p.name}</div>
                      {p.description && <div className="text-[12px] text-ink-muted line-clamp-1">{p.description}</div>}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{p.customer?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <select
                        value={p.status}
                        onChange={e => quickStatus(p, e.target.value as ProjectStatus)}
                        className={cn('px-2 py-1 rounded text-[12px] font-medium border-0 cursor-pointer', STATUS_COLOR[p.status])}
                      >
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', PRIORITY_COLOR[p.priority])}>
                        {p.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{fmtDate(p.startDate)}</td>
                    <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{fmtDate(p.targetDate)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <CanDo permission="projects:update">
                        <button onClick={() => openEdit(p)}
                          className="text-brand text-[12.5px] font-medium hover:underline mr-3">
                          Edit
                        </button>
                      </CanDo>
                      <CanDo permission="projects:delete">
                        <button onClick={() => deleteProject(p)}
                          className="text-danger text-[12.5px] font-medium hover:underline">
                          Delete
                        </button>
                      </CanDo>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.meta.totalPages > 1 && (
          <div className="border-t border-ink-border px-5 py-3 flex items-center justify-between">
            <span className="text-[12px] text-ink-muted">Page {data.meta.page} of {data.meta.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">Previous</button>
              <button disabled={page >= data.meta.totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-ink-border rounded text-[12px] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <ProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSuccess={() => {
          setModalOpen(false);
          qc.invalidateQueries({ queryKey: ['projects'] });
        }}
      />
    </div>
  );
}

function ProjectModal({ open, onClose, editing, onSuccess }: {
  open: boolean; onClose: () => void; editing: Project | null; onSuccess: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(editing?.status ?? 'NEW');
  const [priority, setPriority] = useState<ProjectPriority>(editing?.priority ?? 'MEDIUM');
  const [startDate, setStartDate] = useState(editing?.startDate?.slice(0, 10) ?? '');
  const [targetDate, setTargetDate] = useState(editing?.targetDate?.slice(0, 10) ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset when editing changes
  if (open && editing && name !== editing.name && !submitting) {
    setName(editing.name);
    setDescription(editing.description ?? '');
    setStatus(editing.status);
    setPriority(editing.priority);
    setStartDate(editing.startDate?.slice(0, 10) ?? '');
    setTargetDate(editing.targetDate?.slice(0, 10) ?? '');
  }

  if (!open) return null;

  const submit = async () => {
    setError('');
    if (name.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        status, priority,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      };
      if (editing) await projectsService.update(editing.id, payload);
      else await projectsService.create(payload);
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">{editing ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none focus:outline-none focus:border-brand" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand">
                {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as ProjectPriority)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Start date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Target date</label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
            </div>
          </div>
          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={submit} disabled={submitting}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {submitting ? 'Saving…' : editing ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
