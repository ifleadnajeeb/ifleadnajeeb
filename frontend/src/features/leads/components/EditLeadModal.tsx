import { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { api } from '@/shared/api/client';
import { Lead } from '../services/leads.service';

interface Props {
  lead: Lead | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const SOURCES = ['manual', 'website', 'facebook', 'instagram', 'whatsapp', 'referral', 'walk-in'];
const PRIORITIES = ['COLD', 'MEDIUM', 'HOT'];
const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

export function EditLeadModal({ lead, onClose, onSuccess }: Props) {
  const [status, setStatus] = useState('NEW');
  const [source, setSource] = useState('manual');
  const [priority, setPriority] = useState('MEDIUM');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Pre-fill form when modal opens
  useEffect(() => {
    if (lead) {
      setStatus(lead.status || 'NEW');
      setSource(lead.source || 'manual');
      setPriority(lead.priority || 'MEDIUM');
      setCompany(lead.company || '');
      setNotes(lead.notes || '');
      setError('');
      setSuccess(false);
    }
  }, [lead]);

  if (!lead) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/leads/${lead.id}`, {
        status, source, priority,
        company: company.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update lead.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl max-w-[400px] w-full p-6 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-1">Lead Updated!</h2>
          <p className="text-[14px] text-ink-muted mb-5">The changes have been saved.</p>
          <button onClick={onClose} className="w-full h-11 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-[500px] w-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">Edit Lead: {lead.name}</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Source</label>
              <select value={source} onChange={e => setSource(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand capitalize">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] text-ink-muted mb-1.5">Project / Company</label>
              <input value={company} onChange={e => setCompany(e.target.value)} className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand" />
            </div>
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Description / Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand resize-none" />
          </div>

          {error && <div className="text-[13px] text-danger bg-red-50 px-3 py-2 rounded-md border border-red-200">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
