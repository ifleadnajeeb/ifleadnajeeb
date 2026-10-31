import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserSquare,
  CalendarCheck,
  Clock,
  Calendar,
  Target,
  CheckSquare,
  FileText,
  BarChart3,
  Sparkles,
  Shield,
  Bell,
  Plug,
  Mic,
  UsersRound,
  Lock,
  MessageCircle,
  Briefcase,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/app/providers/auth-provider';
import { cn } from '@/shared/utils/cn';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Permission needed to use this module at all (read) */
  permission: string;
}

const NAV: NavItem[] = [
  { label: 'Dashboard',        href: '/dashboard',        icon: LayoutDashboard, permission: 'dashboard:read' },
  { label: 'Team Performance', href: '/team-performance', icon: UsersRound,      permission: 'users:read' },
  { label: 'Missions',      href: '/missions',     icon: Target,          permission: 'followups:read' },
  { label: 'Leads',         href: '/leads',        icon: Users,           permission: 'leads:read' },
  { label: 'Customers',     href: '/customers',    icon: UserSquare,      permission: 'customers:read' },
  { label: 'Follow-ups',    href: '/followups',    icon: Clock,           permission: 'followups:read' },
  { label: 'Appointments',  href: '/appointments', icon: CalendarCheck,   permission: 'appointments:read' },
  { label: 'Calendar',      href: '/calendar',     icon: Calendar,        permission: 'calendar:read' },
  { label: 'Tasks',         href: '/tasks',        icon: CheckSquare,     permission: 'tasks:read' },
  { label: 'Reports',       href: '/reports',      icon: BarChart3,       permission: 'reports:read' },
  { label: 'Daily Reports', href: '/daily-reports',icon: FileText,        permission: 'reports:read' },
  { label: 'Configuration', href: '/config',       icon: Settings,        permission: 'settings:read' },
  { label: 'AI Assistant',  href: '/ai',           icon: Sparkles,        permission: 'ai:read' },
  { label: 'Voice AI',      href: '/voice',        icon: Mic,             permission: 'ai:read' },
  { label: 'Integrations',  href: '/integrations', icon: Plug,            permission: 'integrations:read' },
  { label: 'WhatsApp',      href: '/whatsapp',     icon: MessageCircle,   permission: 'integrations:read' },
  { label: 'Users',            href: '/users',            icon: Users,        permission: 'users:read' },
  { label: 'Roles',         href: '/roles',        icon: Shield,          permission: 'roles:read' },
  { label: 'Audit Logs',    href: '/audit',        icon: Bell,            permission: 'audit:read' },
  { label: 'Attendance',    href: '/attendance',   icon: Bell,            permission: 'audit:read' },
];

export function DesktopSidebar() {
  const { can, user } = useAuth();

  const handleReset = () => {
    if (confirm('Reset demo data? This restores the sample leads.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <aside
      className="bg-white border-r border-ink-border flex flex-col shrink-0 overflow-hidden" style={{ width: '210px', height: '100vh' }}
    >
      {/* Brand */}
      <div className="px-3 pt-4 pb-4 border-b border-ink-border mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center shrink-0">
            <span className="text-white font-black text-[15px] leading-none -mt-0.5">
              if
            </span>
          </div>
          <span className="text-[19px] font-black text-ink leading-none tracking-tight">
            LEADS
          </span>
        </div>
        <p className="mt-2.5 text-[10.5px] font-semibold tracking-[0.14em] uppercase text-ink-muted">
          Follow-up CRM
        </p>
      </div>

      {/* Nav — shows ALL items to every role */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-1">
        {(() => {
          const isOpsRole = ['OP_MANAGER', 'WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR', 'GRAPHIC_DESIGNER'].includes(user?.role || '');
          const isDevRole = ['WEB_DEVELOPER', 'SOFTWARE_DEVELOPER', 'DIGITAL_MARKETER', 'CONTENT_CREATOR', 'VIDEO_EDITOR', 'GRAPHIC_DESIGNER'].includes(user?.role || '');

          return NAV.filter((item) => {
            if (isDevRole) {
              const allowed = ['Dashboard', 'Tasks', 'Calendar'];
              return allowed.includes(item.label);
            }
            if (user?.role === 'OP_MANAGER') {
              const allowed = ['Dashboard', 'Tasks', 'Customers', 'Reports', 'Daily Reports', 'Team Performance', 'Calendar', 'Appointments'];
              return allowed.includes(item.label);
            }
            return true;
          }).map((item) => {
    if (item.label === 'Attendance' && user?.role === 'BDE') return null;

            const allowed = can(item.permission);
            const displayLabel = (isOpsRole && item.label === 'Tasks') ? 'Works' : item.label;
            const DisplayIcon = (isOpsRole && item.label === 'Tasks') ? Briefcase : item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[14px] text-ink',
                    'hover:bg-brand-light transition-colors',
                    isActive && 'bg-brand text-white hover:bg-brand-hover'
                  )
                }
                title={!allowed ? 'View only — actions are restricted by your role' : undefined}
              >
                <DisplayIcon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{displayLabel}</span>
                {!allowed && (
                  <Lock className="w-3 h-3 shrink-0 opacity-40" aria-label="View only" />
                )}
              </NavLink>
            );
          });
        })()}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-ink-border shrink-0">
        
      </div>
    </aside>
  );
}