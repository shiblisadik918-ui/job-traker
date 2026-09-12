import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateApplicationStatus,
  deleteApplication,
  updateGovtExamStage,
  updatePrivateInterviewRound,
} from '../../services/applicationsService';
import {
  formatDisplayDate,
  DEFAULT_GOVT_EXAM_STAGES,
  DEFAULT_PRIVATE_INTERVIEW_ROUNDS,
} from '../../utils/constants';
import { useToast } from '../../hooks/useToast';

const PIPELINE_STAGES = [
  {
    id: 'Applied',
    label: 'Applied',
    icon: 'send',
    description: 'Application submitted',
    activeBadge: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700',
    dotColor: 'bg-sky-500',
  },
  {
    id: 'Shortlisted',
    label: 'Shortlisted',
    icon: 'verified',
    description: 'Selected for review & screening',
    activeBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700',
    dotColor: 'bg-indigo-500',
  },
  {
    id: 'Interview',
    label: 'Interview / Exam',
    icon: 'record_voice_over',
    description: 'Exams or interview rounds in progress',
    activeBadge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'Offer',
    label: 'Offer / Recommendation',
    icon: 'stars',
    description: 'Offer package or gazette recommendation',
    activeBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'Rejected',
    label: 'Archived',
    icon: 'archive',
    description: 'Declined or closed position',
    activeBadge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700',
    dotColor: 'bg-rose-500',
  },
  {
    id: 'Saved',
    label: 'Saved',
    icon: 'bookmark',
    description: 'Saved / bookmarked opportunity',
    activeBadge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
    dotColor: 'bg-slate-500',
  },
];

const MONOGRAM_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
];

/**
 * ApplicationCardActionModal
 * Provides a dedicated dialog when clicking an application card to:
 * 1. Rapidly update its pipeline status / stage with an optional note
 * 2. Update sequential Government Exam Stages or Private Interview Rounds
 * 3. Delete the record permanently with clear confirmation
 * 4. Quick-jump to full application details or edit modal
 */
