import { useState, useEffect } from 'react';
import {
  APPLICATION_STATUSES,
  JOB_TYPES,
  APPLICATION_SOURCES,
  PRIORITY_LEVELS,
} from '../../utils/constants';

export default function ApplicationFormModal({
  isOpen,
  initialData = null,
  isSubmitting = false,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(initialData && initialData.id);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const defaultFormState = {
    companyName: '',
    jobTitle: '',
    companyLogo: '',
    location: '',
    jobType: 'Full-time',
    jobUrl: '',
    applicationDate: getTodayString(),
    status: 'Applied',
    priority: 'Medium',
    deadline: '',
    applicationSource: 'LinkedIn',
    salary: '',
    notes: '',
    recruiterName: '',
    recruiterEmail: '',
    recruiterRole: '',
  };

  const [formData, setFormData] = useState(defaultFormState);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        companyName: initialData.companyName || '',
        jobTitle: initialData.jobTitle || '',
        companyLogo: initialData.companyLogo || '',
        location: initialData.location || '',
        jobType: initialData.jobType || 'Full-time',
        jobUrl: initialData.jobUrl || '',
        applicationDate: initialData.applicationDate || getTodayString(),
        status: initialData.status || 'Applied',
        priority: initialData.priority || 'Medium',
        deadline: initialData.deadline || '',
        applicationSource: initialData.applicationSource || 'LinkedIn',
        salary: initialData.salary || '',
        notes: initialData.notes || '',
        recruiterName: initialData.recruiterName || '',
        recruiterEmail: initialData.recruiterEmail || '',
        recruiterRole: initialData.recruiterRole || '',
      });
    } else {
      setFormData(defaultFormState);
    }
    setValidationErrors({});
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    }
    if (!formData.jobTitle.trim()) {
      errors.jobTitle = 'Job title is required';
    }
    if (!formData.applicationDate) {
      errors.applicationDate = 'Application date is required';
    }
    if (!formData.status) {
      errors.status = 'Status is required';
    }
    if (formData.jobUrl && formData.jobUrl.trim()) {
      const url = formData.jobUrl.trim();
      if (!/^https?:\/\/.+/i.test(url)) {
        errors.jobUrl = 'URL must start with http:// or https://';
      }
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    onSave(formData);
  };

  const monogram = formData.companyName
    ? formData.companyName.trim().slice(0, 2).toUpperCase()
    : 'JT';

  return (
    <div
      id="application-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-inverse-surface/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="application-form-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-form-modal-title"
        className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl max-w-2xl w-full my-6 p-5 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm tracking-tight shrink-0 shadow-xs">
              {monogram}
            </div>
            <div>
              <h2 id="application-form-modal-title" className="font-headline-sm text-headline-sm text-on-surface">
                {isEditing ? 'Edit Opportunity' : 'Track New Opportunity'}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {isEditing
                  ? 'Update role metadata, timelines, and candidate notes.'
                  : 'Record details, set reminders, and initiate your pipeline telemetry.'}
              </p>
            </div>
          </div>
          <button
            id="close-application-form-modal-btn"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-outline hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container transition-colors focus:outline-none"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form id="application-modal-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Company & Role */}
          <div className="space-y-3.5">
            <h3 className="font-label-sm text-label-sm text-primary uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-[16px]">domain</span>
              <span>Company & Role</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Company Name */}
              <div>
                <label
                  htmlFor="input-company-name"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Company Name <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                    business
                  </span>
                  <input
                    id="input-company-name"
                    name="companyName"
                    type="text"
                    placeholder="e.g. Stripe, Figma, Vercel"
                    value={formData.companyName}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 bg-surface-container-low border rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      validationErrors.companyName
                        ? 'border-error bg-error-container/20'
                        : 'border-outline-variant/50'
                    }`}
                  />
                </div>
                {validationErrors.companyName && (
                  <p className="text-[11px] text-error mt-1">{validationErrors.companyName}</p>
                )}
              </div>

              {/* Job Title */}
              <div>
                <label
                  htmlFor="input-job-title"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Job Title <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                    badge
                  </span>
                  <input
                    id="input-job-title"
                    name="jobTitle"
                    type="text"
                    placeholder="e.g. Senior Frontend Engineer"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 bg-surface-container-low border rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      validationErrors.jobTitle
                        ? 'border-error bg-error-container/20'
                        : 'border-outline-variant/50'
                    }`}
                  />
                </div>
                {validationErrors.jobTitle && (
                  <p className="text-[11px] text-error mt-1">{validationErrors.jobTitle}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="input-location"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Location / Modality
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                    location_on
                  </span>
                  <input
                    id="input-location"
                    name="location"
                    type="text"
                    placeholder="e.g. Remote or San Francisco, CA"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Job Type */}
              <div>
                <label
                  htmlFor="select-job-type"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Job Type
                </label>
                <select
                  id="select-job-type"
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {JOB_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Job URL */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="input-job-url"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Job Posting URL
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                    link
                  </span>
                  <input
                    id="input-job-url"
                    name="jobUrl"
                    type="url"
                    placeholder="https://company.com/careers/..."
                    value={formData.jobUrl}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 bg-surface-container-low border rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      validationErrors.jobUrl
                        ? 'border-error bg-error-container/20'
                        : 'border-outline-variant/50'
                    }`}
                  />
                </div>
                {validationErrors.jobUrl && (
                  <p className="text-[11px] text-error mt-1">{validationErrors.jobUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Pipeline Stage & Timeline */}
          <div className="space-y-3.5 pt-2 border-t border-surface-container">
            <h3 className="font-label-sm text-label-sm text-primary uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-[16px]">timeline</span>
              <span>Pipeline Stage &amp; Timeline</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Status */}
              <div>
                <label
                  htmlFor="select-status"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Stage <span className="text-error">*</span>
                </label>
                <select
                  id="select-status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Application Date */}
              <div>
                <label
                  htmlFor="input-application-date"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Application Date <span className="text-error">*</span>
                </label>
                <input
                  id="input-application-date"
                  name="applicationDate"
                  type="date"
                  value={formData.applicationDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Priority */}
              <div>
                <label
                  htmlFor="select-priority"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Priority
                </label>
                <select
                  id="select-priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {PRIORITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deadline */}
              <div>
                <label
                  htmlFor="input-deadline"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Deadline / Follow-up
                </label>
                <input
                  id="input-deadline"
                  name="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Application Source */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="select-application-source"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Application Source
                </label>
                <select
                  id="select-application-source"
                  name="applicationSource"
                  value={formData.applicationSource}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {APPLICATION_SOURCES.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Compensation & Notes */}
          <div className="space-y-3.5 pt-2 border-t border-surface-container">
            <h3 className="font-label-sm text-label-sm text-primary uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-[16px]">attach_money</span>
              <span>Compensation &amp; Notes</span>
            </h3>

            <div>
              <label
                htmlFor="input-salary"
                className="block font-label-md text-label-md text-on-surface mb-1"
              >
                Target Compensation / Range
              </label>
              <div className="relative">
                <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                  payments
                </span>
                <input
                  id="input-salary"
                  name="salary"
                  type="text"
                  placeholder="e.g. $140,000 - $160,000 / yr"
                  value={formData.salary}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Recruiter / Contact info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="input-recruiter-name"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Recruiter Name
                </label>
                <input
                  id="input-recruiter-name"
                  name="recruiterName"
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={formData.recruiterName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="input-recruiter-role"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Contact Role
                </label>
                <input
                  id="input-recruiter-role"
                  name="recruiterRole"
                  type="text"
                  placeholder="e.g. Talent Partner"
                  value={formData.recruiterRole}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="input-recruiter-email"
                  className="block font-label-md text-label-md text-on-surface mb-1"
                >
                  Recruiter Email
                </label>
                <input
                  id="input-recruiter-email"
                  name="recruiterEmail"
                  type="email"
                  placeholder="recruiter@company.com"
                  value={formData.recruiterEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="textarea-notes"
                className="block font-label-md text-label-md text-on-surface mb-1"
              >
                Notes &amp; Candidate Thoughts
              </label>
              <textarea
                id="textarea-notes"
                name="notes"
                rows={3}
                placeholder="Key team members, interview questions, tech stack requirements, or referral notes..."
                value={formData.notes}
                onChange={handleChange}
                className="w-full p-3 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
            <button
              id="cancel-form-modal-btn"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors min-h-[40px]"
            >
              Cancel
            </button>
            <button
              id="submit-application-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary active:scale-[0.98] rounded-xl shadow-sm transition-all disabled:opacity-50 min-h-[40px] flex items-center gap-1.5 font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isEditing ? 'check' : 'add'}
              </span>
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Opportunity' : 'Save Application'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
