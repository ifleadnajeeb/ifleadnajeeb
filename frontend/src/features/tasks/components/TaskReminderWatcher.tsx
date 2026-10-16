import { useEffect, useRef, useState } from 'react';
import { Bell, X, CheckSquare, AlertTriangle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Audio (inline, no external imports)
// ─────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';

function beep() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const now = audioCtx.currentTime;
    [0, 0.4].forEach((d) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, now + d);
      gain.gain.linearRampToValueAtTime(0.35, now + d + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + d + 0.15);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(now + d);
      osc.stop(now + d + 0.2);
    });
  } catch (e) {
    console.warn('[watcher] beep error', e);
  }
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  reminderAt: string | null;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export function TaskReminderWatcher() {
  const [active, setActive] = useState<Task | null>(null);
  const [debug, setDebug] = useState({ polls: 0, lastCount: 0, lastError: '', lastFetchAt: '' });
  const [showDebug, setShowDebug] = useState(true);
  const firedIds = useRef<Set<string>>(new Set());
  const beepIntervalRef = useRef<any>(null);
  const activeRef = useRef<Task | null>(null);

  // keep activeRef in sync so interval can check it
  useEffect(() => { activeRef.current = active; }, [active]);

  // ── Unlock audio on first user gesture ──
  useEffect(() => {
    const unlock = () => {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC && !audioCtx) audioCtx = new AC();
        if (audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {});
        console.log('[watcher] audio unlocked');
      } catch {}
      ['click', 'keydown', 'touchstart'].forEach(ev =>
        document.removeEventListener(ev, unlock));
    };
    ['click', 'keydown', 'touchstart'].forEach(ev =>
      document.addEventListener(ev, unlock));
    return () => {
      ['click', 'keydown', 'touchstart'].forEach(ev =>
        document.removeEventListener(ev, unlock));
    };
  }, []);

  // ── Polling loop ──
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_BASE}/api/tasks/reminders/due`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' },
        });

        const timestamp = new Date().toLocaleTimeString('en-GB');
        console.log(`[watcher] poll @ ${timestamp} → status ${res.status}`);

        if (!res.ok) {
          setDebug(d => ({ ...d, polls: d.polls + 1, lastError: `HTTP ${res.status}`, lastFetchAt: timestamp }));
          return;
        }

        const json = await res.json();
        const items: Task[] = json?.data ?? [];
        console.log('[watcher] got', items.length, 'reminders');

        setDebug(d => ({
          polls: d.polls + 1,
          lastCount: items.length,
          lastError: '',
          lastFetchAt: timestamp,
        }));

        // If already showing one, don't fire another
        if (activeRef.current) return;

        // Find a reminder we haven't fired yet
        const next = items.find(t => !firedIds.current.has(t.id));
        if (!next) return;

        console.log('[watcher] 🚨 FIRING for', next.title);
        firedIds.current.add(next.id);
        setActive(next);

        // Start beep loop
        beep();
        if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
        beepIntervalRef.current = setInterval(beep, 1500);

        // Mark as fired on server
        fetch(`${API_BASE}/api/tasks/${next.id}/reminder-fired`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {});

        // Update tab title
        document.title = `🔔 ${next.title}`;
      } catch (e: any) {
        const ts = new Date().toLocaleTimeString('en-GB');
        console.error('[watcher] poll error', e);
        setDebug(d => ({ ...d, polls: d.polls + 1, lastError: e?.message ?? 'error', lastFetchAt: ts }));
      }
    }

    // First poll immediately
    poll();
    // Then every 10s
    const id = setInterval(poll, 10000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);  // <-- run once

  // ── Stop beep on unmount ──
  useEffect(() => {
    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    };
  }, []);

  const dismiss = () => {
    console.log('[watcher] dismiss');
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
    setActive(null);
    document.title = 'if LEADS';
  };

  const markDone = async () => {
    if (!active) return;
    try {
      await fetch(`${API_BASE}/api/tasks/${active.id}/move`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DONE' }),
      });
    } catch {}
    dismiss();
  };

  // ── Esc to dismiss ──
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <>
      {/* ═══ DEBUG BADGE (bottom-left) ═══ */}
      {showDebug && (
        <div
          className="fixed bottom-4 left-4 z-[9998] bg-black/85 text-white text-[11px] rounded-lg px-3 py-2 font-mono leading-tight shadow-lg"
          onClick={() => setShowDebug(false)}
          title="Click to hide"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">Watcher</span>
          </div>
          <div>polls: {debug.polls}</div>
          <div>last count: {debug.lastCount}</div>
          <div>at: {debug.lastFetchAt || '—'}</div>
          {debug.lastError && <div className="text-red-400">err: {debug.lastError}</div>}
        </div>
      )}

      {/* ═══ ACTIVE REMINDER OVERLAY ═══ */}
      {active && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[480px] w-full overflow-hidden">
            <div className="bg-brand text-white px-5 py-3 flex items-center gap-2">
              <Bell className="w-5 h-5 animate-bounce" />
              <span className="text-[13px] uppercase tracking-wider font-bold">Task Reminder</span>
              {active.priority === 'URGENT' && (
                <span className="ml-auto text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold">URGENT</span>
              )}
            </div>

            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-light flex items-center justify-center">
                <Bell className="w-8 h-8 text-brand animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-ink mb-2">{active.title}</h2>
              {active.description && (
                <p className="text-[14px] text-ink-muted mb-4 whitespace-pre-wrap">{active.description}</p>
              )}
              <div className="text-[12px] text-ink-muted space-y-1">
                {active.reminderAt && (
                  <div>Set for {new Date(active.reminderAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}</div>
                )}
                {active.priority === 'URGENT' && (
                  <div className="text-red-600 font-medium flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> High priority
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-ink-border flex gap-3">
              <button onClick={markDone}
                className="flex-1 h-12 rounded-lg border-2 border-ink-border text-ink font-semibold inline-flex items-center justify-center gap-2 hover:bg-brand-light hover:border-brand">
                <CheckSquare className="w-4 h-4" /> Mark done
              </button>
              <button onClick={dismiss} autoFocus
                className="flex-1 h-12 rounded-lg bg-brand text-white font-semibold inline-flex items-center justify-center gap-2 hover:bg-brand-hover shadow-lg">
                <X className="w-4 h-4" /> OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
