import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Sparkles, X, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { useVoice } from './useVoice';
import { aiService, AIReply } from '../services/ai.service';
import { VoiceDiagnostics } from './VoiceDiagnostics';
import { cn } from '@/shared/utils/cn';

/**
 * Light markdown → JSX so **bold** and bullets show nicely.
 * Same as the one used in the floating widget.
 */
function renderMarkdown(text: string): React.ReactNode {
  const lines = (text ?? '').split('\n');
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
      if (match.index > lastIndex) {
        parts.push(remaining.slice(lastIndex, match.index));
      }
      parts.push(<strong key={`b${key++}`} className="font-semibold">{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remaining.length) {
      parts.push(remaining.slice(lastIndex));
    }

    return (
      <div key={i} className={isBullet ? 'flex gap-1.5 pl-2 my-0.5' : 'my-0.5'}>
        {isBullet && <span className="text-brand shrink-0">•</span>}
        <span>{parts.length ? parts : content}</span>
      </div>
    );
  });
}


interface Message {
  role: 'user' | 'ai';
  text: string;
  links?: { label: string; href: string }[];
}

const QUICK_COMMANDS = [
  'Show hot leads',
  'Who should I call first',
  'How many leads do I have',
  'Show overdue follow-ups',
  'Find John',
];

