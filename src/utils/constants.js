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
  'Chakri.com',
  'BPSC Portal / Teletalk',
  'Govt Official Gazette / Circular',
  'Email',
  'Referral',
  'Other',
];

export const JOB_DISTINCTION_TYPES = ['Government', 'Private'];

export const GOVT_JOB_GRADES = [
  '9th Grade (First Class / BCS)',
  '10th Grade (Second Class)',
  '11th Grade (Assistant / Sub-Inspector)',
  '12th Grade',
  '13th Grade',
  '14th Grade',
  '15th Grade',
  '16th Grade',
  '20th Grade',
  'Autonomous / Bank Officer (General/IT)',
  'Other Grade',
];

export const GOVT_PAYMENT_STATUSES = [
  'Pending',
  'Paid via Teletalk SMS',
  'Paid via Online/bKash/Nagad',
  'Exempted',
];

export const GOVT_ADMIT_CARD_STATUSES = [
  'Not Published',
  'Download Available',
  'Downloaded',
  'Center Assigned',
];

export const GOVT_STAGE_STATUSES = ['Pending', 'Passed', 'Failed', 'Appeared'];

export const DEFAULT_GOVT_EXAM_STAGES = [
  {
    id: 'prelims',
    name: 'Preliminary Exam',
    subtitle: 'MCQ Screening',
    date: '',
    center: '',
    status: 'Pending',
    notes: '',
  },
  {
    id: 'written',
    name: 'Written Exam',
    subtitle: 'Subjective / Broad Exam',
    date: '',
    center: '',
    status: 'Pending',
    notes: '',
  },
  {
    id: 'viva',
    name: 'Viva / Practical',
    subtitle: 'Oral Interview & Viva Voce',
    date: '',
    center: '',
    status: 'Pending',
    notes: '',
  },
  {
    id: 'final',
    name: 'Final Result / Recommendation',
    subtitle: 'BPSC/Ministry Merit Gazetted',
    date: '',
    center: '',
    status: 'Pending',
    notes: '',
  },
];

export const PRIVATE_ROUND_STATUSES = ['Pending', 'Passed', 'Failed', 'Scheduled', 'Completed'];

export const DEFAULT_PRIVATE_INTERVIEW_ROUNDS = [
  {
    id: 'phone_screen',
    name: 'Phone Screen',
    subtitle: 'HR / Recruiter Screening',
    date: '',
    interviewer: '',
    status: 'Pending',
    notes: '',
  },
  {
    id: 'technical_round',
    name: 'Technical Round',
    subtitle: 'Coding / Domain Knowledge',
    date: '',
    interviewer: '',
    status: 'Pending',
    notes: '',
  },
  {
    id: 'hr_round',
    name: 'HR Round',
    subtitle: 'Culture Fit & Compensation',
    date: '',
    interviewer: '',
    status: 'Pending',
    notes: '',
  },
  {
    id: 'final_offer',
    name: 'Final Offer',
    subtitle: 'Offer Letter & Negotiation',
    date: '',
    interviewer: '',
    status: 'Pending',
    notes: '',
  },
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

