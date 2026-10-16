import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X } from 'lucide-react';
import { chatService } from '../services/chat.service';
import { ChatPanel } from './ChatPanel';
import { cn } from '@/shared/utils/cn';

export function ChatFloatingButton() {
  const [open, setOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  // Poll unread count every 10s
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const chats = await chatService.listChats();
        if (cancelled) return;
        const total = chats.reduce((s, c) => s + (c.unreadCount || 0), 0);
        setTotalUnread(total);
      } catch {}
    };
    check();
    const id = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return createPortal(
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-[220px] z-30 inline-flex items-center gap-2
                   px-4 py-2.5 rounded-full bg-brand text-white
                   text-[13px] font-medium shadow-lg hover:bg-brand-hover
                   transition-all"
        title="iFChat"
      >
        <MessageCircle className="w-4 h-4" />
        iFChat
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full
                           bg-red-500 text-white text-[11px] font-bold
                           grid place-items-center border-2 border-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </>,
    document.body
  );
}
