import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../context/ThemeContext';
import { getApplications } from '../services/applicationsService';
import { getUserProfileData, updateUserProfileData } from '../services/authService';
import { calculateProfileCompleteness, SAMPLE_CV_DATA } from '../utils/profileVerification';
import CsvImportModal from '../components/applications/CsvImportModal';
import CvPreviewModal from '../components/cv/CvPreviewModal';
import GoogleDriveStorageManager from '../components/drive/GoogleDriveStorageManager';

export default function Settings() {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const photoInputRef = useRef(null);

  // On-Demand CV Preview Modal state (hidden by default)
  const [isCvPreviewOpen, setIsCvPreviewOpen] = useState(false);

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
    email: '',
    address: '',
    careerObjective: '',
    careerSummary: '',
    workExperience: '',
    specialQualifications: '',
    languageProficiency: '',
    personalDetails: '',
    portfolioUrl: '',
    linkedinUrl: '',
    jobSearchStatus: 'Actively Looking',
    bio: '',
    photoURL: '',
  });

  // Export / Import State
  const [isExporting, setIsExporting] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  // Fetch current user's profile on mount
  useEffect(() => {
    async function loadProfile() {
      if (!user?.uid) return;
      setProfileLoading(true);
      const { profile } = await getUserProfileData(user.uid);
      if (profile) {
        setFormData({
          displayName: profile.displayName || user.displayName || '',
          targetRole: profile.targetRole || '',
          targetSalary: profile.targetSalary || '',
          workMode: profile.workMode || 'Remote',
          preferredLocation: profile.preferredLocation || '',
          phone: profile.phone || '',
          email: profile.email || user.email || '',
          address: profile.address || '',
          careerObjective: profile.careerObjective || '',
          careerSummary: profile.careerSummary || '',
          workExperience: profile.workExperience || '',
          specialQualifications: profile.specialQualifications || '',
          languageProficiency: profile.languageProficiency || '',
          personalDetails: profile.personalDetails || '',
          portfolioUrl: profile.portfolioUrl || '',
          linkedinUrl: profile.linkedinUrl || '',
          jobSearchStatus: profile.jobSearchStatus || 'Actively Looking',
          bio: profile.bio || '',
          photoURL: profile.photoURL || user.photoURL || '',
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          displayName: user.displayName || user.email?.split('@')[0] || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
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

  // Calculate verification metrics
  const { percentage, isVerified } = calculateProfileCompleteness(formData);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError('ছবির সাইজ ২MB এর কম হতে হবে');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({
        ...prev,
        photoURL: event.target.result,
      }));
      showSuccess('ছবি সফলভাবে যুক্ত হয়েছে!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photoURL: '' }));
    if (photoInputRef.current) photoInputRef.current.value = '';
    showSuccess('ছবি মুছে ফেলা হয়েছে');
  };

  const handleClearAll = () => {
    if (window.confirm('আপনি কি নিশ্চিত যে সিভির সমস্ত তথ্য মুছে ফাঁকা করতে চান?')) {
      setFormData({
        displayName: '',
        targetRole: '',
        targetSalary: '',
        workMode: 'Remote',
        preferredLocation: '',
        phone: '',
        email: '',
        address: '',
        careerObjective: '',
        careerSummary: '',
        workExperience: '',
        specialQualifications: '',
        languageProficiency: '',
        personalDetails: '',
        portfolioUrl: '',
        linkedinUrl: '',
        jobSearchStatus: 'Actively Looking',
        bio: '',
        photoURL: '',
      });
      if (photoInputRef.current) photoInputRef.current.value = '';
      showSuccess('সিভির সমস্ত তথ্য মুছে ফাঁকা করা হয়েছে।');
    }
  };

  const handleLoadSample = () => {
    setFormData((prev) => ({
      ...prev,
      ...SAMPLE_CV_DATA,
    }));
    showSuccess('নমুনা তথ্য (Sample CV Data) সফলভাবে লোড করা হয়েছে!');
  };

  const displayName = formData.displayName || user?.displayName || user?.email?.split('@')[0] || 'Alex Chen';
  const email = formData.email || user?.email || 'alex.chen@student.edu';
  const uid = user?.uid || 'user_demo_123';
  const photoURL =
    formData.photoURL ||
    user?.photoURL ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  return (
    <div
      id="settings-page"
      className="max-w-4xl mx-auto space-y-space-lg transition-all duration-300 animate-in fade-in"
    >
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
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 font-label-sm text-[11px] font-bold">
                    <span className="material-symbols-outlined text-[15px] text-blue-600">verified</span>
                    Account Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-label-sm text-[11px] font-semibold">
                    {percentage}% Completed
                  </span>
                )}
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

        {/* Verification Status & Action Buttons Banner */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isVerified
              ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40'
              : 'bg-surface-container-low border-surface-container-high'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`material-symbols-outlined text-[22px] ${
                  isVerified ? 'text-blue-600' : 'text-primary'
                }`}
              >
                {isVerified ? 'verified' : 'fact_check'}
              </span>
              <h4 className="font-semibold text-sm text-on-surface">
                {isVerified ? 'আপনার অ্যাকাউন্ট সম্পূর্ণ ভেরিফাইড!' : `প্রোফাইল সম্পূর্ণতা: ${percentage}%`}
              </h4>
            </div>
            <p className="text-xs text-on-surface-variant max-w-md">
              {isVerified
                ? 'আপনার সব সিভি তথ্য সংরক্ষিত আছে। প্রয়োজন হলে প্রিভিউ দেখে বা PDF ডাউনলোড করতে পারেন।'
                : 'সব ফিল্ড পূরণ করলে স্বয়ংক্রিয়ভাবে অ্যাকাউন্ট ভেরিফাইড হবে এবং আপনার পছন্দমতো সিভি তৈরি হবে।'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 dark:border-red-800/40 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
              <span>সব খালি করুন</span>
            </button>
            {!isVerified && (
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-3 py-1.5 rounded-lg bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
              >
                নমুনা তথ্য লোড
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCvPreviewOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>সিভি প্রিভিউ ও ডাউনলোড</span>
            </button>
          </div>
        </div>

        {/* Profile Editor Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
          <div className="flex items-center justify-between text-on-surface font-bold text-sm pb-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
              <h3>Candidate Details</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-normal text-red-500 hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">clear_all</span>
                সব মুছুন
              </button>
              <button
                type="button"
                onClick={() => setIsCvPreviewOpen(true)}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">visibility</span>
                <span>সিভি প্রিভিউ</span>
              </button>
            </div>
          </div>

                {/* Candidate Photo Uploader */}
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                  <label className="block text-xs font-semibold text-on-surface">
                    প্রোফাইল ছবি (Candidate Photo)
                  </label>
                  <div className="flex items-center gap-3">
                    <img
                      src={photoURL}
                      alt={displayName}
                      className="w-14 h-14 rounded-xl object-cover ring-2 ring-primary/20 bg-surface-container"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        ref={photoInputRef}
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                        <span>ছবি আপলোড করুন</span>
                      </button>
                      {formData.photoURL && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-2.5 py-1.5 rounded-lg border border-outline-variant/30 text-xs text-on-surface-variant hover:text-red-500 transition-colors"
                        >
                          মুছে ফেলুন
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    id="photoURL"
                    name="photoURL"
                    type="url"
                    value={formData.photoURL}
                    onChange={handleChange}
                    placeholder="অথবা ছবির সরাসরি URL লিংক দিন (https://...)"
                    className="w-full px-3 py-2 bg-surface-container border border-outline-variant/30 rounded-lg text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
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

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-xs font-semibold text-on-surface mb-1">
              বর্তমান ও স্থায়ী ঠিকানা (Address) *
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="আপনার বর্তমান ও স্থায়ী ঠিকানা লিখুন"
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Career Objective */}
          <div>
            <label htmlFor="careerObjective" className="block text-xs font-semibold text-on-surface mb-1">
              Career Objective (ক্যারিয়ার উদ্দেশ্য) *
            </label>
            <textarea
              id="careerObjective"
              name="careerObjective"
              rows={2}
              value={formData.careerObjective}
              onChange={handleChange}
              placeholder="আপনার ক্যারিয়ারের উদ্দেশ্য সংক্ষেপে লিখুন..."
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y leading-relaxed"
            />
          </div>

          {/* Career Summary */}
          <div>
            <label htmlFor="careerSummary" className="block text-xs font-semibold text-on-surface mb-1">
              Career Summary (ক্যারিয়ার সারাংশ) *
            </label>
            <textarea
              id="careerSummary"
              name="careerSummary"
              rows={2}
              value={formData.careerSummary}
              onChange={handleChange}
              placeholder="আপনার পেশাগত বা শিক্ষাগত সারাংশ লিখুন..."
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y leading-relaxed"
            />
          </div>

          {/* Work Experience */}
          <div>
            <label htmlFor="workExperience" className="block text-xs font-semibold text-on-surface mb-1">
              Work Experience (কাজের অভিজ্ঞতা বা ফ্রেশার বিবরণ) *
            </label>
            <textarea
              id="workExperience"
              name="workExperience"
              rows={2}
              value={formData.workExperience}
              onChange={handleChange}
              placeholder="কাজের অভিজ্ঞতা বা ফ্রেশার বিবরণ লিখুন..."
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y leading-relaxed"
            />
          </div>

          {/* Special Qualifications */}
          <div>
            <label htmlFor="specialQualifications" className="block text-xs font-semibold text-on-surface mb-1">
              Special Qualifications (বিশেষ দক্ষতা / স্কিল) *
            </label>
            <textarea
              id="specialQualifications"
              name="specialQualifications"
              rows={3}
              value={formData.specialQualifications}
              onChange={handleChange}
              placeholder="আপনার বিশেষ দক্ষতা বা স্কিলসমূহ লিখুন..."
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Language Proficiency */}
          <div>
            <label htmlFor="languageProficiency" className="block text-xs font-semibold text-on-surface mb-1">
              Language Proficiency (ভাষাগত দক্ষতা) *
            </label>
            <textarea
              id="languageProficiency"
              name="languageProficiency"
              rows={2}
              value={formData.languageProficiency}
              onChange={handleChange}
              placeholder="ভাষাগত দক্ষতা লিখুন (যেমন: বাংলা, ইংরেজি ইত্যাদি)..."
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Personal Details */}
          <div>
            <label htmlFor="personalDetails" className="block text-xs font-semibold text-on-surface mb-1">
              Personal Details (পিতার নাম, জন্ম তারিখ ইত্যাদি) *
            </label>
            <textarea
              id="personalDetails"
              name="personalDetails"
              rows={3}
              value={formData.personalDetails}
              onChange={handleChange}
              placeholder="পিতার নাম, জন্ম তারিখ, জাতীয়তা, ধর্ম ইত্যাদি লিখুন..."
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y font-mono text-xs leading-relaxed"
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
              rows={2}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Describe your core technical strengths, years of experience, and what you're looking for in your next role..."
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-surface-container-high/30 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCvPreviewOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <span className="material-symbols-outlined text-[17px]">visibility</span>
                <span>সিভি প্রিভিউ ও PDF ডাউনলোড</span>
              </button>
              <Link
                to="/cv"
                className="hidden sm:flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors px-2 py-1"
              >
                <span className="material-symbols-outlined text-[15px]">badge</span>
                <span>CV Builder</span>
              </Link>
            </div>

            <button
              id="save-profile-settings-btn"
              type="submit"
              disabled={isSavingProfile || profileLoading}
              className="flex items-center gap-1.5 px-space-lg py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>{isSavingProfile ? 'সংরক্ষণ হচ্ছে...' : 'তথ্য সংরক্ষণ করুন (Save Profile)'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* On-Demand CV Preview & Download Modal */}
      <CvPreviewModal
        isOpen={isCvPreviewOpen}
        onClose={() => setIsCvPreviewOpen(false)}
        data={formData}
        isVerified={isVerified}
      />

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

      {/* Google Drive Direct Cloud Storage Card */}
      <GoogleDriveStorageManager />

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
