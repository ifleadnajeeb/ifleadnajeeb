import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { DesktopLayout } from '@/app/layouts/desktop-layout';

// ✅ Standard Imports (No more lazy loading to prevent React Error #426)
import Login from '@/features/auth/pages/Login';
import UsersPage from '@/features/users/pages/UsersPage';
import TeamPerformancePage from '@/features/users/pages/TeamPerformancePage';
import UserPanelPage from '@/features/users/pages/UserPanelPage';
import IntegrationsPage from '@/features/integrations/pages/IntegrationsPage';
import VoicePage from '@/features/ai/voice/VoicePage';
import ReportsPage from '@/features/reports/pages/ReportsPage';
import LeadsPage from '@/features/leads/pages/LeadsPage';
import DashboardHome from '@/features/dashboard/pages/DashboardHome';
import AIAssistantPage from '@/features/ai/pages/AIAssistantPage';
import MissionsPage from '@/features/missions/pages/MissionsPage';
import FollowupsPage from '@/features/followups/pages/FollowupsPage';
import TasksPage from '@/features/tasks/pages/TasksPage';
import DailyReportsPage from '@/features/reports/pages/DailyReportsPage';
import AppointmentsPage from '@/features/appointments/pages/AppointmentsPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import CustomersPage from '@/features/customers/pages/CustomersPage';
import CalendarPage from '@/features/calendar/pages/CalendarPage';

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-[10px] bg-[#E3001B] flex items-center justify-center shrink-0">
            <span className="text-white font-black text-[30px] leading-none -mt-1 font-sans">if</span>
          </div>
          <span className="text-[42px] font-black text-black leading-none tracking-tighter">LEADS</span>
        </div>
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#E3001B] rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm mt-4 font-medium">Loading your workspace...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <div className="bg-white border border-ink-border rounded-xl p-10 text-center shadow-sm">
        <p className="text-sm text-ink-muted">Coming soon…</p>
      </div>
    </div>
  );
}

function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-bg">
      <div className="text-center">
        <div className="text-6xl font-bold text-danger mb-4">403</div>
        <p className="text-ink-muted">Access denied.</p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-bg">
      <div className="text-center">
        <div className="text-6xl font-bold text-ink-muted mb-4">404</div>
        <p className="text-ink-muted">Page not found.</p>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DesktopLayout />,
        children: [
          { path: '/dashboard', element: <DashboardHome /> },
          { path: '/missions', element: <MissionsPage /> },
          { path: '/leads', element: <LeadsPage /> },
          { path: '/ai', element: <AIAssistantPage /> },
          { path: '/voice', element: <VoicePage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '/team-performance', element: <TeamPerformancePage /> },
          { path: '/panel/:userId', element: <UserPanelPage /> },
          { path: '/integrations', element: <IntegrationsPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/daily-reports', element: <DailyReportsPage /> },
          { path: '/tasks', element: <TasksPage /> },
          { path: '/works', element: <TasksPage /> }, // Alias
          { path: '/customers', element: <CustomersPage /> },
          { path: '/appointments', element: <AppointmentsPage /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/followups', element: <FollowupsPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '/403', element: <Forbidden /> },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <NotFound /> },
]);
