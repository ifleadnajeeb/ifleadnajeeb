import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Building2, Plus, X } from 'lucide-react';
import { operationsService, Project, Department } from '../services/operations.service';
import { cn } from '@/shared/utils/cn';

export default function OperationsPage() {
  const [tab, setTab] = useState<'projects' | 'departments'>('projects');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Operations</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">
            Manage company projects and departments
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-ink-border pb-px">
        <button
          onClick={() => setTab('projects')}
          className={cn(
            'px-4 py-2 text-[13.5px] font-medium border-b-2 transition-colors flex items-center gap-2',
            tab === 'projects'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <Briefcase className="w-4 h-4" /> Projects
        </button>
        <button
          onClick={() => setTab('departments')}
          className={cn(
            'px-4 py-2 text-[13.5px] font-medium border-b-2 transition-colors flex items-center gap-2',
            tab === 'departments'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <Building2 className="w-4 h-4" /> Departments
        </button>
      </div>

      {/* Content */}
      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        {tab === 'projects' ? <ProjectsTab /> : <DepartmentsTab />}
      </div>
    </div>
  );
}

function ProjectsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: projects, isLoading } = useQuery({
    queryKey: ['operations', 'projects'],
    queryFn: operationsService.listProjects,
  });

  return (
    <div>
      <div className="px-5 py-4 border-b border-ink-border flex justify-between items-center">
        <h2 className="text-base font-semibold text-ink">All Projects</h2>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-[13px] font-medium hover:bg-brand-hover"
        >
          <Plus className="w-3.5 h-3.5" /> New Project
        </button>
      </div>
      
      {isLoading ? (
        <div className="p-8 text-center text-ink-muted">Loading...</div>
      ) : !projects || projects.length === 0 ? (
        <div className="p-8 text-center text-ink-muted">No projects found.</div>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-ink-bg text-[12px] uppercase tracking-wider text-brand font-semibold">
            <tr>
              <th className="px-5 py-3">Project Name</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t border-ink-border hover:bg-ink-bg/50">
                <td className="px-5 py-3 font-medium text-ink">{p.name}</td>
                <td className="px-5 py-3 text-ink-muted">{p.customer?.name || '—'}</td>
                <td className="px-5 py-3">
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && <CreateProjectModal onClose={() => setOpen(false)} onSuccess={() => { qc.invalidateQueries({ queryKey: ['operations', 'projects'] }); setOpen(false); }} />}
    </div>
  );
}

function DepartmentsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: depts, isLoading } = useQuery({
    queryKey: ['operations', 'departments'],
    queryFn: operationsService.listDepartments,
  });

  return (
    <div>
      <div className="px-5 py-4 border-b border-ink-border flex justify-between items-center">
        <h2 className="text-base font-semibold text-ink">Departments</h2>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-[13px] font-medium hover:bg-brand-hover"
        >
          <Plus className="w-3.5 h-3.5" /> New Department
        </button>
      </div>
      
      {isLoading ? (
        <div className="p-8 text-center text-ink-muted">Loading...</div>
      ) : !depts || depts.length === 0 ? (
        <div className="p-8 text-center text-ink-muted">No departments found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {depts.map((d) => (
            <div key={d.id} className="border border-ink-border rounded-lg p-4">
              <div className="font-semibold text-ink">{d.name}</div>
              <div className="text-[13px] text-ink-muted mt-1">{d.description || 'No description'}</div>
            </div>
          ))}
        </div>
      )}
      {open && <CreateDepartmentModal onClose={() => setOpen(false)} onSuccess={() => { qc.invalidateQueries({ queryKey: ['operations', 'departments'] }); setOpen(false); }} />}
    </div>
  );
}

// ─── Modals ───
function CreateProjectModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await operationsService.createProject({ name, description: desc });
      onSuccess();
    } catch { alert('Error creating project'); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-ink">New Project</h3>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-ink-muted" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Project Name</label>
            <input required value={name} onChange={e => setName(e.target.value)} className="w-full border rounded p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full border rounded p-2 text-sm" rows={3} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-brand text-white rounded text-sm disabled:opacity-50">
            {loading ? 'Saving...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CreateDepartmentModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await operationsService.createDepartment({ name, description: desc });
      onSuccess();
    } catch { alert('Error creating department'); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-ink">New Department</h3>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-ink-muted" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Department Name</label>
            <input required value={name} onChange={e => setName(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="e.g. Web Development" />
          </div>
          <div>
            <label className="block text-sm mb-1">Description (Optional)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full border rounded p-2 text-sm" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-brand text-white rounded text-sm disabled:opacity-50">
            {loading ? 'Saving...' : 'Create Department'}
          </button>
        </div>
      </form>
    </div>
  );
}
