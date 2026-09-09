export function CardSkeleton({ count = 3 }) {
  return (
    <div id="skeleton-card-container" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 bg-surface-container-lowest rounded-2xl border border-surface-container-high/30 animate-pulse flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-surface-container shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-4 bg-surface-container rounded w-1/3" />
              <div className="h-3 bg-surface-container-low rounded w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 bg-surface-container rounded-full w-20" />
            <div className="h-6 bg-surface-container-low rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div id="skeleton-metrics-container" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high/30 animate-pulse space-y-2">
          <div className="h-3 bg-surface-container rounded w-1/2" />
          <div className="h-6 bg-surface-container rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div id="skeleton-detail-container" className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 bg-surface-container rounded w-32" />
      <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high/30 p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-container" />
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-surface-container rounded w-1/3" />
            <div className="h-4 bg-surface-container-low rounded w-1/4" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-surface-container-high/30">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-surface-container rounded w-16" />
              <div className="h-4 bg-surface-container-low rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
