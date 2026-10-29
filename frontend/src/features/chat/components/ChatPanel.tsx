import { useEffect, useRef, useState } from 'react';
import {
  X, Send, Plus, Search, ArrowLeft, Users, User,
  MessageCircle, Check, ChevronDown,
} from 'lucide-react';
import {
  chatService,
  type Chat,
  type ChatMessage,
  type ChatUser,
} from '../services/chat.service';
import { useAuth } from '@/app/providers/auth-provider';
import { cn } from '@/shared/utils/cn';

type View = 'list' | 'thread' | 'new';

function timeShort(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function initials(name: string) {
  return name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [view, setView] = useState<View>('list');
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch chats + poll every 4s ──
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingChats(true);
        const data = await chatService.listChats();
        if (!cancelled) setChats(data);
      } catch {} finally {
        if (!cancelled) setLoadingChats(false);
      }
    };
    load();
    const id = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // ── Poll active chat messages every 3s ──
  useEffect(() => {
    if (!activeChat) return;
    let cancelled = false;

    const load = async (showLoader = false) => {
      try {
        if (showLoader) setLoadingMessages(true);
        const data = await chatService.listMessages(activeChat.id);
        if (!cancelled) setMessages(data);
      } catch {} finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };
    load(true);
    const id = setInterval(() => load(false), 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeChat]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, view]);

  // Focus input on thread view
  useEffect(() => {
    if (view === 'thread') setTimeout(() => inputRef.current?.focus(), 100);
  }, [view]);

  // ── Load users when opening new chat ──
  useEffect(() => {
    if (view !== 'new') return;
    chatService.listUsers().then(setUsers).catch(() => {});
  }, [view]);

  const openChat = (chat: Chat) => {
    setActiveChat(chat);
    setView('thread');
    setMessages([]);
  };

  const send = async () => {
    if (!activeChat || !input.trim() || sending) return;
    const body = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await chatService.sendMessage(activeChat.id, body);
      setMessages((m) => [...m, msg]);
    } catch {}
    setSending(false);
  };

  const startDM = async (userId: string) => {
    try {
      const chat = await chatService.createDM(userId);
      setChats((c) => {
        const exists = c.find((x) => x.id === chat.id);
        return exists ? c : [chat, ...c];
      });
      openChat(chat);
    } catch {}
  };

  const filteredChats = search
    ? chats.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.lastMessage?.body ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : chats;

  const filteredUsers = search
    ? users.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[80]" onClick={onClose} />

      {/* Panel — full-height slide-in from right */}
      <div className="fixed inset-y-0 right-0 z-[90] w-full max-w-[900px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-border bg-brand text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5" />
            <div>
              <div className="font-semibold text-[15px]">iFChat</div>
              <div className="text-[11px] opacity-90">Team messaging</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* ─── LEFT: Conversations list (hidden on mobile when in thread) ─── */}
          <div
            className={cn(
              'w-full md:w-[320px] border-r border-ink-border flex-col bg-white shrink-0',
              view === 'thread' ? 'hidden md:flex' : 'flex'
            )}
          >
            {/* New chat button */}
            <div className="p-3 border-b border-ink-border">
              <button
                onClick={() => { setView('new'); setSearch(''); }}
                className="w-full h-10 rounded-md bg-brand text-white font-medium text-[13.5px] inline-flex items-center justify-center gap-2 hover:bg-brand-hover transition-colors"
              >
                <Plus className="w-4 h-4" /> New chat
              </button>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chats…"
                  className="w-full h-9 pl-9 pr-3 border border-ink-border rounded-md text-[13px] bg-ink-bg focus:outline-none focus:border-brand focus:bg-white"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {loadingChats && chats.length === 0 && (
                <div className="p-6 text-center text-[13px] text-ink-muted">Loading…</div>
              )}
              {!loadingChats && filteredChats.length === 0 && (
                <div className="p-6 text-center">
                  <MessageCircle className="w-8 h-8 mx-auto text-ink-muted mb-2 opacity-50" />
                  <p className="text-[13px] text-ink-muted">No chats yet.</p>
                  <p className="text-[12px] text-ink-muted mt-1">Click "New chat" to start.</p>
                </div>
              )}
              {filteredChats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openChat(c)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b border-ink-border hover:bg-brand-light transition-colors flex items-center gap-3',
                    activeChat?.id === c.id && 'bg-brand-light'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full grid place-items-center text-[13px] font-bold shrink-0 text-white',
                      c.isGroup ? 'bg-purple-500' : 'bg-brand'
                    )}
                  >
                    {c.isGroup ? <Users className="w-4 h-4" /> : initials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-[13.5px] font-medium text-ink truncate">
                        {c.name}
                      </div>
                      {c.lastMessage && (
                        <div className="text-[10.5px] text-ink-muted shrink-0">
                          {timeShort(c.lastMessage.at)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="text-[12px] text-ink-muted truncate">
                        {c.lastMessage
                          ? `${c.lastMessage.senderName === user?.name ? 'You: ' : ''}${c.lastMessage.body}`
                          : c.isGroup ? `${c.members.length} members` : 'No messages yet'}
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold grid place-items-center shrink-0">
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ─── RIGHT: Thread / New chat picker ─── */}
          <div className={cn(
            'flex-1 flex-col min-w-0',
            view === 'thread' ? 'flex' : 'hidden md:flex'
          )}>
            {/* Thread view */}
            {view === 'thread' && activeChat && (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-border bg-white shrink-0">
                  <button
                    onClick={() => setView('list')}
                    className="md:hidden w-8 h-8 rounded-md hover:bg-ink-bg grid place-items-center"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full grid place-items-center text-[12px] font-bold text-white shrink-0',
                      activeChat.isGroup ? 'bg-purple-500' : 'bg-brand'
                    )}
                  >
                    {activeChat.isGroup ? <Users className="w-4 h-4" /> : initials(activeChat.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-ink truncate">
                      {activeChat.name}
                    </div>
                    <div className="text-[11.5px] text-ink-muted">
                      {activeChat.isGroup
                        ? `${activeChat.members.length} members`
                        : activeChat.otherUser?.role ?? 'DM'}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={listRef}
                  className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-ink-bg/30"
                >
                  {loadingMessages && messages.length === 0 && (
                    <div className="text-center text-[13px] text-ink-muted py-8">Loading…</div>
                  )}
                  {!loadingMessages && messages.length === 0 && (
                    <div className="text-center py-8">
                      <MessageCircle className="w-10 h-10 mx-auto text-ink-muted mb-2 opacity-40" />
                      <p className="text-[13px] text-ink-muted">
                        No messages yet — say hi! 👋
                      </p>
                    </div>
                  )}
                  {(Array.isArray(messages) ? messages : (messages?.data || [])).map((m, i) => {
                    const mine = m.sender?.id === user?.id;
                    const showSender =
                      activeChat.isGroup &&
                      !mine &&
                      (i === 0 || messages[i - 1].sender?.id !== m.sender?.id);
                    return (
                      <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                        <div className="max-w-[75%]">
                          {showSender && (
                            <div className="text-[11px] text-brand font-medium mb-0.5 px-2">
                              {m.sender?.name ?? 'Unknown'}
                            </div>
                          )}
                          <div
                            className={cn(
                              'rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words',
                              mine
                                ? 'bg-brand text-white rounded-br-sm'
                                : 'bg-white text-ink rounded-bl-sm border border-ink-border'
                            )}
                          >
                            {m.body}
                          </div>
                          <div
                            className={cn(
                              'text-[10.5px] text-ink-muted mt-0.5 px-2',
                              mine ? 'text-right' : 'text-left'
                            )}
                          >
                            {timeShort(m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Send box */}
                <div className="flex items-end gap-2 px-3 py-3 border-t border-ink-border bg-white shrink-0">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder="Type a message…"
                    disabled={sending}
                    className="flex-1 px-3.5 py-2.5 border border-ink-border rounded-xl text-[13.5px] resize-none focus:outline-none focus:border-brand max-h-[120px]"
                    style={{ minHeight: 44 }}
                  />
                  <button
                    onClick={send}
                    disabled={sending || !input.trim()}
                    className="w-11 h-11 rounded-full bg-brand text-white grid place-items-center hover:bg-brand-hover disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* New chat picker */}
            {view === 'new' && (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-border bg-white shrink-0">
                  <button
                    onClick={() => setView('list')}
                    className="w-8 h-8 rounded-md hover:bg-ink-bg grid place-items-center"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="text-[14px] font-semibold text-ink">
                    Start a new chat
                  </div>
                </div>

                <div className="p-3 border-b border-ink-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search teammates…"
                      className="w-full h-10 pl-9 pr-3 border border-ink-border rounded-md text-[13.5px] bg-ink-bg focus:outline-none focus:border-brand focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredUsers.length === 0 && (
                    <div className="p-6 text-center text-[13px] text-ink-muted">
                      No teammates found.
                    </div>
                  )}
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => startDM(u.id)}
                      className="w-full text-left px-4 py-3 border-b border-ink-border hover:bg-brand-light flex items-center gap-3 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-brand text-white grid place-items-center text-[12px] font-bold shrink-0">
                        {initials(u.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-medium text-ink truncate">
                          {u.name}
                        </div>
                        <div className="text-[11.5px] text-ink-muted">{u.role}</div>
                      </div>
                      <User className="w-4 h-4 text-ink-muted" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Empty state — no chat selected */}
            {view === 'list' && (
              <div className="flex-1 grid place-items-center bg-ink-bg/30">
                <div className="text-center px-6">
                  <MessageCircle className="w-16 h-16 mx-auto text-ink-muted mb-4 opacity-30" />
                  <div className="text-[16px] font-semibold text-ink mb-1">
                    Welcome to iFChat
                  </div>
                  <p className="text-[13px] text-ink-muted max-w-[300px]">
                    Pick a conversation on the left, or start a new one with a teammate.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
