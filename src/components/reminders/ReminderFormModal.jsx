import { useState, useEffect } from 'react';
import { REMINDER_TYPES } from '../../utils/constants';

export default function ReminderFormModal({
  isOpen,
  initialData = null,
  applications = [],
  isSubmitting = false,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(initialData && initialData.id);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const defaultFormState = {
    title: '',
    date: getTodayString(),
    time: '09:00',
    type: 'Follow-up',
    applicationId: '',
    completed: false,
    notes: '',
  };

  const [formData, setFormData] = useState(defaultFormState);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        date: initialData.date || initialData.dueDate?.split('T')[0] || getTodayString(),
        time: initialData.time || '09:00',
        type: initialData.type || 'Follow-up',
        applicationId: initialData.applicationId || '',
        completed: Boolean(initialData.completed),
        notes: initialData.notes || '',
      });
    } else {
      setFormData(defaultFormState);
    }
    setValidationError('');
  }, [initialData, isOpen]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setValidationError('Reminder title is required');
      return;
    }
    onSave(formData);
  };

  return (
    <div
      id="reminder-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-inverse-surface/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="reminder-form-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-form-modal-title"
        className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">alarm</span>
            </div>
            <div>
              <h2 id="reminder-form-modal-title" className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {isEditing ? 'Edit Reminder' : 'Add Reminder'}
              </h2>
              <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                Keep track of follow-ups, interview preps, and deadlines.
              </p>
            </div>
          </div>
          <button
            id="close-reminder-form-modal-btn"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-outline hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form id="reminder-modal-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reminder-input-title"
              className="block font-label-md text-label-md text-on-surface mb-1"
            >
              Action Title <span className="text-error">*</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                edit_calendar
              </span>
              <input
                id="reminder-input-title"
                type="text"
                placeholder="e.g. Follow up with recruiter after round 2"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  setValidationError('');
                }}
                className={`w-full pl-9 pr-3 py-2 bg-surface-container-low border rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                  validationError ? 'border-error bg-error-container/20' : 'border-outline-variant/40'
                }`}
              />
            </div>
            {validationError && (
              <p className="text-[11px] text-error mt-1">{validationError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="reminder-select-type"
                className="block font-label-md text-label-md text-on-surface mb-1"
              >
                Reminder Type
              </label>
              <select
                id="reminder-select-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {REMINDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="reminder-select-application"
                className="block font-label-md text-label-md text-on-surface mb-1"
              >
                Associated Opportunity
              </label>
              <select
                id="reminder-select-application"
                value={formData.applicationId}
                onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">General / None</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.companyName} - {app.jobTitle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="reminder-input-date"
                className="block font-label-md text-label-md text-on-surface mb-1"
              >
                Due Date
              </label>
              <input
                id="reminder-input-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="reminder-input-time"
                className="block font-label-md text-label-md text-on-surface mb-1"
              >
                Time
              </label>
              <input
                id="reminder-input-time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reminder-textarea-notes"
              className="block font-label-md text-label-md text-on-surface mb-1"
            >
              Notes (Optional)
            </label>
            <textarea
              id="reminder-textarea-notes"
              rows={3}
              placeholder="Meeting links, discussion talking points, or prep tasks..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
            <button
              id="cancel-reminder-form-btn"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors min-h-[40px]"
            >
              Cancel
            </button>
            <button
              id="submit-reminder-form-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 min-h-[40px] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Reminder' : 'Save Reminder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
