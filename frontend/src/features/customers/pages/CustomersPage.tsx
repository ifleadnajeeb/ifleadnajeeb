import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, Mail, Phone, User, Briefcase, FileText, Edit2 } from 'lucide-react';
import { customersService, Customer, CustomerDetail } from '../services/customers.service';
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
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover"
          >
            <Plus className="w-4 h-4" /> New Customer
          </button>
        </CanDo>
      </div>

      <div className="bg-white border border-ink-border rounded-xl p-3.5 shadow-sm">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, phone, email, company…"
            className="w-full h-10 pl-9 pr-3 border border-ink-border rounded-md text-[14px] bg-ink-bg focus:outline-none focus:border-brand focus:bg-white"
          />
        </div>

        {isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
        {error && <div className="py-12 text-center text-danger text-sm">Failed to load customers.</div>}

        {data && data.data.length === 0 && (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 mx-auto text-ink-muted mb-3" />
            <p className="text-ink-muted text-sm">No customers yet.</p>
            <p className="text-ink-muted text-[12px] mt-1">
              Convert a lead from the Leads page, or click "New Customer".
            </p>
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
                  <th className="px-4 py-3 text-center">Leads</th>
                  <th className="px-4 py-3 text-center">Projects</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className="border-t border-ink-border hover:bg-brand-light/40 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {c.phone && <div className="flex items-center gap-1 text-[12.5px]"><Phone className="w-3 h-3" />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1 text-[12.5px]"><Mail className="w-3 h-3" />{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.company ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.owner?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-ink">{c.leadCount ?? 0}</td>
                    <td className="px-4 py-3 text-center text-ink">{c.projectCount ?? 0}</td>
                    <td className="px-4 py-3 text-ink-muted">{fmtDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.meta.totalPages > 1 && (
          <div className="border-t border-ink-border pt-3 mt-3 flex items-center justify-between">
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

      <CreateCustomerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          qc.invalidateQueries({ queryKey: ['customers'] });
        }}
      />

      <CustomerDrawer
        customerId={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

// ─── Create modal ───
function CreateCustomerModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [serviceType, setServiceType] = useState('Website');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async () => {
    setError('');
    if (name.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    setSubmitting(true);
    try {
      await customersService.create({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        serviceType: serviceType || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setName(''); setPhone(''); setEmail(''); setCompany(''); setAddress(''); setNotes('');
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">New Customer</h2>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="Acme Inc"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
            </div>
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Company</label>
            <input value={company} onChange={e => setCompany(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Service Required</label>
            <select value={serviceType} onChange={e => setServiceType(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand">
              <option value="Website">Website Development</option>
              <option value="Software">Software Development</option>
              <option value="App">App Development</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Graphic Design">Graphic Design</option>
              <option value="Video Editing">Video Editing</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none focus:outline-none focus:border-brand" />
          </div>
          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={submit} disabled={submitting}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail drawer ───
function CustomerDrawer({ customerId, onClose }: { customerId: string | null; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersService.get(customerId!),
    enabled: !!customerId,
  });

  // Load existing notes into state when data arrives
  useEffect(() => {
    if (data?.notes) setNoteText(data.notes);
    else setNoteText('');
  }, [data]);

  const saveNote = async () => {
    if (!customerId) return;
    try {
      await customersService.update(customerId, { notes: noteText });
      qc.invalidateQueries({ queryKey: ['customer', customerId] });
      setIsEditingNote(false);
    } catch {
      alert('Failed to save note');
    }
  };

  if (!customerId) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[640px] bg-ink-bg shadow-2xl flex flex-col">
        <div className="bg-white border-b border-ink-border px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand" />
            <h2 className="text-base font-semibold text-ink">
              {data?.name ?? 'Customer'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <button
                onClick={() => navigate(`/tasks?customerId=${data.id}&customerName=${encodeURIComponent(data.name)}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-[13px] font-medium hover:bg-brand-hover transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5" /> Assign Work
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading && <div className="text-center py-12 text-sm text-ink-muted">Loading…</div>}

          {data && (
            <>
              {/* Identity */}
              <div className="bg-white border border-ink-border rounded-xl p-5">
                <div className="grid grid-cols-[120px_1fr] gap-y-2 gap-x-3 text-[13.5px]">
                  <span className="text-ink-muted">Name</span><span className="text-ink">{data.name}</span>
                  <span className="text-ink-muted">Phone</span><span className="text-ink">{data.phone ?? '—'}</span>
                  <span className="text-ink-muted">Email</span><span className="text-ink">{data.email ?? '—'}</span>
                  <span className="text-ink-muted">Company</span><span className="text-ink">{data.company ?? '—'}</span>
                  <span className="text-ink-muted">Service</span><span className="text-brand font-medium">{data.serviceType ?? '—'}</span>
                  <span className="text-ink-muted">Address</span><span className="text-ink">{data.address ?? '—'}</span>
                  <span className="text-ink-muted">Owner</span><span className="text-ink">{data.owner?.name ?? '—'}</span>
                  <span className="text-ink-muted">Since</span><span className="text-ink">{fmtDate(data.createdAt)}</span>
                </div>

              </div>

              {/* Project Notes */}
              <div className="bg-white border border-ink-border rounded-xl p-5 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand" /> Project Notes
                  </h3>
                  {!isEditingNote && (
                    <button onClick={() => setIsEditingNote(true)} className="text-[12px] text-brand hover:underline flex items-center gap-1 font-medium">
                      <Edit2 className="w-3 h-3" /> Edit Note
                    </button>
                  )}
                </div>
                {isEditingNote ? (
                  <div className="space-y-3">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full h-32 p-3 text-[13px] border border-ink-border rounded-md focus:outline-none focus:border-brand bg-ink-bg focus:bg-white resize-none"
                      placeholder="Write requirements discussed with the customer..."
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsEditingNote(false)} className="px-4 py-1.5 text-[13px] border border-ink-border rounded-md hover:bg-gray-50">Cancel</button>
                      <button onClick={saveNote} className="px-4 py-1.5 text-[13px] bg-brand text-white rounded-md hover:bg-brand-hover">Save Note</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-ink whitespace-pre-wrap">
                    {data.notes || <span className="text-ink-muted italic">No notes added yet. Click "Edit Note" to add requirements.</span>}
                  </p>
                )}
              </div>

              {/* Leads */}
              {data.leads.length > 0 && (
                <div className="bg-white border border-ink-border rounded-xl p-5">
                  <h3 className="text-[14px] font-semibold text-ink mb-3">Leads ({data.leads.length})</h3>
                  <div className="space-y-2">
                    {data.leads.map(l => (
                      <div key={l.id} className="flex items-center justify-between py-2 border-b border-ink-border last:border-0">
                        <div>
                          <div className="text-[13.5px] font-medium text-ink">{l.name}</div>
                          <div className="text-[12px] text-ink-muted">{l.source ?? '—'} · {fmtDate(l.createdAt)}</div>
                        </div>
                        <div className="flex gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">{l.status}</span>
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">{l.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {data.projects.length > 0 && (
                <div className="bg-white border border-ink-border rounded-xl p-5">
                  <h3 className="text-[14px] font-semibold text-ink mb-3">Projects ({data.projects.length})</h3>
                  <div className="space-y-2">
                    {data.projects.map(p => (
                      <div key={p.id} className="text-[13.5px] text-ink py-1.5 border-b border-ink-border last:border-0">
                        {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Appointments */}
              {data.appointments.length > 0 && (
                <div className="bg-white border border-ink-border rounded-xl p-5">
                  <h3 className="text-[14px] font-semibold text-ink mb-3">Appointments ({data.appointments.length})</h3>
                  <div className="space-y-2">
                    {data.appointments.map(a => (
                      <div key={a.id} className="flex justify-between py-1.5 border-b border-ink-border last:border-0 text-[13px]">
                        <span className="text-ink">{a.title}</span>
                        <span className="text-ink-muted">{fmtDate(a.startAt)} · {a.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity */}
              {data.activities.length > 0 && (
                <div className="bg-white border border-ink-border rounded-xl p-5">
                  <h3 className="text-[14px] font-semibold text-ink mb-3">Activity</h3>
                  <div className="space-y-3">
                    {data.activities.map(a => (
                      <div key={a.id} className="border-l-2 border-brand-lightBorder pl-3 py-1">
                        <div className="text-[11px] text-ink-muted uppercase tracking-wide">
                          {fmtDate(a.createdAt)} · {a.type}
                          {a.by && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">by {a.by.name}</span>}
                        </div>
                        <div className="text-[13.5px] text-ink mt-0.5">{a.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
