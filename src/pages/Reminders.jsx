import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  deleteCompletedReminders,
} from '../services/remindersService';
import { getApplications } from '../services/applicationsService';
import {
  REMINDER_TYPES,
  formatDisplayDate,
} from '../utils/constants';
import { useToast } from '../hooks/useToast';
import { CardSkeleton } from '../components/common/Skeleton';
import ConfirmationModal from '../components/common/ConfirmationModal';
import ReminderFormModal from '../components/reminders/ReminderFormModal';
import CalendarExportButtons from '../components/common/CalendarExportButtons';
import { Link } from 'react-router-dom';

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | completed
  const [typeFilter, setTypeFilter] = useState('All');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clear completed reminders modal state
  const [isClearCompletedModalOpen, setIsClearCompletedModalOpen] = useState(false);
  const [isClearingCompleted, setIsClearingCompleted] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [remindersRes, appsRes] = await Promise.all([
      getReminders(),
      getApplications(),
    ]);

    if (remindersRes.error) {
      showError(remindersRes.error);
    } else {
      setReminders(remindersRes.data || []);
    }

    if (!appsRes.error) {
      setApplications(appsRes.data || []);
    }

    setLoading(false);
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lookup map for applications by ID
  const appsMap = useMemo(() => {
    const map = {};
    applications.forEach((app) => {
      map[app.id] = app;
    });
    return map;
  }, [applications]);

  const handleOpenAddModal = () => {
    setEditingReminder(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (reminder) => {
    setEditingReminder(reminder);
    setIsFormModalOpen(true);
  };

  const handleSaveReminder = async (formData) => {
    setIsSubmittingForm(true);

    if (editingReminder && editingReminder.id) {
      const { success, error } = await updateReminder(editingReminder.id, formData);
      setIsSubmittingForm(false);

      if (success) {
        showSuccess('Reminder updated.');
        setIsFormModalOpen(false);
        setEditingReminder(null);
        loadData();
      } else {
        showError(error || 'Failed to update reminder.');
      }
    } else {
      const { data, error } = await createReminder(formData);
      setIsSubmittingForm(false);

      if (error) {
        showError(error);
      } else {
        showSuccess('Reminder scheduled.');
        setIsFormModalOpen(false);
        loadData();
      }
    }
  };

  const handleToggleComplete = async (reminder) => {
    const newStatus = !reminder.completed;
    const { success, error } = await updateReminder(reminder.id, { completed: newStatus });

    if (success) {
      setReminders((prev) =>
        prev.map((r) => (r.id === reminder.id ? { ...r, completed: newStatus } : r))
      );
      showSuccess(newStatus ? 'Marked as completed.' : 'Marked as pending.');
    } else {
      showError(error || 'Failed to update reminder.');
    }
  };

  const handleDeletePrompt = (reminder) => {
    setReminderToDelete(reminder);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reminderToDelete) return;
    setIsDeleting(true);

    const { success, error } = await deleteReminder(reminderToDelete.id);
    setIsDeleting(false);

    if (success) {
      setReminders((prev) => prev.filter((r) => r.id !== reminderToDelete.id));
      showSuccess('Reminder deleted.');
      setIsDeleteModalOpen(false);
      setReminderToDelete(null);
    } else {
      showError(error || 'Failed to delete reminder.');
    }
  };

  const handleConfirmClearCompleted = async () => {
    setIsClearingCompleted(true);
    const { success, count, error } = await deleteCompletedReminders();
    setIsClearingCompleted(false);

    if (success) {
      setReminders((prev) => prev.filter((r) => !r.completed));
      showSuccess(`Deleted ${count} completed task${count !== 1 ? 's' : ''}.`);
      setIsClearCompletedModalOpen(false);
    } else {
      showError(error || 'Failed to delete completed reminders.');
    }
  };

  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      if (statusFilter === 'pending' && r.completed) return false;
      if (statusFilter === 'completed' && !r.completed) return false;
      if (typeFilter !== 'All' && r.type !== typeFilter) return false;
      return true;
    });
  }, [reminders, statusFilter, typeFilter]);

  const pendingCount = reminders.filter((r) => !r.completed).length;
  const completedCount = reminders.filter((r) => r.completed).length;

  return (
    <div id="reminders-page" className="space-y-space-lg max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div id="reminders-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm pb-space-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              {pendingCount} Pending Action{pendingCount !== 1 ? 's' : ''}
            </span>
          </div>
          <h1 id="reminders-title" className="font-display-lg-mobile md:font-display-lg text-on-surface font-bold tracking-tight">
            Follow-ups &amp; Deadlines
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
            Never miss a recruiter check-in, technical round prep, or offer response deadline.
          </p>
        </div>

        <button
          id="open-create-reminder-btn"
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center gap-1 px-space-md py-2.5 bg-primary-container hover:bg-primary active:scale-[0.98] text-on-primary font-label-md text-label-md font-semibold rounded-xl shadow-xs transition-all self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Reminder</span>
        </button>
      </div>

      {/* Filter Tabs & Type Selector */}
      <div id="reminders-filter-bar" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high/30 pb-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {[
            { key: 'all', label: 'All Tasks' },
            { key: 'pending', label: 'Pending' },
            { key: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              id={`filter-tab-${tab.key}`}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl font-label-md text-label-sm font-semibold transition-all ${
                statusFilter === tab.key
                  ? 'bg-primary-container text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type Filter & Clear Completed */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {completedCount > 0 && (
            <button
              id="clear-completed-reminders-btn"
              type="button"
              onClick={() => setIsClearCompletedModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-outline hover:text-error hover:bg-error-container/20 transition-colors font-medium border border-outline-variant/30"
              title="Delete all completed reminders"
            >
              <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
              <span>Clear Completed ({completedCount})</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-outline text-[16px]">filter_list</span>
            <span className="font-body-sm text-outline font-medium">Type:</span>
            <select
              id="reminders-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-xl font-body-sm text-[12px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="All">All Types</option>
              {REMINDER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reminders Content */}
      {loading ? (
        <CardSkeleton count={3} />
      ) : filteredReminders.length === 0 ? (
        <div
          id="reminders-empty-state"
          className="rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 p-10 sm:p-14 text-center space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-surface-container text-outline flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[28px]">notifications_paused</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Nothing coming up.</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto">
            {statusFilter === 'all'
              ? 'Schedule follow-up emails, interview prep sessions, and recruiter deadlines.'
              : `No ${statusFilter} reminders match the current filters.`}
          </p>
          <button
            id="empty-create-reminder-btn"
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1 px-space-md py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-sm font-semibold rounded-xl shadow-xs transition-colors mt-2"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Reminder</span>
          </button>
        </div>
      ) : (
        <div
          id="reminders-list-card"
          className="rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 divide-y divide-surface-container-high/30 overflow-hidden"
        >
          {filteredReminders.map((reminder) => {
            const linkedApp = reminder.applicationId ? appsMap[reminder.applicationId] : null;

            return (
              <div
                key={reminder.id}
                id={`reminder-item-${reminder.id}`}
                className="p-4 sm:p-5 flex items-start justify-between gap-3.5 hover:bg-surface-container-low/40 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <button
                    id={`toggle-reminder-${reminder.id}`}
                    type="button"
                    onClick={() => handleToggleComplete(reminder)}
                    className="mt-0.5 text-outline hover:text-primary transition-colors shrink-0 p-1 -m-1 focus:outline-none"
                    title={reminder.completed ? 'Mark pending' : 'Mark complete'}
                    aria-label={reminder.completed ? 'Mark pending' : 'Mark complete'}
                  >
                    {reminder.completed ? (
                      <span className="material-symbols-outlined text-secondary text-[22px]">
                        check_circle
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-outline text-[22px]">
                        radio_button_unchecked
                      </span>
                    )}
                  </button>

                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`font-headline-sm text-body-sm font-bold text-on-surface ${
                          reminder.completed ? 'line-through text-outline font-normal' : ''
                        }`}
                      >
                        {reminder.title}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-[10px] font-semibold text-on-surface-variant uppercase">
                        {reminder.type || 'Follow-up'}
                      </span>
                    </div>

                    {reminder.notes && (
                      <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed max-w-xl">
                        {reminder.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-outline flex-wrap pt-0.5 font-body-sm">
                      <span className="flex items-center gap-1 font-medium text-on-surface">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        <span>{formatDisplayDate(reminder.date || reminder.dueDate)}</span>
                      </span>

                      {reminder.time && (
                        <span className="flex items-center gap-1 font-medium text-on-surface">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span>{reminder.time}</span>
                        </span>
                      )}

                      {linkedApp && (
                        <Link
                          to={`/applications/${linkedApp.id}`}
                          className="flex items-center gap-1 text-primary hover:underline font-semibold"
                        >
                          <span className="material-symbols-outlined text-[14px]">business_center</span>
                          <span>
                            {linkedApp.companyName} ({linkedApp.jobTitle})
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 flex-wrap">
                  <CalendarExportButtons
                    title={reminder.title + (linkedApp ? ` - ${linkedApp.companyName}` : '')}
                    description={reminder.notes || `Reminder: ${reminder.title}`}
                    date={reminder.date || reminder.dueDate}
                    variant="compact"
                  />

                  <button
                    id={`edit-reminder-btn-${reminder.id}`}
                    type="button"
                    onClick={() => handleOpenEditModal(reminder)}
                    className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
                    title="Edit reminder"
                    aria-label="Edit reminder"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>

                  <button
                    id={`delete-reminder-btn-${reminder.id}`}
                    type="button"
                    onClick={() => handleDeletePrompt(reminder)}
                    className="p-1.5 text-outline hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"
                    title="Delete reminder"
                    aria-label="Delete reminder"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reminder Form Modal */}
      <ReminderFormModal
        isOpen={isFormModalOpen}
        initialData={editingReminder}
        applications={applications}
        isSubmitting={isSubmittingForm}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingReminder(null);
        }}
        onSave={handleSaveReminder}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete this reminder?"
        message="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isConfirming={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setReminderToDelete(null);
        }}
      />

      {/* Clear Completed Tasks Confirmation Modal */}
      <ConfirmationModal
        isOpen={isClearCompletedModalOpen}
        title="Clear Completed Reminders?"
        message={`Are you sure you want to permanently delete all ${completedCount} completed reminder${completedCount !== 1 ? 's' : ''}?`}
        confirmText="Clear Completed"
        cancelText="Cancel"
        isConfirming={isClearingCompleted}
        onConfirm={handleConfirmClearCompleted}
        onCancel={() => setIsClearCompletedModalOpen(false)}
      />
    </div>
  );
}
