import { createContext, useState, useCallback, useMemo } from 'react';
import Toast from '../components/common/Toast';

export const ToastContext = createContext({
  showToast: () => {},
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    if (!message) return;
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((msg) => showToast(msg, 'success', 3000), [showToast]);
  const showError = useCallback((msg) => showToast(msg, 'error', 3500), [showToast]);
  const showInfo = useCallback((msg) => showToast(msg, 'info', 3000), [showToast]);

  const value = useMemo(
    () => ({
      showToast,
      showSuccess,
      showError,
      showInfo,
    }),
    [showToast, showSuccess, showError, showInfo]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        id="toast-container"
        className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
