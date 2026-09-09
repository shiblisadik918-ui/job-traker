import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ id, type, message, onClose }) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-lg';
      case 'error':
        return 'border-rose-200 dark:border-rose-800/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-lg';
      case 'warning':
        return 'border-amber-200 dark:border-amber-800/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-lg';
      default:
        return 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-lg';
    }
  };

  return (
    <div
      id={`toast-item-${id}`}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${getBorderColor()}`}
      role="alert"
    >
      {getIcon()}
      <div className="flex-1 text-xs font-semibold leading-snug">
        {message}
      </div>
      <button
        id={`toast-close-btn-${id}`}
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg focus:outline-none"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
