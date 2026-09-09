import { useEffect } from 'react';

export default function ConfirmationModal({
  isOpen,
  title = 'Delete this item?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isConfirming = false,
  onConfirm,
  onCancel,
  confirmVariant = 'danger',
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isConfirming) {
        onCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirming, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      id="confirmation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-inverse-surface/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        id="confirmation-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-message"
        className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">warning</span>
            </div>
            <div>
              <h3 id="confirmation-modal-title" className="font-headline-sm text-headline-sm text-on-surface font-bold leading-snug">
                {title}
              </h3>
              <p id="confirmation-modal-message" className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {message}
              </p>
            </div>
          </div>
          <button
            id="confirmation-modal-close-btn"
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="text-outline hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
          <button
            id="confirmation-modal-cancel-btn"
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="px-4 py-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors disabled:opacity-50 min-h-[40px]"
          >
            {cancelText}
          </button>
          <button
            id="confirmation-modal-confirm-btn"
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`px-4 py-2 font-label-md text-label-md font-semibold text-white rounded-xl shadow-xs transition-all disabled:opacity-50 min-h-[40px] ${
              confirmVariant === 'danger'
                ? 'bg-error hover:bg-error/90'
                : 'bg-primary-container text-on-primary hover:bg-primary'
            }`}
          >
            {isConfirming ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
