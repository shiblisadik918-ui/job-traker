/**
 * Calendar Helper Utility
 * Generates Google Calendar URL and creates downloadable .ics files
 */

/**
 * Format a date string or timestamp into iCal / Google format (YYYYMMDDTHHmmSSZ or YYYYMMDD)
 */
function formatToCalDate(dateInput, timeStr = '10:00') {
  if (!dateInput) {
    const now = new Date();
    return now.toISOString().replace(/-|:|\.\d+/g, '');
  }

  try {
    let year, month, day;
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
      const parts = dateInput.split('-');
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    } else {
      const d = new Date(dateInput);
      year = d.getFullYear();
      month = String(d.getMonth() + 1).padStart(2, '0');
      day = String(d.getDate()).padStart(2, '0');
    }

    const [hours, minutes] = (timeStr || '10:00').split(':');
    const h = (hours || '10').padStart(2, '0');
    const m = (minutes || '00').padStart(2, '0');

    // Create a local date and return local representation
    return `${year}${month}${day}T${h}${m}00`;
  } catch {
    const now = new Date();
    return now.toISOString().replace(/-|:|\.\d+/g, '');
  }
}

/**
 * Generate Google Calendar Web URL
 */
export function generateGoogleCalendarUrl({
  title,
  description = '',
  location = '',
  date,
  time = '10:00',
  durationMinutes = 60,
}) {
  const startCal = formatToCalDate(date, time);
  
  // End time calculation
  const [h, m] = (time || '10:00').split(':').map(Number);
  const endMinutesTotal = (h * 60 + m + (durationMinutes || 60));
  const endH = String(Math.floor(endMinutesTotal / 60) % 24).padStart(2, '0');
  const endM = String(endMinutesTotal % 60).padStart(2, '0');
  const endCal = formatToCalDate(date, `${endH}:${endM}`);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Job Interview / Task',
    details: description || '',
    location: location || 'Online / Video Call',
    dates: `${startCal}/${endCal}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate and download .ics iCalendar file (compatible with Apple Calendar, Outlook, Google Calendar)
 */
export function downloadIcsFile({
  title,
  description = '',
  location = '',
  date,
  time = '10:00',
  durationMinutes = 60,
}) {
  const startCal = formatToCalDate(date, time);
  const [h, m] = (time || '10:00').split(':').map(Number);
  const endMinutesTotal = (h * 60 + m + (durationMinutes || 60));
  const endH = String(Math.floor(endMinutesTotal / 60) % 24).padStart(2, '0');
  const endM = String(endMinutesTotal % 60).padStart(2, '0');
  const endCal = formatToCalDate(date, `${endH}:${endM}`);

  const uid = `jobtrack-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@jobtrack.app`;
  const cleanDescription = (description || '').replace(/\n/g, '\\n');
  const cleanLocation = (location || 'Online').replace(/\n/g, ' ');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JobTrack//Job Interview Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatToCalDate(new Date().toISOString().split('T')[0], '12:00')}`,
    `DTSTART:${startCal}`,
    `DTEND:${endCal}`,
    `SUMMARY:${title || 'Job Interview'}`,
    `DESCRIPTION:${cleanDescription}`,
    `LOCATION:${cleanLocation}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const icsData = icsLines.join('\r\n');
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${(title || 'interview').toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
