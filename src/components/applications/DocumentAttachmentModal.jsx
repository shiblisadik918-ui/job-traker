import { useState, useEffect } from 'react';
import { uploadToCloudinary } from '../../services/cloudinaryService';

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
  const [isCloudinaryUploading, setIsCloudinaryUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

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
      setUploadSuccessMsg('');
      setIsCloudinaryUploading(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleCloudinaryFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploadSuccessMsg('');
    setIsCloudinaryUploading(true);

    try {
      const result = await uploadToCloudinary(file);
      if (result && result.url) {
        setUrl(result.url);
        setSelectedFileName(file.name);
        if (!name.trim()) {
          setName(file.name);
        }
        setUploadSuccessMsg(`Uploaded successfully! (${file.name})`);
      }
    } catch (err) {
      console.error(err);
      setError('Cloudinary upload failed: ' + (err.message || 'Check connection.'));
    } finally {
      setIsCloudinaryUploading(false);
    }
  };

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

          {/* Direct Cloud Upload via Cloudinary */}
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-on-surface flex items-center gap-1.5 text-xs text-primary">
                <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                <span>Direct Cloud Upload (Cloudinary)</span>
              </span>
              <span className="text-[10px] text-outline">PDF, Docx, Image</span>
            </div>

            <p className="text-[11px] text-on-surface-variant leading-tight">
              Upload CV, admit card, or job circular directly. It saves to your Cloudinary storage and populates the permanent link.
            </p>

            <label className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed text-xs font-semibold cursor-pointer transition-all ${
              isCloudinaryUploading
                ? 'bg-surface-container border-outline/30 text-outline cursor-wait'
                : 'bg-surface-container-lowest border-primary/40 text-primary hover:bg-primary/10'
            }`}>
              <span className="material-symbols-outlined text-[18px]">
                {isCloudinaryUploading ? 'sync' : 'upload_file'}
              </span>
              <span>
                {isCloudinaryUploading
                  ? 'Uploading to Cloudinary...'
                  : selectedFileName
                  ? `Uploaded: ${selectedFileName}`
                  : 'Choose File to Upload (CV/Photo/Circular)'}
              </span>
              <input
                type="file"
                disabled={isCloudinaryUploading}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                onChange={handleCloudinaryFileUpload}
                className="hidden"
              />
            </label>

            {uploadSuccessMsg && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>{uploadSuccessMsg}</span>
              </p>
            )}
          </div>

          {/* Cloud Link / URL */}
          <div>
            <label className="block font-semibold text-on-surface mb-1">
              Document Link / URL <span className="text-outline font-normal">(Cloudinary, Google Drive, etc.)</span>
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
