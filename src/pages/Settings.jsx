import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../context/ThemeContext';
import { getApplications } from '../services/applicationsService';
import { getUserProfileData, updateUserProfileData } from '../services/authService';
import CsvImportModal from '../components/applications/CsvImportModal';

export default function Settings() {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Profile Editor State
  const [profileLoading, setProfileLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    targetRole: '',
    targetSalary: '',
    workMode: 'Remote',
    preferredLocation: '',
    phone: '',
    portfolioUrl: '',
    linkedinUrl: '',
    jobSearchStatus: 'Actively Looking',
    bio: '',
  });

  // Export / Import State
  const [isExporting, setIsExporting] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  // Fetch current user's profile on mount
  useEffect(() => {
    async function loadProfile() {
      if (!user?.uid) return;
      setProfileLoading(true);
      const { profile, error } = await getUserProfileData(user.uid);
      if (profile) {
        setFormData({
          displayName: profile.displayName || user.displayName || '',
          targetRole: profile.targetRole || '',
          targetSalary: profile.targetSalary || '',
          workMode: profile.workMode || 'Remote',
          preferredLocation: profile.preferredLocation || '',
          phone: profile.phone || '',
          portfolioUrl: profile.portfolioUrl || '',
          linkedinUrl: profile.linkedinUrl || '',
          jobSearchStatus: profile.jobSearchStatus || 'Actively Looking',
          bio: profile.bio || '',
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          displayName: user.displayName || user.email?.split('@')[0] || '',
        }));
      }
      setProfileLoading(false);
    }

    loadProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSavingProfile(true);
    const { success, error } = await updateUserProfileData(user.uid, formData);
    setIsSavingProfile(false);

    if (success) {
      showSuccess('Profile settings updated successfully.');
    } else {
      showError(error || 'Failed to update profile settings.');
    }
  };

  const handleLogout = async () => {
    const { success, error } = await logout();
    if (success) {
      showSuccess('Signed out successfully.');
      navigate('/login');
    } else {
      showError(error || 'Failed to sign out.');
    }
  };

  // CSV Export utility
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const { data: apps, error } = await getApplications();
      if (error) {
        showError(error);
        setIsExporting(false);
        return;
      }

      if (!apps || apps.length === 0) {
        showError('No applications found to export.');
        setIsExporting(false);
        return;
      }

      const headers = [
        'ID',
        'Company Name',
        'Job Title',
        'Status',
        'Priority',
        'Application Date',
        'Location',
        'Job Type',
        'Salary',
        'Job URL',
        'Application Source',
        'Deadline',
        'Notes',
      ];

      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = apps.map((app) => [
        escapeCSV(app.id),
        escapeCSV(app.companyName),
        escapeCSV(app.jobTitle),
        escapeCSV(app.status),
        escapeCSV(app.priority),
        escapeCSV(app.applicationDate),
        escapeCSV(app.location),
        escapeCSV(app.jobType),
        escapeCSV(app.salary),
        escapeCSV(app.jobUrl),
        escapeCSV(app.applicationSource),
        escapeCSV(app.deadline),
        escapeCSV(app.notes),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `jobtrack-applications-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess(`Exported ${apps.length} applications to CSV.`);
    } catch (err) {
      showError('Failed to export CSV: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const displayName = formData.displayName || user?.displayName || user?.email?.split('@')[0] || 'Candidate';
  const email = user?.email || 'user@example.com';
  const uid = user?.uid || 'N/A';
  const photoURL =
    user?.photoURL ||
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAXaKP8v0P4JJuVOXs6U8SkYcrQ5rsr_Iaxf9xDpFkcmLU5CRhbRdwDu8vg4IJSCdRlCoKkEmJ5sn6V3iUrOoOgeWow6AhBBwFGWA8gfJvVrc0RZ1RQTQmOgQ4I7dYpyzwGMfwwBv5PlRab-DYUVJSZUeuis48OQR6nDOWkKKMz6oshUzfyu6-eqoz9dtd4wfXQk1f-6Nih_zFSdJJ3gNjzX7_NeC79KVQ8V69ZiKQh02_BuqoNwDhY';

  return (
    <div id="settings-page" className="max-w-3xl mx-auto space-y-space-lg animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <h1 id="settings-title" className="font-display-lg-mobile md:font-display-lg text-on-surface font-bold tracking-tight">
          Settings &amp; Profile Editor
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Personalize your candidate identity, preferences, and data synchronization.
        </p>
      </div>

      {/* Candidate Profile Settings Editor Card */}
      <div
        id="profile-card"
        className="p-space-md sm:p-space-xl rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container-high/30">
          <div className="flex items-center gap-4">
            <img
              src={photoURL}
              alt={displayName}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/20 shadow-xs"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                  {displayName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  {formData.jobSearchStatus}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-outline mt-0.5">
                <span className="material-symbols-outlined text-[16px]">mail</span>
                <span>{email}</span>
              </div>
            </div>
          </div>

          <span className="text-xs text-outline self-start sm:self-auto font-mono bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant/30">
            UID: {uid.slice(0, 10)}...
          </span>
        </div>

        {/* Profile Editor Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center gap-2 text-on-surface font-bold text-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
            <h3>Candidate Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold text-on-surface mb-1">
                Full Display Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="e.g., Alex Chen"
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Target Role */}
            <div>
              <label htmlFor="targetRole" className="block text-xs font-semibold text-on-surface mb-1">
                Target Role / Career Headline
              </label>
              <input
                id="targetRole"
                name="targetRole"
                type="text"
                value={formData.targetRole}
                onChange={handleChange}
                placeholder="e.g., Senior Full Stack Engineer"
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Job Search Status */}
            <div>
              <label htmlFor="jobSearchStatus" className="block text-xs font-semibold text-on-surface mb-1">
                Job Search Status
              </label>
              <select
                id="jobSearchStatus"
                name="jobSearchStatus"
                value={formData.jobSearchStatus}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="Actively Looking">Actively Looking</option>
                <option value="Open to Offers">Open to Offers</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Accepted Offer">Accepted Offer</option>
                <option value="Not Looking">Not Looking</option>
              </select>
            </div>

            {/* Target Salary */}
            <div>
              <label htmlFor="targetSalary" className="block text-xs font-semibold text-on-surface mb-1">
                Target Minimum Compensation
              </label>
              <input
                id="targetSalary"
                name="targetSalary"
                type="text"
                value={formData.targetSalary}
                onChange={handleChange}
                placeholder="e.g., $135,000 - $160,000 / yr"
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Work Mode */}
            <div>
              <label htmlFor="workMode" className="block text-xs font-semibold text-on-surface mb-1">
                Preferred Work Modality
              </label>
              <select
                id="workMode"
                name="workMode"
                value={formData.workMode}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
                <option value="Flexible">Flexible</option>
              </select>
            </div>

            {/* Preferred Location */}
            <div>
              <label htmlFor="preferredLocation" className="block text-xs font-semibold text-on-surface mb-1">
                Preferred Location / Time Zone
              </label>
              <input
                id="preferredLocation"
                name="preferredLocation"
                type="text"
                value={formData.preferredLocation}
                onChange={handleChange}
                placeholder="e.g., San Francisco, CA or EST"
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-on-surface mb-1">
                Contact Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g., +1 (555) 019-2834"
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Portfolio URL */}
            <div>
              <label htmlFor="portfolioUrl" className="block text-xs font-semibold text-on-surface mb-1">
                Portfolio / GitHub URL
              </label>
              <input
                id="portfolioUrl"
                name="portfolioUrl"
                type="url"
                value={formData.portfolioUrl}
                onChange={handleChange}
                placeholder="e.g., https://github.com/username"
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* LinkedIn URL */}
          <div>
            <label htmlFor="linkedinUrl" className="block text-xs font-semibold text-on-surface mb-1">
              LinkedIn Profile URL
            </label>
            <input
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              value={formData.linkedinUrl}
              onChange={handleChange}
              placeholder="e.g., https://linkedin.com/in/alex-chen"
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Bio / Summary */}
          <div>
            <label htmlFor="bio" className="block text-xs font-semibold text-on-surface mb-1">
              Professional Summary &amp; Elevator Pitch
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Describe your core technical strengths, years of experience, and what you're looking for in your next role..."
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              id="save-profile-settings-btn"
              type="submit"
              disabled={isSavingProfile || profileLoading}
              className="flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all shadow-xs disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>{isSavingProfile ? 'Saving Profile...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Theme Preference Card */}
      <div
        id="theme-settings-card"
        className="p-space-md sm:p-space-xl rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 space-y-4"
      >
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Appearance &amp; Theme
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Switch between light, dark, or system default mode.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Light', icon: 'light_mode' },
            { id: 'dark', label: 'Dark', icon: 'dark_mode' },
            { id: 'system', label: 'System', icon: 'devices' },
          ].map((item) => {
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                id={`theme-btn-${item.id}`}
                type="button"
                onClick={() => setTheme(item.id)}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all gap-1.5 ${
                  isSelected
                    ? 'border-primary bg-primary-fixed/40 text-primary ring-2 ring-primary/20'
                    : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                <span className="font-label-md text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Management (CSV Export & Import) Card */}
      <div
        id="export-data-card"
        className="p-space-md sm:p-space-xl rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">swap_horiz</span>
              <span>Data Import &amp; Export</span>
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Bulk import past applications via CSV spreadsheets, or download your entire career history.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              id="import-applications-settings-btn"
              type="button"
              onClick={() => setIsCsvImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-surface-container text-on-surface font-label-md text-xs font-semibold rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">upload_file</span>
              <span>Import CSV</span>
            </button>

            <button
              id="export-applications-csv-btn"
              type="button"
              disabled={isExporting}
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-primary-container text-on-primary font-label-md text-xs font-semibold rounded-xl shadow-xs hover:bg-primary transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Firestore Partition Verification */}
      <div
        id="architecture-verification-card"
        className="p-space-md sm:p-space-xl rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-secondary text-[24px]">verified_user</span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Data Isolation &amp; Security
          </h2>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Your pipeline is stored in a private partition enforced by cloud security rules:
        </p>

        <div className="space-y-2.5 text-xs font-body-sm">
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px]">database</span>
              <div>
                <p className="font-semibold text-on-surface">Private Partition</p>
                <p className="text-outline font-mono text-[11px]">users/{`{userId}`}/applications</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-secondary bg-secondary-container font-label-sm text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px]">check</span>
              User-Scoped
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px]">key</span>
              <div>
                <p className="font-semibold text-on-surface">Security Rules</p>
                <p className="text-outline text-[11px]">Firestore rules verify request.auth.uid == userId</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-secondary bg-secondary-container font-label-sm text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px]">check</span>
              Enforced
            </span>
          </div>
        </div>
      </div>

      {/* Logout Session Management */}
      <div
        id="session-card"
        className="p-space-md sm:p-space-xl rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex items-center justify-between gap-4"
      >
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Sign Out of JobTrack
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Safely end your current active session.
          </p>
        </div>

        <button
          id="settings-logout-btn"
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-space-md py-2 text-error hover:bg-error-container/20 rounded-xl transition-colors font-label-md text-label-md font-semibold border border-error-container shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>

      {/* CSV Bulk Import Modal accessible from Settings */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onImportSuccess={() => showSuccess('Applications imported successfully.')}
      />
    </div>
  );
}
