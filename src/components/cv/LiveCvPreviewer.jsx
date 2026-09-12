import React, { useState, useRef } from 'react';
import { exportCvToPdf, generateCvPdfBlob } from '../../utils/pdfExport';
import { uploadFileToDrive } from '../../services/googleDriveService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

/**
 * LiveCvPreviewer Component
 * Mirrors the exact structure, typography, and professional styling of the CV specification.
 * Dynamically binds to candidate profile data in real-time.
 * Supports direct high-resolution PDF download, Google Drive direct save, and native A4 print styles.
 */
export default function LiveCvPreviewer({
  data = {},
  isVerified = false,
  showControls = true,
  onPrint,
  onDownloadPdf,
  className = '',
  printableId = 'cv-printable-area',
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveSavedLink, setDriveSavedLink] = useState(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const containerRef = useRef(null);

  const { connectGoogleDrive, getGoogleAccessToken } = useAuth();
  const { showSuccess, showError } = useToast();

  // Fallback defaults for date
  const declarationDate =
    data.declarationDate ||
    new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  // Native Browser Print with strict A4 styling
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }

    const printStyle = document.createElement('style');
    printStyle.id = 'dynamic-cv-print-styles';
    printStyle.innerHTML = `
      @page {
        size: A4 portrait;
        margin: 0;
      }
      @media print {
        html, body {
          width: 210mm !important;
          height: 297mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        body * {
          visibility: hidden !important;
        }
        #${printableId}, #${printableId} * {
          visibility: visible !important;
        }
        #${printableId} {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 210mm !important;
          min-height: 297mm !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          z-index: 999999 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #cv-sidebar-panel {
          background-color: #0f172a !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #cv-preview-controls-bar, .no-print {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(printStyle);
    window.print();
    setTimeout(() => {
      const existing = document.getElementById('dynamic-cv-print-styles');
      if (existing) existing.remove();
    }, 1500);
  };

  // High-Resolution Direct PDF Download using html2canvas-pro & jsPDF
  const handleDownloadPdf = async () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }

    const element = document.getElementById(printableId);
    if (!element) return;

    setIsGeneratingPdf(true);
    const prevZoom = zoomLevel;
    setZoomLevel(1);

    // Wait for repaint to ensure unscaled capture
    await new Promise((r) => setTimeout(r, 120));

    try {
      await exportCvToPdf(printableId, data.displayName || 'Candidate');
    } catch (err) {
      console.error('PDF generation error, switching to print fallback:', err);
      handlePrint();
    } finally {
      setZoomLevel(prevZoom);
      setIsGeneratingPdf(false);
    }
  };

  // Direct Upload / Save to User's Personal Google Drive
  const handleSaveToDrive = async () => {
    const element = document.getElementById(printableId);
    if (!element) return;

    setPopupBlocked(false);
    setIsSavingToDrive(true);
    const prevZoom = zoomLevel;
    setZoomLevel(1);

    try {
      let token = getGoogleAccessToken();
      if (!token) {
        const connectRes = await connectGoogleDrive();
        if (connectRes?.error) {
          if (connectRes.rawError?.code === 'auth/popup-blocked') {
            setPopupBlocked(true);
          }
          showError(connectRes.error || 'গুগল অ্যাকাউন্টে সাইন-ইন করতে পারেনি।');
          setIsSavingToDrive(false);
          setZoomLevel(prevZoom);
          return;
        }
        token = connectRes?.accessToken || getGoogleAccessToken();
      }

      if (!token) {
        showError('Google Drive অ্যাক্সেস টোকেন পাওয়া যায়নি।');
        setIsSavingToDrive(false);
        setZoomLevel(prevZoom);
        return;
      }

      await new Promise((r) => setTimeout(r, 120));

      const { blob, filename } = await generateCvPdfBlob(
        printableId,
        data.displayName || 'Candidate'
      );

      const driveResult = await uploadFileToDrive(token, blob, filename, 'application/pdf');

      setDriveSavedLink(driveResult.webViewLink || '#');
      showSuccess(`আপনার সিভি সরাসরি আপনার ব্যক্তিগত গুগল ড্রাইভে সংরক্ষিত হয়েছে!`);
    } catch (err) {
      console.error('Google Drive save error:', err);
      showError(err.message || 'গুগল ড্রাইভে সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setZoomLevel(prevZoom);
      setIsSavingToDrive(false);
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 1.4));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div
      id="live-cv-previewer-root"
      ref={containerRef}
      className={`flex flex-col items-center w-full ${className} ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-4 overflow-y-auto'
          : ''
      }`}
    >
      {/* Top Controls Toolbar */}
      {showControls && (
        <div
          id="cv-preview-controls-bar"
          className="w-full max-w-[800px] mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface select-none shadow-xs"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-primary">
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span className="hidden sm:inline">লাইভ সিভি প্রিভিউ (Live CV)</span>
              <span className="sm:hidden">CV</span>
            </span>
            {isVerified && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold text-[10px]">
                <span className="material-symbols-outlined text-[12px] text-blue-600">verified</span>
                Verified
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-surface-container rounded-lg border border-outline-variant/30 p-0.5">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                className="w-6 h-6 flex items-center justify-center hover:bg-surface-container-high rounded text-on-surface"
              >
                <span className="material-symbols-outlined text-[14px]">remove</span>
              </button>
              <span className="px-1.5 text-[11px] font-mono min-w-[36px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                className="w-6 h-6 flex items-center justify-center hover:bg-surface-container-high rounded text-on-surface"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset Zoom (100%)"
                className="px-1 text-[10px] hover:text-primary transition-colors text-outline"
              >
                Fit
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
              className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isFullscreen ? 'close_fullscreen' : 'fullscreen'}
              </span>
            </button>

            {/* Direct PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isSavingToDrive}
              id="cv-download-pdf-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isGeneratingPdf ? 'progress_activity' : 'download'}
              </span>
              <span>{isGeneratingPdf ? 'PDF তৈরি হচ্ছে...' : 'PDF ডাউনলোড'}</span>
            </button>

            {/* Direct Google Drive Cloud Save Button */}
            <button
              type="button"
              onClick={handleSaveToDrive}
              disabled={isSavingToDrive || isGeneratingPdf}
              id="cv-save-drive-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
              title="আপনার ব্যক্তিগত গুগল ড্রাইভে সরাসরি সংরক্ষণ করুন"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5-3.42-6zm1.72 6.5l3.43 6h10L19.42 10H9.43zm7.43-6.5l-5.14 9 3.43 6 5.14-9-3.43-6z" />
              </svg>
              <span>{isSavingToDrive ? 'ড্রাইভে সেভ হচ্ছে...' : 'Drive-এ সেভ'}</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              id="cv-quick-print-btn"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
              title="প্রিন্ট ডায়ালগ খুলুন"
            >
              <span className="material-symbols-outlined text-[15px]">print</span>
              <span className="hidden sm:inline">প্রিন্ট</span>
            </button>
          </div>
        </div>
      )}

      {/* Drive Saved Link Notification */}
      {driveSavedLink && (
        <div className="w-full max-w-[800px] mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>সিভিটি সরাসরি আপনার ব্যক্তিগত Google Drive-এ সেভ করা হয়েছে।</span>
          </div>
          <a
            href={driveSavedLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition-colors shrink-0"
          >
            <span>ড্রাইভে খুলুন</span>
            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
          </a>
        </div>
      )}

      {/* Popup Blocked Warning */}
      {popupBlocked && (
        <div className="w-full max-w-[800px] mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
          <p className="font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            <span>ব্রাউজার পপ-আপ ব্লক করেছে (Popup Blocked)</span>
          </p>
          <p className="text-[11px] text-on-surface-variant">
            আইফ্রেমের ভেতর ব্রাউজার গুগল পপ-আপ ব্লক করতে পারে। ওপরে ডানপাশের "Open in new tab" বাটনে ক্লিক করে নতুন ট্যাবে খুলুন অথবা ব্রাউজার থেকে Popups Allow করুন।
          </p>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            <span>নতুন ট্যাবে খুলুন</span>
          </a>
        </div>
      )}

      {/* Printable / Live Document Canvas Container */}
      <div className="w-full overflow-x-auto pb-4 flex justify-center">
        <div
          style={{
            transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="transition-transform"
        >
          {/* Exact Standard A4 Proportions: 800px width x 1130px min-height */}
          <div
            id={printableId}
            className="w-[800px] min-h-[1130px] bg-[#ffffff] text-[#1e293b] shadow-xl overflow-hidden border border-[#e2e8f0] grid grid-cols-[260px_1fr] print:m-0 print:rounded-none print:shadow-none print:border-none"
            style={{ fontFamily: "'Poppins', 'Segoe UI', sans-serif" }}
          >
            {/* ================= LEFT SIDEBAR PANEL (#0f172a) ================= */}
            <aside
              id="cv-sidebar-panel"
              className="bg-[#0f172a] text-[#f8fafc] p-[28px_20px] flex flex-col gap-[22px] print:bg-[#0f172a]"
            >
              {/* Profile Image & Candidate Verification Badge */}
              <div className="text-center">
                {data.photoURL ? (
                  <img
                    src={data.photoURL}
                    alt={data.displayName || 'Profile Photo'}
                    className="w-[115px] h-[115px] rounded-full object-cover mx-auto border-[3px] border-[#0ea5e9] shadow-md"
                  />
                ) : (
                  <div className="w-[115px] h-[115px] rounded-full border-2 border-dashed border-[#334155] mx-auto flex flex-col items-center justify-center text-[#64748b] bg-[#1e293b]/40">
                    <span className="material-symbols-outlined text-[36px]">account_circle</span>
                    <span className="text-[10px] mt-0.5 text-[#94a3b8] font-medium">ছবি নেই</span>
                  </div>
                )}

                {isVerified && (
                  <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0369a1]/20 text-[#38bdf8] text-[11px] font-semibold border border-[#38bdf8]/40">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    <span>VERIFIED CANDIDATE</span>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="cv-side-section">
                <h3 className="text-[12.5px] font-bold uppercase text-[#38bdf8] border-b border-[#334155] pb-[5px] mb-[10px] tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">contact_page</span>
                  যোগাযোগ (Contact)
                </h3>
                <div className="space-y-[9px] text-[12px] text-[#cbd5e1] break-words">
                  {data.phone ? (
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[#38bdf8] text-[15px] shrink-0 mt-0.5">
                        call
                      </span>
                      <span>{data.phone}</span>
                    </div>
                  ) : null}
                  {data.email ? (
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[#38bdf8] text-[15px] shrink-0 mt-0.5">
                        mail
                      </span>
                      <span className="break-all">{data.email}</span>
                    </div>
                  ) : null}
                  {data.address ? (
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[#38bdf8] text-[15px] shrink-0 mt-0.5">
                        location_on
                      </span>
                      <span>{data.address}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Special Qualifications */}
              {data.specialQualifications && (
                <div className="cv-side-section">
                  <h3 className="text-[12.5px] font-bold uppercase text-[#38bdf8] border-b border-[#334155] pb-[5px] mb-[10px] tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">psychology</span>
                    Special Qualifications
                  </h3>
                  <p className="text-[11.5px] text-[#cbd5e1] leading-[1.6] whitespace-pre-line">
                    {data.specialQualifications}
                  </p>
                </div>
              )}

              {/* Language Proficiency */}
              {data.languageProficiency && (
                <div className="cv-side-section">
                  <h3 className="text-[12.5px] font-bold uppercase text-[#38bdf8] border-b border-[#334155] pb-[5px] mb-[10px] tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">translate</span>
                    Language Proficiency
                  </h3>
                  <p className="text-[11.5px] text-[#cbd5e1] leading-[1.6] whitespace-pre-line">
                    {data.languageProficiency}
                  </p>
                </div>
              )}

              {/* Personal Details */}
              {data.personalDetails && (
                <div className="cv-side-section">
                  <h3 className="text-[12.5px] font-bold uppercase text-[#38bdf8] border-b border-[#334155] pb-[5px] mb-[10px] tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">person</span>
                    Personal Details
                  </h3>
                  <p className="text-[11.5px] text-[#cbd5e1] leading-[1.6] whitespace-pre-line">
                    {data.personalDetails}
                  </p>
                </div>
              )}
            </aside>

            {/* ================= RIGHT MAIN CONTENT PANEL (#ffffff) ================= */}
            <main id="cv-main-content" className="p-[32px_28px] flex flex-col justify-between bg-[#ffffff]">
              <div className="space-y-[22px]">
                {/* Header: Name and Target Role */}
                <div className="border-b-2 border-[#e2e8f0] pb-[14px]">
                  <div className="flex items-center justify-between">
                    <h1 className="text-[25px] font-extrabold uppercase text-[#0f172a] tracking-[0.5px]">
                      {data.displayName || 'YOUR FULL NAME'}
                    </h1>
                    {isVerified && (
                      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] text-[11px] font-bold">
                        <span className="material-symbols-outlined text-[15px] text-[#2563eb]">
                          verified
                        </span>
                        <span>ACCOUNT VERIFIED</span>
                      </div>
                    )}
                  </div>
                  {data.targetRole && (
                    <h2 className="text-[13.5px] text-[#0284c7] font-semibold tracking-wide uppercase mt-1">
                      {data.targetRole}
                    </h2>
                  )}
                </div>

                {/* Career Objective */}
                {data.careerObjective && (
                  <section className="space-y-[6px]">
                    <h3 className="text-[14px] font-bold uppercase text-[#0f172a] border-b border-[#e2e8f0] pb-[4px] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0284c7] text-[17px]">
                        track_changes
                      </span>
                      Career Objective
                    </h3>
                    <p className="text-[12.5px] text-[#475569] leading-[1.65] text-justify whitespace-pre-line">
                      {data.careerObjective}
                    </p>
                  </section>
                )}

                {/* Career Summary */}
                {data.careerSummary && (
                  <section className="space-y-[6px]">
                    <h3 className="text-[14px] font-bold uppercase text-[#0f172a] border-b border-[#e2e8f0] pb-[4px] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0284c7] text-[17px]">
                        badge
                      </span>
                      Career Summary
                    </h3>
                    <p className="text-[12.5px] text-[#475569] leading-[1.65] text-justify whitespace-pre-line">
                      {data.careerSummary}
                    </p>
                  </section>
                )}

                {/* Work Experience */}
                {data.workExperience && (
                  <section className="space-y-[6px]">
                    <h3 className="text-[14px] font-bold uppercase text-[#0f172a] border-b border-[#e2e8f0] pb-[4px] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0284c7] text-[17px]">
                        work
                      </span>
                      Work Experience
                    </h3>
                    <p className="text-[12.5px] text-[#475569] leading-[1.65] whitespace-pre-line text-justify">
                      {data.workExperience}
                    </p>
                  </section>
                )}
              </div>

              {/* Declaration & Signature at bottom */}
              <section className="pt-[24px] border-t border-[#e2e8f0] mt-[20px]">
                <h3 className="text-[13px] font-bold uppercase text-[#0f172a] mb-[5px] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#0284c7] text-[15px]">
                    history_edu
                  </span>
                  Declaration
                </h3>
                <p className="text-[11.5px] text-[#64748b] italic leading-[1.55]">
                  "I hereby declare that the information provided above is true and correct to the best
                  of my knowledge and belief."
                </p>

                <div className="flex justify-between items-end mt-[28px] text-[11.5px] text-[#334155]">
                  <div>
                    <span className="font-semibold">Date:</span> {declarationDate}
                  </div>
                  <div className="text-center">
                    <div className="border-t border-[#94a3b8] w-[160px] pt-1 min-h-[28px]">
                      <span className="font-semibold uppercase tracking-wider block text-[11px]">
                        {data.displayName || 'Applicant'}
                      </span>
                      <span className="text-[9.5px] text-[#64748b]">Applicant Signature</span>
                    </div>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
