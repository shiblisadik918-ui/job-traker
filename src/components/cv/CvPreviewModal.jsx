import React, { useEffect, useState, useRef } from 'react';
import LiveCvPreviewer from './LiveCvPreviewer';
import { exportCvToPdf, generateCvPdfBlob } from '../../utils/pdfExport';
import { uploadFileToDrive } from '../../services/googleDriveService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

/**
 * CvPreviewModal Component
 * Displays the Live CV only on-demand when the user clicks Preview.
 * Includes direct PDF download, Google Drive direct cloud save, print, zoom, and auto-fit controls.
 */
export default function CvPreviewModal({
  isOpen,
  onClose,
  data = {},
  isVerified = false,
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveSavedUrl, setDriveSavedUrl] = useState(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const modalContentRef = useRef(null);

  const { connectGoogleDrive, getGoogleAccessToken, hasGoogleDriveAccess } = useAuth();
  const { showSuccess, showError } = useToast();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Auto-fit zoom on mount or resize
  useEffect(() => {
    if (!isOpen) return;

    const computeAutoFit = () => {
      const screenWidth = window.innerWidth;
      // CV is 800px wide. On screens narrower than 860px, scale down smoothly.
      if (screenWidth < 860) {
        const calculatedScale = Math.max(0.45, (screenWidth - 32) / 820);
        setZoomLevel(Number(calculatedScale.toFixed(2)));
      } else {
        setZoomLevel(1);
      }
    };

    computeAutoFit();
    window.addEventListener('resize', computeAutoFit);
    return () => window.removeEventListener('resize', computeAutoFit);
  }, [isOpen]);

  if (!isOpen) return null;

  // Direct PDF Download Handler using html2canvas-pro and jsPDF (supports oklch & modern CSS)
  const handleDownloadPdf = async () => {
    const printableEl = document.getElementById('modal-cv-printable-area');
    if (!printableEl) return;

    setIsGeneratingPdf(true);
    const prevZoom = zoomLevel;
    setZoomLevel(1);

    await new Promise((r) => setTimeout(r, 120));

    try {
      await exportCvToPdf('modal-cv-printable-area', data.displayName || 'Candidate');
    } catch (err) {
      console.error('Modal PDF generation error, falling back to print dialog:', err);
      handlePrint();
    } finally {
      setZoomLevel(prevZoom);
      setIsGeneratingPdf(false);
    }
  };

  // Direct Save to User's Personal Google Drive
  const handleSaveToDrive = async () => {
    const printableEl = document.getElementById('modal-cv-printable-area');
    if (!printableEl) return;

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
        showError('Google Drive অ্যাক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
        setIsSavingToDrive(false);
        setZoomLevel(prevZoom);
        return;
      }

      await new Promise((r) => setTimeout(r, 120));

      const { blob, filename } = await generateCvPdfBlob(
        'modal-cv-printable-area',
        data.displayName || 'Candidate'
      );

      const driveResult = await uploadFileToDrive(token, blob, filename, 'application/pdf');

      setDriveSavedUrl(driveResult.webViewLink || '#');
      showSuccess(`আপনার সিভি সরাসরি নিজস্ব গুগল ড্রাইভে সংরক্ষিত হয়েছে!`);
    } catch (err) {
      console.error('Google Drive save error:', err);
      showError(err.message || 'গুগল ড্রাইভে সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setZoomLevel(prevZoom);
      setIsSavingToDrive(false);
    }
  };

  const handlePrint = () => {
    const printStyle = document.createElement('style');
    printStyle.id = 'modal-cv-print-styles';
    printStyle.innerHTML = `
      @page {
        size: A4 portrait;
        margin: 0;
      }
      @media print {
        body * {
          visibility: hidden !important;
        }
        #modal-cv-printable-area, #modal-cv-printable-area * {
          visibility: visible !important;
        }
        #modal-cv-printable-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 210mm !important;
          min-height: 297mm !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
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
        .no-print, #modal-header-toolbar {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(printStyle);
    window.print();
    setTimeout(() => {
      const existing = document.getElementById('modal-cv-print-styles');
      if (existing) existing.remove();
    }, 1500);
  };

  return (
    <div
      id="cv-preview-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target.id === 'cv-preview-modal-overlay') onClose();
      }}
    >
      {/* Top Floating Control Bar */}
      <div
        id="modal-header-toolbar"
        className="sticky top-0 z-20 w-full bg-slate-900/95 border-b border-slate-800 text-white px-4 py-3 shadow-lg flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">badge</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">সিভি প্রিভিউ (Live CV Preview)</h2>
              {isVerified && (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold border border-sky-500/30 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  ভেরিফাইড
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {data.displayName ? `${data.displayName} এর প্রফেশনাল A4 ফরম্যাট সিভি` : 'প্রোফাইল থেকে তথ্য লোড হচ্ছে'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.45, z - 0.1))}
              title="Zoom Out"
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-700 rounded text-slate-300"
            >
              <span className="material-symbols-outlined text-[15px]">remove</span>
            </button>
            <span className="px-2 font-mono text-[11px] text-slate-200 min-w-[42px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              title="Zoom In"
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-700 rounded text-slate-300"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="px-2 py-1 text-[11px] hover:text-sky-400 text-slate-400 transition-colors"
            >
              ১০০%
            </button>
          </div>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || isSavingToDrive}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-md disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isGeneratingPdf ? 'progress_activity' : 'download'}
            </span>
            <span>{isGeneratingPdf ? 'PDF প্রস্তুত হচ্ছে...' : 'PDF ডাউনলোড'}</span>
          </button>

          {/* Direct Google Drive Cloud Save Button */}
          <button
            type="button"
            onClick={handleSaveToDrive}
            disabled={isSavingToDrive || isGeneratingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs transition-all shadow-md disabled:opacity-50"
            title="আপনার নিজস্ব গুগল ড্রাইভে সরাসরি সংরক্ষণ করুন"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5-3.42-6zm1.72 6.5l3.43 6h10L19.42 10H9.43zm7.43-6.5l-5.14 9 3.43 6 5.14-9-3.43-6z" />
            </svg>
            <span>{isSavingToDrive ? 'ড্রাইভে সেভ হচ্ছে...' : 'Google Drive-এ সেভ'}</span>
          </button>

          {/* Native Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span className="hidden md:inline">প্রিন্ট</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span>বন্ধ করুন</span>
          </button>
        </div>
      </div>

      {/* Success Notification with direct Drive View link */}
      {driveSavedUrl && (
        <div className="w-full max-w-4xl mt-3 px-4">
          <div className="p-3 bg-blue-900/60 border border-blue-500/40 rounded-xl flex items-center justify-between gap-3 text-white text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
              <span>আপনার সিভি সরাসরি আপনার ব্যক্তিগত গুগল ড্রাইভে সফলভাবে সংরক্ষিত হয়েছে!</span>
            </div>
            <a
              href={driveSavedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold shrink-0 transition-colors"
            >
              <span>ড্রাইভে দেখুন</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>
        </div>
      )}

      {/* Popup Blocked Warning */}
      {popupBlocked && (
        <div className="w-full max-w-4xl mt-3 px-4">
          <div className="p-3.5 bg-amber-900/80 border border-amber-500/50 rounded-xl text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">warning</span>
              <span>ব্রাউজার পপ-আপ ব্লক করেছে (Popup Blocked)</span>
            </div>
            <p>
              আইফ্রেম প্রিভিউতে ব্রাউজার গুগল সাইন-ইন উইন্ডো বন্ধ করে দিতে পারে। সম্পূর্ণ মসৃণভাবে গুগল ড্রাইভ ব্যবহারের জন্য অ্যাপটি নতুন ব্রাউজার ট্যাবে খুলুন:
            </p>
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold text-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              <span>নতুন ট্যাবে খুলুন (Open in New Tab)</span>
            </a>
          </div>
        </div>
      )}

      {/* Modal Content / Printable CV Preview Area */}
      <div
        ref={modalContentRef}
        className="w-full max-w-6xl py-6 px-2 sm:px-6 flex flex-col items-center justify-start overflow-x-auto"
      >
        <div
          style={{
            transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            marginBottom: zoomLevel < 1 ? `-${Math.round((1 - zoomLevel) * 1130)}px` : '0px',
          }}
          className="transition-transform duration-150"
        >
          <LiveCvPreviewer
            data={data}
            isVerified={isVerified}
            showControls={false}
            printableId="modal-cv-printable-area"
            onDownloadPdf={handleDownloadPdf}
            onPrint={handlePrint}
          />
        </div>
      </div>
    </div>
  );
}
