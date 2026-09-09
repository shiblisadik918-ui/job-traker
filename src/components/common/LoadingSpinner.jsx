export default function LoadingSpinner({
  message = 'Loading...',
  fullScreen = false,
  size = 'md',
}) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        id="loading-spinner-circle"
        className={`animate-spin rounded-full border-blue-600 border-t-transparent ${sizeClasses[size] || sizeClasses.md}`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p id="loading-spinner-message" className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 tracking-normal">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        id="loading-screen-container"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xs min-h-screen"
      >
        {spinner}
      </div>
    );
  }

  return (
    <div id="loading-inline-container" className="py-12 flex items-center justify-center w-full">
      {spinner}
    </div>
  );
}
