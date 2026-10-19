import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, Mail, Phone, User, Briefcase, FileText, Edit2, X } from 'lucide-react';
import { customersService, Customer, CustomerDetail } from '../services/customers.service';
import { tasksService } from '@/features/tasks/services/tasks.service';
import { usersService, AppUser } from '@/features/users/services/users.service';
import { cn } from '@/shared/utils/cn';
import { CanDo } from '@/shared/permissions/CanDo';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB');
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => customersService.list({ search: search || undefined, page, pageSize: 20 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Customers</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">Converted leads and direct customers</p>
        </div>
        <CanDo permission="customers:create">
          <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover">
            <Plus className="w-4 h-4" /> New Customer
          </button>
        </CanDo>
      </div>

      <div className="bg-white border border-ink-border rounded-xl p-3.5 shadow-sm">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, phone, email, company…" className="w-full h-10 pl-9 pr-3 border border-ink-border rounded-md text-[14px] bg-ink-bg focus:outline-none focus:border-brand focus:bg-white" />
        </div>

        {isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
        {error && <div className="py-12 text-center text-danger text-sm">Failed to load customers.</div>}

        {data && data.data.length === 0 && (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 mx-auto text-ink-muted mb-3" />
            <p className="text-ink-muted text-sm">No customers yet.</p>
          </div>
        )}

        {data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-ink-bg">
                <tr className="text-left text-[12px] uppercase tracking-wider text-brand font-semibold">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(c => (
                  <tr key={c.id} onClick={() => setSelected(c.id)} className="border-t border-ink-border hover:bg-brand-light/40 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {c.phone && <div className="flex items-center gap-1 text-[12.5px]"><Phone className="w-3 h-3" />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1 text-[12.5px]"><Mail className="w-3 h-3" />{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.company ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.owner?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-muted">{fmtDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && <CreateCustomerModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={() => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ['customers'] }); }} />}
      {selected && <CustomerDrawer customerId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── Create Modal ───
function CreateCustomerModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [serviceType, setServiceType] = useState('Website');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async () => {
    setError('');
    if (name.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    setSubmitting(true);
    try {
      await customersService.create({ name: name.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined, company: company.trim() || undefined, serviceType });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create customer');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-ink-border"><h2 className="text-[16px] font-semibold text-ink">New Customer</h2></div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div><label className="block text-[13px] text-ink-muted mb-1.5">Name *</label><input value={name} onChange={e => setName(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[13px] text-ink-muted mb-1.5">Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" /></div>
            <div><label className="block text-[13px] text-ink-muted mb-1.5">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" /></div>
          </div>
          <div><label className="block text-[13px] text-ink-muted mb-1.5">Company</label><input value={company} onChange={e => setCompany(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" /></div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Service Required</label>
            <select value={serviceType} onChange={e => setServiceType(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white">
              <option value="Website">Website Development</option>
              <option value="Software">Software Development</option>
              <option value="App">App Development</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Logo Design">Logo Design</option>
            </select>
          </div>
          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={submit} disabled={submitting} className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">{submitting ? 'Creating…' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Drawer ───
function CustomerDrawer({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersService.get(customerId),
  });

  const { data: worksData } = useQuery({
    queryKey: ['customer-works', customerId],
    queryFn: () => tasksService.list({ pageSize: 50 }), // Fetch tasks, filter locally
  });

  const customerWorks = worksData?.data?.filter((t: any) => t.customerId === customerId) || [];

  if (isLoading) return <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center"><div className="bg-white p-4 rounded">Loading...</div></div>;
  if (isError || !data) return <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center"><div className="bg-white p-4 rounded text-red-500">Error loading</div></div>;

  const saveNote = async () => {
    await customersService.update(customerId, { notes: noteText });
    qc.invalidateQueries({ queryKey: ['customer', customerId] });
    setIsEditingNote(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[640px] bg-ink-bg shadow-2xl flex flex-col overflow-y-auto">
        <div className="bg-white border-b border-ink-border px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2"><User className="w-4 h-4 text-brand" /><h2 className="text-base font-semibold text-ink">{data.name}</h2></div>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light"><X className="w-4 h-4 mx-auto" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-white border border-ink-border rounded-xl p-5">
            <div className="grid grid-cols-[120px_1fr] gap-y-2 text-[13.5px]">
              <span className="text-ink-muted">Phone</span><span className="text-ink">{data.phone ?? '—'}</span>
              <span className="text-ink-muted">Email</span><span className="text-ink">{data.email ?? '—'}</span>
              <span className="text-ink-muted">Company</span><span className="text-ink">{data.company ?? '—'}</span>
              <span className="text-ink-muted">Service</span><span className="text-brand font-medium">{data.serviceType ?? '—'}</span>
            </div>
          </div>

          <div className="bg-white border border-ink-border rounded-xl p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2"><FileText className="w-4 h-4 text-brand" /> Project Notes</h3>
              {!isEditingNote && <button onClick={() => { setNoteText(data.notes || ''); setIsEditingNote(true); }} className="text-[12px] text-brand hover:underline flex items-center gap-1 font-medium"><Edit2 className="w-3 h-3" /> Edit Note</button>}
            </div>
            {isEditingNote ? (
              <div className="space-y-3">
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} className="w-full h-32 p-3 text-[13px] border border-ink-border rounded-md resize-none" placeholder="Write requirements..." />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsEditingNote(false)} className="px-4 py-1.5 text-[13px] border rounded">Cancel</button>
                  <button onClick={saveNote} className="px-4 py-1.5 text-[13px] bg-brand text-white rounded">Save Note</button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-ink whitespace-pre-wrap">{data.notes || <span className="text-ink-muted italic">No notes added yet.</span>}</p>
            )}
          </div>

          <div className="bg-white border border-ink-border rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2"><Briefcase className="w-4 h-4 text-brand" /> Assigned Works</h3>
              <button onClick={() => setAssignModalOpen(true)} className="text-[12px] text-brand font-medium hover:underline">+ Assign New</button>
            </div>
            {customerWorks.length === 0 ? (
              <p className="text-[13px] text-ink-muted italic">No works assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {customerWorks.map((w: any) => (
                  <div key={w.id} className="border border-ink-border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-ink">{w.title}</div>
                      <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', w.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>{w.status}</span>
                    </div>
                    <div className="text-[12px] text-ink-muted mt-1">Assigned to: {w.assignedTo?.name || 'Unassigned'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {assignModalOpen && (
        <AssignWorkModal 
          customerId={customerId} 
          customerName={data.name} 
          onClose={() => setAssignModalOpen(false)} 
          onSuccess={() => { setAssignModalOpen(false); qc.invalidateQueries({ queryKey: ['customer-works', customerId] }); }} 
        />
      )}
    </>
  );
}

// ─── Assign Work Modal ───
function AssignWorkModal({ customerId, customerName, onClose, onSuccess }: { customerId: string, customerName: string, onClose: () => void, onSuccess: () => void }) {
  const [title, setTitle] = useState(`Work for ${customerName}`);
  const [instructions, setInstructions] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: users } = useQuery({ queryKey: ['assignable-users'], queryFn: usersService.assignable });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await tasksService.create({
        title,
        description: instructions,
        assignedToId: assignedToId || undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        customerId, // Send customerId so it links to this customer
      } as any);
      onSuccess();
    } catch { alert('Failed to assign work'); } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-ink">Assign Work</h3>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-ink-muted" /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5 font-medium">Work Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" />
          </div>
          
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5 font-medium">Instructions / Method</label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none" placeholder="What exactly should the staff do?" />
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5 font-medium">Assign To Staff *</label>
            <select required value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white">
              <option value="">— Select Employee —</option>
              {users?.map((u: AppUser) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5 font-medium">Due Date</label>
            <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]" />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={submitting || !assignedToId} className="px-4 py-2 bg-brand text-white rounded text-sm disabled:opacity-50">
            {submitting ? 'Assigning...' : 'Assign Work'}
          </button>
        </div>
      </form>
    </div>
  );
}
