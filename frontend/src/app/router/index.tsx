import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { DesktopLayout } from '@/app/layouts/desktop-layout';
const Login = lazy(() => import('@/features/auth/pages/Login'));
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const TeamPerformancePage = lazy(() => import('@/features/users/pages/TeamPerformancePage'));
const UserPanelPage = lazy(() => import('@/features/users/pages/UserPanelPage'));
const IntegrationsPage = lazy(() => import('@/features/integrations/pages/IntegrationsPage'));
const VoicePage = lazy(() => import('@/features/ai/voice/VoicePage'));
const DailyReportsPage = lazy(() => import('@/features/reports/pages/DailyReportsPage'));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const LeadsPage = lazy(() => import('@/features/leads/pages/LeadsPage'));
const DashboardHome = lazy(() => import('@/features/dashboard/pages/DashboardHome'));
const AIAssistantPage = lazy(() => import('@/features/ai/pages/AIAssistantPage'));
const MissionsPage = lazy(() => import('@/features/missions/pages/MissionsPage'));
const FollowupsPage = lazy(() => import('@/features/followups/pages/FollowupsPage'));
const AppointmentsPage = lazy(() => import('@/features/appointments/pages/AppointmentsPage'));
const CalendarPage = lazy(() => import('@/features/calendar/pages/CalendarPage'));
const CustomersPage = lazy(() => import('@/features/customers/pages/CustomersPage'));
const TasksPage = lazy(() => import('@/features/tasks/pages/TasksPage'));
const DocumentsPage = lazy(() => import('@/features/documents/pages/DocumentsPage'));
const RolesPage = lazy(() => import('@/features/roles/pages/RolesPage'));
const AuditPage = lazy(() => import('@/features/audit/pages/AuditPage'));
const AttendancePage = lazy(() => import('@/features/audit/pages/AttendancePage'));
const WhatsAppPage = lazy(() => import('@/features/whatsapp/pages/WhatsAppPage'));
const ConfigPage = lazy(() => import('@/features/config/pages/ConfigPage'));


function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-10 text-center text-ink-muted">Loading...</div>}>{children}</Suspense>;
}

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-bg">
        <div className="text-sm text-ink-muted">Loading…</div>
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
          { path: '/dashboard',        element: <DashboardHome /> },
          { path: '/missions',         element: <MissionsPage /> },
          { path: '/leads',            element: <LeadsPage /> },
          { path: '/ai',               element: <AIAssistantPage /> },
          { path: '/users',            element: <UsersPage /> },
          { path: '/team-performance', element: <TeamPerformancePage /> },
          { path: '/panel/:userId',    element: <UserPanelPage /> },
          { path: '/integrations',     element: <IntegrationsPage /> },
          { path: '/whatsapp',          element: <WhatsAppPage /> },
          { path: '/voice',            element: <VoicePage /> },
          { path: '/customers',        element: <CustomersPage /> },
          { path: '/followups',        element: <FollowupsPage /> },
          { path: '/appointments',     element: <AppointmentsPage /> },
          { path: '/calendar',         element: <CalendarPage /> },
          { path: '/tasks',            element: <TasksPage /> },
          { path: '/works',            element: <TasksPage /> },
          { path: '/documents',        element: <DocumentsPage /> },
          { path: '/reports',          element: <ReportsPage /> },
          { path: '/daily-reports',    element: <DailyReportsPage /> },
          { path: '/reports/user/:userId', element: <ReportsPage /> },
          { path: '/roles',            element: <RolesPage /> },
          { path: '/audit',            element: <AuditPage /> },
          { path: '/attendance',      element: <AttendancePage /> },
          { path: '/config',           element: <ConfigPage /> },
        ],
      },
    ],
  },
  { path: '/403', element: <Forbidden /> },
  { path: '/',    element: <Navigate to="/dashboard" replace /> },
  { path: '*',    element: <NotFound /> },
]);
