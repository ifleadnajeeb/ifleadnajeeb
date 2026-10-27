import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Plus, X, Trash2, Copy, Edit3, Send } from 'lucide-react';
import { whatsappService, Template, WA_CATEGORIES } from '../services/whatsapp.service';
import { SendTemplateModal } from '../components/SendTemplateModal';
import { cn } from '@/shared/utils/cn';

type Tab = 'templates' | 'logs';

export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>('templates');
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-emerald-600" />
          WhatsApp
        </h1>
        <p className="text-[13.5px] text-ink-muted mt-0.5">
          Message templates and click-to-chat activity log
        </p>
      </div>
      <div className="flex gap-2">
        {(['templates', 'logs'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-1.5 rounded-full text-[13px] font-medium',
              tab === t ? 'bg-ink text-white' : 'bg-white border border-ink-border text-ink hover:bg-ink-bg')}>
            {t === 'templates' ? 'Templates' : 'Activity Log'}
          </button>
        ))}
      </div>
      {tab === 'templates' ? <TemplatesTab /> : <LogsTab />}
    </div>
  );
}

function TemplatesTab() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [sendTarget, setSendTarget] = useState<Template | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['wa-templates'],
    queryFn: () => whatsappService.listTemplates(),
  });

  const deleteTemplate = async (t: Template) => {
    if (!confirm('Delete template "' + t.name + '"?')) return;
    await whatsappService.deleteTemplate(t.id);
    qc.invalidateQueries({ queryKey: ['wa-templates'] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>
      {isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
      {templates && templates.length === 0 && (
        <div className="bg-white border border-ink-border rounded-xl p-10 text-center">
          <MessageCircle className="w-10 h-10 mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted text-sm">No templates yet.</p>
        </div>
      )}
      {templates && templates.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-ink-border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-ink">{t.name}</h3>
                  <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium capitalize">
                    {t.category}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setSendTarget(t)} title="Send via WhatsApp"
                    className="w-8 h-8 grid place-items-center rounded-md text-emerald-700 hover:bg-emerald-50">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(t.body)} title="Copy"
                    className="w-8 h-8 grid place-items-center rounded-md text-ink-muted hover:bg-brand-light">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditing(t); setModalOpen(true); }} title="Edit"
                    className="w-8 h-8 grid place-items-center rounded-md text-ink-muted hover:bg-brand-light">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteTemplate(t)} title="Delete"
                    className="w-8 h-8 grid place-items-center rounded-md text-ink-muted hover:bg-red-50 hover:text-danger">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="bg-ink-bg border border-ink-border rounded-md p-3 text-[13px] text-ink whitespace-pre-wrap">
                {t.body}
              </div>
            </div>
          ))}
        </div>
      )}
      <TemplateModal open={modalOpen} editing={editing}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); qc.invalidateQueries({ queryKey: ['wa-templates'] }); }} />
    </div>
  );
}

function LogsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['wa-logs', page],
    queryFn: () => whatsappService.listLogs({ page, pageSize: 30 }),
  });

  return (
    <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
      {isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
      {data && data.data.length === 0 && (
        <div className="py-16 text-center">
          <MessageCircle className="w-10 h-10 mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted text-sm">No WhatsApp activity yet.</p>
        </div>
      )}
      {data && data.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-ink-bg">
              <tr className="text-left text-[12px] uppercase tracking-wider text-brand font-semibold">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">To</th>
                <th className="px-5 py-3">Message</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">By</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(data) ? data : (data?.data || [])).map(l => (
                <tr key={l.id} className="border-t border-ink-border">
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-ink">{l.lead?.name || l.customer?.name || '—'}</div>
                    <div className="text-[11.5px] text-ink-muted">{l.lead?.phone || l.customer?.phone || ''}</div>
                  </td>
                  <td className="px-5 py-3 text-ink-muted max-w-[300px] truncate">{l.body ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                      {l.method}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{l.actor?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TemplateModal({ open, editing, onClose, onSuccess }: {
  open: boolean; editing: Template | null; onClose: () => void; onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (open && editing && name === '' && body === '') {
    setName(editing.name);
    setBody(editing.body);
    setCategory(editing.category);
  }

  if (!open) return null;

  const submit = async () => {
    setError('');
    if (name.trim().length < 2) { setError('Name required'); return; }
    if (body.trim().length < 2) { setError('Message required'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await whatsappService.updateTemplate(editing.id, { name: name.trim(), body: body.trim(), category });
      } else {
        await whatsappService.createTemplate({ name: name.trim(), body: body.trim(), category });
      }
      setName(''); setBody(''); setCategory('general');
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const close = () => { setName(''); setBody(''); setCategory('general'); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={close}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">
            {editing ? 'Edit Template' : 'New Template'}
          </h2>
          <button onClick={close} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Template name</label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus
              placeholder="Follow-up greeting"
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand capitalize">
              {WA_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
              placeholder="Hi, following up on your enquiry…"
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] resize-none focus:outline-none focus:border-brand" />
          </div>
          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={close} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={submit} disabled={submitting}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {submitting ? 'Saving…' : editing ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
