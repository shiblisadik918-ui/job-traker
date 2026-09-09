import { generateGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendarHelper';

export default function CalendarExportButtons({
  title,
  description,
  location,
  date,
  time = '10:00',
  durationMinutes = 60,
  variant = 'compact', // 'compact' | 'full'
}) {
  const gcalUrl = generateGoogleCalendarUrl({
    title,
    description,
    location,
    date,
    time,
    durationMinutes,
  });

  const handleDownloadIcs = (e) => {
    e.stopPropagation();
    downloadIcsFile({
      title,
      description,
      location,
      date,
      time,
      durationMinutes,
    });
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <a
          href={gcalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-[11px] font-semibold border border-outline-variant/30"
          title="Add event to Google Calendar"
        >
          <span className="material-symbols-outlined text-[14px] text-primary">calendar_today</span>
          <span className="hidden sm:inline">Google Cal</span>
        </a>

        <button
          type="button"
          onClick={handleDownloadIcs}
          className="p-1.5 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-colors border border-outline-variant/30"
          title="Download .ics calendar invite (Outlook/Apple)"
        >
          <span className="material-symbols-outlined text-[14px]">event_available</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
      <a
        href={gcalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-xs font-semibold border border-outline-variant/40"
      >
        <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
        <span>Google Calendar</span>
      </a>

      <button
        type="button"
        onClick={handleDownloadIcs}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-xs font-semibold border border-outline-variant/40"
      >
        <span className="material-symbols-outlined text-[16px]">download</span>
        <span>Download .ics File</span>
      </button>
    </div>
  );
}
