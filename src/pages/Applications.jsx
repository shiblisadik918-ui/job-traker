import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getApplications,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
} from '../services/applicationsService';
import {
  APPLICATION_STATUSES,
  JOB_TYPES,
  formatDisplayDate,
} from '../utils/constants';
import { useToast } from '../hooks/useToast';
import { useApplicationModal } from '../context/ApplicationModalContext';
import ConfirmationModal from '../components/common/ConfirmationModal';
import CsvImportModal from '../components/applications/CsvImportModal';
import KanbanBoard from '../components/applications/KanbanBoard';
import ApplicationCardActionModal from '../components/applications/ApplicationCardActionModal';
import { createReminder } from '../services/remindersService';

export default function Applications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { openAddModal, openEditModal } = useApplicationModal();

  // Follow-up scheduling state
  const [schedulingFollowUpId, setSchedulingFollowUpId] = useState(null);

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [modalityFilter, setModalityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Stage Quick Change popover state
  const [stagePopoverAppId, setStagePopoverAppId] = useState(null);

  // Application Card Quick Action Modal (Update Status & Delete Record)
  const [cardActionApp, setCardActionApp] = useState(null);

  // Delete Safeguard Modal state
  const [deleteModalApp, setDeleteModalApp] = useState(null);
  const [deleteSafeguardChecked, setDeleteSafeguardChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync URL search param
  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('search');
    if (q !== null && q !== searchQuery) {
      setSearchQuery(q);
    }
    const statusParam = searchParams.get('status');
    if (statusParam && statusParam !== statusFilter) {
      setStatusFilter(statusParam);
    }
  }, [searchParams, searchQuery, statusFilter]);

  // 1-Click Automatic Follow-up Scheduler
  const handleAutoScheduleFollowUp = async (e, app) => {
    e.stopPropagation();
    setSchedulingFollowUpId(app.id);

    const followUpDays = 5;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + followUpDays);
    const dateStr = targetDate.toISOString().split('T')[0];

    const reminderPayload = {
      applicationId: app.id,
      title: `Follow up with ${app.companyName} (${app.jobTitle})`,
      date: dateStr,
      time: '10:00',
      type: 'Follow-up',
      notes: `Touchpoint on application status with ${app.recruiterName || app.companyName} for the ${app.jobTitle} position.`,
    };

    const { error } = await createReminder(reminderPayload);
    setSchedulingFollowUpId(null);

    if (error) {
      showError(error || 'Failed to schedule follow-up.');
    } else {
      showSuccess(`Follow-up automatically scheduled for ${app.companyName} on ${formatDisplayDate(dateStr)}!`);
      window.dispatchEvent(new CustomEvent('jobtrack:reminder-changed', { detail: { action: 'create' } }));
    }
  };

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getApplications();
    if (error) {
      showError(error);
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  }, [showError]);

  useEffect(() => {
    fetchApplications();
    const handleChanged = () => fetchApplications();
    window.addEventListener('jobtrack:application-changed', handleChanged);
    return () => window.removeEventListener('jobtrack:application-changed', handleChanged);
  }, [fetchApplications]);

  // Calculations for Top KPI Velocity Strip
  const totalApps = applications.length;
  const interviewApps = applications.filter((a) => a.status === 'Interview');
  const offerApps = applications.filter((a) => a.status === 'Offer');
  const interviewRate = totalApps > 0 ? ((interviewApps.length / totalApps) * 100).toFixed(1) : '0.0';

  // Export CSV helper
  const handleExportCSV = () => {
    if (applications.length === 0) {
      showError('No applications to export.');
      return;
    }

    const headers = [
      'Company Name',
      'Job Title',
      'Status',
      'Job Type',
      'Location',
      'Application Date',
      'Priority',
      'Salary',
      'Job URL',
      'Notes',
    ];

    const rows = applications.map((app) => [
      `"${(app.companyName || '').replace(/"/g, '""')}"`,
      `"${(app.jobTitle || '').replace(/"/g, '""')}"`,
      `"${(app.status || '').replace(/"/g, '""')}"`,
      `"${(app.jobType || '').replace(/"/g, '""')}"`,
      `"${(app.location || '').replace(/"/g, '""')}"`,
      `"${app.applicationDate || ''}"`,
      `"${app.priority || ''}"`,
      `"${(app.salary || '').replace(/"/g, '""')}"`,
      `"${(app.jobUrl || '').replace(/"/g, '""')}"`,
      `"${(app.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `jobtrack_applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess('Exported applications to CSV.');
  };

  // Quick Status Change
  const handleQuickStatusChange = async (appId, newStatus) => {
    setStagePopoverAppId(null);
    const { success, error } = await updateApplication(appId, { status: newStatus });
    if (success) {
      showSuccess(`Updated stage to ${newStatus}`);
      fetchApplications();
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id: appId, action: 'update' } }));
    } else {
      showError(error || 'Failed to update stage.');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteModalApp) return;
    setIsDeleting(true);
    const { success, error } = await deleteApplication(deleteModalApp.id);
    setIsDeleting(false);

    if (success) {
      showSuccess('Application removed from pipeline.');
      setDeleteModalApp(null);
      setDeleteSafeguardChecked(false);
      fetchApplications();
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id: deleteModalApp.id, action: 'delete' } }));
    } else {
      showError(error || 'Failed to delete application.');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setJobTypeFilter('All');
    setModalityFilter('All');
    setSortBy('newest');
    setSearchParams({});
    setCurrentPage(1);
  };

  // Monogram helper
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

  // Filter and sort applications
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCompany = (app.companyName || '').toLowerCase().includes(q);
          const matchTitle = (app.jobTitle || '').toLowerCase().includes(q);
          const matchLoc = (app.location || '').toLowerCase().includes(q);
          if (!matchCompany && !matchTitle && !matchLoc) return false;
        }

        if (statusFilter !== 'All' && app.status !== statusFilter) return false;
        if (jobTypeFilter !== 'All' && app.jobType !== jobTypeFilter) return false;

        if (modalityFilter !== 'All') {
          const loc = (app.location || '').toLowerCase();
          if (modalityFilter === 'Remote' && !loc.includes('remote')) return false;
          if (modalityFilter === 'Hybrid' && !loc.includes('hybrid')) return false;
          if (modalityFilter === 'On-site' && (loc.includes('remote') || loc.includes('hybrid'))) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.applicationDate || '').localeCompare(a.applicationDate || '');
        if (sortBy === 'oldest') return (a.applicationDate || '').localeCompare(b.applicationDate || '');
        if (sortBy === 'company') return (a.companyName || '').localeCompare(b.companyName || '');
        return 0;
      });
  }, [applications, searchQuery, statusFilter, jobTypeFilter, modalityFilter, sortBy]);

  // Paginated slices
  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / itemsPerPage));
  const paginatedApps = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Interview':
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
            Interviewing
          </span>
        );
      case 'Offer':
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            Offered
          </span>
        );
      case 'Shortlisted':
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            Shortlisted
          </span>
        );
      case 'Applied':
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
            Applied
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
            {status}
          </span>
        );
    }
  };

  // 4-step pipeline segment indicator
  const getPipelineProgress = (status) => {
    switch (status) {
      case 'Saved':
        return [true, false, false, false];
      case 'Applied':
        return [true, true, false, false];
      case 'Shortlisted':
        return [true, true, true, false];
      case 'Interview':
        return [true, true, true, false];
      case 'Offer':
        return [true, true, true, true];
      default:
        return [true, false, false, false];
    }
  };

  const handleKanbanStatusChange = async (appId, newStatus) => {
    const { success, error } = await updateApplicationStatus(
      appId,
      newStatus,
      `Moved to ${newStatus} via Kanban board.`
    );
    if (success) {
      showSuccess(`Moved application to ${newStatus}`);
      fetchApplications();
    } else {
      showError(error || 'Failed to update application status.');
    }
  };

  return (
    <div id="applications-page" className="space-y-space-lg animate-in fade-in duration-200">
      {/* Top KPI Velocity Strip */}
      <section
        id="applications-kpi-strip"
        className="grid grid-cols-2 lg:grid-cols-4 gap-space-md"
      >
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Active Pipeline
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">rocket_launch</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {totalApps}
          </div>
          <div className="font-body-sm text-[11px] text-outline mt-0.5">+4 this week</div>
        </div>

        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Interview Rate
            </span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">conversion_path</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {interviewRate}%
          </div>
          <div className="font-body-sm text-[11px] text-tertiary font-medium mt-0.5">
            {interviewApps.length}/{totalApps} Total
          </div>
        </div>

        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Offers Received
            </span>
            <span className="material-symbols-outlined text-secondary text-[20px]">workspace_premium</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {offerApps.length}
          </div>
          <div className="font-body-sm text-[11px] text-secondary font-medium mt-0.5">
            {offerApps.length > 0 ? 'Decision pending' : 'Target: 2 offers'}
          </div>
        </div>

        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Avg. Velocity
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">pace</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            11d
          </div>
          <div className="font-body-sm text-[11px] text-outline mt-0.5">Submission to call</div>
        </div>
      </section>

      {/* Main Workspace Command Surface */}
      <section
        id="applications-command-surface"
        className="rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 p-space-md space-y-space-md"
      >
        {/* Search Bar & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm">
          {/* Search Input with ⌘K Badge */}
          <div className="relative flex-1 max-w-lg">
            <span className="material-symbols-outlined text-outline text-[20px] absolute left-3.5 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              id="applications-command-search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchParams(e.target.value ? { q: e.target.value } : {});
                setCurrentPage(1);
              }}
              placeholder="Search applications, roles, companies..."
              className="w-full pl-10 pr-16 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono-metric text-[10px] uppercase text-outline px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/40">
              ⌘K
            </span>
          </div>

          {/* Right Actions: Export CSV, Import CSV and Add Application */}
          <div className="flex items-center gap-space-xs self-end sm:self-auto">
            <button
              id="import-csv-btn"
              type="button"
              onClick={() => setIsCsvImportOpen(true)}
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors border border-outline-variant/40"
              title="Import Applications from CSV"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">upload_file</span>
              <span className="hidden sm:inline">Import CSV</span>
            </button>

            <button
              id="export-csv-btn"
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors border border-outline-variant/40"
              title="Export Applications to CSV"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              id="command-add-app-btn"
              type="button"
              onClick={() => openAddModal()}
              className="flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all shadow-sm active:scale-98 font-semibold"
              title="Track a new job application"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Track Application</span>
            </button>
          </div>
        </div>

        {/* Status Filter Interactive Pills */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1">
          {[
            { id: 'All', label: 'All', count: totalApps },
            { id: 'Applied', label: 'Applied', count: applications.filter((a) => a.status === 'Applied').length },
            { id: 'Shortlisted', label: 'Shortlisted', count: applications.filter((a) => a.status === 'Shortlisted').length },
            { id: 'Interview', label: 'Interview', count: interviewApps.length },
            { id: 'Offer', label: 'Offered', count: offerApps.length },
            { id: 'Rejected', label: 'Rejected', count: applications.filter((a) => a.status === 'Rejected').length },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                setStatusFilter(pill.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-label-sm text-label-sm whitespace-nowrap transition-all flex items-center gap-1.5 ${
                statusFilter === pill.id
                  ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span>{pill.label}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest/20 font-mono-metric text-[10px]">
                {pill.count}
              </span>
            </button>
          ))}
        </div>

        {/* Secondary Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-space-xs pt-space-xs border-t border-surface-container-high/30 text-xs">
          <div className="flex flex-wrap items-center gap-space-xs">
            {/* Job Type Dropdown */}
            <select
              value={jobTypeFilter}
              onChange={(e) => {
                setJobTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-surface-container-low rounded-xl font-body-sm text-[12px] text-on-surface border border-outline-variant/40 focus:outline-none"
            >
              <option value="All">All Job Types</option>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Modality Dropdown */}
            <select
              value={modalityFilter}
              onChange={(e) => {
                setModalityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-surface-container-low rounded-xl font-body-sm text-[12px] text-on-surface border border-outline-variant/40 focus:outline-none"
            >
              <option value="All">All Modalities</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>

            {/* Reset Button */}
            {(statusFilter !== 'All' || jobTypeFilter !== 'All' || modalityFilter !== 'All' || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-primary hover:underline font-label-sm text-[11px]"
              >
                <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                <span>Reset</span>
              </button>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-container-low rounded-xl font-body-sm text-[12px] text-on-surface border border-outline-variant/40 focus:outline-none"
            >
              <option value="newest">Newest Applied</option>
              <option value="oldest">Oldest First</option>
              <option value="company">Company (A-Z)</option>
            </select>
          </div>

          {/* List vs Grid vs Kanban Layout View Switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-container-low border border-outline-variant/30">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-outline hover:text-on-surface'}`}
              title="List View"
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-outline hover:text-on-surface'}`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1 rounded ${viewMode === 'kanban' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-outline hover:text-on-surface'}`}
              title="Kanban Board View"
            >
              <span className="material-symbols-outlined text-[18px]">view_kanban</span>
            </button>
          </div>
        </div>

        {/* Applications List / Grid / Kanban Stream */}
        {loading ? (
          <div className="py-12 text-center text-outline">Loading applications...</div>
        ) : filteredApplications.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <span className="material-symbols-outlined text-outline text-[40px]">search_off</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              No matching applications found
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto">
              Try adjusting your search terms or clearing your stage filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-2 px-space-md py-1.5 rounded-xl bg-surface-container font-label-md text-label-sm text-on-surface hover:bg-surface-container-high"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'kanban' ? (
          /* Kanban Board View Layout */
          <div className="pt-space-xs">
            <KanbanBoard
              applications={filteredApplications}
              onStatusChange={handleKanbanStatusChange}
              onEdit={openEditModal}
              onDelete={(app) => {
                setDeleteModalApp(app);
                setDeleteSafeguardChecked(false);
              }}
              onAdd={(defaultStatus) => openAddModal({ status: defaultStatus })}
              onCardClick={(app) => setCardActionApp(app)}
            />
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
            {paginatedApps.map((app) => (
              <div
                key={app.id}
                onClick={() => setCardActionApp(app)}
                title="Click to update status or delete record"
                className="p-space-md rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-space-sm group relative"
              >
                <div className="space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${getMonogramStyle(
                        app.companyName
                      )}`}
                    >
                      {getMonogram(app.companyName)}
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold group-hover:text-primary transition-colors truncate">
                      {app.jobTitle}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                      {app.companyName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] flex-wrap font-body-sm pt-0.5">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary-container/20 dark:bg-primary-950/40 text-primary font-semibold border border-primary/20"
                      title={`Application submission date: ${formatDisplayDate(app.applicationDate)}`}
                    >
                      <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                      <span>Applied: {formatDisplayDate(app.applicationDate)}</span>
                    </span>
                    {app.location && (
                      <span className="text-outline flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        <span>{app.location}</span>
                      </span>
                    )}
                  </div>
                  {app.salary && (
                    <div className="font-mono-metric text-[11px] font-bold text-primary">
                      {app.salary}
                    </div>
                  )}
                </div>

                <div
                  className="flex items-center justify-between pt-space-xs border-t border-surface-container-high/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/applications/${app.id}`)}
                    className="text-primary font-label-md text-label-sm font-semibold hover:underline"
                  >
                    View Details →
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleAutoScheduleFollowUp(e, app)}
                      disabled={schedulingFollowUpId === app.id}
                      className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors"
                      title="Automatically schedule follow-up in 5 days"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {schedulingFollowUpId === app.id ? 'hourglass_empty' : 'alarm_add'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(app)}
                      className="p-1 rounded text-outline hover:text-on-surface"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteModalApp(app)}
                      className="p-1 rounded text-outline hover:text-error"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View Layout (Exact Stitch Screen 4 Stream) */
          <div className="divide-y divide-surface-container-high/30">
            {paginatedApps.map((app) => {
              const isRemote = (app.location || '').toLowerCase().includes('remote');
              const isHybrid = (app.location || '').toLowerCase().includes('hybrid');
              const progressSegments = getPipelineProgress(app.status);

              return (
                <div
                  key={app.id}
                  onClick={() => setCardActionApp(app)}
                  title="Click to update status or delete record"
                  className="py-space-md flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm hover:bg-surface-container-low/60 rounded-xl px-space-xs transition-colors cursor-pointer group"
                >
                  {/* Left Column: Monogram + Info */}
                  <div className="flex items-start gap-space-sm min-w-0 flex-1">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${getMonogramStyle(
                        app.companyName
                      )}`}
                    >
                      {getMonogram(app.companyName)}
                    </div>

                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex items-center gap-space-xs flex-wrap">
                        <span className="font-headline-sm text-body-md font-bold text-on-surface">
                          {app.companyName}
                        </span>
                        <span className="px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[10px] font-semibold uppercase">
                          {isRemote ? 'Remote' : isHybrid ? 'Hybrid' : 'On-site'}
                        </span>
                      </div>

                      <h3 className="font-headline-sm text-body-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                        {app.jobTitle}
                      </h3>

                      <div className="flex items-center gap-space-sm text-[11px] flex-wrap font-body-sm">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary-container/20 dark:bg-primary-950/40 text-primary font-semibold border border-primary/20"
                          title={`Application submission date: ${formatDisplayDate(app.applicationDate)}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                          <span>Applied: {formatDisplayDate(app.applicationDate)}</span>
                        </span>
                        {app.location && (
                          <span className="flex items-center gap-0.5 text-outline">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            <span>{app.location}</span>
                          </span>
                        )}
                        {app.salary && (
                          <span className="px-2 py-0.5 rounded bg-surface-container font-mono-metric text-[10px] text-on-surface font-semibold">
                            {app.salary}
                          </span>
                        )}
                      </div>

                      {/* Sub-detail note matching Stitch */}
                      {app.notes && (
                        <p className="font-body-sm text-[11px] text-on-surface-variant line-clamp-1 italic">
                          {app.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Miniature Segmented Pipeline Progress */}
                  <div className="hidden xl:flex items-center gap-1 w-36 px-2">
                    {progressSegments.map((active, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          active ? 'bg-primary' : 'bg-surface-container-high'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Right Column: Stage Pill & Action Buttons */}
                  <div
                    className="flex items-center gap-space-xs sm:gap-space-sm justify-between lg:justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-surface-container-high/30"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Status Badge with Quick Update trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setStagePopoverAppId(stagePopoverAppId === app.id ? null : app.id)
                        }
                        className="focus:outline-none"
                        title="Click to update stage"
                      >
                        {getStatusBadge(app.status)}
                      </button>

                      {/* Stage Popover */}
                      {stagePopoverAppId === app.id && (
                        <div className="absolute left-0 lg:right-0 mt-2 w-48 rounded-xl bg-surface-container-lowest shadow-xl border border-surface-container z-50 p-1.5 text-xs animate-in fade-in zoom-in-95">
                          <div className="px-2 py-1 font-label-sm text-[10px] text-outline uppercase tracking-wider">
                            Move Stage To:
                          </div>
                          {APPLICATION_STATUSES.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleQuickStatusChange(app.id, st)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                                app.status === st
                                  ? 'bg-primary-container text-on-primary font-bold'
                                  : 'hover:bg-surface-container-low text-on-surface'
                              }`}
                            >
                              <span>{st}</span>
                              {app.status === st && (
                                <span className="material-symbols-outlined text-[16px]">check</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <button
                      type="button"
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="px-space-sm py-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container font-label-md text-label-sm transition-colors"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleAutoScheduleFollowUp(e, app)}
                      disabled={schedulingFollowUpId === app.id}
                      className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors"
                      title="Automatically schedule follow-up in 5 days"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {schedulingFollowUpId === app.id ? 'hourglass_empty' : 'alarm_add'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(app)}
                      className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteModalApp(app);
                        setDeleteSafeguardChecked(false);
                      }}
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {viewMode !== 'kanban' && filteredApplications.length > 0 && (
          <div className="pt-space-sm border-t border-surface-container-high/30 flex flex-col sm:flex-row items-center justify-between gap-space-xs text-xs">
            <span className="font-body-sm text-outline">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredApplications.length)} of{' '}
              {filteredApplications.length} applications
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-lg font-label-md text-[12px] transition-all ${
                    currentPage === i + 1
                      ? 'bg-primary-container text-on-primary font-bold shadow-2xs'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Safeguard Delete Confirmation Modal (Screen 5) */}
      {deleteModalApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-xs animate-in fade-in"
          onClick={() => setDeleteModalApp(null)}
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
                  deleteModalApp.companyName
                )}`}
              >
                {getMonogram(deleteModalApp.companyName)}
              </div>
              <div className="min-w-0">
                <p className="font-headline-sm text-body-sm font-semibold text-on-surface truncate">
                  {deleteModalApp.jobTitle}
                </p>
                <p className="font-body-sm text-[12px] text-outline truncate">
                  {deleteModalApp.companyName}
                </p>
              </div>
            </div>

            {/* Checkbox safeguard */}
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
                onClick={() => setDeleteModalApp(null)}
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

      {/* CSV Bulk Import Modal */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onImportSuccess={fetchApplications}
      />

      {/* Application Card Quick Action Modal (Update Status / Delete Record) */}
      <ApplicationCardActionModal
        isOpen={!!cardActionApp}
        onClose={() => setCardActionApp(null)}
        application={cardActionApp}
        onStatusUpdated={(appId, newStatus) => {
          setApplications((prev) =>
            prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
          );
          setCardActionApp((prev) =>
            prev && prev.id === appId ? { ...prev, status: newStatus } : prev
          );
        }}
        onDeleted={(appId) => {
          setApplications((prev) => prev.filter((a) => a.id !== appId));
          setCardActionApp(null);
        }}
        onEdit={(app) => {
          setCardActionApp(null);
          openEditModal(app);
        }}
      />
    </div>
  );
}
