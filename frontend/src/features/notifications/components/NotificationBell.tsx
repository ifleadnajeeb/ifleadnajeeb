import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { notificationsService, AppNotification } from '../services/notifications.service';
import { cn } from '@/shared/utils/cn';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.list,
    refetchInterval: 15000, // Poll every 15 seconds
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications?.filter(n => !n.readAt).length || 0;

  const handleMarkAllRead = async () => {
    await notificationsService.markAllRead();
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const handleItemClick = async (n: AppNotification) => {
    if (!n.readAt) {
      await notificationsService.markRead(n.id);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-light transition-colors text-ink-muted"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[360px] max-w-[calc(100vw-32px)] bg-white border border-ink-border rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-border">
            <h3 className="font-semibold text-ink text-[14px]">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-[12px] text-brand hover:underline font-medium">
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-ink-muted">No notifications yet.</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    'px-4 py-3 border-b border-ink-border last:border-0 cursor-pointer transition-colors',
                    n.readAt ? 'bg-white hover:bg-gray-50' : 'bg-brand-light/30 hover:bg-brand-light/50'
                  )}
                >
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      {n.type.includes('approved') ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                       n.type.includes('correction') || n.type.includes('assigned') ? <AlertCircle className="w-4 h-4 text-amber-500" /> :
                       <Bell className="w-4 h-4 text-brand" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <div className={cn('text-[13px] truncate', n.readAt ? 'font-medium text-ink' : 'font-bold text-ink')}>{n.title}</div>
                        <div className="text-[10px] text-ink-muted whitespace-nowrap ml-2">
                          {new Date(n.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-[12px] text-ink-muted line-clamp-2">{n.body}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
