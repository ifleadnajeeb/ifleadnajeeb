import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { DesktopLayout } from '@/app/layouts/desktop-layout';

// ✅ LAZY LOADING: Only download the code for the page the user is actually looking at
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
const ConfigPage = lazy(() => import('@/features/config/pages/ConfigPage'));
const VoicePage = lazy(() => import('@/features/ai/voice/VoicePage'));
const IntegrationsPage = lazy(() => import('@/features/integrations/pages/IntegrationsPage'));
const FollowupsPage = lazy(() => import('@/features/followups/pages/FollowupsPage'));
const MissionsPage = lazy(() => import('@/features/missions/pages/MissionsPage'));
const AttendancePage = lazy(() => import('@/features/attendance/pages/AttendancePage'));
const AuditLogsPage = lazy(() => import('@/features/audit/pages/AuditLogsPage'));
const CalendarPage = lazy(() => import('@/features/calendar/pages/CalendarPage'));

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-[#E3001B] rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500 text-sm font-medium">Loading...</p>
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
  return <div className="p-10 text-center">{title} Coming Soon</div>;
}

export const router = createBrowserRouter([
  { 
    path: '/login', 
    element: <Suspense fallback={<LoadingScreen />}><Login /></Suspense> 
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DesktopLayout />,
        children: [
          { path: '/dashboard', element: <Suspense fallback={<LoadingScreen />}><DashboardHome /></Suspense> },
          { path: '/leads', element: <Suspense fallback={<LoadingScreen />}><LeadsPage /></Suspense> },
          { path: '/tasks', element: <Suspense fallback={<LoadingScreen />}><TasksPage /></Suspense> },
          { path: '/works', element: <Suspense fallback={<LoadingScreen />}><TasksPage /></Suspense> },
          { path: '/ai', element: <Suspense fallback={<LoadingScreen />}><AIAssistantPage /></Suspense> },
          { path: '/reports', element: <Suspense fallback={<LoadingScreen />}><ReportsPage /></Suspense> },
          { path: '/reports/user/:userId', element: <Suspense fallback={<LoadingScreen />}><ReportsPage /></Suspense> },
          { path: '/daily-reports', element: <Suspense fallback={<LoadingScreen />}><DailyReportsPage /></Suspense> },
          { path: '/users', element: <Suspense fallback={<LoadingScreen />}><UsersPage /></Suspense> },
          { path: '/team-performance', element: <Suspense fallback={<LoadingScreen />}><TeamPerformancePage /></Suspense> },
          { path: '/panel/:userId', element: <Suspense fallback={<LoadingScreen />}><UserPanelPage /></Suspense> },
          { path: '/calendar', element: <Suspense fallback={<LoadingScreen />}><CalendarPage /></Suspense> },
                    { path: '/audit', element: <Suspense fallback={<LoadingScreen />}><AuditLogsPage /></Suspense> },
          { path: '/config', element: <Suspense fallback={<LoadingScreen />}><ConfigPage /></Suspense> },
          { path: '/integrations', element: <Suspense fallback={<LoadingScreen />}><IntegrationsPage /></Suspense> },
          { path: '/missions', element: <Suspense fallback={<LoadingScreen />}><MissionsPage /></Suspense> },
          { path: '/roles', element: <Placeholder title="Roles" /> },
          { path: '/voice', element: <Suspense fallback={<LoadingScreen />}><VoicePage /></Suspense> },
          { path: '/whatsapp', element: <Placeholder title="WhatsApp" /> },
{ path: '/settings', element: <Suspense fallback={<LoadingScreen />}><ConfigPage /></Suspense> },
          { path: '/customers', element: <Suspense fallback={<LoadingScreen />}><CustomersPage /></Suspense> },
          { path: '/appointments', element: <Suspense fallback={<LoadingScreen />}><AppointmentsPage /></Suspense> },
          { path: '/followups', element: <Suspense fallback={<LoadingScreen />}><FollowupsPage /></Suspense> },
          { path: '/attendance', element: <Suspense fallback={<LoadingScreen />}><AttendancePage /></Suspense> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