export default function VoicePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [busy, setBusy] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const voice = useVoice({
    onTranscript: (text) => send(text),
    lang: 'en-IN',
  });

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text: string) => {
    text = text.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const reply: AIReply = await aiService.chat(text);
      setMessages((m) => [
        ...m,
        { role: 'ai', text: reply.reply, links: reply.links },
      ]);
      if (speakReplies) {
        voice.speak(reply.reply);
      } else {
        voice.setIdle();
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message || 'Something went wrong. Try again.';
      setMessages((m) => [...m, { role: 'ai', text: errMsg }]);
      voice.setIdle();
    } finally {
      setBusy(false);
    }
  };

  const handleMicClick = () => {
    if (!voice.supported) return;
    if (voice.state === 'listening') {
      voice.stopListening();
    } else if (voice.state === 'speaking') {
      voice.stopSpeaking();
    } else {
      voice.startListening();
    }
  };

  const micLabel: Record<string, string> = {
    idle: 'Tap to speak',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
    error: 'Not understood',
  };

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand" />
            Voice Assistant
          </h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">
            Speak a command. The AI will use your CRM data to answer.
          </p>
        </div>
        <button
          onClick={() => {
            setSpeakReplies((v) => !v);
            voice.stopSpeaking();
          }}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium border transition-colors',
            speakReplies
              ? 'bg-brand text-white border-brand'
              : 'bg-white text-ink border-ink-border hover:border-brand'
          )}
        >
          {speakReplies ? (
            <><Volume2 className="w-4 h-4" /> Voice replies on</>
          ) : (
            <><VolumeX className="w-4 h-4" /> Voice replies off</>
          )}
        </button>
      </div>

      {/* Not supported warning */}
      {!voice.supported && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[13px] text-amber-800">
            <strong>Voice input needs Chrome or Edge.</strong> You can still use
            the text box below.
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 overflow-hidden">
        {/* Mic panel */}
        <div className="bg-gradient-to-br from-brand to-brand-hover rounded-2xl p-6 flex flex-col items-center justify-center text-white shadow-lg">
          <button
            onClick={handleMicClick}
            disabled={!voice.supported}
            className={cn(
              'relative w-32 h-32 rounded-full flex items-center justify-center',
              'transition-all duration-300',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              voice.state === 'listening' &&
                'bg-white text-brand scale-110 shadow-2xl',
              voice.state === 'thinking' &&
                'bg-white/90 text-brand animate-pulse',
              voice.state === 'speaking' &&
                'bg-white text-brand ring-4 ring-white/40',
              voice.state === 'error' && 'bg-red-500 text-white',
              voice.state === 'idle' &&
                'bg-white/20 text-white hover:bg-white/30 hover:scale-105'
            )}
            aria-label={micLabel[voice.state]}
          >
            {voice.state === 'listening' ? (
              <MicOff className="w-14 h-14" />
            ) : (
              <Mic className="w-14 h-14" />
            )}

            {/* Listening pulse rings */}
            {voice.state === 'listening' && (
              <>
                <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
                <span
                  className="absolute inset-[-12px] rounded-full border-2 border-white/40 animate-pulse"
                />
              </>
            )}

            {/* Speaking wave */}
            {voice.state === 'speaking' && (
              <span className="absolute inset-[-16px] rounded-full border-4 border-white/50 animate-pulse" />
            )}
          </button>

          <div className="mt-6 text-center">
            <div className="text-[18px] font-semibold">{micLabel[voice.state]}</div>
            <div className="text-[12px] opacity-80 mt-1">
              {voice.state === 'idle' && 'Press the mic and say a command'}
              {voice.state === 'listening' && 'Speak now…'}
              {voice.state === 'thinking' && 'Processing your request…'}
              {voice.state === 'speaking' && 'AI is talking…'}
              {voice.state === 'error' && 'Try again'}
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div className="bg-white border border-ink-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {/* Quick commands */}
          <div className="border-b border-ink-border p-3 flex flex-wrap gap-1.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted py-1.5 pr-2">
              Try:
            </span>
            {QUICK_COMMANDS.map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                disabled={busy}
                className="px-2.5 py-1 text-[12px] rounded-md border border-ink-border
                           bg-white text-ink hover:border-brand hover:text-brand
                           disabled:opacity-50 transition-colors"
              >
                {c}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-light text-brand flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-[16px] font-semibold text-ink mb-1">
                  Ready when you are
                </h2>
                <p className="text-[13px] text-ink-muted max-w-sm leading-relaxed">
                  Click the mic and speak, or type below. The AI uses your live
                  CRM data — nothing is invented.
                </p>
              </div>
            )}

            {(Array.isArray(messages) ? messages : (messages?.data || [])).map((m, i) => (
              <div key={i}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-4 py-2.5 text-[14px] leading-relaxed',
                    m.role === 'user'
                      ? 'ml-auto bg-ink text-white'
                      : 'bg-brand-light text-ink border border-brand-lightBorder'
                  )}
                >
                  {(m.text ?? '').split('\n').map((line, j) => (
                    <div key={j}>{line}</div>
                  ))}

                  {m.links && m.links.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.links.map((l) => (
                        <a
                          key={l.href}
                          href={l.href}
                          target={l.href.startsWith('http') ? '_blank' : undefined}
                          rel="noopener"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[12.5px]
                                     rounded-md bg-brand text-white hover:bg-brand-hover
                                     transition-colors no-underline"
                        >
                          {l.label}
                        </a>
                      ))}
                    </div>
                  )}

                  {m.role === 'ai' && speakReplies && (
                    <button
                      onClick={() => voice.speak(m.text)}
                      className="mt-2 text-[11px] text-ink-muted hover:text-brand
                                 inline-flex items-center gap-1"
                      title="Replay voice"
                    >
                      <Volume2 className="w-3 h-3" /> Replay
                    </button>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="bg-brand-light text-ink border border-brand-lightBorder
                              rounded-xl px-4 py-2.5 text-[14px] w-fit flex items-center gap-2">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
                Thinking…
              </div>
            )}
          </div>

          {/* Text input */}
          <div className="border-t border-ink-border p-3 flex items-center gap-2">
            <input
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualQuery.trim()) {
                  send(manualQuery);
                  setManualQuery('');
                }
              }}
              placeholder="Or type a command…"
              className="flex-1 px-3 py-2.5 border border-ink-border rounded-md text-[14px]
                         bg-white focus:outline-none focus:border-brand"
            />
            <button
              onClick={() => {
                if (manualQuery.trim()) {
                  send(manualQuery);
                  setManualQuery('');
                }
              }}
              disabled={busy || !manualQuery.trim()}
              className="h-10 px-4 rounded-md bg-brand text-white text-[13.5px] font-medium
                         hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    
      {/* Voice Diagnostics — press "V" key to toggle */}
      <VoiceDiagnostics />
</div>
  );
}