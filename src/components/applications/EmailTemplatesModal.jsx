import { useState, useMemo } from 'react';
import { EMAIL_TEMPLATES, populateTemplate } from '../../utils/emailTemplates';
import { useToast } from '../../hooks/useToast';

export default function EmailTemplatesModal({
  isOpen,
  application = {},
  candidateName = '',
  onClose,
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(EMAIL_TEMPLATES[0].id);
  const [customRecruiterName, setCustomRecruiterName] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const { showSuccess } = useToast();

  const selectedTemplate = useMemo(() => {
    return EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId) || EMAIL_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Derive initial populated values whenever template or application changes
  const initialPopulated = useMemo(() => {
    return populateTemplate(selectedTemplate, {
      candidateName: candidateName || 'Candidate',
      recruiterName: customRecruiterName || application.recruiterName || 'Hiring Team',
      companyName: application.companyName || 'Company',
      jobTitle: application.jobTitle || 'Role',
    });
  }, [selectedTemplate, candidateName, customRecruiterName, application]);

  // Current active subject and body
  const currentSubject = customSubject || initialPopulated.subject;
  const currentBody = customBody || initialPopulated.body;

  if (!isOpen) return null;

  const handleSelectTemplate = (tId) => {
    setSelectedTemplateId(tId);
    setCustomSubject('');
    setCustomBody('');
    setIsCopied(false);
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(currentBody);
      setIsCopied(true);
      showSuccess('Email body copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopySubject = async () => {
    try {
      await navigator.clipboard.writeText(currentSubject);
      showSuccess('Subject line copied!');
    } catch {}
  };

  const recruiterEmail = application.recruiterEmail || '';
  const mailtoHref = `mailto:${encodeURIComponent(recruiterEmail)}?subject=${encodeURIComponent(currentSubject)}&body=${encodeURIComponent(currentBody)}`;

  return (
    <div
      id="email-templates-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="email-templates-modal-container"
        className="w-full max-w-2xl bg-surface-container-lowest rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-outline-variant/30 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-space-md py-space-sm border-b border-surface-container-high/40 shrink-0">
          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Recruiter Email Templates
              </h2>
              <p className="font-body-sm text-[12px] text-outline">
                Auto-tailored follow-ups for {application.companyName || 'this company'} ({application.jobTitle || 'Role'}).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Template Tabs Strip */}
        <div className="flex items-center gap-1.5 p-space-sm border-b border-surface-container-high/30 overflow-x-auto bg-surface-container-low shrink-0">
          {EMAIL_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleSelectTemplate(tpl.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedTemplateId === tpl.id
                  ? 'bg-surface-container-lowest text-primary shadow-xs border border-outline-variant/30'
                  : 'text-outline hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span>{tpl.name}</span>
            </button>
          ))}
        </div>

        {/* Body & Editor */}
        <div className="p-space-md space-y-space-sm overflow-y-auto flex-1 font-body-sm text-xs">
          {/* Target Recruiter & Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-space-xs bg-surface-container-low rounded-2xl border border-outline-variant/20">
            <div>
              <span className="text-outline text-[11px] font-medium block">Recipient:</span>
              <span className="font-semibold text-on-surface">
                {application.recruiterName || 'Talent Team'}{' '}
                {recruiterEmail && <span className="text-outline font-normal">({recruiterEmail})</span>}
              </span>
            </div>
            <div>
              <span className="text-outline text-[11px] font-medium block">Role & Company:</span>
              <span className="font-semibold text-on-surface">
                {application.jobTitle} • {application.companyName}
              </span>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-on-surface">Subject Line</label>
              <button
                type="button"
                onClick={handleCopySubject}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                <span>Copy Subject</span>
              </button>
            </div>
            <input
              type="text"
              value={currentSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
            />
          </div>

          {/* Email Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-on-surface">Email Message</label>
              <button
                type="button"
                onClick={handleCopyBody}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                <span>{isCopied ? 'Copied!' : 'Copy Body'}</span>
              </button>
            </div>
            <textarea
              rows={9}
              value={currentBody}
              onChange={(e) => setCustomBody(e.target.value)}
              className="w-full p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-on-surface text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-sans"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-space-md py-space-sm border-t border-surface-container-high/40 bg-surface-container-lowest shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-space-md py-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container text-xs font-semibold"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyBody}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high transition-colors border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              <span>{isCopied ? 'Copied to Clipboard' : 'Copy Email'}</span>
            </button>

            <a
              href={mailtoHref}
              className="flex items-center gap-1.5 px-space-md py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:bg-primary-container transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              <span>Open in Email App</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