export default function ApplicationCardActionModal({
  isOpen,
  onClose,
  application,
  onStatusUpdated,
  onDeleted,
  onEdit,
}) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [currentStatus, setCurrentStatus] = useState('Applied');
  const [selectedStatus, setSelectedStatus] = useState('Applied');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Workflow Stages state
  const [govtStages, setGovtStages] = useState([]);
  const [privateRounds, setPrivateRounds] = useState([]);
  const [updatingStageId, setUpdatingStageId] = useState(null);

  // Delete flow state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state when application changes
  useEffect(() => {
    if (application) {
      setCurrentStatus(application.status || 'Applied');
      setSelectedStatus(application.status || 'Applied');
      setStatusNote('');
      setIsConfirmingDelete(false);

      const isGovt = application.job_type === 'Government' || Boolean(application.ministryDepartment);
      if (isGovt) {
        setGovtStages(
          Array.isArray(application.govtExamStages) && application.govtExamStages.length > 0
            ? application.govtExamStages
            : DEFAULT_GOVT_EXAM_STAGES
        );
      } else {
        setPrivateRounds(
          Array.isArray(application.privateInterviewRounds) && application.privateInterviewRounds.length > 0
            ? application.privateInterviewRounds
            : DEFAULT_PRIVATE_INTERVIEW_ROUNDS
        );
      }
    }
  }, [application]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isUpdatingStatus && !isDeleting) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUpdatingStatus, isDeleting, onClose]);

  if (!isOpen || !application) return null;

  const isGovt = application.job_type === 'Government' || Boolean(application.ministryDepartment);

  const getMonogram = (name) => {
    if (!name) return isGovt ? 'BD' : 'JT';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getMonogramStyle = (name) => {
    if (isGovt) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
    }
    return MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length];
  };

  // Status update handler
  const handleUpdateStatus = async (targetStatusOverride = null) => {
    const targetStatus = targetStatusOverride || selectedStatus;
    if (!targetStatus || targetStatus === currentStatus) return;

    setIsUpdatingStatus(true);
    const { success, error } = await updateApplicationStatus(
      application.id,
      targetStatus,
      statusNote.trim() || `Status updated to ${targetStatus}`
    );
    setIsUpdatingStatus(false);

    if (success) {
      setCurrentStatus(targetStatus);
      setSelectedStatus(targetStatus);
      setStatusNote('');
      showSuccess(`Status successfully updated to ${targetStatus}`);

      if (onStatusUpdated) {
        onStatusUpdated(application.id, targetStatus);
      }
      window.dispatchEvent(
        new CustomEvent('jobtrack:application-changed', {
          detail: { id: application.id, action: 'update', status: targetStatus },
        })
      );
    } else {
      showError(error || 'Failed to update application status.');
    }
  };

  // Quick Government Stage status updater
  const handleToggleGovtStageStatus = async (stageId, newStatus) => {
    setUpdatingStageId(stageId);
    const { success, error } = await updateGovtExamStage(application.id, stageId, { status: newStatus });
    setUpdatingStageId(null);

    if (success) {
      setGovtStages((prev) =>
        prev.map((st) => (st.id === stageId ? { ...st, status: newStatus } : st))
      );
      showSuccess(`Exam stage marked as ${newStatus}`);
      window.dispatchEvent(
        new CustomEvent('jobtrack:application-changed', {
          detail: { id: application.id, action: 'stage-update' },
        })
      );
    } else {
      showError(error || 'Failed to update exam stage.');
    }
  };

  // Quick Private Interview Round status updater
  const handleTogglePrivateRoundStatus = async (roundId, newStatus) => {
    setUpdatingStageId(roundId);
    const { success, error } = await updatePrivateInterviewRound(application.id, roundId, { status: newStatus });
    setUpdatingStageId(null);

    if (success) {
      setPrivateRounds((prev) =>
        prev.map((rd) => (rd.id === roundId ? { ...rd, status: newStatus } : rd))
      );
      showSuccess(`Interview round marked as ${newStatus}`);
      window.dispatchEvent(
        new CustomEvent('jobtrack:application-changed', {
          detail: { id: application.id, action: 'round-update' },
        })
      );
    } else {
      showError(error || 'Failed to update interview round.');
    }
  };

  // Delete handler
  const handleDeleteApplication = async () => {
    setIsDeleting(true);
    const { success, error } = await deleteApplication(application.id);
    setIsDeleting(false);

    if (success) {
      showSuccess(`Application for ${application.companyName || application.ministryDepartment || 'opportunity'} deleted.`);
      if (onDeleted) {
        onDeleted(application.id);
      }
      window.dispatchEvent(
        new CustomEvent('jobtrack:application-changed', {
          detail: { id: application.id, action: 'delete' },
        })
      );
      onClose();
    } else {
      showError(error || 'Failed to delete application.');
    }
  };

  const hasStatusChanged = selectedStatus !== currentStatus;

  return (
    <div
      id="application-card-action-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-inverse-surface/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isUpdatingStatus && !isDeleting) onClose();
      }}
    >
      <div
        id="application-card-action-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-action-modal-title"
        className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Organization & Job Overview */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-surface-container-high/40">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shrink-0 shadow-xs ${getMonogramStyle(
                application.companyName || application.ministryDepartment
              )}`}
            >
              {isGovt ? (
                <span className="material-symbols-outlined text-[24px]">account_balance</span>
              ) : (
                getMonogram(application.companyName)
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="card-action-modal-title"
                  className="font-headline-sm text-base sm:text-lg font-bold text-on-surface truncate"
                >
                  {isGovt
                    ? application.ministryDepartment || application.companyName || 'Bangladesh Government'
                    : application.companyName}
                </h2>
                {/* Job Type Badge */}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    isGovt
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300'
                      : 'bg-primary-fixed text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {isGovt ? 'account_balance' : 'corporate_fare'}
                  </span>
                  <span>{isGovt ? 'Govt Job' : 'Private / MNC'}</span>
                </span>
                {isGovt && application.jobGrade && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant">
                    {application.jobGrade}
                  </span>
                )}
              </div>

              <p className="font-body-md text-sm text-on-surface-variant font-medium truncate">
                {application.jobTitle}
              </p>

              <div className="flex items-center gap-2 text-[11px] text-outline flex-wrap pt-0.5">
                <span className="flex items-center gap-1 text-primary font-medium">
                  <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                  <span>Applied: {formatDisplayDate(application.applicationDate)}</span>
                </span>
                {application.location && (
                  <span className="flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">location_on</span>
                    <span>{application.location}</span>
                  </span>
                )}
                {isGovt ? (
                  application.circularId && (
                    <span className="font-mono text-on-surface-variant text-[10px] bg-surface-container px-1.5 py-0.5 rounded">
                      Ref: {application.circularId}
                    </span>
                  )
                ) : (
                  application.salary && (
                    <span className="font-mono text-secondary font-semibold">
                      {application.salary}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            id="card-action-modal-close-btn"
            onClick={onClose}
            disabled={isUpdatingStatus || isDeleting}
            className="text-outline hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container transition-colors shrink-0"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Section: Contextual Bangladesh Govt or Private Highlights */}
        {isGovt ? (
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">info</span>
                <span>Government Circular &amp; Credentials</span>
              </span>
              {application.admitCardStatus && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  application.admitCardStatus.includes('Download')
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                }`}>
                  Admit Card: {application.admitCardStatus}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-outline block">Fee &amp; Payment</span>
                <span className="font-medium text-on-surface flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    application.paymentStatus?.includes('Paid') ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}></span>
                  <span>{application.paymentStatus || 'Pending'}</span>
                  {application.applicationFee && ` (${application.applicationFee})`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-outline block">Job Grade</span>
                <span className="font-medium text-on-surface">{application.jobGrade || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[10px] text-outline block">Roll Number</span>
                <span className="font-mono text-on-surface font-semibold">
                  {application.userRollNumber || 'Not assigned'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-primary-fixed/20 border border-primary/20 rounded-xl space-y-1.5 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">contact_phone</span>
                <span>Recruiter &amp; Compensation</span>
              </span>
              <span className="text-[10px] text-outline">Source: {application.applicationSource || 'Direct'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-outline block">Recruiter Contact</span>
                <span className="font-medium text-on-surface">
                  {application.recruiterName ? (
                    <>
                      {application.recruiterName}
                      {application.recruiterEmail && ` • ${application.recruiterEmail}`}
                    </>
                  ) : (
                    'No recruiter contact logged'
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-outline block">Salary / Package</span>
                <span className="font-medium text-secondary font-mono">
                  {application.salary || 'Negotiable / Undisclosed'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Section: Interactive Stages Workflow */}
        <div className="space-y-2.5 pt-1 border-t border-surface-container-high/40">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">
                {isGovt ? 'fact_check' : 'conversion_path'}
              </span>
              <span>{isGovt ? 'Sequential Exam Stages Workflow' : 'Interview Rounds Workflow'}</span>
            </h3>
            <span className="text-[11px] text-on-surface-variant">
              {isGovt ? 'Prelims → Written → Viva → Result' : 'Screening → Tech → HR → Offer'}
            </span>
          </div>

          {/* Render Stages / Rounds */}
          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-0.5">
            {isGovt ? (
              govtStages.map((stage, idx) => {
                const isPassed = stage.status === 'Passed';
                const isFailed = stage.status === 'Failed';
                const isUpdating = updatingStageId === stage.id;

                return (
                  <div
                    key={stage.id}
                    className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                      isPassed
                        ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                        : isFailed
                        ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
                        : 'bg-surface-container-low/50 border-outline-variant/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isFailed
                          ? 'bg-rose-600 text-white'
                          : 'bg-surface-container-highest text-on-surface'
                      }`}>
                        {isPassed ? '✓' : isFailed ? '✕' : idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-on-surface">{stage.name}</span>
                          <span className="text-[10px] text-outline">({stage.subtitle})</span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex items-center gap-2 flex-wrap">
                          {stage.date && <span>📅 {formatDisplayDate(stage.date)}</span>}
                          {stage.center && <span>📍 {stage.center}</span>}
                          {!stage.date && !stage.center && <span className="text-outline">Date/Center not announced</span>}
                        </div>
                      </div>
                    </div>

                    {/* Quick stage toggle buttons */}
                    <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleGovtStageStatus(stage.id, 'Passed')}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          stage.status === 'Passed'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-surface-container hover:bg-emerald-100 text-emerald-800 dark:hover:bg-emerald-950'
                        }`}
                        title="Mark stage as Passed"
                      >
                        Passed
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleGovtStageStatus(stage.id, 'Pending')}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                          stage.status === 'Pending'
                            ? 'bg-primary text-on-primary font-bold shadow-xs'
                            : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                        }`}
                        title="Mark stage as Pending"
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleGovtStageStatus(stage.id, 'Failed')}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          stage.status === 'Failed'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-surface-container hover:bg-rose-100 text-rose-800 dark:hover:bg-rose-950'
                        }`}
                        title="Mark stage as Failed"
                      >
                        Failed
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              privateRounds.map((round, idx) => {
                const isPassed = round.status === 'Passed';
                const isFailed = round.status === 'Failed';
                const isUpdating = updatingStageId === round.id;

                return (
                  <div
                    key={round.id}
                    className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                      isPassed
                        ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                        : isFailed
                        ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
                        : 'bg-surface-container-low/50 border-outline-variant/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isFailed
                          ? 'bg-rose-600 text-white'
                          : 'bg-surface-container-highest text-on-surface'
                      }`}>
                        {isPassed ? '✓' : isFailed ? '✕' : idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-on-surface">{round.name}</span>
                          <span className="text-[10px] text-outline">({round.subtitle})</span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex items-center gap-2 flex-wrap">
                          {round.date && <span>📅 {formatDisplayDate(round.date)}</span>}
                          {round.interviewer && <span>👤 {round.interviewer}</span>}
                          {!round.date && !round.interviewer && <span className="text-outline">Schedule pending</span>}
                        </div>
                      </div>
                    </div>

                    {/* Quick round status toggle buttons */}
                    <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleTogglePrivateRoundStatus(round.id, 'Passed')}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          round.status === 'Passed'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-surface-container hover:bg-emerald-100 text-emerald-800 dark:hover:bg-emerald-950'
                        }`}
                        title="Mark round as Passed"
                      >
                        Passed
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleTogglePrivateRoundStatus(round.id, 'Scheduled')}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                          round.status === 'Scheduled'
                            ? 'bg-purple-600 text-white font-bold shadow-xs'
                            : 'bg-surface-container hover:bg-purple-100 text-purple-800 dark:hover:bg-purple-950'
                        }`}
                        title="Mark round as Scheduled"
                      >
                        Scheduled
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleTogglePrivateRoundStatus(round.id, 'Failed')}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          round.status === 'Failed'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-surface-container hover:bg-rose-100 text-rose-800 dark:hover:bg-rose-950'
                        }`}
                        title="Mark round as Failed"
                      >
                        Failed
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 1: Pipeline Status Selector */}
        <div className="space-y-3 pt-2 border-t border-surface-container-high/40">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">published_with_changes</span>
              <span>Update Overall Status</span>
            </h3>
            <span className="text-[11px] text-on-surface-variant">
              Current: <strong className="text-on-surface">{currentStatus}</strong>
            </span>
          </div>

          {/* Grid of Status Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PIPELINE_STAGES.map((stage) => {
              const isCurrent = currentStatus === stage.id;
              const isSelected = selectedStatus === stage.id;

              return (
                <button
                  key={stage.id}
                  type="button"
                  id={`status-select-btn-${stage.id.toLowerCase()}`}
                  disabled={isUpdatingStatus || isDeleting}
                  onClick={() => {
                    setSelectedStatus(stage.id);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 group relative ${
                    isSelected
                      ? `${stage.activeBadge} ring-2 ring-primary/40 shadow-xs`
                      : 'border-surface-container bg-surface-container-low/50 hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[18px]">
                      {stage.icon}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-surface-container-highest text-on-surface border border-outline-variant/40 uppercase">
                        Active
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-label-md text-xs font-bold flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${stage.dotColor}`}></span>
                      <span>{stage.label}</span>
                    </div>
                    <p className="font-body-sm text-[10px] opacity-75 truncate mt-0.5">
                      {stage.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Optional Transition Note & Save Button */}
          {hasStatusChanged && (
            <div className="p-3 rounded-xl bg-surface-container-low border border-primary/20 space-y-2 animate-in fade-in duration-150">
              <label
                htmlFor="status-note-input"
                className="block text-[11px] font-semibold text-on-surface flex items-center justify-between"
              >
                <span>Add Note for Status Update (Optional)</span>
                <span className="text-outline text-[10px]">appended to timeline</span>
              </label>
              <input
                id="status-note-input"
                type="text"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder={`e.g. Moved from ${currentStatus} to ${selectedStatus}`}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus(currentStatus);
                    setStatusNote('');
                  }}
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-update-status-btn"
                  onClick={() => handleUpdateStatus()}
                  disabled={isUpdatingStatus}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-on-primary font-semibold text-xs shadow-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isUpdatingStatus ? 'progress_activity' : 'check'}
                  </span>
                  <span>
                    {isUpdatingStatus ? 'Updating...' : `Set as ${selectedStatus}`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Delete Record / Danger Zone */}
        <div className="pt-2 border-t border-surface-container-high/40">
          {!isConfirmingDelete ? (
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-on-surface-variant">
                Need to remove this opportunity?
              </div>
              <button
                type="button"
                id="initiate-delete-record-btn"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isUpdatingStatus || isDeleting}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-error hover:bg-error-container/20 text-xs font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete Record</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-error-container/20 border border-error/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">
                  warning
                </span>
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-bold text-on-surface">
                    Delete this application record?
                  </h4>
                  <p className="text-on-surface-variant text-[11px] leading-relaxed">
                    This will permanently remove{' '}
                    <strong>{application.companyName || application.ministryDepartment}</strong> (
                    {application.jobTitle}) from your tracking list, including all notes, stages, and reminders. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-record-btn"
                  onClick={handleDeleteApplication}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-error text-on-error font-semibold text-xs shadow-xs hover:bg-error/90 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isDeleting ? 'progress_activity' : 'delete_forever'}
                  </span>
                  <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Record'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Modal Footer Actions (View details & Edit) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-surface-container-high/40">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/applications/${application.id}`);
            }}
            id="view-full-details-modal-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-primary hover:text-primary/80 font-semibold text-xs py-1.5 hover:underline"
          >
            <span>View Full Details &amp; Timeline</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(application);
                }}
                className="px-3 py-1.5 rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors"
              >
                Edit Details
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
