import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, FileText, Trash2, Download, X } from 'lucide-react';
import { documentsService, Document, fmtBytes, iconFor, CATEGORIES } from '../services/documents.service';
import { cn } from '@/shared/utils/cn';
import { CanDo } from '@/shared/permissions/CanDo';

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB');
}

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['documents', search, categoryFilter, page],
    queryFn: () => documentsService.list({
      search: search || undefined,
      category: categoryFilter || undefined,
      page, pageSize: 30,
    }),
  });

  const onDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    try {
      await documentsService.remove(doc.id);
      qc.invalidateQueries({ queryKey: ['documents'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Documents</h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">Quotations, contracts, invoices and files</p>
        </div>
        <CanDo permission="documents:create">
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover"
          >
            <Plus className="w-4 h-4" /> Upload
          </button>
        </CanDo>
      </div>

      <div className="bg-white border border-ink-border rounded-xl p-3.5 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by filename…"
            className="w-full h-10 pl-9 pr-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="h-10 px-3 border border-ink-border rounded-md text-[14px] bg-white focus:outline-none focus:border-brand capitalize"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
      </div>

      <div className="bg-white border border-ink-border rounded-xl shadow-sm overflow-hidden">
        {isLoading && <div className="py-12 text-center text-ink-muted text-sm">Loading…</div>}
        {error && <div className="py-12 text-center text-danger text-sm">Failed to load documents.</div>}
        {data && data.data.length === 0 && (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 mx-auto text-ink-muted mb-3" />
            <p className="text-ink-muted text-sm">No documents yet.</p>
            <p className="text-ink-muted text-[12px] mt-1">Click "Upload" to add your first file.</p>
          </div>
        )}
        {data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-ink-bg">
                <tr className="text-left text-[12px] uppercase tracking-wider text-brand font-semibold">
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3">Uploaded</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.(Array.isArray(data) ? data : (data?.data || [])).map(d => (
                  <tr key={d.id} className="border-t border-ink-border hover:bg-brand-light/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{iconFor(d.mimeType)}</span>
                        <div>
                          <div className="font-medium text-ink truncate max-w-[280px]">{d.name}</div>
                          <div className="text-[11.5px] text-ink-muted">{d.mimeType ?? 'unknown'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {d.category && (
                        <span className="px-2 py-0.5 rounded bg-ink-bg border border-ink-border text-[11px] font-medium text-ink-muted capitalize">
                          {d.category}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{d.customer?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{fmtBytes(d.size)}</td>
                    <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{fmt(d.createdAt)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <a href={d.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand text-[12.5px] font-medium hover:underline mr-3">
                        <Download className="w-3.5 h-3.5" /> Open
                      </a>
                      <CanDo permission="documents:delete">
                        <button onClick={() => onDelete(d)}
                          className="inline-flex items-center gap-1 text-danger text-[12.5px] font-medium hover:underline">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
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

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        uploading={uploading}
        onUploading={setUploading}
        onSuccess={() => { setUploadOpen(false); qc.invalidateQueries({ queryKey: ['documents'] }); }}
      />
    </div>
  );
}

function UploadModal({ open, onClose, onSuccess, uploading, onUploading }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  uploading: boolean; onUploading: (v: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const pick = () => inputRef.current?.click();

  const submit = async () => {
    setError('');
    if (!file) { setError('Please choose a file'); return; }
    onUploading(true);
    try {
      await documentsService.upload(file, { category, name: name.trim() || undefined });
      setFile(null); setName(''); setCategory('general');
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Upload failed');
    } finally { onUploading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[480px] w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border">
          <h2 className="text-[16px] font-semibold text-ink">Upload Document</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-ink-muted hover:bg-brand-light">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <input ref={inputRef} type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.zip,.json"
            onChange={e => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !name) setName(f.name);
            }}
            className="hidden" />

          <button onClick={pick}
            className={cn('w-full border-2 border-dashed rounded-xl py-8 px-4 text-center transition-colors',
              file ? 'border-emerald-300 bg-emerald-50' : 'border-ink-border hover:border-brand hover:bg-brand-light')}>
            {file ? (
              <div>
                <div className="text-2xl mb-1">{iconFor(file.type)}</div>
                <div className="text-[14px] font-medium text-ink">{file.name}</div>
                <div className="text-[12px] text-ink-muted mt-0.5">{fmtBytes(file.size)}</div>
              </div>
            ) : (
              <div>
                <Plus className="w-6 h-6 mx-auto text-ink-muted mb-2" />
                <div className="text-[14px] font-medium text-ink">Click to choose a file</div>
                <div className="text-[12px] text-ink-muted mt-1">PDF, Word, Excel, Images · up to 20 MB</div>
              </div>
            )}
          </button>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Display name (optional)</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder={file?.name ?? 'Leave empty to use filename'}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand" />
          </div>

          <div>
            <label className="block text-[13px] text-ink-muted mb-1.5">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full h-10 px-3 border border-ink-border rounded-md text-[14px] focus:outline-none focus:border-brand capitalize">
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>

          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-ink-border">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-ink-border text-[13.5px] hover:bg-brand-light">Cancel</button>
          <button onClick={submit} disabled={!file || uploading}
            className="h-10 px-5 rounded-md bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
