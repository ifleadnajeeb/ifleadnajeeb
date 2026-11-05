import { Bell, LogOut, Search, Menu } from 'lucide-react';
import { useAuth } from '@/app/providers/auth-provider';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { TaskFloatingButton } from '@/features/tasks/components/TaskFloatingButton';

export function DesktopHeader({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 bg-white flex items-center justify-between px-3 lg:px-6 gap-2 lg:gap-4 shrink-0 border-b border-ink-border relative">
      {/* Signature red accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-primary/25" />

      {/* Mobile hamburger */}
      <button
        onClick={onOpenMobileMenu}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-md text-ink-muted hover:bg-brand-light shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search — hidden on mobile */}
      <div className="hidden lg:block flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="search"
            placeholder="Search leads, customers…"
            className="w-full h-9 pl-9 pr-3 bg-ink-bg border border-ink-border rounded-md text-sm
                       placeholder:text-ink-muted
                       focus:outline-none focus:bg-white focus:border-brand-primary
                       transition-colors"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Task quick-add */}
        <TaskFloatingButton inline />

        {/* Notification bell — dynamic */}
        <NotificationBell />

        <div className="w-px h-6 bg-ink-border mx-1" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right leading-tight">
            <div className="text-sm font-semibold text-ink">
              {user?.name}
            </div>
            <div className="text-[10.5px] text-ink-muted uppercase tracking-[0.12em]">
              {typeof user?.role === 'object' ? user?.role?.name : user?.role}
            </div>
          </div>
          <div
            className="w-9 h-9 rounded-full bg-brand-light text-brand-primary
                       font-bold flex items-center justify-center text-sm
                       ring-2 ring-brand-light hover:ring-brand-primary/40
                       transition-all cursor-pointer"
          >
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-9 h-9 flex items-center justify-center rounded-md
                     text-ink-muted hover:bg-brand-light hover:text-brand-primary
                     transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
