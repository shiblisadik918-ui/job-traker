import { useState, useEffect } from 'react';
import { APPLICATION_STATUSES } from '../../utils/constants';

const COMMON_MILESTONE_TYPES = [
  ...APPLICATION_STATUSES,
  'Screening Call',
  'Technical Assessment',
  'System Design Round',
  'Hiring Manager Chat',
  'Executive Round',
  'Reference Check',
  'Follow-up Sent',
  'Offer Received',
  'Offer Negotiation',
  'Note Logged',
];

export default function TimelineEventModal({
  isOpen,
  initialData = null,
  isSubmitting = false,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(initialData && initialData.index !== undefined);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    status: 'Applied',
    date: getTodayString(),
    notes: '',
  });
  const [customStatus, setCustomStatus] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      const isKnown = COMMON_MILESTONE_TYPES.includes(initialData.status);
      setFormData({
        status: isKnown ? initialData.status : 'Custom',
        date: initialData.date ? initialData.date.split('T')[0] : getTodayString(),
        notes: initialData.notes || '',
      });
      if (!isKnown && initialData.status) {
        setIsCustom(true);
        setCustomStatus(initialData.status);
      } else {
        setIsCustom(false);
        setCustomStatus('');
      }
    } else {
      setFormData({
        status: 'Screening Call',
        date: getTodayString(),
        notes: '',
      });
      setIsCustom(false);
      setCustomStatus('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalStatus = isCustom ? customStatus.trim() : formData.status;
    if (!finalStatus) {
      setError('Please select or specify a milestone status/title.');
      return;
    }
    if (!formData.date) {
      setError('Please provide a milestone date.');
      return;
    }

    onSave({
      status: finalStatus,
      date: formData.date,
      notes: formData.notes,
    });
  };

  return (
    <div
      id="timeline-event-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-inverse-surface/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="timeline-event-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="timeline-modal-title"
        className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm shadow-xs">
              <span className="material-symbols-outlined text-[20px]">
                {isEditing ? 'edit_calendar' : 'add_task'}
              </span>
            </div>
            <div>
              <h3 id="timeline-modal-title" className="font-headline-sm text-headline-sm text-on-surface">
                {isEditing ? 'Edit Milestone' : 'Add Milestone Event'}
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant">
                {isEditing ? 'Modify milestone details or candidate notes.' : 'Log a key progress event in this application.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Milestone Stage / Action <span className="text-error">*</span>
            </label>
            <select
              value={isCustom ? 'Custom' : formData.status}
              onChange={(e) => {
                if (e.target.value === 'Custom') {
                  setIsCustom(true);
                } else {
                  setIsCustom(false);
                  setFormData((prev) => ({ ...prev, status: e.target.value }));
                }
              }}
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {COMMON_MILESTONE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value="Custom">Custom Event Title...</option>
            </select>
          </div>

          {isCustom && (
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Custom Event Title <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="e.g. Portfolio Review, Take-Home Submitted"
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Date <span className="text-error">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Milestone Notes / Feedback
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Positive discussion on system architecture; next round scheduled next Tuesday."
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary active:scale-[0.98] rounded-xl shadow-xs transition-all font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isEditing ? 'check' : 'add'}
              </span>
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Save Milestone' : 'Add Milestone'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
