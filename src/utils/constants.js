/**
 * JobTrack Core Constants and Domain Enums
 * Version 1 - Foundational Schema
 */

export const APPLICATION_STATUSES = [
  'Saved',
  'Applied',
  'Shortlisted',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
];

export const STATUS_COLORS = {
  Saved: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
  },
  Applied: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  Shortlisted: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  Interview: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  Offer: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Rejected: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  Withdrawn: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
};

export const JOB_TYPES = [
  'Full-time',
  'Part-time',
  'Internship',
  'Contract',
  'Remote',
];

export const APPLICATION_SOURCES = [
  'Company Website',
  'LinkedIn',
  'Bdjobs',
  'Email',
  'Referral',
  'Other',
];

export const PRIORITY_LEVELS = [
  'Low',
  'Medium',
  'High',
];

export const PRIORITY_COLORS = {
  Low: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    badge: 'border-slate-200 text-slate-700',
  },
  Medium: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    badge: 'border-amber-200 text-amber-800',
  },
  High: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    badge: 'border-rose-200 text-rose-800',
  },
};

export const REMINDER_TYPES = [
  'Follow-up',
  'Interview',
  'Deadline',
  'Custom',
];

export const REMINDER_TYPE_COLORS = {
  'Follow-up': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  Interview: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  Deadline: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  Custom: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
};

export const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'company_asc', label: 'Company A–Z' },
  { id: 'company_desc', label: 'Company Z–A' },
];

/**
 * Helper to format date strings for display (e.g. "08 Sep 2026")
 */
export function formatDisplayDate(dateInput) {
  if (!dateInput) return 'Not specified';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

