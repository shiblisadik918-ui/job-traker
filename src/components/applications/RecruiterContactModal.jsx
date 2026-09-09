import { useState, useEffect } from 'react';

export default function RecruiterContactModal({
  isOpen,
  initialData = null,
  isSubmitting = false,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(initialData && (initialData.recruiterName || initialData.recruiterEmail));

  const [formData, setFormData] = useState({
    recruiterName: '',
    recruiterEmail: '',
    recruiterRole: '',
    recruiterPhone: '',
    recruiterNotes: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        recruiterName: initialData.recruiterName || '',
        recruiterEmail: initialData.recruiterEmail || '',
        recruiterRole: initialData.recruiterRole || '',
        recruiterPhone: initialData.recruiterPhone || '',
        recruiterNotes: initialData.recruiterNotes || '',
      });
    } else {
      setFormData({
        recruiterName: '',
        recruiterEmail: '',
        recruiterRole: '',
        recruiterPhone: '',
        recruiterNotes: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      id="recruiter-contact-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-inverse-surface/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="recruiter-contact-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recruiter-modal-title"
        className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center font-bold text-sm shadow-xs">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
            <div>
              <h3 id="recruiter-modal-title" className="font-headline-sm text-headline-sm text-on-surface">
                {isEditing ? 'Edit Recruiter Contact' : 'Add Recruiter Contact'}
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Manage point-of-contact details for this hiring pipeline.
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

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Contact Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.recruiterName}
              onChange={(e) => setFormData((prev) => ({ ...prev, recruiterName: e.target.value }))}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Role / Title
            </label>
            <input
              type="text"
              value={formData.recruiterRole}
              onChange={(e) => setFormData((prev) => ({ ...prev, recruiterRole: e.target.value }))}
              placeholder="e.g. Senior Technical Recruiter"
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.recruiterEmail}
              onChange={(e) => setFormData((prev) => ({ ...prev, recruiterEmail: e.target.value }))}
              placeholder="recruiter@company.com"
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Phone / LinkedIn
            </label>
            <input
              type="text"
              value={formData.recruiterPhone}
              onChange={(e) => setFormData((prev) => ({ ...prev, recruiterPhone: e.target.value }))}
              placeholder="e.g. +1 (555) 234-5678"
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                {isEditing ? 'check' : 'person_add'}
              </span>
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Contact' : 'Save Contact'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
