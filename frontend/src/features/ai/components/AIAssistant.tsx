import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Send, RotateCcw, Copy, Check, Bot, User } from 'lucide-react';
import { aiService } from '../services/ai.service';
import { cn } from '@/shared/utils/cn';
import { useDraggable } from '@/shared/hooks/useDraggable';

interface Message {
  role: 'user' | 'ai';
  text: string;
  links?: { label: string; href: string }[];
  at: number;
}

const STORAGE_KEY = 'ifleads-ai-chat';

const QUICK_ACTIONS = [
  { label: "Today's follow-ups", query: "show today's follow-ups" },
  { label: 'Hot leads',          query: 'show hot leads' },
  { label: 'My tasks',           query: 'what are my tasks?' },
  { label: 'Top performer',      query: 'who is the top performer?' },
  { label: 'Write a WhatsApp',   query: 'write a WhatsApp message to John Doe about his project' },
];

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const isBullet = /^[•\-*]\s/.test(line);
    const content = isBullet ? line.replace(/^[•\-*]\s/, '') : line;
    const parts: React.ReactNode[] = [];
    let remaining = content;
    let lastIndex = 0;
    let key = 0;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let match;
    while ((match = boldRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) parts.push(remaining.slice(lastIndex, match.index));
      parts.push(<strong key={`b${key++}`} className="font-semibold">{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remaining.length) parts.push(remaining.slice(lastIndex));
    return (
      <div key={i} className={isBullet ? 'flex gap-1.5 pl-2 my-0.5' : 'my-0.5'}>
        {isBullet && <span className="text-brand shrink-0">•</span>}
        <span>{parts.length ? parts : content}</span>
      </div>
    );
  });
}

function timeShort(ms: number) {
  return new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [busy, setBusy] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { pos, isDragging, didMove, dragHandlers } = useDraggable(
    'ifleads-ai-button-pos',
    { x: window.innerWidth - 160, y: window.innerHeight - 60 }
  );

  const handleButtonClick = () => {
    if (didMove()) return;
    setOpen((v) => !v);
  };

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))); } catch {}
  }, [messages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (text: string) => {
    text = text.trim();
    if (!text || busy) return;

    setMessages((m) => [...m, { role: 'user', text, at: Date.now() }]);
    setInput('');
    setBusy(true);

    try {
      const reply = await aiService.chat(text);
      setMessages((m) => [
        ...m,
        { role: 'ai', text: reply.reply, links: reply.links, at: Date.now() },
      ]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: err?.response?.data?.message || 'Something went wrong. Please try again.',
          at: Date.now(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => {
    if (messages.length === 0) return;
    if (!confirm('Start a new chat?')) return;
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  };

  return createPortal(
    <>
      <button
        {...dragHandlers}
        onClick={handleButtonClick}
        style={{ left: pos.x, top: pos.y }}
        className={cn(
          'fixed z-50 rounded-full px-4 py-2.5 bg-brand text-white',
          'font-medium text-sm shadow-lg hover:bg-brand-hover',
          'flex items-center gap-2 select-none touch-none',
          isDragging ? 'cursor-grabbing opacity-90' : 'cursor-grab transition-colors'
        )}
        title="AI Assistant — drag to move"
      >
        <Sparkles className="w-4 h-4" /> AI Assistant
      </button>

      {open && (
        <div
          style={{
            left: Math.min(pos.x, window.innerWidth - 440),
            top: Math.max(pos.y - 660, 8),
          }}
          className="fixed z-50 flex flex-col w-[420px] max-w-[calc(100vw-24px)] h-[640px] max-h-[80vh] bg-white border border-ink-border rounded-2xl shadow-2xl overflow-hidden"
          role="dialog"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-[14px] text-ink leading-tight">CRM Assistant</div>
                <div className="text-[11px] text-ink-muted leading-tight flex items-center gap-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full', busy ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500')} />
                  {busy ? 'Thinking…' : 'Online'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={newChat} title="New chat" className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-brand-light hover:text-brand">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-brand-light hover:text-brand">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-ink-border bg-ink-bg/40">
            {QUICK_ACTIONS.map((q) => (
              <button key={q.label} onClick={() => send(q.query)} disabled={busy}
                className="px-2.5 py-1 text-[11.5px] rounded-full border border-ink-border bg-white text-ink hover:border-brand hover:text-brand disabled:opacity-50">
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand to-brand-hover text-white grid place-items-center">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="text-[18px] font-semibold text-ink mb-1">How can I help you today?</div>
                <p className="text-[13px] text-ink-muted max-w-[320px] mx-auto leading-relaxed">
                  Ask me anything — CRM data, general questions, or writing help.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand to-brand-hover grid place-items-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={cn('max-w-[85%] flex flex-col gap-1', m.role === 'user' && 'items-end')}>
                  <div className={cn(
                    'rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed',
                    m.role === 'user' ? 'bg-ink text-white rounded-br-sm' : 'bg-ink-bg text-ink rounded-bl-sm border border-ink-border',
                  )}>
                    {m.role === 'ai' ? renderMarkdown(m.text) : m.text}
                  </div>
                  {m.role === 'ai' && m.text && (
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10.5px] text-ink-muted">{timeShort(m.at)}</span>
                      <button onClick={() => copyMessage(m.text, i)} className="text-[10.5px] text-ink-muted hover:text-brand inline-flex items-center gap-1">
                        {copiedIdx === i ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                  )}
                  {m.links && m.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.links.map((l) => (
                        <a key={l.href} href={l.href}
                          className="inline-block px-2.5 py-1 text-[12px] rounded-md bg-brand text-white hover:bg-brand-hover transition-colors no-underline">
                          {l.label} →
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-ink text-white grid place-items-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand to-brand-hover grid place-items-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-ink-bg text-ink border border-ink-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-1.5 px-3 py-3 border-t border-ink-border bg-white">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              placeholder="Message CRM Assistant…"
              disabled={busy}
              className="flex-1 px-3.5 py-2.5 border border-ink-border rounded-xl text-[13.5px] bg-white focus:outline-none focus:border-brand disabled:bg-ink-bg"
            />
            <button onClick={() => send(input)} disabled={busy || !input.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-hover disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
