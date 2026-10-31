import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';
import { DesktopHeader } from '@/components/navigation/DesktopHeader';
import { AIAssistant } from '@/features/ai/components/AIAssistant';
import { TaskFloatingButton } from '@/features/tasks/components/TaskFloatingButton';
import { ChatFloatingButton } from '@/features/chat/components/ChatFloatingButton';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { MobileSidebarDrawer } from '@/components/navigation/MobileSidebarDrawer';

export function DesktopLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-ink-bg">
      {/* Desktop sidebar — hidden on mobile (drawer renders its own copy) */}
      <div className="hidden lg:block shrink-0">
        <DesktopSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <DesktopHeader onOpenMobileMenu={() => setDrawerOpen(true)} />

        <main className="flex-1 overflow-auto">
          <div className="max-w-[1440px] mx-auto p-4 lg:p-6 pb-20 lg:pb-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating AI Assistant — bottom-right of every page */}
      <AIAssistant />
      <ChatFloatingButton />
      <TaskReminderWatcher />

      {/* Mobile-only: bottom nav + slide-in drawer */}
      <MobileBottomNav onOpenMenu={() => setDrawerOpen(true)} />
      <MobileSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
