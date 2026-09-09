import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDisplayDate } from '../../utils/constants';

const KANBAN_COLUMNS = [
  {
    id: 'Applied',
    title: 'Applied',
    color: 'border-t-sky-500',
    bgBadge: 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300',
    dotColor: 'bg-sky-500',
  },
  {
    id: 'Shortlisted',
    title: 'Shortlisted',
    color: 'border-t-indigo-500',
    bgBadge: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
    dotColor: 'bg-indigo-500',
  },
  {
    id: 'Interview',
    title: 'Interview',
    color: 'border-t-amber-500',
    bgBadge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'Offer',
    title: 'Offer',
    color: 'border-t-emerald-500',
    bgBadge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'Rejected',
    title: 'Archived',
    color: 'border-t-slate-400',
    bgBadge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    dotColor: 'bg-slate-400',
  },
];

const MONOGRAM_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
];

export default function KanbanBoard({
  applications = [],
  onStatusChange,
  onEdit,
  onDelete,
  onAdd,
}) {
  const [draggedAppId, setDraggedAppId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);
  const [movingAppId, setMovingAppId] = useState(null);

  const getMonogram = (name) => {
    if (!name) return 'JB';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getMonogramStyle = (name) => {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
    }
    return MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length];
  };

  // Drag Handlers
  const handleDragStart = (e, app) => {
    setDraggedAppId(app.id);
    e.dataTransfer.setData('text/plain', app.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = (e, colId) => {
    if (dragOverColId === colId) {
      setDragOverColId(null);
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColId(null);
    const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
    setDraggedAppId(null);

    if (!appId || !targetStatus) return;

    const currentApp = applications.find((a) => a.id === appId);
    if (!currentApp || currentApp.status === targetStatus) return;

    setMovingAppId(appId);
    await onStatusChange(appId, targetStatus);
    setMovingAppId(null);
  };

  const handleQuickMove = async (appId, targetStatus) => {
    setMovingAppId(appId);
    await onStatusChange(appId, targetStatus);
    setMovingAppId(null);
  };

  return (
    <div
      id="kanban-board-container"
      className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3.5 items-start overflow-x-auto pb-4"
    >
      {KANBAN_COLUMNS.map((col) => {
        const colApps = applications.filter((app) => app.status === col.id);
        const isTarget = dragOverColId === col.id;

        return (
          <div
            key={col.id}
            id={`kanban-column-${col.id}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={(e) => handleDragLeave(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col rounded-2xl bg-surface-container-low/60 border border-surface-container-high/40 transition-all min-h-[460px] max-h-[780px] overflow-hidden ${
              isTarget
                ? 'ring-2 ring-primary border-primary bg-primary-fixed/20 shadow-md'
                : ''
            }`}
          >
            {/* Column Header */}
            <div
              className={`p-3 border-t-4 ${col.color} border-b border-surface-container-high/40 bg-surface-container-lowest flex items-center justify-between gap-2`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dotColor}`}></span>
                <h3 className="font-headline-sm text-xs font-bold text-on-surface uppercase tracking-wider">
                  {col.title}
                </h3>
                <span className={`px-1.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${col.bgBadge}`}>
                  {colApps.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onAdd(col.id)}
                className="p-1 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors"
                title={`Add application to ${col.title}`}
                aria-label={`Add application to ${col.title}`}
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>

            {/* Column Body / Draggable Cards Stream */}
            <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 divide-y-0">
              {colApps.length === 0 ? (
                <div className="h-40 border-2 border-dashed border-outline-variant/30 rounded-xl flex flex-col items-center justify-center text-center p-3 text-outline">
                  <span className="material-symbols-outlined text-[24px] mb-1 opacity-50">
                    inbox
                  </span>
                  <p className="text-[11px]">No applications here</p>
                  <p className="text-[10px] text-outline/80">Drag a card or click + to add</p>
                </div>
              ) : (
                colApps.map((app) => {
                  const isMoving = movingAppId === app.id;
                  const isBeingDragged = draggedAppId === app.id;

                  return (
                    <div
                      key={app.id}
                      id={`kanban-card-${app.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app)}
                      className={`p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing group space-y-2 ${
                        isBeingDragged ? 'opacity-40 scale-95 border-dashed border-primary' : ''
                      } ${isMoving ? 'animate-pulse' : ''}`}
                    >
                      {/* Card Header: Monogram & Company */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${getMonogramStyle(
                              app.companyName
                            )}`}
                          >
                            {getMonogram(app.companyName)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-label-md text-xs font-bold text-on-surface truncate">
                              {app.companyName}
                            </h4>
                            <p className="font-body-sm text-[11px] text-on-surface-variant truncate">
                              {app.jobTitle}
                            </p>
                          </div>
                        </div>

                        {app.priority && (
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                              app.priority === 'High'
                                ? 'bg-error-container text-on-error-container'
                                : app.priority === 'Medium'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-surface-container text-outline'
                            }`}
                          >
                            {app.priority}
                          </span>
                        )}
                      </div>

                      {/* Location & Modality Badges */}
                      <div className="flex items-center gap-1.5 text-[10px] text-outline flex-wrap font-body-sm">
                        {app.location && (
                          <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                            <span className="material-symbols-outlined text-[12px]">location_on</span>
                            <span className="truncate">{app.location}</span>
                          </span>
                        )}
                        {app.jobType && (
                          <span className="px-1.5 py-0.2 rounded bg-surface-container-low text-on-surface-variant font-medium">
                            {app.jobType}
                          </span>
                        )}
                      </div>

                      {/* Salary Tag */}
                      {app.salary && (
                        <div className="font-mono-metric text-[11px] font-semibold text-secondary flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">payments</span>
                          <span>{app.salary}</span>
                        </div>
                      )}

                      {/* Footer: Date & Stage Mover / Actions */}
                      <div className="pt-2 border-t border-surface-container-high/30 flex items-center justify-between gap-1 text-[11px]">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30"
                          title={`Applied: ${formatDisplayDate(app.applicationDate)}`}
                        >
                          <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                          <span>{formatDisplayDate(app.applicationDate)}</span>
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Quick Stage Mover select */}
                          <select
                            value={app.status}
                            onChange={(e) => handleQuickMove(app.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] bg-surface-container-low border border-outline-variant/30 rounded px-1 py-0.5 text-on-surface font-semibold focus:outline-none"
                            title="Move stage"
                          >
                            <option value="Applied">Applied</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Interview">Interview</option>
                            <option value="Offer">Offer</option>
                            <option value="Rejected">Archived</option>
                          </select>

                          <Link
                            to={`/applications/${app.id}`}
                            className="p-1 text-outline hover:text-primary transition-colors"
                            title="Open application"
                          >
                            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => onEdit(app)}
                            className="p-1 text-outline hover:text-on-surface transition-colors"
                            title="Edit details"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDelete(app)}
                            className="p-1 text-outline hover:text-error transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
