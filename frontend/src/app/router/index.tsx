import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { DesktopLayout } from '@/app/layouts/desktop-layout';
import Login from '@/features/auth/pages/Login';
import UsersPage from '@/features/users/pages/UsersPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import TeamPerformancePage from '@/features/users/pages/TeamPerformancePage';
import UserPanelPage from '@/features/users/pages/UserPanelPage';
import IntegrationsPage from '@/features/integrations/pages/IntegrationsPage';
import VoicePage from '@/features/ai/voice/VoicePage';
import ReportsPage from '@/features/reports/pages/ReportsPage';
import LeadsPage from '@/features/leads/pages/LeadsPage';
import DashboardHome from '@/features/dashboard/pages/DashboardHome';
import AIAssistantPage from '@/features/ai/pages/AIAssistantPage';
import OperationsPage from '@/features/operations/pages/OperationsPage';
import MissionsPage from '@/features/missions/pages/MissionsPage';
import FollowupsPage from '@/features/followups/pages/FollowupsPage';
import AppointmentsPage from '@/features/appointments/pages/AppointmentsPage';
import CalendarPage from '@/features/calendar/pages/CalendarPage';
import CustomersPage from '@/features/customers/pages/CustomersPage';
import TasksPage from '@/features/tasks/pages/TasksPage';
import DocumentsPage from '@/features/documents/pages/DocumentsPage';
import RolesPage from '@/features/roles/pages/RolesPage';
import AuditPage from '@/features/audit/pages/AuditPage';
import AttendancePage from '@/features/audit/pages/AttendancePage';
import WhatsAppPage from '@/features/whatsapp/pages/WhatsAppPage';
import ConfigPage from '@/features/config/pages/ConfigPage';

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
          { path: '/documents',        element: <DocumentsPage /> },
          { path: '/reports',          element: <ReportsPage /> },
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
