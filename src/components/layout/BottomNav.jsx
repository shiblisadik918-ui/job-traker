import { NavLink } from 'react-router-dom';

export default function BottomNav() {
  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 w-full z-50 pb-safe bg-surface/90 dark:bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.04)] border-t border-surface-container-high/40 select-none"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {/* Dashboard */}
        <NavLink
          id="mobile-nav-dashboard"
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] h-12 gap-0.5 transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">dashboard</span>
          <span className="font-label-sm text-[11px]">Dashboard</span>
        </NavLink>

        {/* Applications */}
        <NavLink
          id="mobile-nav-applications"
          to="/applications"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] h-12 gap-0.5 transition-colors relative ${
              isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <div className="relative">
            <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            <span className="absolute -top-1 -right-2 bg-error text-on-error font-label-sm text-[10px] h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center leading-none font-bold">
              2
            </span>
          </div>
          <span className="font-label-sm text-[11px]">Applications</span>
        </NavLink>

        {/* Live CV */}
        <NavLink
          id="mobile-nav-cv"
          to="/cv"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] h-12 gap-0.5 transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">badge</span>
          <span className="font-label-sm text-[11px]">Live CV</span>
        </NavLink>

        {/* Reminders */}
        <NavLink
          id="mobile-nav-reminders"
          to="/reminders"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] h-12 gap-0.5 transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">event_upcoming</span>
          <span className="font-label-sm text-[11px]">Reminders</span>
        </NavLink>

        {/* Settings */}
        <NavLink
          id="mobile-nav-settings"
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] h-12 gap-0.5 transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
          <span className="font-label-sm text-[11px]">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}
