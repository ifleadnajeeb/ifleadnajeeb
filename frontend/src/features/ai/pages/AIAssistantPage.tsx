import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, RotateCcw, Copy, Check, Bot, User } from 'lucide-react';
import { aiService } from '../services/ai.service';
import { cn } from '@/shared/utils/cn';

interface Message {
  role: 'user' | 'ai';
  text: string;
  links?: { label: string; href: string }[];
  at: number;
}

const STORAGE_KEY = 'ifleads-ai-page';

const SUGGESTIONS = [
  'How many leads do I have?',
  'Show me hot leads',
  "What are today's follow-ups?",
  'Show overdue follow-ups',
  'What are my tasks?',
  'Appointments today',
  'Who is the top performer?',
  'What is my XP?',
  'Write a WhatsApp to John Doe',
  'Summarize my week',
  'What is AI?',
  'Explain digital marketing',
];

function renderMarkdown(text: string): React.ReactNode {
  const lines = (text ?? '').split('\n');
  return lines.map((line, i) => {
    const isBullet = /^[•\-*]\s/.test(line);
    const content = isBullet ? line.replace(/^[•\-*]\s/, '') : line;
    
    // Match both **bold** and *italic*
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      
      const matchText = match[0];
      if (matchText.startsWith('**')) {
        parts.push(<strong key={`b${key++}`} className="font-semibold">{matchText.slice(2, -2)}</strong>);
      } else {
        parts.push(<em key={`i${key++}`}>{matchText.slice(1, -1)}</em>);
      }
      lastIndex = match.index + matchText.length;
    }
    
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return (
      <div key={i} className={isBullet ? 'flex gap-1.5 pl-2 my-1' : 'my-1'}>
        {isBullet && <span className="text-brand shrink-0">•</span>}
        <span>{parts.length ? parts : content}</span>
      </div>
    );
  });
}

function timeShort(ms: number) {
  return new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function AIAssistantPage() {
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))); } catch {}
  }, [messages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">AI Assistant</h1>
            <p className="text-[12.5px] text-ink-muted mt-0.5">
              Ask anything — CRM data, general questions, or writing help
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={newChat}
            className="text-[12.5px] text-ink-muted hover:text-brand px-3 py-1.5 rounded-md hover:bg-brand-light inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> New chat
          </button>
        )}
      </div>

      {/* Chat area */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto rounded-xl bg-white border border-ink-border p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand to-brand-hover text-white grid place-items-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-[18px] font-semibold text-ink mb-1">
              How can I help you today?
            </h2>
            <p className="text-[13px] text-ink-muted mb-6 max-w-md mx-auto">
              I'm powered by your CRM data + a Groq LLM. Ask me anything.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-[700px] mx-auto">
              {SUGGESTIONS.slice(0, 6).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-full border border-ink-border bg-white text-[12.5px] text-ink hover:border-brand hover:bg-brand-light transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-hover grid place-items-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            <div className={cn('max-w-[85%] flex flex-col gap-1', m.role === 'user' && 'items-end')}>
              <div className={cn(
                'rounded-2xl px-4 py-3 text-[14px] leading-relaxed',
                m.role === 'user'
                  ? 'bg-ink text-white rounded-br-sm'
                  : 'bg-ink-bg text-ink rounded-bl-sm border border-ink-border',
              )}>
                {m.role === 'ai' ? renderMarkdown(m.text) : m.text}
              </div>

              {m.role === 'ai' && m.text && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10.5px] text-ink-muted">{timeShort(m.at)}</span>
                  <button
                    onClick={() => copyMessage(m.text, i)}
                    className="text-[10.5px] text-ink-muted hover:text-brand inline-flex items-center gap-1"
                  >
                    {copiedIdx === i
                      ? <><Check className="w-3 h-3" /> Copied</>
                      : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
              )}

              {m.links && m.links.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      className="inline-block px-3 py-1.5 text-[12.5px] rounded-md bg-brand text-white hover:bg-brand-hover transition-colors no-underline"
                    >
                      {l.label} →
                    </a>
                  ))}
                </div>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-ink text-white grid place-items-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-hover grid place-items-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
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
      <div className="mt-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
          disabled={busy}
          className="flex-1 px-4 py-3 border border-ink-border rounded-xl text-[14px] resize-none focus:outline-none focus:border-brand bg-white max-h-[140px] disabled:bg-ink-bg"
          style={{ minHeight: 48 }}
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          className="h-12 px-6 rounded-xl bg-brand text-white text-[13.5px] font-medium hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 shrink-0"
        >
          <Send className="w-4 h-4" /> Send
        </button>
      </div>

      {/* Suggestion chips below input when chat has messages */}
      {messages.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.slice(6, 11).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="px-2.5 py-1 rounded-full border border-ink-border bg-white text-[11.5px] text-ink-muted hover:border-brand hover:text-brand transition-colors disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
