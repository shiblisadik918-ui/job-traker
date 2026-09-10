import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import JobTrackLogo from '../common/JobTrackLogo';

export default function Sidebar() {
  const { user, userProfile, isVerified, profileCompleteness, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
    { to: '/applications', label: 'Applications', icon: 'view_kanban' },
    {
      to: '/cv',
      label: 'Live CV',
      icon: 'badge',
      badge: isVerified ? 'Verified' : `${profileCompleteness || 0}%`,
      isVerified,
    },
    { to: '/reminders', label: 'Reminders', icon: 'alarm' },
    { to: '/statistics', label: 'Statistics', icon: 'insights' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const handleLogout = async () => {
    const { success, error } = await logout();
    if (success) {
      showSuccess('Signed out successfully.');
      navigate('/login');
    } else {
      showError(error || 'Failed to sign out. Please try again.');
    }
  };

  const displayName =
    userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Alex Chen';
  const email = userProfile?.email || user?.email || 'alex.chen@student.edu';
  const photoURL =
    userProfile?.photoURL ||
    user?.photoURL ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  return (
    <aside
      id="app-sidebar"
      className="fixed left-0 top-0 h-screen w-64 bg-surface-container-lowest z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-surface-container-high/30 hidden md:flex select-none"
    >
      <div className="flex flex-col">
        {/* Brand Bar */}
        <div className="h-16 px-space-md flex items-center justify-between border-b border-surface-container-high/20">
          <div className="flex items-center gap-space-xs">
            <JobTrackLogo className="h-8 w-auto object-contain" />
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
              JobTrack
            </span>
            <span className="px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium">
              Personal
            </span>
          </div>
        </div>

        {/* Workspace Navigation */}
        <div className="px-space-md pt-space-md">
          <div className="px-space-xs pb-space-xs font-label-sm text-label-sm text-outline uppercase tracking-wider">
            Workspace
          </div>
          <nav className="flex flex-col gap-space-2xs">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                id={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-space-xs rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary-container text-on-primary font-medium shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`
                }
              >
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="font-body-md text-body-md">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.isVerified
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="p-space-md bg-surface-container-lowest border-t border-surface-container-high/30">
        <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <img
              src={photoURL}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-surface-container-high"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-body-sm font-semibold text-on-surface truncate">
                  {displayName}
                </span>
                {isVerified && (
                  <span
                    title="Account Verified"
                    className="material-symbols-outlined text-blue-600 text-[16px] shrink-0"
                  >
                    verified
                  </span>
                )}
              </div>
              <span className="font-body-sm text-label-sm text-outline truncate">
                {email}
              </span>
            </div>
          </div>
          <div className="pt-space-2xs flex items-center justify-between">
            {isVerified ? (
              <span className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-label-sm text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Verified Account
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                {profileCompleteness > 0 ? `${profileCompleteness}% Done` : 'Actively Seeking'}
              </span>
            )}
            <button
              id="sidebar-logout-btn"
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
