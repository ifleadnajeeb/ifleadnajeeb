import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, AlertCircle, Briefcase, Clock, CheckSquare } from 'lucide-react';
import { notificationsService, AppNotification } from '../services/notifications.service';
import { cn } from '@/shared/utils/cn';

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

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

  const getIcon = (type: string) => {
    if (type.includes('approved')) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (type.includes('correction')) return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (type.includes('assigned')) return <Briefcase className="w-5 h-5 text-blue-500" />;
    if (type.includes('review')) return <Clock className="w-5 h-5 text-amber-500" />;
    return <Bell className="w-5 h-5 text-brand" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-light transition-colors text-ink-muted focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-[380px] max-w-[calc(100vw-32px)] bg-white border border-ink-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-border bg-gray-50/50">
            <h3 className="font-semibold text-ink text-[15px]">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-[12px] text-brand hover:underline font-medium">
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-gray-400" />
                </div>
                <h4 className="text-[14px] font-medium text-ink">All caught up!</h4>
                <p className="text-[12.5px] text-ink-muted mt-1">You don't have any new notifications.</p>
              </div>
            ) : (
              (Array.isArray(notifications) ? notifications : (notifications?.data || [])).map(n => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    'flex gap-3 px-5 py-4 border-b border-ink-border last:border-0 cursor-pointer transition-colors group relative',
                    n.readAt ? 'bg-white hover:bg-gray-50' : 'bg-brand-light/20 hover:bg-brand-light/30'
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className={cn('text-[13.5px] leading-tight truncate', n.readAt ? 'font-medium text-ink' : 'font-bold text-ink')}>
                        {n.title}
                      </div>
                    </div>
                    <div className="text-[12.5px] text-ink-muted line-clamp-2 leading-snug mt-1">
                      {n.body}
                    </div>
                    <div className="text-[11px] text-ink-muted/70 font-medium mt-2">
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>

                  {/* Unread Dot */}
                  {!n.readAt && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brand shadow-sm" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications && notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-ink-border bg-gray-50 text-center">
              <span className="text-[12px] text-ink-muted">Showing recent notifications</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
