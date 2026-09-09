import { useState, useEffect } from 'react';

const DOCUMENT_TYPES = [
  'Resume',
  'Cover Letter',
  'Portfolio',
  'Offer Letter',
  'Recommendation',
  'Other',
];

export default function DocumentAttachmentModal({
  isOpen,
  initialData = null,
  isSubmitting = false,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(initialData && initialData.id);

  const [name, setName] = useState('');
  const [type, setType] = useState('Resume');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setType(initialData.type || 'Resume');
        setUrl(initialData.url || '');
        setNotes(initialData.notes || '');
        setSelectedFileName('');
      } else {
        setName('');
        setType('Resume');
        setUrl('');
        setNotes('');
        setSelectedFileName('');
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleLocalFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      if (!name) {
        setName(file.name);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a document title or resume name.');
      return;
    }

    onSave({
      name: name.trim(),
      type,
      url: url.trim(),
      notes: notes.trim(),
      fileName: selectedFileName,
    });
  };

  return (
    <div
      id="document-attachment-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="document-attachment-modal-container"
        className="w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-outline-variant/30 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-space-md py-space-sm border-b border-surface-container-high/40 shrink-0">
          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">attachment</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {isEditing ? 'Edit Document' : 'Attach Resume / Document'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-space-md space-y-space-sm font-body-sm text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs">
              {error}
            </div>
          )}

          {/* Document Type */}
          <div>
            <label className="block font-semibold text-on-surface mb-1">Document Category</label>
            <div className="grid grid-cols-3 gap-1.5">
              {DOCUMENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-1.5 px-2 rounded-xl text-center text-xs font-semibold border transition-all ${
                    type === t
                      ? 'bg-primary text-on-primary border-primary shadow-2xs'
                      : 'bg-surface-container text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Document Name */}
          <div>
            <label className="block font-semibold text-on-surface mb-1">
              Document Name / Label <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senior_Frontend_Resume_v4.pdf"
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Cloud Link / URL */}
          <div>
            <label className="block font-semibold text-on-surface mb-1">
              Document Link / URL <span className="text-outline font-normal">(Google Drive, Dropbox, Notion, etc.)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-outline material-symbols-outlined text-[16px]">
                link
              </span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full pl-8 pr-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Local File Attachment reference */}
          <div>
            <label className="block font-semibold text-on-surface mb-1">
              Or Select Local File Reference
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-dashed border-outline-variant/50 cursor-pointer hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-primary text-[18px]">upload</span>
              <span className="text-xs text-outline truncate flex-1">
                {selectedFileName || 'Browse file from computer (PDF, DOCX)...'}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleLocalFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-on-surface mb-1">
              Notes or Version Details
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Customized with metrics from previous project for this role."
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-surface-container-high/40">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Document' : 'Add Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
