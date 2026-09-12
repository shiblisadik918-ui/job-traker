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
  const { user, hasGoogleDriveAccess, connectGoogleDrive, getGoogleAccessToken } = useAuth();
  const { showSuccess, showError } = useToast();

  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [popupBlockedWarning, setPopupBlockedWarning] = useState(false);

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
      // If 401, token might have expired
      if (err.message?.includes('expired') || err.message?.includes('401')) {
        showError('Google Drive session expired. Please reconnect.');
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (hasGoogleDriveAccess) {
      loadFiles();
    }
  }, [hasGoogleDriveAccess]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setPopupBlockedWarning(false);
    try {
      const res = await connectGoogleDrive();
      if (res.error) {
        if (res.rawError?.code === 'auth/popup-blocked' || res.error?.includes('blocked')) {
          setPopupBlockedWarning(true);
        }
        showError(res.error);
      } else if (res.accessToken) {
        showSuccess('Google Drive সফলভাবে সংযুক্ত হয়েছে!');
        loadFiles();
      }
    } catch (err) {
      showError(err.message || 'Google Drive সংযোগ ব্যর্থ হয়েছে।');
    } finally {
      setIsConnecting(false);
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
      const result = await uploadFileToDrive(
        token,
        selectedFile,
        selectedFile.name,
        selectedFile.type
      );
      showSuccess(`"${selectedFile.name}" সরাসরি আপনার গুগল ড্রাইভে সংরক্ষিত হয়েছে!`);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Refresh file list
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
            <div className="flex items-center gap-2">
              <h3 className="font-title-lg text-title-lg font-bold text-on-surface">
                ব্যক্তিগত Google Drive স্টোরেজ
              </h3>
              {hasGoogleDriveAccess ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  সংযুক্ত (Connected)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium">
                  ডিসকানেক্টেড
                </span>
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              আপনার ফাইল সরাসরি আপনার নিজস্ব ড্রাইভে জমা থাকে। কোনো অ্যাডমিন বা সার্ভারে কোনো ফাইল পাঠানো হয় না।
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {!hasGoogleDriveAccess ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-label-md font-semibold transition-all shadow-xs disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>{isConnecting ? 'সংযুক্ত হচ্ছে...' : 'Google Drive সংযুক্ত করুন'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loadFiles}
              disabled={loadingFiles}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-container-high hover:bg-surface-container text-on-surface text-label-sm font-medium transition-colors"
            >
              <span className={`material-symbols-outlined text-[16px] ${loadingFiles ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>রিফ্রেশ</span>
            </button>
          )}
        </div>
      </div>

      {/* Popup Blocked Warning Guidance */}
      {popupBlockedWarning && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-body-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400">
              warning
            </span>
            <span>পপ-আপ ব্লক হয়েছে (Popup Blocked)</span>
          </div>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            আইফ্রেম বা প্রিভিউ মোডে ব্রাউজার গুগল সাইন-ইন উইন্ডো স্বয়ংক্রিয়ভাবে ব্লক করে দিতে পারে।
            সম্পূর্ণ মসৃণ অভিজ্ঞতার জন্য ওপরে ডানপাশের <strong>"Open in new tab"</strong> বাটনে ক্লিক করে নতুন ট্যাবে খুলুন অথবা ব্রাউজার অ্যাড্রেস বার থেকে <strong>"Always allow popups"</strong> অন করুন।
          </p>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            <span>নতুন ট্যাবে অ্যাপটি খুলুন (Open in New Tab)</span>
          </a>
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
                সিভি, সার্টিফিকেট বা পোর্টফোলিও (PDF, DOCX, JPG, PNG) সরাসরি আপনার ড্রাইভে সেভ হবে।
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-label-md font-semibold transition-all shadow-xs disabled:opacity-60 min-h-[40px]"
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
                সিভি তৈরি করে "গুগল ড্রাইভে সংরক্ষণ" বাটনে ক্লিক করুন অথবা ওপরে ফাইল আপলোড করুন।
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
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors"
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
