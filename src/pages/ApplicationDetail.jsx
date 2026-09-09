import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getApplication,
  updateApplicationStatus,
  updateApplication,
  deleteApplication,
  addTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
  updateRecruiterInfo,
  deleteRecruiterInfo,
  addDocumentAttachment,
  updateDocumentAttachment,
  deleteDocumentAttachment,
} from '../services/applicationsService';
import {
  APPLICATION_STATUSES,
  formatDisplayDate,
} from '../utils/constants';
import { useToast } from '../hooks/useToast';
import { DetailSkeleton } from '../components/common/Skeleton';
import { createReminder } from '../services/remindersService';
import ApplicationFormModal from '../components/applications/ApplicationFormModal';
import TimelineEventModal from '../components/applications/TimelineEventModal';
import RecruiterContactModal from '../components/applications/RecruiterContactModal';
import DocumentAttachmentModal from '../components/applications/DocumentAttachmentModal';
import EmailTemplatesModal from '../components/applications/EmailTemplatesModal';
import InterviewPrepChecklist from '../components/applications/InterviewPrepChecklist';
import CalendarExportButtons from '../components/common/CalendarExportButtons';
import ConfirmationModal from '../components/common/ConfirmationModal';

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  // Status popover & quick change
  const [isStagePopoverOpen, setIsStagePopoverOpen] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Notes state
  const [notesDraft, setNotesDraft] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedIndicator, setNotesSavedIndicator] = useState(false);
  const [isClearNotesModalOpen, setIsClearNotesModalOpen] = useState(false);
  const [isClearingNotes, setIsClearingNotes] = useState(false);

  // Recruiter Contact State
  const [isRecruiterModalOpen, setIsRecruiterModalOpen] = useState(false);
  const [isSubmittingRecruiter, setIsSubmittingRecruiter] = useState(false);
  const [isDeleteRecruiterModalOpen, setIsDeleteRecruiterModalOpen] = useState(false);
  const [isDeletingRecruiter, setIsDeletingRecruiter] = useState(false);

  // Automatic Follow-up Scheduling State
  const [isSchedulingFollowUp, setIsSchedulingFollowUp] = useState(false);
  const [recentFollowUpDate, setRecentFollowUpDate] = useState(null);

  // Timeline Milestones State
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null); // { entry, index } or null
  const [isSubmittingMilestone, setIsSubmittingMilestone] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState(null); // { entry, index }
  const [isDeleteMilestoneModalOpen, setIsDeleteMilestoneModalOpen] = useState(false);
  const [isDeletingMilestone, setIsDeletingMilestone] = useState(false);

  // Edit Application Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Safeguard Modal State (Screen 5)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteSafeguardChecked, setDeleteSafeguardChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Documents & Attachments State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleteDocModalOpen, setIsDeleteDocModalOpen] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Email Templates Modal State
  const [isEmailTemplatesModalOpen, setIsEmailTemplatesModalOpen] = useState(false);

  const fetchApplication = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getApplication(id);
    if (error) {
      showError(error);
      navigate('/applications');
    } else {
      setApplication(data);
      setNotesDraft(data.notes || '');
    }
    setLoading(false);
  }, [id, showError, navigate]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  // Status transition handler
  const handleStatusChange = async (newStatus) => {
    if (!application) return;
    setIsStagePopoverOpen(false);

    if (application.status === newStatus) {
      return;
    }

    setIsUpdatingStatus(true);
    const { success, error } = await updateApplicationStatus(id, newStatus, statusNote);
    setIsUpdatingStatus(false);

    if (success) {
      showSuccess(`Stage transitioned to ${newStatus}`);
      setStatusNote('');
      fetchApplication();
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id, action: 'status' } }));
    } else {
      showError(error || 'Failed to update status.');
    }
  };

  // Notes handlers
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    const { success, error } = await updateApplication(id, { notes: notesDraft });
    setIsSavingNotes(false);

    if (success) {
      showSuccess('Notes saved.');
      setApplication((prev) => ({ ...prev, notes: notesDraft }));
      setNotesSavedIndicator(true);
      setTimeout(() => setNotesSavedIndicator(false), 2500);
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id, action: 'notes' } }));
    } else {
      showError(error || 'Failed to save notes.');
    }
  };

  const handleConfirmClearNotes = async () => {
    setIsClearingNotes(true);
    const { success, error } = await updateApplication(id, { notes: '' });
    setIsClearingNotes(false);

    if (success) {
      showSuccess('Notes deleted.');
      setNotesDraft('');
      setApplication((prev) => ({ ...prev, notes: '' }));
      setIsClearNotesModalOpen(false);
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id, action: 'notes' } }));
    } else {
      showError(error || 'Failed to clear notes.');
    }
  };

  const handleResetNotesDraft = () => {
    setNotesDraft(application.notes || '');
  };

  // Recruiter handlers
  const handleSaveRecruiter = async (recruiterData) => {
    setIsSubmittingRecruiter(true);
    const { success, error } = await updateRecruiterInfo(id, recruiterData);
    setIsSubmittingRecruiter(false);

    if (success) {
      showSuccess('Recruiter contact saved.');
      setIsRecruiterModalOpen(false);
      setApplication((prev) => ({
        ...prev,
        ...recruiterData,
      }));
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id, action: 'recruiter' } }));
    } else {
      showError(error || 'Failed to save recruiter contact.');
    }
  };

  const handleConfirmDeleteRecruiter = async () => {
    setIsDeletingRecruiter(true);
    const { success, error } = await deleteRecruiterInfo(id);
    setIsDeletingRecruiter(false);

    if (success) {
      showSuccess('Recruiter contact removed.');
      setIsDeleteRecruiterModalOpen(false);
      setApplication((prev) => ({
        ...prev,
        recruiterName: '',
        recruiterEmail: '',
        recruiterRole: '',
        recruiterPhone: '',
        recruiterNotes: '',
      }));
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id, action: 'recruiter' } }));
    } else {
      showError(error || 'Failed to remove recruiter contact.');
    }
  };

  // 1-Click Automatic Follow-up Scheduler
  const handleAutoScheduleFollowUp = async () => {
    if (!application) return;
    setIsSchedulingFollowUp(true);

    const followUpDays = 5;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + followUpDays);
    const dateStr = targetDate.toISOString().split('T')[0];

    const reminderPayload = {
      applicationId: application.id,
      title: `Follow up with ${application.companyName} (${application.jobTitle})`,
      date: dateStr,
      time: '10:00',
      type: 'Follow-up',
      notes: `Touchpoint on application status with ${application.recruiterName || application.companyName} for the ${application.jobTitle} position.`,
    };

    const { error } = await createReminder(reminderPayload);
    setIsSchedulingFollowUp(false);

    if (error) {
      showError(error || 'Failed to schedule follow-up.');
    } else {
      setRecentFollowUpDate(dateStr);
      showSuccess(`Follow-up automatically scheduled for ${application.companyName} on ${formatDisplayDate(dateStr)}!`);
      window.dispatchEvent(new CustomEvent('jobtrack:reminder-changed', { detail: { action: 'create' } }));
    }
  };

  // Timeline handlers
  const handleOpenAddMilestone = () => {
    setEditingMilestone(null);
    setIsTimelineModalOpen(true);
  };

  const handleOpenEditMilestone = (entry, index) => {
    setEditingMilestone({ ...entry, index });
    setIsTimelineModalOpen(true);
  };

  const handleSaveMilestone = async (milestoneData) => {
    setIsSubmittingMilestone(true);

    if (editingMilestone && editingMilestone.index !== undefined) {
      const { success, error } = await updateTimelineEvent(id, editingMilestone.index, milestoneData);
      setIsSubmittingMilestone(false);

      if (success) {
        showSuccess('Milestone updated.');
        setIsTimelineModalOpen(false);
        setEditingMilestone(null);
        fetchApplication();
        window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id, action: 'timeline' } }));
      } else {
        showError(error || 'Failed to update milestone.');
      }
    } else {
      const { success, error } = await addTimelineEvent(id, milestoneData);
      setIsSubmittingMilestone(false);

      if (success) {
        showSuccess('Milestone added to timeline.');
        setIsTimelineModalOpen(false);
        fetchApplication();
        window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id, action: 'timeline' } }));
      } else {
        showError(error || 'Failed to add milestone.');
      }
    }
  };

  const handleDeleteMilestonePrompt = (entry, index) => {
    setMilestoneToDelete({ ...entry, index });
    setIsDeleteMilestoneModalOpen(true);
  };

  const handleConfirmDeleteMilestone = async () => {
    if (!milestoneToDelete || milestoneToDelete.index === undefined) return;
    setIsDeletingMilestone(true);

    const { success, error } = await deleteTimelineEvent(id, milestoneToDelete.index);
    setIsDeletingMilestone(false);

    if (success) {
      showSuccess('Milestone deleted.');
      setIsDeleteMilestoneModalOpen(false);
      setMilestoneToDelete(null);
      fetchApplication();
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id, action: 'timeline' } }));
    } else {
      showError(error || 'Failed to delete milestone.');
    }
  };

  // Documents and Attachments handlers
  const handleOpenAddDoc = () => {
    setEditingDoc(null);
    setIsDocModalOpen(true);
  };

  const handleOpenEditDoc = (docItem) => {
    setEditingDoc(docItem);
    setIsDocModalOpen(true);
  };

  const handleSaveDoc = async (docData) => {
    setIsSubmittingDoc(true);
    let result;
    if (editingDoc && editingDoc.id) {
      result = await updateDocumentAttachment(id, editingDoc.id, docData);
    } else {
      result = await addDocumentAttachment(id, docData);
    }
    setIsSubmittingDoc(false);

    if (result.success) {
      showSuccess(editingDoc ? 'Document updated.' : 'Document attached.');
      setIsDocModalOpen(false);
      setEditingDoc(null);
      fetchApplication();
    } else {
      showError(result.error || 'Failed to save document.');
    }
  };

  const handleDeleteDocPrompt = (docItem) => {
    setDocToDelete(docItem);
    setIsDeleteDocModalOpen(true);
  };

  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeletingDoc(true);
    const result = await deleteDocumentAttachment(id, docToDelete.id);
    setIsDeletingDoc(false);

    if (result.success) {
      showSuccess('Document deleted.');
      setIsDeleteDocModalOpen(false);
      setDocToDelete(null);
      fetchApplication();
    } else {
      showError(result.error || 'Failed to delete document.');
    }
  };

  // Edit application metadata handler
  const handleSaveEdit = async (formData) => {
    setIsSubmittingEdit(true);
    const { success, error } = await updateApplication(id, formData);
    setIsSubmittingEdit(false);

    if (success) {
      showSuccess('Application metadata updated.');
      setIsEditModalOpen(false);
      fetchApplication();
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id, action: 'edit' } }));
    } else {
      showError(error || 'Failed to update application.');
    }
  };

  // Delete with safeguard checkbox
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    const { success, error } = await deleteApplication(id);
    setIsDeleting(false);

    if (success) {
      showSuccess('Application deleted from pipeline.');
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id, action: 'delete' } }));
      navigate('/applications');
    } else {
      showError(error || 'Failed to delete application.');
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!application) {
    return (
      <div id="application-not-found" className="text-center py-16 space-y-3">
        <h2 className="font-headline-sm text-on-surface">Application not found</h2>
        <Link to="/applications" className="text-primary text-body-sm font-semibold hover:underline">
          Return to Applications
        </Link>
      </div>
    );
  }

  const timeline = Array.isArray(application.timeline) ? application.timeline : [];

  // Monogram & styling
  const getMonogram = (name) => {
    if (!name) return 'JT';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getMonogramStyle = (name) => {
    if (!name) return 'bg-primary-fixed text-primary';
    const n = name.toLowerCase();
    if (n.includes('figma')) return 'bg-error-container text-on-error-container';
    if (n.includes('stripe')) return 'bg-primary-fixed text-primary';
    if (n.includes('linear')) return 'bg-tertiary-fixed text-tertiary';
    if (n.includes('notion')) return 'bg-surface-container-high text-on-surface';
    if (n.includes('vercel')) return 'bg-surface-container-highest text-on-surface';
    return 'bg-primary-fixed text-primary';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Interview':
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
            Interviewing
          </span>
        );
      case 'Offer':
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            Offered
          </span>
        );
      case 'Shortlisted':
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            Shortlisted
          </span>
        );
      case 'Applied':
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
            Applied
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
            {status}
          </span>
        );
    }
  };

  const trackingId = `#${application.companyName ? application.companyName.slice(0, 3).toUpperCase() : 'APP'}-${(application.id || '9482').slice(-4).toUpperCase()}`;
  const hasRecruiter = Boolean(application.recruiterName || application.recruiterEmail);
  const recruiterInitials = application.recruiterName
    ? getMonogram(application.recruiterName)
    : 'RC';

  const isNotesModified = notesDraft !== (application.notes || '');

  return (
    <div id="application-detail-page" className="max-w-5xl mx-auto space-y-space-lg animate-in fade-in duration-200">
      {/* Top Header Bar & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs border-b border-surface-container-high/30">
        <div className="flex items-center gap-space-xs">
          <Link
            id="back-to-applications-link"
            to="/applications"
            className="p-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Back to applications"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono-metric text-xs uppercase px-2.5 py-1 rounded-lg bg-surface-container font-bold text-on-surface">
              {trackingId}
            </span>
            <span className="font-body-sm text-[12px] text-outline">
              Updated {application.updatedAt?.toDate ? formatDisplayDate(application.updatedAt.toDate()) : 'recently'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-space-xs self-end sm:self-auto relative">
          {/* Change Stage Button with Popover */}
          <button
            id="change-stage-header-btn"
            type="button"
            onClick={() => setIsStagePopoverOpen(!isStagePopoverOpen)}
            className="flex items-center gap-1 px-space-md py-2 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all shadow-2xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">cached</span>
            <span>Change Stage</span>
          </button>

          {/* Contextual Stage Popover (Screen 5) */}
          {isStagePopoverOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-surface-container-lowest shadow-2xl border border-surface-container z-50 p-2 text-xs animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1.5 font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold">
                Select Pipeline Stage
              </div>
              <div className="space-y-1">
                {APPLICATION_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between font-label-md text-[13px] ${
                      application.status === st
                        ? 'bg-primary-container text-on-primary font-bold shadow-2xs'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <span>{st}</span>
                    {application.status === st && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Edit Metadata Button */}
          <button
            id="edit-application-header-btn"
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-space-md py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors border border-outline-variant/40 font-semibold"
            title="Edit Application Metadata"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span className="hidden sm:inline">Edit Metadata</span>
          </button>

          {/* Delete Button */}
          <button
            id="delete-application-header-btn"
            type="button"
            onClick={() => {
              setIsDeleteModalOpen(true);
              setDeleteSafeguardChecked(false);
            }}
            className="flex items-center gap-1 p-2 sm:px-3 rounded-xl text-outline hover:text-error hover:bg-error-container/20 transition-colors border border-outline-variant/40 font-semibold"
            title="Delete Application"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span className="hidden sm:inline text-label-md">Delete</span>
          </button>
        </div>
      </div>

      {/* Main Hero Card (Screen 2) */}
      <div
        id="application-hero-card"
        className="rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 p-space-md sm:p-space-xl space-y-space-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-md pb-space-md border-b border-surface-container-high/30">
          <div className="flex items-start gap-space-md">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 shadow-xs ${getMonogramStyle(
                application.companyName
              )}`}
            >
              {getMonogram(application.companyName)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-body-lg font-bold text-on-surface">
                  {application.companyName}
                </span>
                <span className="material-symbols-outlined text-primary text-[18px]" title="Verified Company Record">
                  verified
                </span>
              </div>

              <h1 id="app-detail-jobtitle" className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                {application.jobTitle}
              </h1>

              <div className="flex items-center gap-space-sm text-[12px] text-outline flex-wrap font-body-sm pt-0.5">
                {application.location && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    <span>{application.location}</span>
                  </span>
                )}
                <span>•</span>
                <span>{application.jobType || 'Full-time'}</span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded bg-surface-container font-semibold text-on-surface">
                  {application.priority || 'Medium'} Priority
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            {getStatusBadge(application.status)}
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              title="Edit Application Details"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>
        </div>

        {/* Metadata Grid */}
        <div id="application-meta-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-space-md py-space-xs text-xs">
          <div>
            <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold">
              Target Salary
            </span>
            <p className="font-headline-sm text-body-sm text-on-surface font-bold mt-1">
              {application.salary || 'Undisclosed'}
            </p>
          </div>
          <div>
            <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold">
              Application Date
            </span>
            <p className="font-body-sm text-body-sm text-on-surface font-medium mt-1">
              {formatDisplayDate(application.applicationDate)}
            </p>
          </div>
          <div>
            <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold">
              Deadline / Next Action
            </span>
            <p className="font-body-sm text-body-sm text-on-surface font-medium mt-1">
              {formatDisplayDate(application.deadline)}
            </p>
          </div>
          <div>
            <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold">
              Source
            </span>
            <p className="font-body-sm text-body-sm text-on-surface font-medium mt-1">
              {application.applicationSource || 'LinkedIn'}
            </p>
          </div>
        </div>

        {/* Job URL row if available */}
        {application.jobUrl && (
          <div className="pt-space-xs border-t border-surface-container-high/30 flex items-center justify-between text-xs flex-wrap gap-2">
            <span className="font-body-sm text-outline">Public Job Posting:</span>
            <a
              id="open-job-posting-btn"
              href={application.jobUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-primary font-label-md text-label-sm hover:underline font-semibold"
            >
              <span>Open Job Posting in New Tab</span>
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
          </div>
        )}
      </div>

      {/* Recruiter & Contact Strip - Fully Editable and Deletable */}
      <div
        id="recruiter-contact-section"
        className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm"
      >
        {hasRecruiter ? (
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center font-bold text-sm shrink-0">
              {recruiterInitials}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline-sm text-body-sm font-bold text-on-surface truncate">
                  {application.recruiterName || 'Talent Partner'}
                </span>
                {application.recruiterRole && (
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[10px] font-semibold">
                    {application.recruiterRole}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[12px] text-outline flex-wrap font-body-sm">
                {application.recruiterEmail ? (
                  <a
                    href={`mailto:${application.recruiterEmail}`}
                    className="hover:text-primary transition-colors truncate"
                  >
                    {application.recruiterEmail}
                  </a>
                ) : (
                  <span>recruiting@{application.companyName?.toLowerCase().replace(/\s+/g, '') || 'company'}.com</span>
                )}
                {application.recruiterPhone && (
                  <>
                    <span>•</span>
                    <span>{application.recruiterPhone}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-surface-container text-outline flex items-center justify-center font-bold text-sm">
              <span className="material-symbols-outlined text-[20px]">person_outline</span>
            </div>
            <div>
              <div className="font-headline-sm text-body-sm font-bold text-on-surface">
                Recruiter Contact
              </div>
              <div className="font-body-sm text-[12px] text-outline">
                No recruiter or talent partner logged yet.
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-space-xs flex-wrap">
          {hasRecruiter ? (
            <>
              {application.recruiterEmail && (
                <a
                  href={`mailto:${application.recruiterEmail}?subject=Regarding%20${encodeURIComponent(application.jobTitle)}%20Application`}
                  className="flex items-center gap-1 px-space-md py-1.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-sm hover:bg-surface-container-high transition-colors font-medium"
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  <span>Email</span>
                </a>
              )}
              <button
                id="email-templates-btn"
                type="button"
                onClick={() => setIsEmailTemplatesModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-sm hover:bg-surface-container-high transition-colors font-medium border border-outline-variant/30"
                title="Personalized follow-up email templates"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">mark_email_read</span>
                <span>Templates</span>
              </button>
              <button
                id="edit-recruiter-btn"
                type="button"
                onClick={() => setIsRecruiterModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-sm hover:bg-surface-container-high transition-colors font-medium border border-outline-variant/30"
                title="Edit recruiter contact"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Edit</span>
              </button>
              <button
                id="delete-recruiter-btn"
                type="button"
                onClick={() => setIsDeleteRecruiterModalOpen(true)}
                className="p-1.5 rounded-xl text-outline hover:text-error hover:bg-error-container/20 transition-colors border border-outline-variant/30"
                title="Delete recruiter contact"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </>
          ) : (
            <button
              id="add-recruiter-btn"
              type="button"
              onClick={() => setIsRecruiterModalOpen(true)}
              className="flex items-center gap-1 px-space-md py-1.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-sm hover:bg-surface-container-high transition-colors font-semibold border border-outline-variant/40"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Add Recruiter Contact</span>
            </button>
          )}

          {recentFollowUpDate && (
            <Link
              to="/reminders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-label-md text-label-sm font-semibold border border-emerald-300/50 hover:underline"
              title="View your scheduled follow-up reminder"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Follow-up: {formatDisplayDate(recentFollowUpDate)} →</span>
            </Link>
          )}

          <button
            id="detail-auto-schedule-followup-btn"
            type="button"
            onClick={handleAutoScheduleFollowUp}
            disabled={isSchedulingFollowUp}
            className="flex items-center gap-1.5 px-space-md py-1.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-sm hover:bg-primary transition-all font-semibold shadow-xs active:scale-98 disabled:opacity-60"
            title="Automatically schedule a follow-up reminder for this application"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isSchedulingFollowUp ? 'hourglass_empty' : 'alarm_add'}
            </span>
            <span>{isSchedulingFollowUp ? 'Scheduling...' : 'Schedule Follow-up'}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split: Notes / Prep & Application Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {/* Notes & Interview Prep */}
        <div
          id="notes-section"
          className="rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 p-space-md flex flex-col justify-between space-y-space-sm"
        >
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/30 flex-wrap gap-2">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">edit_note</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Notes &amp; Interview Prep
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              {notesSavedIndicator && (
                <span className="flex items-center gap-1 text-[11px] text-secondary font-semibold">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  <span>Saved</span>
                </span>
              )}

              {isNotesModified && (
                <button
                  type="button"
                  onClick={handleResetNotesDraft}
                  className="px-2 py-1 rounded-lg text-outline hover:text-on-surface text-[12px] font-medium"
                  title="Discard unsaved changes"
                >
                  Discard
                </button>
              )}

              {Boolean(application.notes) && (
                <button
                  id="clear-notes-btn"
                  type="button"
                  onClick={() => setIsClearNotesModalOpen(true)}
                  className="p-1 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                  title="Delete Notes"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}

              <button
                id="save-notes-btn"
                type="button"
                disabled={isSavingNotes}
                onClick={handleSaveNotes}
                className="px-space-sm py-1 rounded-lg bg-primary-container text-on-primary font-label-md text-label-sm hover:bg-primary transition-colors font-semibold shadow-2xs"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>

          <textarea
            id="notes-textarea"
            rows={10}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Document key interview questions, recruiter contact info, salary discussions, follow-up thoughts..."
            className="w-full flex-1 p-space-sm bg-surface-container-low border border-outline-variant/30 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed"
          />
        </div>

        {/* Vertical Application Timeline (Screen 2) - Editable & Deletable */}
        <div
          id="timeline-section"
          className="rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 p-space-md space-y-space-sm"
        >
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/30">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">history_edu</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Application Timeline
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-body-sm text-[11px] text-outline">
                {timeline.length} milestone{timeline.length !== 1 ? 's' : ''}
              </span>
              <button
                id="add-milestone-btn"
                type="button"
                onClick={handleOpenAddMilestone}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high text-xs font-semibold transition-colors border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Add Event</span>
              </button>
            </div>
          </div>

          {timeline.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="font-body-sm text-xs text-outline">
                No timeline records logged yet. Record milestones to track your candidate journey.
              </p>
              <button
                type="button"
                onClick={handleOpenAddMilestone}
                className="inline-flex items-center gap-1 text-primary text-xs font-semibold hover:underline"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Log First Milestone</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {timeline.map((entry, index) => {
                const entryDateDisplay = entry.date ? formatDisplayDate(entry.date) : 'Logged';

                return (
                  <div
                    key={index}
                    id={`timeline-item-${index}`}
                    className="relative pl-6 pb-2 border-l border-surface-container-high last:border-0 group"
                  >
                    <span className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-primary ring-4 ring-surface-container-lowest shadow-xs" />
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-headline-sm text-body-sm font-bold text-on-surface">
                        {entry.status}
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="font-body-sm text-[11px] text-outline">
                          {entryDateDisplay}
                        </span>

                        {/* Milestone Edit & Delete Actions */}
                        <div className="opacity-80 group-hover:opacity-100 flex items-center gap-0.5 ml-1 transition-opacity">
                          {entry.status === 'Interview' && entry.date && (
                            <CalendarExportButtons
                              title={`${application.companyName} Interview (${entry.status})`}
                              date={entry.date}
                              description={entry.notes || `Interview stage with ${application.companyName}`}
                              variant="compact"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditMilestone(entry, index)}
                            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                            title="Edit milestone"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestonePrompt(entry, index)}
                            className="p-1 rounded text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                            title="Delete milestone"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {entry.notes && (
                      <p className="font-body-sm text-xs text-on-surface-variant mt-1.5 bg-surface-container-low p-2.5 rounded-xl border border-surface-container-high/30 leading-relaxed">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Structured Interview Prep Checklist */}
      <InterviewPrepChecklist
        applicationId={application.id}
        companyName={application.companyName}
        jobTitle={application.jobTitle}
        initialChecklist={application.interviewChecklist || []}
        onChecklistUpdated={(newList) =>
          setApplication((prev) => ({ ...prev, interviewChecklist: newList }))
        }
      />

      {/* Documents & Resume Attachments */}
      <div
        id="documents-attachments-section"
        className="rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 p-space-md space-y-space-sm"
      >
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/30 flex-wrap gap-2">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">attachment</span>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Documents &amp; Resume Attachments
              </h2>
              <p className="font-body-sm text-[12px] text-outline">
                Track versions of resumes, cover letters, and offer letters submitted for this role.
              </p>
            </div>
          </div>
          <button
            id="add-document-btn"
            type="button"
            onClick={handleOpenAddDoc}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-sm hover:bg-primary transition-colors font-semibold shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Attach Document</span>
          </button>
        </div>

        {(!application.documents || application.documents.length === 0) ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-outline">
              <span className="material-symbols-outlined text-[20px]">draft</span>
            </div>
            <p className="font-body-sm text-xs text-outline">
              No resumes or documents attached to this application yet.
            </p>
            <button
              type="button"
              onClick={handleOpenAddDoc}
              className="inline-flex items-center gap-1 text-primary text-xs font-semibold hover:underline"
            >
              <span className="material-symbols-outlined text-[14px]">attachment</span>
              <span>Attach First Resume / File Link</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {application.documents.map((docItem) => {
              const getDocIcon = (t) => {
                switch (t) {
                  case 'Resume': return 'description';
                  case 'Cover Letter': return 'history_edu';
                  case 'Portfolio': return 'laptop_mac';
                  case 'Offer Letter': return 'workspace_premium';
                  default: return 'draft';
                }
              };

              return (
                <div
                  key={docItem.id}
                  className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high/40 hover:border-primary/40 transition-all flex flex-col justify-between space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">
                          {getDocIcon(docItem.type)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-on-surface truncate" title={docItem.name}>
                          {docItem.name}
                        </h4>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-surface-container text-[10px] font-semibold text-on-surface-variant mt-0.5">
                          {docItem.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEditDoc(docItem)}
                        className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
                        title="Edit Document Info"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocPrompt(docItem)}
                        className="p-1 rounded-lg text-outline hover:text-error hover:bg-error-container/20"
                        title="Delete Document"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {docItem.notes && (
                    <p className="text-[11px] text-outline line-clamp-2 italic">
                      "{docItem.notes}"
                    </p>
                  )}

                  <div className="pt-2 border-t border-surface-container-high/30 flex items-center justify-between text-[11px]">
                    <span className="text-outline">
                      {docItem.createdAt ? formatDisplayDate(docItem.createdAt) : 'Attached'}
                    </span>
                    {docItem.url ? (
                      <a
                        href={docItem.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        <span>Open Link</span>
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                      </a>
                    ) : (
                      <span className="text-outline font-medium">Local File</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Application Metadata Modal */}
      <ApplicationFormModal
        isOpen={isEditModalOpen}
        initialData={application}
        isSubmitting={isSubmittingEdit}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
      />

      {/* Recruiter Contact Edit/Add Modal */}
      <RecruiterContactModal
        isOpen={isRecruiterModalOpen}
        initialData={application}
        isSubmitting={isSubmittingRecruiter}
        onClose={() => setIsRecruiterModalOpen(false)}
        onSave={handleSaveRecruiter}
      />

      {/* Timeline Event Modal (Add/Edit Milestone) */}
      <TimelineEventModal
        isOpen={isTimelineModalOpen}
        initialData={editingMilestone}
        isSubmitting={isSubmittingMilestone}
        onClose={() => {
          setIsTimelineModalOpen(false);
          setEditingMilestone(null);
        }}
        onSave={handleSaveMilestone}
      />

      {/* Delete Recruiter Contact Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteRecruiterModalOpen}
        title="Remove Recruiter Contact?"
        message="Are you sure you want to remove this recruiter's contact details from this application?"
        confirmText="Remove Contact"
        isConfirming={isDeletingRecruiter}
        onCancel={() => setIsDeleteRecruiterModalOpen(false)}
        onConfirm={handleConfirmDeleteRecruiter}
      />

      {/* Clear Notes Confirmation Modal */}
      <ConfirmationModal
        isOpen={isClearNotesModalOpen}
        title="Clear Candidate Notes?"
        message="Are you sure you want to delete all notes recorded for this application? This cannot be undone."
        confirmText="Clear Notes"
        isConfirming={isClearingNotes}
        onCancel={() => setIsClearNotesModalOpen(false)}
        onConfirm={handleConfirmClearNotes}
      />

      {/* Delete Milestone Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteMilestoneModalOpen}
        title="Delete Timeline Milestone?"
        message={`Are you sure you want to delete the "${milestoneToDelete?.status || 'milestone'}" event from the timeline?`}
        confirmText="Delete Milestone"
        isConfirming={isDeletingMilestone}
        onCancel={() => {
          setIsDeleteMilestoneModalOpen(false);
          setMilestoneToDelete(null);
        }}
        onConfirm={handleConfirmDeleteMilestone}
      />

      {/* Delete Safeguard Modal (Screen 5) */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-xl shadow-2xl border border-surface-container space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Delete Application?
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  This action cannot be undone or reversed.
                </p>
              </div>
            </div>

            <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${getMonogramStyle(
                  application.companyName
                )}`}
              >
                {getMonogram(application.companyName)}
              </div>
              <div className="min-w-0">
                <p className="font-headline-sm text-body-sm font-semibold text-on-surface truncate">
                  {application.jobTitle}
                </p>
                <p className="font-body-sm text-[12px] text-outline truncate">
                  {application.companyName}
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-on-surface-variant cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={deleteSafeguardChecked}
                onChange={(e) => setDeleteSafeguardChecked(e.target.checked)}
                className="mt-0.5 rounded border-outline text-primary focus:ring-primary"
              />
              <span>
                I understand that this candidate journey record and historical telemetry cannot be recovered.
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-space-md py-2 rounded-xl text-on-surface-variant font-label-md text-label-md hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deleteSafeguardChecked || isDeleting}
                onClick={handleConfirmDelete}
                className="px-space-md py-2 rounded-xl bg-error text-white font-label-md text-label-md hover:bg-error/90 disabled:opacity-40 transition-all font-semibold shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document / Resume Attachment Modal */}
      <DocumentAttachmentModal
        isOpen={isDocModalOpen}
        initialData={editingDoc}
        isSubmitting={isSubmittingDoc}
        onClose={() => {
          setIsDocModalOpen(false);
          setEditingDoc(null);
        }}
        onSave={handleSaveDoc}
      />

      {/* Email Follow-up Templates Modal */}
      <EmailTemplatesModal
        isOpen={isEmailTemplatesModalOpen}
        application={application}
        candidateName=""
        onClose={() => setIsEmailTemplatesModalOpen(false)}
      />

      {/* Delete Document Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteDocModalOpen}
        title="Delete Document Attachment?"
        message={`Are you sure you want to remove "${docToDelete?.name || 'this document'}"?`}
        confirmText="Delete Document"
        isConfirming={isDeletingDoc}
        onCancel={() => {
          setIsDeleteDocModalOpen(false);
          setDocToDelete(null);
        }}
        onConfirm={handleConfirmDeleteDoc}
      />
    </div>
  );
}
