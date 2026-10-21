// @ts-nocheck — TODO: fix types
import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { leadsService } from '../services/leads.service';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  source?: string;
  status?: string;
  priority?: string;
  value?: number;
  notes?: string;
}

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  name: 'name', 'full name': 'name', 'lead name': 'name', 'client name': 'name',
  phone: 'phone', mobile: 'phone', 'phone number': 'phone', contact: 'phone', number: 'phone',
  email: 'email', 'email address': 'email', mail: 'email',
  company: 'company', 'company name': 'company', project: 'company',
  source: 'source', 'lead source': 'source', channel: 'source',
  status: 'status', stage: 'status',
  priority: 'priority', urgency: 'priority',
  value: 'value', amount: 'value', budget: 'value', price: 'value',
  'next follow-up': 'nextFollowupDate', 'next followup': 'nextFollowupDate',
  'next follow-up date': 'nextFollowupDate', 'follow-up date': 'nextFollowupDate',
  'follow up date': 'nextFollowupDate', 'nextfollowup': 'nextFollowupDate',
  notes: 'notes', note: 'notes', remark: 'notes', remarks: 'notes', comments: 'notes',
};

function normalizeHeader(h: string): keyof ParsedRow | null {
  return HEADER_MAP[h.toLowerCase().trim()] ?? null;
}

const TEMPLATE = `Name,Phone,Project Name,Service,Source,Status,Priority,Value,Next Follow-up,Notes
John Doe,9876543210,Acme website redesign,Website Development,manual,NEW,MEDIUM,50000,2026-10-20,Interested in website
Jane Smith,9876543211,Globex mobile app,SEO,website,CONTACTED,HOT,75000,2026-10-18,Call back tomorrow
Rajesh Kumar,9876543212,Tech Solutions CRM,Mobile App,referral,QUALIFIED,HOT,120000,2026-10-25,Ready to sign`;

export function BulkImportModal({ open, onClose, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number; errors: any[] } | null>(null);
  const [error, setError] = useState('');

  if (!open) return null;

  const reset = () => {
    setRows([]); setFileName(''); setError(''); setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleClose = () => { reset(); onClose(); };

  const handleFile = async (file: File) => {
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (json.length === 0) { setError('The file is empty.'); return; }

      const parsed: ParsedRow[] = [];
      for (const raw of json) {
        const mapped: any = {};
        for (const [key, val] of Object.entries(raw)) {
          const target = normalizeHeader(key);
          if (target) mapped[target] = String(val ?? '').trim();
        }
        if (!mapped.name || mapped.name.length < 2) continue;
        if (mapped.value) {
          const num = Number(String(mapped.value).replace(/[^\d.]/g, ''));
          if (!isNaN(num)) mapped.value = num;
        }
        parsed.push(mapped);
      }
      if (parsed.length === 0) {
        setError('No valid rows found. Make sure you have a "Name" column.');
        return;
      }
      setRows(parsed);
    } catch (e: any) {
      setError('Could not read the file: ' + (e?.message ?? 'unknown'));
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');
    try {
      const res = await leadsService.bulkCreate(rows);
      setResult(res);
      if (res.created > 0) onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4 overflow-y-auto" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[820px] w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand" />
            <h2 className="text-[16px] font-semibold text-ink">Import Leads from Excel / CSV</h2>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-ink-bg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-emerald-800">
                    Imported {result.created} lead{result.created === 1 ? '' : 's'}
                    {result.failed > 0 && `, ${result.failed} failed`}
                  </p>
                  {result.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-[12.5px] text-red-700 cursor-pointer font-medium">
                        Show {result.errors.length} error(s)
                      </summary>
                      <ul className="mt-2 space-y-1 text-[12px] text-red-700 font-mono">
                        {result.errors.slice(0, 10).map((e, i) => (
                          <li key={i}>Row {e.row} — {e.name}: {e.error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <button onClick={handleClose}
                    className="mt-3 h-9 px-4 rounded-md bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700">
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {!result && (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                className="border-2 border-dashed border-ink-border rounded-xl p-8 text-center cursor-pointer hover:border-brand hover:bg-brand-light/30 transition-colors"
              >
                <Upload className="w-10 h-10 mx-auto text-ink-muted mb-3" />
                <p className="text-[14px] font-medium text-ink mb-1">Click to upload or drag &amp; drop</p>
                <p className="text-[12.5px] text-ink-muted">Excel (.xlsx, .xls) or CSV</p>
                {fileName && <p className="text-[12.5px] text-brand font-medium mt-2">Selected: {fileName}</p>}
              </div>

              <input
                ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />

              <button onClick={downloadTemplate} className="inline-flex items-center gap-2 text-[13px] text-brand hover:underline">
                <Download className="w-3.5 h-3.5" /> Download CSV template
              </button>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-red-700">{error}</p>
                </div>
              )}

              {rows.length > 0 && (
                <div>
                  <p className="text-[13px] font-medium text-ink mb-2">
                    Preview — {rows.length} row{rows.length === 1 ? '' : 's'}
                  </p>
                  <div className="border border-ink-border rounded-md overflow-hidden">
                    <div className="overflow-x-auto max-h-[280px]">
                      <table className="w-full text-[12.5px]">
                        <thead className="bg-ink-bg sticky top-0">
                          <tr className="text-left text-[11px] uppercase tracking-wider text-brand font-semibold">
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Phone</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Company</th>
                            <th className="px-3 py-2">Source</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Priority</th>
                            <th className="px-3 py-2 text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 50).map((r, i) => (
                            <tr key={i} className="border-t border-ink-border">
                              <td className="px-3 py-1.5 text-ink-muted">{i + 1}</td>
                              <td className="px-3 py-1.5 font-medium text-ink">{r.name}</td>
                              <td className="px-3 py-1.5 text-ink-muted">{r.phone || '—'}</td>
                              <td className="px-3 py-1.5 text-ink-muted">{r.email || '—'}</td>
                              <td className="px-3 py-1.5 text-ink-muted">{r.company || '—'}</td>
                              <td className="px-3 py-1.5 text-ink-muted">{r.source || 'manual'}</td>
                              <td className="px-3 py-1.5 text-ink-muted">{r.status || 'NEW'}</td>
                              <td className="px-3 py-1.5 text-ink-muted">{r.priority || 'MEDIUM'}</td>
                              <td className="px-3 py-1.5 text-right text-ink-muted">
                                {r.value ? `₹${r.value.toLocaleString('en-IN')}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rows.length > 50 && (
                      <div className="px-3 py-2 bg-ink-bg text-[12px] text-ink-muted border-t border-ink-border">
                        Showing first 50 of {rows.length} rows
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!result && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
            <button onClick={handleClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-ink-bg">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={rows.length === 0 || importing}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importing…' : `Import ${rows.length || ''} Lead${rows.length === 1 ? '' : 's'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
