// @ts-nocheck — TODO: fix types
import { useState } from 'react';
import { X, CheckCircle2, Sparkles } from 'lucide-react';
import { leadsService, FollowupResult } from '../services/leads.service';

interface Props {
  lead: { id: string; name: string } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─── Result options + auto-fill rules (mirrors backend) ───
const RESULTS: {
  value: string;
  status: string;
  nextAction: string;
  days: number;
  closes: boolean;
}[] = [
  { value: 'No answer',            status: 'CONTACTED',   nextAction: 'Call customer',          days: 1, closes: false },
  { value: 'Call back later',      status: 'CONTACTED',   nextAction: 'Call customer',          days: 1, closes: false },
  { value: 'Interested',           status: 'QUALIFIED',   nextAction: 'Send quotation',         days: 2, closes: false },
  { value: 'Very interested',      status: 'QUALIFIED',   nextAction: 'Send quotation',         days: 1, closes: false },
  { value: 'Requested quotation',  status: 'PROPOSAL',    nextAction: 'Send quotation',         days: 2, closes: false },
  { value: 'Quotation sent',       status: 'PROPOSAL',    nextAction: 'Check quotation status', days: 2, closes: false },
  { value: 'Negotiation',          status: 'NEGOTIATION', nextAction: 'Follow up later',        days: 2, closes: false },
  { value: 'Meeting scheduled',    status: 'NEGOTIATION', nextAction: 'Attend meeting',         days: 3, closes: false },
  { value: 'Waiting for customer', status: 'NEGOTIATION', nextAction: 'Follow up later',        days: 3, closes: false },
  { value: 'Not interested',       status: 'LOST',        nextAction: '',                       days: 0, closes: true },
  { value: 'Wrong number',         status: 'LOST',        nextAction: '',                       days: 0, closes: true },
  { value: 'Converted',            status: 'WON',         nextAction: '',                       days: 0, closes: true },
  { value: 'Other',                status: 'CONTACTED',   nextAction: 'Follow up later',        days: 2, closes: false },
];

const METHODS = ['Phone', 'WhatsApp', 'Email', 'Meeting', 'Other'] as const;

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function FollowUpModal({ lead, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState<(typeof METHODS)[number]>('Phone');
  const [result, setResult] = useState('Interested');
  const [note, setNote] = useState('');
  const [nextAction, setNextAction] = useState('Send quotation');
  const [nextDate, setNextDate] = useState(addDays(2));
  const [nextTime, setNextTime] = useState('10:30');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<FollowupResult | null>(null);

  if (!lead) return null;

  // Auto-fill nextAction + nextDate when result changes
  const handleResultChange = (newResult: string) => {
    setResult(newResult);
    const rule = RESULTS.find((r) => r.value === newResult);
    if (!rule) return;
    if (rule.closes) {
      setNextAction('');
    } else {
      setNextAction(rule.nextAction);
      setNextDate(addDays(rule.days));
    }
    setError('');
  };

  const currentRule = RESULTS.find((r) => r.value === result);
  const closesLead = currentRule?.closes ?? false;

  const handleSubmit = async () => {
    setError('');
    if (!closesLead && !nextDate) {
      setError('Please pick the next follow-up date.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await leadsService.completeFollowup(lead.id, {
        method,
        result,
        note: note.trim() || undefined,
        nextAction: closesLead ? undefined : nextAction,
        nextDate: closesLead ? null : nextDate,
        nextTime: closesLead ? null : nextTime,
      });
      setSuccess(res);
      onSuccess?.();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Could not save the follow-up. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success screen ───
  if (success) {
    return (
      <div
        className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-[440px] w-full p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-1">Mission Complete!</h2>
          <p className="text-[14px] text-ink-muted mb-5">
            {lead.name} follow-up recorded as <strong>{result}</strong>
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-light border border-brand-lightBorder mb-4">
            <Sparkles className="w-4 h-4 text-brand" />
            <span className="text-[15px] font-bold text-brand">
              +{success.xp} XP
            </span>
          </div>

          {success.closesLead ? (
            <p className="text-[13.5px] text-ink-muted mb-5">
              This lead is now closed as <strong>{success.newStatus}</strong>.
            </p>
          ) : (
            <div className="text-[13.5px] text-ink-muted mb-5 leading-relaxed">
              Next follow-up:{' '}
              <strong className="text-ink">
                {success.suggestedNextAction}
              </strong>
              {success.suggestedNextDate && (
                <>
                  {' '}
                  on{' '}
                  <strong className="text-ink">
                    {new Date(success.suggestedNextDate).toLocaleDateString(
                      'en-IN',
                      { day: '2-digit', month: 'short' }
                    )}
                  </strong>
                </>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full h-11 rounded-lg bg-brand text-white font-medium
                       hover:bg-brand-hover transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ─── Form ───
  return (
    <div
      className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">
              Complete Follow-up
            </h2>
            <p className="text-[12.5px] text-ink-muted">{lead.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md
                       text-ink-muted hover:bg-brand-light hover:text-brand transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Contact method */}
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">
              Contact method
            </label>
            <div className="flex flex-wrap gap-1.5">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={
                    'px-3 py-1.5 rounded-md border text-[13px] font-medium transition-colors ' +
                    (method === m
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-ink border-ink-border hover:border-brand')
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">
              Result
            </label>
            <select
              value={result}
              onChange={(e) => handleResultChange(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]
                         bg-white focus:outline-none focus:border-brand"
            >
              {RESULTS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.value}
                  {r.closes ? '  — closes lead' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="What did the customer say?"
              className="w-full px-3 py-2 border border-ink-border rounded-md text-[14px]
                         bg-white focus:outline-none focus:border-brand resize-none"
            />
          </div>

          {/* Next action + date — only if not closing */}
          {!closesLead && (
            <>
              <div>
                <label className="block text-[13px] text-ink-muted mb-1.5">
                  Next action
                </label>
                <input
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]
                             bg-white focus:outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] text-ink-muted mb-1.5">
                    Next follow-up
                  </label>
                  <input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]
                               bg-white focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-ink-muted mb-1.5">
                    Time
                  </label>
                  <input
                    type="time"
                    value={nextTime}
                    onChange={(e) => setNextTime(e.target.value)}
                    className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px]
                               bg-white focus:outline-none focus:border-brand"
                  />
                </div>
              </div>
            </>
          )}

          {closesLead && (
            <div className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200
                            rounded-md px-3 py-2">
              ⚠ This result will <strong>close</strong> the lead (status:{' '}
              {currentRule?.status}).
            </div>
          )}

          {error && (
            <div className="text-[13px] text-danger bg-red-50 border border-red-200
                            rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] text-ink
                       hover:bg-brand-light transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium
                       hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {submitting ? 'Saving…' : 'Complete mission'}
          </button>
        </div>
      </div>
    </div>
  );
}
