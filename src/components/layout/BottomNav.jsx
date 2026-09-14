import { NavLink } from 'react-router-dom';
import { useApplicationModal } from '../../context/ApplicationModalContext';

export default function BottomNav() {
  const { openAddModal } = useApplicationModal();

  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 w-full z-50 pb-safe bg-surface/85 dark:bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.05)] border-t border-surface-container-high/30 select-none"
    >
      <div className="h-16 px-space-xs flex items-center justify-around relative">
        {/* Home / Dashboard */}
        <NavLink
          id="mobile-nav-home"
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors ${
              isActive ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">dashboard</span>
          <span className="font-label-sm text-label-sm mt-0.5">Home</span>
        </NavLink>

        {/* Jobs / Applications */}
        <NavLink
          id="mobile-nav-jobs"
          to="/applications"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors ${
              isActive ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">work_outline</span>
          <span className="font-label-sm text-label-sm mt-0.5">Jobs</span>
        </NavLink>

        {/* Center Floating Plus Button */}
        <div className="relative flex items-center justify-center -top-4">
          <button
            id="mobile-center-add-btn"
            type="button"
            onClick={() => openAddModal()}
            aria-label="Add new application"
            className="w-[52px] h-[52px] rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_4px_14px_rgba(53,37,205,0.35)] active:scale-95 transition-all hover:bg-primary-container"
          >
            <span className="material-symbols-outlined text-[28px]">add</span>
          </button>
        </div>

        {/* Live CV */}
        <NavLink
          id="mobile-nav-cv"
          to="/cv"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors ${
              isActive ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">badge</span>
          <span className="font-label-sm text-label-sm mt-0.5">CV</span>
        </NavLink>

        {/* Settings */}
        <NavLink
          id="mobile-nav-settings"
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors ${
              isActive ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">settings</span>
          <span className="font-label-sm text-label-sm mt-0.5">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}
