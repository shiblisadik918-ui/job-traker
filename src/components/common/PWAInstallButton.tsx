import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition"
      >
        <span className="material-symbols-outlined text-[18px]">download</span>
        Install App
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg border border-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[16px]">ios_share</span>
          Install on iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest p-6 shadow-xl border border-surface-container-high/30">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_to_home_screen</span>
                Install on iPhone / iPad
              </h3>
              <div className="mt-4 space-y-3 text-sm text-on-surface-variant bg-surface-container p-4 rounded-xl">
                <p className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-surface-container-highest text-xs font-bold shrink-0 mt-0.5">1</span>
                  <span>Tap the <strong>Share</strong> button in the Safari browser toolbar.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-surface-container-highest text-xs font-bold shrink-0 mt-0.5">2</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-surface-container-high py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
