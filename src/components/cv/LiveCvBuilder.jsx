import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { updateUserProfileData } from '../../services/authService';
import { calculateProfileCompleteness, SAMPLE_CV_DATA } from '../../utils/profileVerification';
import LiveCvPreviewer from './LiveCvPreviewer';
import CvPreviewModal from './CvPreviewModal';

export default function LiveCvBuilder({ initialData = null, onSaved = null }) {
  const { user, userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    targetRole: '',
    phone: '',
    email: '',
    address: '',
    careerObjective: '',
    careerSummary: '',
    workExperience: '',
    specialQualifications: '',
    languageProficiency: '',
    personalDetails: '',
    photoURL: '',
    signatureName: '',
    declarationDate: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  });

  // Populate data from user profile or initialData (strictly no dummy fallbacks)
  useEffect(() => {
    const source = initialData || userProfile || {};
    setFormData((prev) => ({
      ...prev,
      displayName: source.displayName || '',
      targetRole: source.targetRole || '',
      phone: source.phone || '',
      email: source.email || '',
      address: source.address || '',
      careerObjective: source.careerObjective || '',
      careerSummary: source.careerSummary || '',
      workExperience: source.workExperience || '',
      specialQualifications: source.specialQualifications || '',
      languageProficiency: source.languageProficiency || '',
      personalDetails: source.personalDetails || '',
      photoURL: source.photoURL || '',
      signatureName: source.displayName || '',
    }));
  }, [initialData, userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearAll = () => {
    setFormData({
      displayName: '',
      targetRole: '',
      phone: '',
      email: '',
      address: '',
      careerObjective: '',
      careerSummary: '',
      workExperience: '',
      specialQualifications: '',
      languageProficiency: '',
      personalDetails: '',
      photoURL: '',
      signatureName: '',
      declarationDate: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showSuccess('সিভির সমস্ত তথ্য মুছে সম্পূর্ণ ফাঁকা করা হয়েছে।');
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showError('Image size should be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFormData((prev) => ({
          ...prev,
          photoURL: uploadEvent.target.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoadSample = () => {
    setFormData((prev) => ({
      ...prev,
      ...SAMPLE_CV_DATA,
      signatureName: SAMPLE_CV_DATA.displayName,
      declarationDate: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    }));
    showSuccess('নমুনা তথ্য (Sample CV Data) সফলভাবে লোড করা হয়েছে!');
  };

  const handleSaveToProfile = async () => {
    if (!user?.uid) {
      showError('Please sign in to save your CV to your profile.');
      return;
    }

    setIsSaving(true);
    const result = await updateUserProfileData(user.uid, formData);
    setIsSaving(false);

    if (result.success) {
      if (result.isVerified) {
        showSuccess('অভিনন্দন! আপনার প্রোফাইল ১০০% সম্পন্ন হয়েছে এবং Account Verified হয়েছে!');
      } else {
        showSuccess(`প্রোফাইল তথ্য সংরক্ষিত হয়েছে (${result.profileCompleteness}% সম্পন্ন)।`);
      }
      if (onSaved) onSaved(result);
    } else {
      showError(result.error || 'Failed to update profile.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate completeness & verification status
  const { percentage, isVerified, missingFields } = calculateProfileCompleteness(formData);

  const fallbackAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  return (
    <div className="cv-app-container w-full">
      {/* Print Specific CSS Style Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #cv-printable-area, #cv-printable-area * {
            visibility: visible;
          }
          #cv-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          aside, nav, header, #app-sidebar, #mobile-bottom-nav, #dashboard-header {
            display: none !important;
          }
        }
      `}</style>

      {/* Verification & Action Bar */}
      <div className="no-print mb-space-md p-space-md rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isVerified
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            <span className="material-symbols-outlined text-[28px]">
              {isVerified ? 'verified' : 'fact_check'}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                {isVerified ? 'Account Verified (অ্যাকাউন্ট ভেরিফাইড)' : 'প্রোফাইল ভেরিফিকেশন প্রগ্রেস'}
              </h2>
              {isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Verified
                </span>
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {isVerified
                ? 'সব ফিল্ড সঠিকভাবে পূরণ হয়েছে। আপনার সিভি প্রস্তুত ও ভেরিফাইড।'
                : `প্রোফাইল সম্পূর্ণতা: ${percentage}% (ভেরিফাইড ব্যাজ পেতে সব তথ্য পূরণ করুন)`}
            </p>
          </div>
        </div>

        {/* Progress Bar & Actions */}
        <div className="w-full md:w-auto flex flex-wrap items-center gap-space-xs">
          <div className="hidden lg:block w-36 mr-2">
            <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isVerified ? 'bg-blue-600' : 'bg-primary'
                }`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <span className="text-[11px] text-outline mt-0.5 block text-right font-medium">
              {percentage}% Complete
            </span>
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            title="সিভির সমস্ত তথ্য মুছে ফাঁকা করুন"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-rose-600 dark:text-rose-400 font-label-md text-label-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors border border-rose-200 dark:border-rose-900/40"
          >
            <span className="material-symbols-outlined text-[18px]">clear_all</span>
            <span>সব খালি করুন</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            title="আড়ং সেলস অ্যাসোসিয়েট নমূনা তথ্য লোড করুন"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[18px]">dataset</span>
            <span>নমুনা তথ্য</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToProfile}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isSaving ? 'sync' : 'save'}
            </span>
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইলে সেভ করুন'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-label-md text-label-md hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            <span>সিভি প্রিভিউ ও PDF ডাউনলোড</span>
          </button>
        </div>
      </div>

      {/* Missing Fields Warning if not 100% */}
      {!isVerified && missingFields.length > 0 && (
        <div className="no-print mb-space-md p-space-sm px-space-md rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 text-xs flex flex-wrap items-center gap-2">
          <span className="font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">info</span>
            ভেরিফাইড হতে বাকি ফিল্ডগুলো পূরণ করুন:
          </span>
          {missingFields.slice(0, 4).map((f) => (
            <span key={f.key} className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-medium">
              {f.label}
            </span>
          ))}
          {missingFields.length > 4 && <span>+ আরও {missingFields.length - 4} টি</span>}
        </div>
      )}

      {/* Form Editor Section (Hidden CV Preview by default, shown on click) */}
      <div className="w-full max-w-4xl mx-auto">
        <div
          id="cv-editor-panel"
          className="no-print w-full bg-surface-container-lowest p-space-md sm:p-space-xl rounded-2xl border border-surface-container-high/40 shadow-sm space-y-space-md"
        >
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/30">
            <div className="flex items-center gap-space-xs text-primary font-semibold">
              <span className="material-symbols-outlined text-[20px]">edit_document</span>
              <h3 className="font-headline-sm text-body-md font-semibold text-on-surface">
                CV তথ্য পূরণ ও এডিট করুন
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">visibility</span>
              <span>সিভি প্রিভিউ দেখুন</span>
            </button>
          </div>

          {/* Profile Picture Upload */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-medium">
              প্রোফাইল ছবি (Profile Picture)
            </label>
            <div className="flex items-center gap-space-sm">
              {formData.photoURL ? (
                <div className="relative group">
                  <img
                    src={formData.photoURL}
                    alt="Preview"
                    className="w-14 h-14 rounded-full object-cover border-2 border-sky-500 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, photoURL: '' }));
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    title="ছবি মুছুন"
                    className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full border border-dashed border-outline/40 flex flex-col items-center justify-center bg-surface-container text-outline shrink-0">
                  <span className="material-symbols-outlined text-[22px]">person</span>
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-xs text-outline file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-container file:text-on-primary hover:file:bg-primary cursor-pointer w-full"
                />
                <p className="text-[10px] text-outline mt-1">সর্বোচ্চ ২MB (JPG/PNG)</p>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-medium">
              পুরো নাম (Full Name) *
            </label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="আপনার পুরো নাম লিখুন"
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-body-md text-on-surface uppercase placeholder:text-outline/60"
            />
          </div>

          {/* Target Role / Job Title */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-medium">
              টার্গেট পদবী / জব রোল (Target Role) *
            </label>
            <input
              type="text"
              name="targetRole"
              value={formData.targetRole}
              onChange={handleChange}
              placeholder="টার্গেট পদবী / জব রোল"
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-body-md text-on-surface placeholder:text-outline/60"
            />
          </div>

          {/* Contact Fields (Phone, Email, Address) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
            <div className="space-y-1">
              <label className="block font-label-sm text-label-sm text-on-surface font-medium">
                ফোন নম্বর *
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="যেমন: 01XXXXXXXXX"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface placeholder:text-outline/60"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-label-sm text-label-sm text-on-surface font-medium">
                ইমেইল ঠিকানা *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="যেমন: name@example.com"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface placeholder:text-outline/60"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-medium">
              ঠিকানা (Address) *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="আপনার বর্তমান ও স্থায়ী ঠিকানা"
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface placeholder:text-outline/60"
            />
          </div>

          {/* Career Objective */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-medium">
              Career Objective (ক্যারিয়ার উদ্দেশ্য) *
            </label>
            <textarea
              name="careerObjective"
              rows={3}
              value={formData.careerObjective}
              onChange={handleChange}
              placeholder="আপনার ক্যারিয়ারের উদ্দেশ্য সংক্ষেপে লিখুন..."
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface resize-y placeholder:text-outline/60"
            />
          </div>

          {/* Career Summary */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-medium">
              Career Summary (ক্যারিয়ার সারাংশ) *
            </label>
            <textarea
              name="careerSummary"
              rows={3}
              value={formData.careerSummary}
              onChange={handleChange}
              placeholder="আপনার পেশাগত বা শিক্ষাগত সারাংশ লিখুন..."
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface resize-y placeholder:text-outline/60"
            />
          </div>

          {/* Work Experience */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-medium">
              Work Experience (কাজের অভিজ্ঞতা বা ফ্রেশার বিবরণ) *
            </label>
            <textarea
              name="workExperience"
              rows={3}
              value={formData.workExperience}
              onChange={handleChange}
              placeholder="কাজের অভিজ্ঞতা বা ফ্রেশার বিবরণ লিখুন..."
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface resize-y placeholder:text-outline/60"
            />
          </div>

          {/* Special Qualifications */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-medium">
              Special Qualifications (বিশেষ দক্ষতা / স্কিল) *
            </label>
            <textarea
              name="specialQualifications"
              rows={4}
              value={formData.specialQualifications}
              onChange={handleChange}
              placeholder="আপনার বিশেষ দক্ষতা বা স্কিলসমূহ লিখুন..."
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface resize-y font-mono text-xs placeholder:text-outline/60"
            />
          </div>

          {/* Language Proficiency */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-medium">
              Language Proficiency (ভাষাগত দক্ষতা) *
            </label>
            <textarea
              name="languageProficiency"
              rows={3}
              value={formData.languageProficiency}
              onChange={handleChange}
              placeholder="ভাষাগত দক্ষতা লিখুন..."
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface resize-y font-mono text-xs placeholder:text-outline/60"
            />
          </div>

          {/* Personal Details */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-medium">
              Personal Details (পিতার নাম, জন্ম তারিখ ইত্যাদি) *
            </label>
            <textarea
              name="personalDetails"
              rows={4}
              value={formData.personalDetails}
              onChange={handleChange}
              placeholder="পিতার নাম, জন্ম তারিখ, জাতীয়তা, ধর্ম ইত্যাদি লিখুন..."
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface resize-y font-mono text-xs placeholder:text-outline/60"
            />
          </div>

          {/* Bottom Save, Clear & Print shortcuts inside editor */}
          <div className="pt-4 flex items-center justify-between gap-3 border-t border-surface-container-high/30 flex-wrap">
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 dark:border-rose-900/40 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              সব খালি করুন
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <span className="material-symbols-outlined text-[17px]">visibility</span>
                <span>সিভি প্রিভিউ ও PDF ডাউনলোড</span>
              </button>
              <button
                type="button"
                onClick={handleSaveToProfile}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইলে সেভ করুন'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* On-Demand Live CV Preview & Download Modal */}
      <CvPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={formData}
        isVerified={isVerified}
      />
    </div>
  );
}
