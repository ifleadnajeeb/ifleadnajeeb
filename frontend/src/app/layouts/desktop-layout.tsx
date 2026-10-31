import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';
import { DesktopHeader } from '@/components/navigation/DesktopHeader';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { MobileSidebarDrawer } from '@/components/navigation/MobileSidebarDrawer';

// Floating Buttons
import { AIAssistant } from '@/features/ai/components/AIAssistant';
import { TaskFloatingButton } from '@/features/tasks/components/TaskFloatingButton';
import { ChatFloatingButton } from '@/features/chat/components/ChatFloatingButton';

export function DesktopLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-ink-bg relative">
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">
        <DesktopSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DesktopHeader />
        <main className="flex-1 overflow-y-auto relative">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-5 pb-24">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <MobileBottomNav />
      
      {/* ✅ Floating Buttons (Globally forced to top layer) */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-auto">
        <ChatFloatingButton />
        <TaskFloatingButton />
        <AIAssistant />
      </div>
    </div>
  );
}
