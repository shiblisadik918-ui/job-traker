import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import JobTrackLogo from '../common/JobTrackLogo';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
    { to: '/applications', label: 'Applications', icon: 'view_kanban' },
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

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Alex Chen';
  const email = user?.email || 'alex.chen@student.edu';
  const photoURL = user?.photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXaKP8v0P4JJuVOXs6U8SkYcrQ5rsr_Iaxf9xDpFkcmLU5CRhbRdwDu8vg4IJSCdRlCoKkEmJ5sn6V3iUrOoOgeWow6AhBBwFGWA8gfJvVrc0RZ1RQTQmOgQ4I7dYpyzwGMfwwBv5PlRab-DYUVJSZUeuis48OQR6nDOWkKKMz6oshUzfyu6-eqoz9dtd4wfXQk1f-6Nih_zFSdJJ3gNjzX7_NeC79KVQ8V69ZiKQh02_BuqoNwDhY';

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
                id={`sidebar-nav-${item.label.toLowerCase()}`}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-space-xs px-space-sm py-space-xs rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary-container text-on-primary font-medium shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-body-md text-body-md">{item.label}</span>
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
              <span className="font-headline-sm text-body-sm font-semibold text-on-surface truncate">
                {displayName}
              </span>
              <span className="font-body-sm text-label-sm text-outline truncate">
                {email}
              </span>
            </div>
          </div>
          <div className="pt-space-2xs flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              Actively Seeking
            </span>
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
