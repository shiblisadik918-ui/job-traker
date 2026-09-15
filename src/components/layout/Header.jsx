import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useApplicationModal } from '../../context/ApplicationModalContext';
import { useTheme } from '../../context/ThemeContext';
import JobTrackLogo from '../common/JobTrackLogo';
import GlobalSearchBar from '../search/GlobalSearchBar';
import { PWAInstallButton } from '../common/PWAInstallButton';

export default function Header() {
  const { user, userProfile, isVerified, logout } = useAuth();
  const { openAddModal } = useApplicationModal();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const displayName =
    userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Alex Chen';
  const email = userProfile?.email || user?.email || 'alex.chen@student.edu';
  const photoURL =
    userProfile?.photoURL ||
    user?.photoURL ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  return (
    <>
      <header
        id="app-header"
        className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-surface/80 dark:bg-surface-container-lowest/80 backdrop-blur-xl z-40 flex items-center justify-between px-4 sm:px-space-md md:px-space-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container-high/30"
      >
        {/* Mobile Brand indicator */}
        <div className="flex items-center gap-2 md:hidden mr-2">
          <JobTrackLogo className="w-8 h-8 shrink-0 object-contain" />
          <div className="flex flex-col">
            <span className="font-headline-sm text-[15px] text-on-surface font-bold tracking-tight leading-none">
              JobTrack
            </span>
            <span className="font-label-sm text-[10px] text-primary tracking-wider uppercase leading-none mt-0.5 font-bold">
              Tracker
            </span>
          </div>
        </div>

        {/* Global Search Bar with Filters */}
        <div className="flex-1 max-w-xl">
          <GlobalSearchBar />
        </div>

        {/* Action Header Elements */}
        <div className="flex items-center gap-space-xs sm:gap-space-sm md:gap-space-md">
          {/* Dual Pipeline Pill (Hidden on mobile) */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-fixed">
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
            <span className="font-label-sm text-label-sm font-medium">
              Dual Pipeline • BD Govt &amp; Private
            </span>
          </div>

          {/* Reminders / Notifications */}
          <button
            id="header-notifications-btn"
            type="button"
            onClick={() => navigate('/reminders')}
            title="Notifications & Alerts"
            className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
            </span>
          </button>

          {/* Install PWA Prompt */}
          <div className="hidden sm:block">
            <PWAInstallButton />
          </div>

          {/* Add Application Primary Action */}
          <button
            id="header-add-application-btn"
            type="button"
            onClick={() => openAddModal()}
            className="hidden sm:flex items-center gap-space-xs px-3 sm:px-space-md py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Application</span>
          </button>

          {/* User Profile Avatar with dropdown */}
          <div className="relative pl-space-2xs">
            <button
              id="header-profile-avatar-btn"
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <img
                src={photoURL}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-container/30 shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div className="hidden xl:flex flex-col text-left">
                <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight truncate max-w-[120px]">
                  {displayName}
                </span>
                <span className="font-label-sm text-[11px] text-secondary leading-tight">
                  Senior Aspirant
                </span>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant hidden xl:inline">
                expand_more
              </span>
            </button>

            {showProfileMenu && (
              <div
                id="header-profile-dropdown"
                className="absolute right-0 mt-2 w-60 rounded-2xl bg-surface-container-lowest shadow-xl border border-surface-container-high/60 z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setShowProfileMenu(false)}
              >
                <div className="px-3 py-2 border-b border-surface-container mb-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-on-surface truncate">{displayName}</p>
                    {isVerified && (
                      <span
                        title="Verified Account"
                        className="material-symbols-outlined text-blue-600 text-[16px] shrink-0"
                      >
                        verified
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-outline truncate">{email}</p>
                  {isVerified ? (
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      Verified Account
                    </div>
                  ) : (
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium">
                      Unverified • Complete CV
                    </div>
                  )}
                </div>

                <Link
                  to="/cv"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-primary font-medium hover:bg-primary-container/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                  <span>Live CV Builder & Print</span>
                </Link>

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

                <div className="sm:hidden mt-1 pt-1 border-t border-surface-container">
                  <div className="px-3 py-2">
                    <PWAInstallButton />
                  </div>
                </div>

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
