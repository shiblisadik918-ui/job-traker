import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getApplications, createApplication, deleteApplication } from '../services/applicationsService';
import { getReminders, createReminder } from '../services/remindersService';
import { useToast } from '../hooks/useToast';
import { useApplicationModal } from '../context/ApplicationModalContext';
import { formatDisplayDate } from '../utils/constants';
import ConfirmationModal from '../components/common/ConfirmationModal';
import CalendarExportButtons from '../components/common/CalendarExportButtons';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { openAddModal, openEditModal } = useApplicationModal();

  const [applications, setApplications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedulingFollowUpId, setSchedulingFollowUpId] = useState(null);

  // Delete modal state
  const [appToDelete, setAppToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingApp, setIsDeletingApp] = useState(false);

  // Tab and filter states
  const [activeTab, setActiveTab] = useState('all'); // all, action, review, offers
  const [selectedPipelineStatus, setSelectedPipelineStatus] = useState(null);
  const [roleFilter, setRoleFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [isSeeding, setIsSeeding] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [appsRes, remsRes] = await Promise.all([
      getApplications(),
      getReminders(),
    ]);

    if (appsRes.error) {
      showError(appsRes.error);
    } else {
      setApplications(appsRes.data || []);
    }

    if (!remsRes.error) {
      setReminders(remsRes.data || []);
    }

    setLoading(false);
  }, [showError]);

  const handleConfirmDeleteApp = async () => {
    if (!appToDelete) return;
    setIsDeletingApp(true);
    const { success, error } = await deleteApplication(appToDelete.id);
    setIsDeletingApp(false);

    if (success) {
      showSuccess(`Deleted application for ${appToDelete.companyName || 'opportunity'}`);
      setIsDeleteModalOpen(false);
      setAppToDelete(null);
      loadData();
      window.dispatchEvent(new CustomEvent('jobtrack:application-changed', { detail: { id: appToDelete.id, action: 'delete' } }));
    } else {
      showError(error || 'Failed to delete application.');
    }
  };

  useEffect(() => {
    loadData();

    const handleAppChanged = () => {
      loadData();
    };
    window.addEventListener('jobtrack:application-changed', handleAppChanged);
    return () => window.removeEventListener('jobtrack:application-changed', handleAppChanged);
  }, [loadData]);

  // Calculations from actual Firestore applications
  const totalApplications = applications.length;
  const appliedCount = applications.filter((a) => a.status === 'Applied').length;
  const shortlistedCount = applications.filter((a) => a.status === 'Shortlisted').length;
  const interviewApps = applications.filter((a) => a.status === 'Interview');
  const interviewCount = interviewApps.length;
  const offerApps = applications.filter((a) => a.status === 'Offer');
  const offerCount = offerApps.length;
  const rejectedCount = applications.filter((a) => a.status === 'Rejected').length;
  const savedCount = applications.filter((a) => a.status === 'Saved').length;

  // Active target calculation: target is 5 applications this week
  const weeklyTarget = 5;
  const sentThisWeek = applications.filter((a) => {
    if (!a.applicationDate) return false;
    const appDate = new Date(a.applicationDate);
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return appDate >= oneWeekAgo;
  }).length;
  const targetPercent = Math.min(100, Math.round((sentThisWeek / weeklyTarget) * 100)) || 60;

  // Next interview candidate
  const nextInterview = interviewApps[0] || null;

  // 1-Click Starter Seed Helper for Zero State
  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    const demoItems = [
      {
        companyName: 'Figma',
        jobTitle: 'Senior Frontend Engineer',
        location: 'San Francisco, CA',
        jobType: 'Full-time',
        status: 'Interview',
        priority: 'High',
        applicationDate: new Date().toISOString().split('T')[0],
        salary: '$175,000 - $195,000 / yr',
        notes: 'Technical Interview with Figma • Systems Architecture & Canvas Rendering',
        jobUrl: 'https://figma.com/careers',
      },
      {
        companyName: 'Stripe',
        jobTitle: 'Product Designer - Billing',
        location: 'Remote, US',
        jobType: 'Full-time',
        status: 'Offer',
        priority: 'High',
        applicationDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        salary: '$165,000 - $185,000 / yr',
        notes: 'Offer package received • $175k Base + $60k RSUs. Decision deadline in 5 days.',
        jobUrl: 'https://stripe.com/jobs',
      },
      {
        companyName: 'Linear',
        jobTitle: 'Product Engineer',
        location: 'Remote',
        jobType: 'Full-time',
        status: 'Shortlisted',
        priority: 'High',
        applicationDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        salary: '$160,000 - $190,000 / yr',
        notes: 'Hiring manager screening scheduled for Friday at 11:00 AM.',
        jobUrl: 'https://linear.app/careers',
      },
      {
        companyName: 'Vercel',
        jobTitle: 'Developer Advocate',
        location: 'Remote, US',
        jobType: 'Full-time',
        status: 'Applied',
        priority: 'Medium',
        applicationDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
        salary: '$150,000 - $170,000 / yr',
        notes: 'Application submitted via team referral. Awaiting recruiter outreach.',
        jobUrl: 'https://vercel.com/careers',
      },
      {
        companyName: 'Notion',
        jobTitle: 'Core Infrastructure Engineer',
        location: 'San Francisco, CA',
        jobType: 'Full-time',
        status: 'Interview',
        priority: 'Medium',
        applicationDate: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
        salary: '$180,000 - $210,000 / yr',
        notes: 'Round 2 interview with Engineering Lead.',
        jobUrl: 'https://notion.so/careers',
      },
    ];

    try {
      for (const item of demoItems) {
        await createApplication(item);
      }
      showSuccess('Loaded demo applications into your pipeline!');
      loadData();
    } catch (err) {
      showError('Failed to populate demo data.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateTemplate = async (templateType) => {
    let newApp = null;
    const today = new Date().toISOString().split('T')[0];

    if (templateType === 'linkedin') {
      newApp = {
        companyName: 'Anthropic',
        jobTitle: 'Research Platform Engineer',
        location: 'San Francisco, CA',
        jobType: 'Full-time',
        status: 'Applied',
        priority: 'High',
        applicationDate: today,
        applicationSource: 'LinkedIn',
        salary: '$190,000 - $240,000 / yr',
        notes: 'Easy Apply on LinkedIn with tailored systems resume.',
      };
    } else if (templateType === 'recruiter') {
      newApp = {
        companyName: 'OpenAI',
        jobTitle: 'Fullstack UI Engineer',
        location: 'San Francisco, CA',
        jobType: 'Full-time',
        status: 'Shortlisted',
        priority: 'High',
        applicationDate: today,
        applicationSource: 'Recruiter Outreach',
        salary: '$200,000 - $260,000 / yr',
        notes: 'Recruiter reached out via email. Screening call booked for next week.',
      };
    } else {
      newApp = {
        companyName: 'Airbnb',
        jobTitle: 'Senior Frontend Engineer',
        location: 'Remote, US',
        jobType: 'Full-time',
        status: 'Saved',
        priority: 'Medium',
        applicationDate: today,
        applicationSource: 'Company Career Site',
        salary: '$175,000 - $205,000 / yr',
        notes: 'Wishlist position. Working on portfolio updates before applying.',
      };
    }

    const res = await createApplication(newApp);
    if (res.data) {
      showSuccess(`Created opportunity for ${newApp.companyName}!`);
      loadData();
    } else {
      showError('Failed to create template application.');
    }
  };

  // Filtered recent applications
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        // Tab filtering
        if (activeTab === 'action' && app.status !== 'Interview' && app.priority !== 'High') return false;
        if (activeTab === 'review' && app.status !== 'Applied' && app.status !== 'Shortlisted') return false;
        if (activeTab === 'offers' && app.status !== 'Offer') return false;

        // Pipeline pill filter
        if (selectedPipelineStatus && app.status !== selectedPipelineStatus) return false;

        // Role filter
        if (roleFilter !== 'All' && !(app.jobTitle || '').toLowerCase().includes(roleFilter.toLowerCase())) return false;

        // Location filter
        if (locationFilter !== 'All' && !(app.location || '').toLowerCase().includes(locationFilter.toLowerCase())) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return (b.applicationDate || '').localeCompare(a.applicationDate || '');
        }
        if (sortBy === 'oldest') {
          return (a.applicationDate || '').localeCompare(b.applicationDate || '');
        }
        if (sortBy === 'company') {
          return (a.companyName || '').localeCompare(b.companyName || '');
        }
        return 0;
      });
  }, [applications, activeTab, selectedPipelineStatus, roleFilter, locationFilter, sortBy]);

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

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Alex';

  // Get monogram helper
  const getMonogram = (name) => {
    if (!name) return 'JT';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Monogram color styling
  const getMonogramStyle = (name) => {
    const mono = getMonogram(name);
    if (name.toLowerCase().includes('figma')) return 'bg-error-container text-on-error-container';
    if (name.toLowerCase().includes('stripe')) return 'bg-primary-fixed text-primary';
    if (name.toLowerCase().includes('linear')) return 'bg-tertiary-fixed text-tertiary';
    if (name.toLowerCase().includes('vercel')) return 'bg-surface-container-highest text-on-surface';
    if (name.toLowerCase().includes('notion')) return 'bg-surface-container-high text-on-surface';
    return 'bg-primary-fixed text-primary';
  };

  // Status badge styling matching Stitch
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

  // Proportions for Pipeline segmented progress bar
  const totalCountForBar = totalApplications || 1;
  const savedPct = Math.round((savedCount / totalCountForBar) * 100);
  const appliedPct = Math.round((appliedCount / totalCountForBar) * 100);
  const shortlistedPct = Math.round((shortlistedCount / totalCountForBar) * 100);
  const interviewPct = Math.round((interviewCount / totalCountForBar) * 100);
  const offerPct = Math.round((offerCount / totalCountForBar) * 100);
  const rejectedPct = Math.round((rejectedCount / totalCountForBar) * 100);

  // If 0 applications, render the Stitch Zero State (Screen 4)
  if (!loading && applications.length === 0) {
    return (
      <div id="dashboard-zero-state" className="space-y-space-xl animate-in fade-in duration-300">
        {/* Subtitle & Workspace badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Workspace Ready • v2.4.0 • Zero State
            </span>
          </div>
        </div>

        {/* Hero Welcome */}
        <section className="space-y-1">
          <h1 className="font-display-lg-mobile md:font-display-lg text-on-surface font-bold tracking-tight">
            Good morning, {displayName} 👋
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
            Ready to start your job hunt? Let&apos;s track your journey to your next dream role.
          </p>
        </section>

        {/* Pipeline Snapshot Cards (All 0) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
          <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-outline uppercase tracking-wider">Total</span>
              <span className="material-symbols-outlined text-outline text-[18px]">business_center</span>
            </div>
            <div className="font-headline-lg font-bold text-on-surface">0</div>
            <div className="font-body-sm text-[11px] text-outline mt-0.5">Awaiting first entry</div>
          </div>

          <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-outline uppercase tracking-wider">Applied</span>
              <span className="material-symbols-outlined text-outline text-[18px]">send</span>
            </div>
            <div className="font-headline-lg font-bold text-on-surface">0</div>
            <div className="font-body-sm text-[11px] text-outline mt-0.5">0 sent this cycle</div>
          </div>

          <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-outline uppercase tracking-wider">Interviewing</span>
              <span className="material-symbols-outlined text-outline text-[18px]">record_voice_over</span>
            </div>
            <div className="font-headline-lg font-bold text-on-surface">0</div>
            <div className="font-body-sm text-[11px] text-outline mt-0.5">No active rounds</div>
          </div>

          <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-outline uppercase tracking-wider">Offers</span>
              <span className="material-symbols-outlined text-outline text-[18px]">workspace_premium</span>
            </div>
            <div className="font-headline-lg font-bold text-on-surface">0</div>
            <div className="font-body-sm text-[11px] text-outline mt-0.5">Target: 2 offers</div>
          </div>
        </div>

        {/* Central Illustrated Zero State Card */}
        <div className="p-space-xl md:p-space-3xl rounded-3xl bg-surface-container-lowest shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-surface-container-high/40 text-center flex flex-col items-center justify-center space-y-space-md">
          {/* Isometric journey illustration icon */}
          <div className="w-20 h-20 rounded-3xl bg-primary-fixed text-primary flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-[42px]">travel_explore</span>
          </div>

          <div className="space-y-1 max-w-md">
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              Your job journey starts here
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Add your first job opportunity to unlock pipeline analytics, interview timelines, and follow-up reminders.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-space-sm pt-space-xs">
            <button
              id="zero-add-first-app-btn"
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-space-xs px-space-xl py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Your First Application</span>
            </button>

            <button
              id="zero-seed-demo-btn"
              type="button"
              disabled={isSeeding}
              onClick={handleSeedDemoData}
              className="flex items-center gap-space-xs px-space-lg py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-all border border-outline-variant/40"
            >
              <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
              <span>{isSeeding ? 'Populating...' : 'Seed Demo Applications'}</span>
            </button>
          </div>
        </div>

        {/* 1-Click Starter Templates Row */}
        <div className="space-y-space-xs">
          <h3 className="font-label-md text-label-md text-outline uppercase tracking-wider">
            Quick 1-Click Starters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            <button
              type="button"
              onClick={() => handleCreateTemplate('linkedin')}
              className="p-space-md rounded-2xl bg-surface-container-lowest border border-surface-container hover:border-primary/40 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                  in
                </span>
                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[18px]">
                  arrow_forward
                </span>
              </div>
              <h4 className="font-label-md text-on-surface font-semibold">Applied via LinkedIn</h4>
              <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                Quick-log an opportunity with LinkedIn source tag and applied status.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleCreateTemplate('recruiter')}
              className="p-space-md rounded-2xl bg-surface-container-lowest border border-surface-container hover:border-primary/40 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
                </span>
                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[18px]">
                  arrow_forward
                </span>
              </div>
              <h4 className="font-label-md text-on-surface font-semibold">Recruiter Reached Out</h4>
              <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                Record an inbound recruiter message with screening date &amp; salary notes.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleCreateTemplate('wishlist')}
              className="p-space-md rounded-2xl bg-surface-container-lowest border border-surface-container hover:border-primary/40 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">bookmark</span>
                </span>
                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[18px]">
                  arrow_forward
                </span>
              </div>
              <h4 className="font-label-md text-on-surface font-semibold">Dream Company Wishlist</h4>
              <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                Save an exciting target role to research and prep before submitting.
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="dashboard-page" className="space-y-space-lg animate-in fade-in duration-200">
      {/* Top Greeting Banner */}
      <section
        id="dashboard-greeting-banner"
        className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-xs"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-space-xs">
            <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              Dashboard Overview • Fall 2026 Cycle
            </span>
          </div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-on-surface font-bold tracking-tight">
            Keep your career journey organized.
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
            Track your applications, follow your progress, and never lose an opportunity.
          </p>
        </div>

        {/* Weekly Target Indicator Pill */}
        <div className="p-space-sm rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex items-center gap-space-sm self-start md:self-auto">
          {/* Circular SVG progress ring */}
          <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-surface-container-high"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-primary transition-all duration-700"
                strokeDasharray={`${targetPercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono-metric text-[11px] font-bold text-on-surface">
              {targetPercent}%
            </span>
          </div>
          <div>
            <div className="font-label-sm text-label-sm text-outline uppercase tracking-wider flex items-center gap-1">
              <span>🎯</span> Weekly Target
            </div>
            <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              {sentThisWeek} of {weeklyTarget} sent this week
            </div>
          </div>
        </div>
      </section>

      {/* 4 Compact Statistic Cards */}
      <section
        id="dashboard-statistics-row"
        className="grid grid-cols-2 lg:grid-cols-4 gap-space-md"
      >
        {/* Total Applications */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Total Applications
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">business_center</span>
            </div>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {totalApplications}
          </div>
          <div className="font-body-sm text-body-sm text-outline mt-0.5">
            +{sentThisWeek || 3} this week
          </div>
        </div>

        {/* Applied */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Applied
            </span>
            <div className="w-8 h-8 rounded-xl bg-surface-container-highest text-on-primary-fixed-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">send</span>
            </div>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {appliedCount}
          </div>
          <div className="font-body-sm text-body-sm text-outline mt-0.5">
            Awaiting initial review
          </div>
        </div>

        {/* Interviewing */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Interviewing
            </span>
            <div className="w-8 h-8 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">record_voice_over</span>
            </div>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {interviewCount}
          </div>
          <div className="font-body-sm text-body-sm text-tertiary font-medium mt-0.5 truncate">
            {nextInterview ? `${nextInterview.companyName} scheduled` : 'Ready for round 1'}
          </div>
        </div>

        {/* Offers Extended */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Offers Extended
            </span>
            <div className="w-8 h-8 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
            </div>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {offerCount}
          </div>
          <div className="font-body-sm text-body-sm text-secondary font-medium mt-0.5">
            {offerCount > 0 ? 'Decide by next week' : 'Targeting 2 offers'}
          </div>
        </div>
      </section>

      {/* Application Pipeline Overview Section */}
      <section
        id="dashboard-pipeline-overview"
        className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 space-y-space-sm"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">waterfall_chart</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Application Pipeline Overview
            </h2>
          </div>
          <span className="font-body-sm text-body-sm text-outline">
            Total active: {totalApplications} records
          </span>
        </div>

        {/* Proportional Segmented Progression Bar */}
        <div className="w-full h-2.5 rounded-full bg-surface-container flex overflow-hidden">
          {savedPct > 0 && (
            <div
              style={{ width: `${savedPct}%` }}
              className="h-full bg-outline transition-all duration-500"
              title={`Saved: ${savedCount}`}
            />
          )}
          {appliedPct > 0 && (
            <div
              style={{ width: `${appliedPct}%` }}
              className="h-full bg-primary-container transition-all duration-500"
              title={`Applied: ${appliedCount}`}
            />
          )}
          {shortlistedPct > 0 && (
            <div
              style={{ width: `${shortlistedPct}%` }}
              className="h-full bg-tertiary-container transition-all duration-500"
              title={`Shortlisted: ${shortlistedCount}`}
            />
          )}
          {interviewPct > 0 && (
            <div
              style={{ width: `${interviewPct}%` }}
              className="h-full bg-primary transition-all duration-500"
              title={`Interview: ${interviewCount}`}
            />
          )}
          {offerPct > 0 && (
            <div
              style={{ width: `${offerPct}%` }}
              className="h-full bg-secondary transition-all duration-500"
              title={`Offered: ${offerCount}`}
            />
          )}
          {rejectedPct > 0 && (
            <div
              style={{ width: `${rejectedPct}%` }}
              className="h-full bg-error transition-all duration-500"
              title={`Archived: ${rejectedCount}`}
            />
          )}
        </div>

        {/* Filter/Status Interactive Pills */}
        <div className="flex flex-wrap items-center gap-space-xs pt-1">
          <button
            type="button"
            onClick={() => setSelectedPipelineStatus(null)}
            className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
              selectedPipelineStatus === null
                ? 'bg-primary-container text-on-primary font-semibold shadow-2xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            All Stages ({totalApplications})
          </button>

          <button
            type="button"
            onClick={() => setSelectedPipelineStatus(selectedPipelineStatus === 'Saved' ? null : 'Saved')}
            className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
              selectedPipelineStatus === 'Saved'
                ? 'bg-outline text-white font-semibold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
            Saved ({savedCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedPipelineStatus(selectedPipelineStatus === 'Applied' ? null : 'Applied')}
            className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
              selectedPipelineStatus === 'Applied'
                ? 'bg-primary-container text-on-primary font-semibold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
            Applied ({appliedCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedPipelineStatus(selectedPipelineStatus === 'Shortlisted' ? null : 'Shortlisted')}
            className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
              selectedPipelineStatus === 'Shortlisted'
                ? 'bg-tertiary-container text-on-tertiary font-semibold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            Shortlisted ({shortlistedCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedPipelineStatus(selectedPipelineStatus === 'Interview' ? null : 'Interview')}
            className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
              selectedPipelineStatus === 'Interview'
                ? 'bg-primary text-on-primary font-semibold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            Interview ({interviewCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedPipelineStatus(selectedPipelineStatus === 'Offer' ? null : 'Offer')}
            className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
              selectedPipelineStatus === 'Offer'
                ? 'bg-secondary text-on-secondary font-semibold'
                : 'bg-surface-container-low text-on-secondary-container hover:bg-surface-container'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            Offered ({offerCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedPipelineStatus(selectedPipelineStatus === 'Rejected' ? null : 'Rejected')}
            className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
              selectedPipelineStatus === 'Rejected'
                ? 'bg-error text-on-error font-semibold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
            Archived ({rejectedCount})
          </button>
        </div>
      </section>

      {/* 2-Column Split: Next Interview Urgent Card & Weekly Focus Advisor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {/* Next Interview Card */}
        <div
          id="dashboard-next-interview-card"
          className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between space-y-space-sm"
        >
          <div className="space-y-space-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
                {nextInterview ? 'Upcoming Interview Round' : 'Interview Prep Mode'}
              </span>
              <span className="font-body-sm text-body-sm text-outline">
                {nextInterview ? 'Google Meet / Live Code' : 'Calendar synced'}
              </span>
            </div>

            {nextInterview ? (
              <div className="flex items-start gap-space-sm pt-space-2xs">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${getMonogramStyle(
                    nextInterview.companyName
                  )}`}
                >
                  {getMonogram(nextInterview.companyName)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                    {nextInterview.jobTitle} with {nextInterview.companyName}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">
                    {nextInterview.notes || 'System Design & Algorithm Round. Review key architectural concepts.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-space-xs rounded-xl bg-surface-container-low flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[28px]">event_available</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    No interviews on the immediate schedule
                  </h3>
                  <p className="font-body-sm text-[12px] text-on-surface-variant">
                    Submit 2-3 new applications to maintain healthy callback velocity.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-space-xs pt-space-xs border-t border-surface-container-high/30 flex-wrap">
            {nextInterview ? (
              <>
                <CalendarExportButtons
                  title={`${nextInterview.companyName} Interview (${nextInterview.jobTitle})`}
                  description={nextInterview.notes || `Interview with ${nextInterview.companyName}`}
                  date={nextInterview.deadline || nextInterview.applicationDate}
                  variant="compact"
                />
                <button
                  type="button"
                  onClick={() => openEditModal(nextInterview)}
                  className="p-1.5 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                  title="Edit interview application details"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/applications/${nextInterview.id}`)}
                  className="px-space-sm py-1.5 rounded-xl text-on-surface-variant font-label-md text-label-md hover:bg-surface-container transition-colors"
                >
                  Prep Notes
                </button>
                <a
                  href={nextInterview.jobUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-space-md py-1.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">videocam</span>
                  <span>Join Meeting</span>
                </a>
              </>
            ) : (
              <button
                type="button"
                onClick={openAddModal}
                className="px-space-md py-1.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Track Application</span>
              </button>
            )}
          </div>
        </div>

        {/* Weekly Focus Career Assistant Card */}
        <div
          id="dashboard-weekly-focus-card"
          className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between space-y-space-sm"
        >
          <div className="space-y-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                Weekly Focus
              </span>
              <span className="material-symbols-outlined text-primary text-[20px]">mark_email_read</span>
            </div>

            <div className="space-y-1">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Follow up on In-Review Apps
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Vercel and Linear applications have been under review for 8+ days. A polite, value-driven recruiter touchpoint boosts response rates by 34%.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-space-xs border-t border-surface-container-high/30">
            <Link
              to="/reminders"
              className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1 font-semibold"
            >
              <span>View Follow-up Reminders</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>

            <span className="font-body-sm text-[11px] text-outline">
              {reminders.filter((r) => !r.completed).length} pending alerts
            </span>
          </div>
        </div>
      </div>

      {/* Recent Applications Master Section */}
      <section
        id="dashboard-recent-applications"
        className="rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 overflow-hidden space-y-space-sm p-space-md"
      >
        {/* Section Header with Segmented Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs border-b border-surface-container-high/30">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Recent Applications
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Manage recent submissions, upcoming interviews, and offers
            </p>
          </div>

          {/* Segmented Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container self-start sm:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                activeTab === 'all'
                  ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All ({totalApplications})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('action')}
              className={`px-3 py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                activeTab === 'action'
                  ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Needs Action ({interviewCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('review')}
              className={`px-3 py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                activeTab === 'review'
                  ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              In Review ({appliedCount + shortlistedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('offers')}
              className={`px-3 py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                activeTab === 'offers'
                  ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Offers ({offerCount})
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-space-xs pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-space-xs">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-container-low rounded-xl font-body-sm text-[12px] text-on-surface border border-outline-variant/40 focus:outline-none"
            >
              <option value="All">All Roles</option>
              <option value="Frontend">Frontend</option>
              <option value="Engineer">Engineering</option>
              <option value="Designer">Design</option>
              <option value="Product">Product</option>
            </select>

            {/* Location / Modality */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-container-low rounded-xl font-body-sm text-[12px] text-on-surface border border-outline-variant/40 focus:outline-none"
            >
              <option value="All">All Locations</option>
              <option value="Remote">Remote</option>
              <option value="San Francisco">San Francisco</option>
              <option value="Hybrid">Hybrid</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-container-low rounded-xl font-body-sm text-[12px] text-on-surface border border-outline-variant/40 focus:outline-none"
            >
              <option value="newest">Recent First</option>
              <option value="oldest">Oldest First</option>
              <option value="company">Company (A-Z)</option>
            </select>
          </div>

          <span className="font-body-sm text-[11px] text-outline">
            Showing {filteredApplications.length} of {totalApplications} records
          </span>
        </div>

        {/* Application Cards Stack */}
        <div className="divide-y divide-surface-container-high/30">
          {filteredApplications.slice(0, 7).map((app) => {
            const isRemote = (app.location || '').toLowerCase().includes('remote');
            const isHybrid = (app.location || '').toLowerCase().includes('hybrid');

            return (
              <div
                key={app.id}
                id={`app-item-${app.id}`}
                onClick={() => navigate(`/applications/${app.id}`)}
                className="py-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm hover:bg-surface-container-low/50 rounded-xl px-space-xs transition-colors cursor-pointer group"
              >
                {/* Left: Monogram + Company & Role Info */}
                <div className="flex items-start gap-space-sm min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${getMonogramStyle(
                      app.companyName
                    )}`}
                  >
                    {getMonogram(app.companyName)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-space-xs flex-wrap">
                      <span className="font-headline-sm text-body-md font-bold text-on-surface">
                        {app.companyName}
                      </span>
                      <span className="px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[10px] font-semibold uppercase">
                        {isRemote ? 'Remote' : isHybrid ? 'Hybrid' : 'On-site'}
                      </span>
                    </div>

                    <p className="font-headline-sm text-body-sm font-semibold text-on-surface truncate">
                      {app.jobTitle}
                    </p>

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
                          <span className="truncate">{app.location}</span>
                        </span>
                      )}
                      {app.salary && (
                        <span className="px-2 py-0.5 rounded bg-surface-container font-mono-metric text-[10px] text-on-surface font-semibold">
                          {app.salary}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Stage Badge & Actions */}
                <div
                  className="flex items-center gap-space-sm justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-container-high/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>{getStatusBadge(app.status)}</div>

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

                    {app.status === 'Interview' ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/applications/${app.id}`)}
                        className="px-space-sm py-1.5 rounded-xl bg-tertiary-fixed text-tertiary font-label-md text-label-sm hover:bg-tertiary-fixed-dim transition-colors font-semibold"
                      >
                        Prep Notes
                      </button>
                    ) : app.status === 'Offer' ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/applications/${app.id}`)}
                        className="px-space-sm py-1.5 rounded-xl bg-secondary-container text-on-secondary-container font-label-md text-label-sm hover:opacity-90 transition-colors font-semibold"
                      >
                        Review Offer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/applications/${app.id}`)}
                        className="px-space-sm py-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container font-label-md text-label-sm transition-colors"
                      >
                        View Details
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(app)}
                      className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                      title="Edit Opportunity"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAppToDelete(app);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                      title="Delete Opportunity"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Footer link */}
        <div className="pt-space-xs border-t border-surface-container-high/30 flex items-center justify-between text-xs">
          <span className="font-body-sm text-outline">
            Showing top {Math.min(7, filteredApplications.length)} recent opportunities
          </span>
          <Link
            to="/applications"
            className="font-label-md text-label-md text-primary font-semibold hover:underline flex items-center gap-1"
          >
            <span>View All Applications</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* Delete Application Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Opportunity?"
        message={`Are you sure you want to delete your application for ${appToDelete?.companyName || 'this company'}? This will permanently remove its tracking history.`}
        confirmText="Delete Application"
        isConfirming={isDeletingApp}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setAppToDelete(null);
        }}
        onConfirm={handleConfirmDeleteApp}
      />
    </div>
  );
}
