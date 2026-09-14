import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  uploadFileToDrive,
  listDriveFiles,
  deleteDriveFile,
  formatDriveFileSize,
} from '../../services/googleDriveService';

export default function GoogleDriveStorageManager({ compact = false }) {
  const {
    user,
    hasGoogleDriveAccess,
    connectGoogleDrive,
    manualConnectGoogleDrive,
    disconnectGoogleDrive,
    getGoogleAccessToken,
    driveConnectionInfo,
  } = useAuth();
  const { showSuccess, showError } = useToast();

  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [popupBlockedWarning, setPopupBlockedWarning] = useState(false);

  // Manual token input state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [manualError, setManualError] = useState('');

  const fileInputRef = useRef(null);

  // Load user files from Google Drive
  const loadFiles = async () => {
    const token = getGoogleAccessToken();
    if (!token) return;

    setLoadingFiles(true);
    try {
      const driveFiles = await listDriveFiles(token);
      setFiles(driveFiles);
    } catch (err) {
      console.warn('Could not list Google Drive files:', err);
      if (err.message?.includes('expired') || err.message?.includes('401')) {
        showError('Google Drive session expired. Please reconnect or update token.');
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (hasGoogleDriveAccess) {
      loadFiles();
    } else {
      setFiles([]);
    }
  }, [hasGoogleDriveAccess]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setPopupBlockedWarning(false);
    try {
      const res = await connectGoogleDrive();
      if (res.error) {
        if (
          res.rawError?.code === 'auth/popup-blocked' ||
          res.rawError?.code === 'auth/cancelled-popup-request' ||
          res.error?.toLowerCase().includes('popup') ||
          res.error?.toLowerCase().includes('blocked')
        ) {
          setPopupBlockedWarning(true);
          setShowManualModal(true);
        }
        showError(res.error);
      } else if (res.accessToken) {
        showSuccess('Google Drive সফলভাবে সংযুক্ত হয়েছে!');
        loadFiles();
      }
    } catch (err) {
      setPopupBlockedWarning(true);
      setShowManualModal(true);
      showError(err.message || 'Google Drive সংযোগ ব্যর্থ হয়েছে।');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualConnectSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!manualToken.trim()) {
      setManualError('অনুগ্রহ করে একটি বৈধ Google Access Token দিন।');
      return;
    }

    setIsVerifyingManual(true);
    setManualError('');
    try {
      const res = await manualConnectGoogleDrive(manualToken.trim(), user?.email);
      if (!res.success) {
        setManualError(res.error || 'টোকেন যাচাই ব্যর্থ হয়েছে।');
        showError(res.error || 'টোকেন যাচাই ব্যর্থ হয়েছে।');
      } else {
        showSuccess(`Google Drive সফলভাবে ম্যানুয়ালি সংযুক্ত হয়েছে! (${res.accountInfo?.email || user?.email || 'Connected'})`);
        setShowManualModal(false);
        setManualToken('');
        setPopupBlockedWarning(false);
        loadFiles();
      }
    } catch (err) {
      setManualError(err.message || 'টোকেন যাচাই করার সময় ত্রুটি ঘটেছে।');
      showError(err.message || 'টোকেন সংযোগ ব্যর্থ।');
    } finally {
      setIsVerifyingManual(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('আপনি কি সত্যিই Google Drive সংযোগ বিচ্ছিন্ন করতে চান?')) {
      disconnectGoogleDrive();
      setFiles([]);
      showSuccess('Google Drive সংযোগ বিচ্ছিন্ন করা হয়েছে।');
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const token = getGoogleAccessToken();
    if (!token) {
      showError('প্রথমে Google Drive সংযুক্ত করুন।');
      return;
    }

    setIsUploading(true);
    try {
      await uploadFileToDrive(
        token,
        selectedFile,
        selectedFile.name,
        selectedFile.type
      );
      showSuccess(`"${selectedFile.name}" সরাসরি আপনার গুগল ড্রাইভে সংরক্ষিত হয়েছে!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadFiles();
    } catch (err) {
      showError(err.message || 'ড্রাইভে ফাইল আপলোড ব্যর্থ হয়েছে।');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    const token = getGoogleAccessToken();
    if (!token) return;

    if (!window.confirm(`আপনি কি "${fileName}" গুগল ড্রাইভ থেকে মুছে ফেলতে চান?`)) {
      return;
    }

    try {
      await deleteDriveFile(token, fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      showSuccess(`"${fileName}" গুগল ড্রাইভ থেকে মুছে ফেলা হয়েছে।`);
    } catch (err) {
      showError(err.message || 'ফাইল মুছতে সমস্যা হয়েছে।');
    }
  };

  const connectedEmail = driveConnectionInfo?.email || user?.email || 'Google Account';
  const isManualConnection = driveConnectionInfo?.method === 'manual';

  return (
    <div
      id="google-drive-storage-panel"
      className="bg-surface-container-lowest border border-surface-container-high/40 rounded-2xl p-5 sm:p-6 space-y-5 transition-colors"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-container-high/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5-3.42-6zm1.72 6.5l3.43 6h10L19.42 10H9.43zm7.43-6.5l-5.14 9 3.43 6 5.14-9-3.43-6z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-title-lg text-title-lg font-bold text-on-surface">
                ব্যক্তিগত Google Drive স্টোরেজ
              </h3>
              {hasGoogleDriveAccess ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>সংযুক্ত: {connectedEmail}</span>
                  {isManualConnection && (
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 rounded text-[10px]">ম্যানুয়াল</span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium">
                  ডিসকানেক্টেড
                </span>
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              ড্রাইভ অ্যাকাউন্ট মূলত আপনার গুগল অ্যাকাউন্টেরই অংশ। আপনার ফাইল সরাসরি আপনার নিজস্ব ড্রাইভে জমা থাকে।
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {!hasGoogleDriveAccess ? (
            <>
              {/* Primary Connect (Popup) */}
              <button
                type="button"
                id="btn-connect-google-drive-popup"
                onClick={handleConnect}
                disabled={isConnecting}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-label-md font-semibold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                title="গুগল পপ-আপ দিয়ে সংযুক্ত করুন"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#ffffff"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#ffffff"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#ffffff"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#ffffff"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isConnecting ? 'সংযুক্ত হচ্ছে...' : 'Google দিয়ে কানেক্ট'}</span>
              </button>

              {/* Manual Connect Button */}
              <button
                type="button"
                id="btn-open-manual-google-drive"
                onClick={() => setShowManualModal((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant/60 hover:bg-surface-container text-on-surface text-xs sm:text-label-md font-medium transition-colors cursor-pointer"
                title="পপ-আপ কাজ না করলে ম্যানুয়ালি গুগল একাউন্ট বা টোকেন যুক্ত করুন"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">key</span>
                <span>ম্যানুয়ালি যুক্ত করুন</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-refresh-drive-files"
                onClick={loadFiles}
                disabled={loadingFiles}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-container-high hover:bg-surface-container text-on-surface text-label-sm font-medium transition-colors cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[16px] ${loadingFiles ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>রিফ্রেশ</span>
              </button>

              <button
                type="button"
                id="btn-edit-manual-drive-token"
                onClick={() => setShowManualModal((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-on-surface text-xs transition-colors cursor-pointer"
                title="টোকেন পরিবর্তন বা আপডেট করুন"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
                <span>টোকেন আপডেট</span>
              </button>

              <button
                type="button"
                id="btn-disconnect-google-drive"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-error/30 hover:bg-error/10 text-error text-xs font-semibold transition-colors cursor-pointer"
                title="গুগল ড্রাইভ সংযোগ বিচ্ছিন্ন করুন"
              >
                <span className="material-symbols-outlined text-[15px]">link_off</span>
                <span>ডিসকানেক্ট</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Popup Blocked Warning Notice with 1-Click Action */}
      {popupBlockedWarning && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-body-sm space-y-2.5">
          <div className="flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400">
              warning
            </span>
            <span>পপ-আপ কাজ করছে না (Pop-up Blocked by Browser/iFrame)</span>
          </div>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            আইফ্রেম বা প্রিভিউ মোডে ব্রাউজার গুগল সাইন-ইন পপ-আপ ব্লক করেছে। ড্রাইভ অ্যাকাউন্ট যেহেতু গুগল অ্যাকাউন্টেরই অংশ, 
            আপনি নিচের <strong>"ম্যানুয়ালি Google Account / Drive যুক্ত করুন"</strong> অপশন দিয়ে সরাসরি অ্যাক্সেস টোকেন দিয়ে কানেক্ট করতে পারেন, 
            অথবা নতুন ট্যাবে অ্যাপটি খুলে পপ-আপ অনুমোদন করতে পারেন।
          </p>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-lg font-medium text-xs transition-colors cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">key</span>
              <span>ম্যানুয়াল টোকেন ফরম খুলুন</span>
            </button>
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-medium text-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              <span>নতুন ট্যাবে খুলুন (Open in New Tab)</span>
            </a>
          </div>
        </div>
      )}

      {/* Manual Google Account / Access Token Addition Panel */}
      {showManualModal && (
        <div
          id="manual-google-drive-setup-box"
          className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-primary/30 space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">vpn_key</span>
              </div>
              <div>
                <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
                  ম্যানুয়ালি Google Account / Drive যুক্ত করুন
                </h4>
                <p className="text-xs text-on-surface-variant">
                  গুগল ড্রাইভ এবং গুগল অ্যাকাউন্ট একই। এটি সম্পূর্ণ ব্যক্তিগত ও সুরক্ষিত—পাবলিকের দেখার কোনো সুযোগ নেই।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowManualModal(false)}
              className="text-outline hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Privacy and Password Explanation Card */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-950 dark:text-emerald-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">lock</span>
              <span>১০০% ব্যক্তিগত ও নিরাপদ (১০০% Private & Secure)</span>
            </div>
            <p className="leading-relaxed text-[11.5px] text-on-surface-variant">
              Google-এর সিকিউরিটি নিয়মানুযায়ী কোনো থার্ড-পার্টি অ্যাপে ব্যবহারকারীর সরাসরি Gmail পাসওয়ার্ড ইনপুট নেওয়ার অনুমতি নেই। এর পরিবর্তে Google-এর নিজস্ব অনুমোদিত <strong>OAuth Access Token</strong> ব্যবহৃত হয়। এই টোকেন দিয়ে আপনার ড্রাইভ সরাসরি কেবল আপনার ব্রাউজারে যুক্ত হবে—<strong>কোনো পাবলিক বা অন্য কেউ আপনার ফাইল দেখতে পারবে না</strong>।
            </p>
          </div>

          {/* Current User Email info */}
          {user?.email && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container border border-surface-container-high text-xs text-on-surface">
              <span className="material-symbols-outlined text-[16px] text-blue-500">account_circle</span>
              <span>আপনার বর্তমান অ্যাকাউন্ট: <strong>{user.email}</strong></span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleManualConnectSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="input-manual-drive-token"
                className="block text-xs font-semibold text-on-surface mb-1"
              >
                Google OAuth 2.0 Access Token <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-manual-drive-token"
                  type="password"
                  placeholder="ya29.a0AfH6S... (Google Drive Access Token)"
                  value={manualToken}
                  onChange={(e) => {
                    setManualToken(e.target.value);
                    if (manualError) setManualError('');
                  }}
                  className="w-full pl-3 pr-24 py-2 bg-surface-container-lowest border border-outline-variant/50 rounded-xl text-xs font-mono text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setManualToken(text.trim());
                    } catch (e) {
                      showError('ক্লিপবোর্ড থেকে পেস্ট করা যায়নি। হাতে পেস্ট করুন।');
                    }
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-medium bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg transition-colors cursor-pointer"
                >
                  পেস্ট করুন
                </button>
              </div>
              {manualError && (
                <p className="text-[11px] text-error mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  <span>{manualError}</span>
                </p>
              )}
            </div>

            {/* Quick Helper Steps */}
            <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-primary/20 text-xs text-on-surface-variant space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-on-surface flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-[17px] text-primary">live_help</span>
                  <span>টোকেন যেভাবে বের করবেন (মাত্র ৩০ সেকেন্ড):</span>
                </p>
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px]">৩টি সহজ ধাপ</span>
              </div>

              <div className="space-y-2 text-[11.5px] leading-relaxed">
                <div className="flex items-start gap-2 p-2 rounded-lg bg-surface-container/50 border border-surface-container-high/60">
                  <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">১</span>
                  <div className="space-y-1">
                    <p>নিচের অফিসিয়াল গুগল লিঙ্কে ক্লিক করুন:</p>
                    <a
                      href="https://developers.google.com/oauthplayground/#step1&apisSelect=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-on-primary rounded-md font-semibold text-[11px] shadow-xs hover:bg-primary/90 transition-colors"
                    >
                      <span>গুগল প্লেগ্রাউন্ড খুলুন (Google OAuth Playground)</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 rounded-lg bg-surface-container/50 border border-surface-container-high/60">
                  <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">২</span>
                  <div className="space-y-1">
                    <p>
                      পেজের বামপাশে সরাসরি নীল রঙের <strong>"Authorize APIs"</strong> বাটনে ক্লিক করুন।
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/30">
                      ⚠️ <strong>সতর্কতা:</strong> নিচের "Input your own scopes" ইনপুট বক্সে আপনার ইমেইল বা কোনো কিছু টাইপ করবেন না। সরাসরি নীল বাটনে ক্লিক করে আপনার অ্যাকাউন্ট (<strong>{user?.email || 'shiblisadik918@gmail.com'}</strong>) সিলেক্ট করুন।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 rounded-lg bg-surface-container/50 border border-surface-container-high/60">
                  <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">৩</span>
                  <div>
                    <p>
                      Step 2 ওপেন হবে। সেখানে নীল রঙের <strong>"Exchange authorization code for tokens"</strong> বাটনে চাপ দিন। নিচে <strong>"Access token"</strong> বক্সে <code className="bg-surface-container-high px-1 py-0.5 rounded font-mono text-[10.5px]">ya29...</code> লেখা টোকেন আসবে, সেটি কপি করে উপরের বক্সে পেস্ট করুন!
                    </p>
                  </div>
                </div>
              </div>

              {/* Pro-tip: New tab login alternative */}
              <div className="pt-1 border-t border-surface-container-high/40 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                <span className="text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-amber-500">lightbulb</span>
                  <span>সবচেয়ে সহজ উপায়: অ্যাপটি নতুন ট্যাবে খুলুন (যেখানে কোনো পপ-আপ আটকাবে না)</span>
                </span>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  <span>নতুন ট্যাবে খুলুন</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </a>
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-3 py-1.5 text-xs text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                id="btn-verify-and-connect-manual-token"
                disabled={isVerifyingManual || !manualToken.trim()}
                className="px-4 py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isVerifyingManual ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                    <span>যাচাই করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                    <span>যাচাই এবং কানেক্ট করুন</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Direct File Upload to Drive */}
      {hasGoogleDriveAccess && (
        <div className="p-4 rounded-xl bg-surface-container-low border border-dashed border-primary/40 hover:border-primary transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
            </div>
            <div>
              <p className="font-label-lg text-label-lg font-semibold text-on-surface">
                সরাসরি গুগল ড্রাইভে ফাইল আপলোড করুন
              </p>
              <p className="font-body-xs text-body-xs text-on-surface-variant">
                সিভি, সার্টিফিকেট বা পোর্টফোলিও (PDF, DOCX, JPG, PNG) সরাসরি আপনার নিজস্ব ড্রাইভে সেভ হবে।
              </p>
            </div>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="direct-drive-file-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-label-md font-semibold transition-all shadow-xs disabled:opacity-60 min-h-[40px] cursor-pointer"
            >
              {isUploading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  <span>ড্রাইভে আপলোড হচ্ছে...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>ফাইল নির্বাচন ও আপলোড</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Drive File List */}
      {hasGoogleDriveAccess && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-on-surface-variant px-1 font-medium">
            <span>আপনার গুগল ড্রাইভে সংরক্ষিত ফাইলসমূহ ({files.length})</span>
            {loadingFiles && <span>লোড হচ্ছে...</span>}
          </div>

          {files.length === 0 && !loadingFiles ? (
            <div className="p-6 text-center rounded-xl bg-surface-container-lowest border border-surface-container-high/30 text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl text-outline mb-1 block">
                folder_open
              </span>
              <p className="text-body-sm">এখনও গুগল ড্রাইভে কোনো ফাইল আপলোড করা হয়নি।</p>
              <p className="text-xs text-outline mt-0.5">
                সিভি তৈরি করে "Google Drive-এ সেভ" বাটনে ক্লিক করুন অথবা ওপরে ফাইল আপলোড করুন।
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-container-high/40 border border-surface-container-high/30 rounded-xl overflow-hidden">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 sm:px-4 bg-surface-container-lowest hover:bg-surface-container-low transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined text-red-500 text-[22px] shrink-0">
                      {file.mimeType?.includes('pdf') ? 'picture_as_pdf' : 'description'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-on-surface truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {file.size ? formatDriveFileSize(file.size) : 'PDF'} •{' '}
                        {file.createdTime
                          ? new Date(file.createdTime).toLocaleDateString('bn-BD', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'সাম্প্রতিক'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                        <span>ড্রাইভে দেখুন</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file.id, file.name)}
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                      title="গুগল ড্রাইভ থেকে মুছুন"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
