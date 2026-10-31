import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { DesktopLayout } from '@/app/layouts/desktop-layout';

// ✅ Lazy Loaded Pages
const Login = lazy(() => import('@/features/auth/pages/Login'));
const DashboardHome = lazy(() => import('@/features/dashboard/pages/DashboardHome'));
const LeadsPage = lazy(() => import('@/features/leads/pages/LeadsPage'));
const TasksPage = lazy(() => import('@/features/tasks/pages/TasksPage'));
const AIAssistantPage = lazy(() => import('@/features/ai/pages/AIAssistantPage'));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const DailyReportsPage = lazy(() => import('@/features/reports/pages/DailyReportsPage'));
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'));
const TeamPerformancePage = lazy(() => import('@/features/users/pages/TeamPerformancePage'));
const UserPanelPage = lazy(() => import('@/features/users/pages/UserPanelPage'));
const AttendancePage = lazy(() => import('@/features/attendance/pages/AttendancePage'));
const ConfigPage = lazy(() => import('@/features/config/pages/ConfigPage'));
const AuditLogsPage = lazy(() => import('@/features/audit/pages/AuditLogsPage'));
const MissionsPage = lazy(() => import('@/features/missions/pages/MissionsPage'));
const FollowupsPage = lazy(() => import('@/features/followups/pages/FollowupsPage'));
const IntegrationsPage = lazy(() => import('@/features/integrations/pages/IntegrationsPage'));
const VoicePage = lazy(() => import('@/features/ai/voice/VoicePage'));
const CustomersPage = lazy(() => import('@/features/customers/pages/CustomersPage'));
const AppointmentsPage = lazy(() => import('@/features/appointments/pages/AppointmentsPage'));
const CalendarPage = lazy(() => import('@/features/calendar/pages/CalendarPage'));

function LoadingScreen() {
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

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
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

const SuspenseWrap = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
);

export const router = createBrowserRouter([
  { path: '/login', element: <SuspenseWrap><Login /></SuspenseWrap> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DesktopLayout />,
        children: [
          { path: '/dashboard', element: <SuspenseWrap><DashboardHome /></SuspenseWrap> },
          { path: '/leads', element: <SuspenseWrap><LeadsPage /></SuspenseWrap> },
          { path: '/tasks', element: <SuspenseWrap><TasksPage /></SuspenseWrap> },
          { path: '/works', element: <SuspenseWrap><TasksPage /></SuspenseWrap> },
          { path: '/ai', element: <SuspenseWrap><AIAssistantPage /></SuspenseWrap> },
          { path: '/reports', element: <SuspenseWrap><ReportsPage /></SuspenseWrap> },
          { path: '/reports/user/:userId', element: <SuspenseWrap><ReportsPage /></SuspenseWrap> },
          { path: '/daily-reports', element: <SuspenseWrap><DailyReportsPage /></SuspenseWrap> },
          { path: '/users', element: <SuspenseWrap><UsersPage /></SuspenseWrap> },
          { path: '/team-performance', element: <SuspenseWrap><TeamPerformancePage /></SuspenseWrap> },
          { path: '/panel/:userId', element: <SuspenseWrap><UserPanelPage /></SuspenseWrap> },
          { path: '/attendance', element: <SuspenseWrap><AttendancePage /></SuspenseWrap> },
          { path: '/config', element: <SuspenseWrap><ConfigPage /></SuspenseWrap> },
          { path: '/audit', element: <SuspenseWrap><AuditLogsPage /></SuspenseWrap> },
          { path: '/missions', element: <SuspenseWrap><MissionsPage /></SuspenseWrap> },
          { path: '/followups', element: <SuspenseWrap><FollowupsPage /></SuspenseWrap> },
          { path: '/integrations', element: <SuspenseWrap><IntegrationsPage /></SuspenseWrap> },
          { path: '/voice', element: <SuspenseWrap><VoicePage /></SuspenseWrap> },
          { path: '/customers', element: <SuspenseWrap><CustomersPage /></SuspenseWrap> },
          { path: '/appointments', element: <SuspenseWrap><AppointmentsPage /></SuspenseWrap> },
          { path: '/calendar', element: <SuspenseWrap><CalendarPage /></SuspenseWrap> },
          { path: '/roles', element: <Placeholder title="Roles" /> },
          { path: '/whatsapp', element: <Placeholder title="WhatsApp" /> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
