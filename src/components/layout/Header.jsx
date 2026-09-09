import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useApplicationModal } from '../../context/ApplicationModalContext';
import { useTheme } from '../../context/ThemeContext';
import JobTrackLogo from '../common/JobTrackLogo';
import GlobalSearchBar from '../search/GlobalSearchBar';

export default function Header() {
  const { user, logout } = useAuth();
  const { openAddModal } = useApplicationModal();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Alex Chen';
  const email = user?.email || 'alex.chen@student.edu';
  const photoURL = user?.photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXaKP8v0P4JJuVOXs6U8SkYcrQ5rsr_Iaxf9xDpFkcmLU5CRhbRdwDu8vg4IJSCdRlCoKkEmJ5sn6V3iUrOoOgeWow6AhBBwFGWA8gfJvVrc0RZ1RQTQmOgQ4I7dYpyzwGMfwwBv5PlRab-DYUVJSZUeuis48OQR6nDOWkKKMz6oshUzfyu6-eqoz9dtd4wfXQk1f-6Nih_zFSdJJ3gNjzX7_NeC79KVQ8V69ZiKQh02_BuqoNwDhY';

  return (
    <>
      <header
        id="app-header"
        className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-surface/80 dark:bg-surface-container-lowest/80 backdrop-blur-xl z-40 flex items-center justify-between px-4 sm:px-space-md md:px-space-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container-high/30"
      >
        {/* Mobile Logo Brand indicator */}
        <div className="flex items-center gap-2 md:hidden mr-2">
          <JobTrackLogo className="w-7 h-7 shrink-0" />
          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">JobTrack</span>
        </div>

        {/* Global Search Bar with Filters */}
        <GlobalSearchBar />

        {/* Action Header Elements */}
        <div className="flex items-center gap-space-xs sm:gap-space-sm md:gap-space-md">
          {/* Reminders / Notifications */}
          <button
            id="header-notifications-btn"
            type="button"
            onClick={() => navigate('/reminders')}
            title="Follow-ups and Reminders"
            className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface-container-lowest"></span>
          </button>

          {/* Help & Guide */}
          <button
            id="header-help-btn"
            type="button"
            onClick={() => setShowHelpModal(true)}
            title="JobTrack Guide & Shortcuts"
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors hidden sm:block"
          >
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
          </button>

          {/* Add Application Primary Action */}
          <button
            id="header-add-application-btn"
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-space-xs px-3 sm:px-space-md py-2 sm:py-space-xs rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors shadow-sm active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">Add Application</span>
          </button>

          {/* User Profile Avatar with dropdown */}
          <div className="relative pl-space-2xs">
            <button
              id="header-profile-avatar-btn"
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center focus:outline-none"
            >
              <img
                src={photoURL}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-surface-container-highest shadow-xs"
                referrerPolicy="no-referrer"
              />
            </button>

            {showProfileMenu && (
              <div
                id="header-profile-dropdown"
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-surface-container-lowest shadow-xl border border-surface-container-high/60 z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setShowProfileMenu(false)}
              >
                <div className="px-3 py-2 border-b border-surface-container mb-1">
                  <p className="font-semibold text-on-surface truncate">{displayName}</p>
                  <p className="text-[11px] text-outline truncate">{email}</p>
                </div>

                <Link
                  to="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-outline">settings</span>
                  <span>Settings & Preferences</span>
                </Link>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-outline">
                      {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                    </span>
                    <span>Appearance</span>
                  </span>
                  <span className="font-mono-metric text-[10px] uppercase text-outline font-semibold">
                    {theme}
                  </span>
                </button>

                <div className="border-t border-surface-container my-1" />

                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-error hover:bg-error-container/30 transition-colors font-medium"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-xl shadow-2xl border border-surface-container space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">auto_stories</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">JobTrack Guide</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              JobTrack keeps your job search organized and calm through a simple 5-step core flow:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-on-surface">ADD</p>
                  <p className="text-on-surface-variant text-[11px]">Log opportunities with company, salary, job link, and initial stage.</p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-semibold text-on-surface">TRACK</p>
                  <p className="text-on-surface-variant text-[11px]">View active pipeline counts, upcoming interviews, and offer rates.</p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-semibold text-on-surface">UPDATE</p>
                  <p className="text-on-surface-variant text-[11px]">Advance stages (Saved → Applied → Shortlisted → Interview → Offered) with notes.</p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">4</span>
                <div>
                  <p className="font-semibold text-on-surface">SEARCH</p>
                  <p className="text-on-surface-variant text-[11px]">Instant filter by stage, modality (Remote/Hybrid), job type, or keywords.</p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">5</span>
                <div>
                  <p className="font-semibold text-on-surface">REMEMBER</p>
                  <p className="text-on-surface-variant text-[11px]">Schedule follow-up alerts so you never lose recruiter momentum.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all shadow-xs"
            >
              Got it, let&apos;s get tracking!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
