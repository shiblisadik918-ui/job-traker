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
import ApplicationCardActionModal from '../components/applications/ApplicationCardActionModal';

export default function Dashboard() {
  const { user, userProfile, isVerified, profileCompleteness } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { openAddModal, openEditModal } = useApplicationModal();

  const [applications, setApplications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedulingFollowUpId, setSchedulingFollowUpId] = useState(null);

  // Application Card Quick Action Modal (Update Status & Delete Record)
  const [cardActionApp, setCardActionApp] = useState(null);

  // Delete modal state
  const [appToDelete, setAppToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingApp, setIsDeletingApp] = useState(false);

  // Tab and filter states
  const [activeTab, setActiveTab] = useState('all'); // all, action, review, offers
  const [selectedPipelineStatus, setSelectedPipelineStatus] = useState(null);
  const [jobTypeFilter, setJobTypeFilter] = useState('All'); // 'All' | 'Government' | 'Private'
  const [workflowStageFilter, setWorkflowStageFilter] = useState('All');
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

  // Calculations from actual Firestore applications segmented by job type
  const govtApps = useMemo(() => {
    return applications.filter((a) => a.job_type === 'Government' || Boolean(a.ministryDepartment));
  }, [applications]);

  const privateApps = useMemo(() => {
    return applications.filter((a) => a.job_type !== 'Government' && !a.ministryDepartment);
  }, [applications]);

  // Active scope based on selected jobTypeFilter
  const scopedApps = useMemo(() => {
    if (jobTypeFilter === 'Government') return govtApps;
    if (jobTypeFilter === 'Private') return privateApps;
    return applications;
  }, [jobTypeFilter, govtApps, privateApps, applications]);

  const totalApplications = applications.length;
  const scopedTotal = scopedApps.length;
  const appliedCount = scopedApps.filter((a) => a.status === 'Applied').length;
  const shortlistedCount = scopedApps.filter((a) => a.status === 'Shortlisted').length;
  const interviewApps = scopedApps.filter((a) => a.status === 'Interview');
  const interviewCount = interviewApps.length;
  const nextInterview = interviewApps[0];
  const offerApps = scopedApps.filter((a) => a.status === 'Offer');
  const offerCount = offerApps.length;
  const rejectedCount = scopedApps.filter((a) => a.status === 'Rejected').length;
  const savedCount = scopedApps.filter((a) => a.status === 'Saved').length;

  // Specific Government Job Metrics
  const govtExamProgressApps = useMemo(() => {
    return govtApps.filter((a) => {
      const stages = a.govtExamStages || [];
      const hasActiveStage = stages.some((s) => s.status === 'Pending' && s.date);
      return a.status === 'Interview' || hasActiveStage;
    });
  }, [govtApps]);

  const govtAdmitCardReadyCount = useMemo(() => {
    return govtApps.filter((a) => {
      const s = (a.admitCardStatus || '').toLowerCase();
      return s.includes('download') || s.includes('available') || s.includes('issued');
    }).length;
  }, [govtApps]);

  const govtFeePaidCount = useMemo(() => {
    return govtApps.filter((a) => (a.paymentStatus || '').toLowerCase().includes('paid')).length;
  }, [govtApps]);

  const govtFeePendingCount = useMemo(() => {
    return govtApps.filter((a) => (a.paymentStatus || '').toLowerCase().includes('pending')).length;
  }, [govtApps]);

  // Stage-specific count helpers for Govt & Private
  const govtPrelimsCount = useMemo(() => {
    return govtApps.filter((a) => (a.govtExamStages || []).find((s) => s.id === 'prelims')?.status === 'Pending').length;
  }, [govtApps]);
  const govtWrittenCount = useMemo(() => {
    return govtApps.filter((a) => (a.govtExamStages || []).find((s) => s.id === 'written')?.status === 'Pending').length;
  }, [govtApps]);
  const govtVivaCount = useMemo(() => {
    return govtApps.filter((a) => (a.govtExamStages || []).find((s) => s.id === 'viva')?.status === 'Pending').length;
  }, [govtApps]);
  const govtFinalPassedCount = useMemo(() => {
    return govtApps.filter((a) => (a.govtExamStages || []).find((s) => s.id === 'final')?.status === 'Passed' || a.status === 'Offer').length;
  }, [govtApps]);

  // Specific Private Job Metrics
  const privateInterviewCount = useMemo(() => {
    return privateApps.filter((a) => a.status === 'Interview').length;
  }, [privateApps]);

  const privateOfferCount = useMemo(() => {
    return privateApps.filter((a) => a.status === 'Offer').length;
  }, [privateApps]);

  const privateShortlistedCount = useMemo(() => {
    return privateApps.filter((a) => a.status === 'Shortlisted').length;
  }, [privateApps]);

  // Upcoming Event (Exam or Interview) Finder
  const upcomingEvent = useMemo(() => {
    let candidate = null;

    // Search Govt exam stages
    if (jobTypeFilter !== 'Private') {
      govtApps.forEach((app) => {
        (app.govtExamStages || []).forEach((st) => {
          if (st.date && st.status === 'Pending') {
            const eventDate = new Date(st.date);
            if (!candidate || eventDate < new Date(candidate.date)) {
              candidate = {
                type: 'Government',
                app,
                title: `${st.name} • ${app.companyName}`,
                stageName: st.name,
                date: st.date,
                location: st.center || app.location || 'Exam Center TBA',
                details: `Ministry: ${app.ministryDepartment || 'Govt Dept'} • Grade: ${app.jobGrade || '9th Grade'} • Roll: ${app.rollNumber || 'Assigned'}`,
                badge: app.admitCardStatus || 'Admit Card Issued',
                notes: app.notes,
              };
            }
          }
        });
      });
    }

    // Search Private interview rounds
    if (jobTypeFilter !== 'Government') {
      privateApps.forEach((app) => {
        (app.privateInterviewRounds || []).forEach((rd) => {
          if (rd.date && rd.status === 'Pending') {
            const eventDate = new Date(rd.date);
            if (!candidate || eventDate < new Date(candidate.date)) {
              candidate = {
                type: 'Private',
                app,
                title: `${rd.name} with ${app.companyName}`,
                stageName: rd.name,
                date: rd.date,
                location: rd.interviewer ? `Interviewer: ${rd.interviewer}` : 'Virtual Interview / Video Call',
                details: `Package: ${app.salary || 'Competitive'} • Recruiter: ${app.recruiterName || 'HR Team'}`,
                badge: app.applicationSource ? `via ${app.applicationSource}` : 'Direct Referral',
                notes: app.notes,
              };
            }
          }
        });

        if (!candidate && app.status === 'Interview') {
          candidate = {
            type: 'Private',
            app,
            title: `Interview Round with ${app.companyName}`,
            stageName: 'Interview Round',
            date: app.deadline || app.applicationDate,
            location: app.location || 'Virtual / Google Meet',
            details: `Role: ${app.jobTitle} • Package: ${app.salary || 'Negotiable'}`,
            badge: 'Interview Scheduled',
            notes: app.notes,
          };
        }
      });
    }

    return candidate;
  }, [jobTypeFilter, govtApps, privateApps]);

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

  // 1-Click Starter Seed Helper for Zero State (Featuring both Govt & Private Bangladesh jobs)
  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    const demoItems = [
      {
        job_type: 'Government',
        companyName: 'BPSC - Bangladesh Public Service Commission',
        jobTitle: '47th BCS Examination (General Cadre)',
        ministryDepartment: 'Ministry of Public Administration',
        jobGrade: '9th Grade',
        circularId: 'BPSC-47/2026-CADRE-01',
        applicationFee: '৳700',
        paymentStatus: 'Paid (Teletalk SMS)',
        admitCardStatus: 'Download Available',
        rollNumber: '204981',
        location: 'Dhaka, Bangladesh',
        status: 'Interview',
        priority: 'High',
        applicationDate: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
        deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        notes: 'Preliminary MCQ Exam scheduled at Eden Mohila College Center. Focus on Bangladesh Affairs, English, and Math.',
        govtExamStages: [
          {
            id: 'prelims',
            name: 'Preliminary Exam (MCQ)',
            status: 'Pending',
            date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            center: 'Eden Mohila College, Azimpur, Dhaka',
          },
          { id: 'written', name: 'Written Examination', status: 'Pending', date: '', center: 'Dhaka University Campus' },
          { id: 'viva', name: 'Viva-Voce / Practical', status: 'Pending', date: '', center: 'BPSC Head Office, Agargaon' },
          { id: 'final', name: 'Final Recommendation', status: 'Pending', date: '', center: '' },
        ],
      },
      {
        job_type: 'Government',
        companyName: 'Bangladesh Bank (Central Bank)',
        jobTitle: 'Assistant Director (General)',
        ministryDepartment: 'Bangladesh Bank Bankers Selection Committee',
        jobGrade: '9th Grade',
        circularId: 'BB-AD-2026-REC-04',
        applicationFee: '৳200',
        paymentStatus: 'Paid (Online/bKash)',
        admitCardStatus: 'Downloaded',
        rollNumber: '110542',
        location: 'Motijheel, Dhaka',
        status: 'Interview',
        priority: 'High',
        applicationDate: new Date(Date.now() - 35 * 86400000).toISOString().split('T')[0],
        deadline: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
        notes: 'Passed Preliminary Exam with score 82/100! Written examination scheduled for next month at BUET.',
        govtExamStages: [
          {
            id: 'prelims',
            name: 'Preliminary Exam (MCQ)',
            status: 'Passed',
            date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
            center: 'Govt. Titumir College, Dhaka',
          },
          {
            id: 'written',
            name: 'Written Examination',
            status: 'Pending',
            date: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
            center: 'BUET ECE Building, Dhaka',
          },
          { id: 'viva', name: 'Viva-Voce / Practical', status: 'Pending', date: '', center: 'BB Head Office, Motijheel' },
          { id: 'final', name: 'Final Recommendation', status: 'Pending', date: '', center: '' },
        ],
      },
      {
        job_type: 'Private',
        companyName: 'bKash Limited',
        jobTitle: 'Senior Software Engineer (Backend / Distributed Systems)',
        salary: '৳150,000 - ৳185,000 / mo',
        recruiterName: 'Tanzim Ahmed (Head of Talent Acquisition)',
        applicationSource: 'BDjobs',
        location: 'Dhaka (Shadhinata Tower, Jahangir Gate)',
        status: 'Interview',
        priority: 'High',
        applicationDate: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
        deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        notes: 'Passed technical coding assessment. System Design round scheduled via Google Meet.',
        privateInterviewRounds: [
          { id: 'phone', name: 'Phone Screening', status: 'Passed', date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], interviewer: 'Tanzim Ahmed' },
          { id: 'tech', name: 'Technical Round / System Design', status: 'Pending', date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], interviewer: 'Principal Architect & VP Eng' },
          { id: 'hr', name: 'HR / Behavioral Round', status: 'Pending', date: '', interviewer: 'HR Business Partner' },
          { id: 'offer', name: 'Final Offer Discussion', status: 'Pending', date: '', interviewer: 'CTO' },
        ],
      },
      {
        job_type: 'Private',
        companyName: 'Figma',
        jobTitle: 'Senior Frontend Engineer (Systems & Canvas)',
        salary: '$175,000 - $195,000 / yr',
        recruiterName: 'Sarah Jenkins (Figma EMEA)',
        applicationSource: 'LinkedIn',
        location: 'Remote, US/Worldwide',
        status: 'Offer',
        priority: 'High',
        applicationDate: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
        deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        notes: 'Offer package extended: $185k Base + $60k RSUs. Decision deadline in 5 business days.',
        privateInterviewRounds: [
          { id: 'phone', name: 'Phone Screening', status: 'Passed', date: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0], interviewer: 'Sarah Jenkins' },
          { id: 'tech', name: 'Technical Round (Deep Dive & Canvas)', status: 'Passed', date: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0], interviewer: 'Staff Engineer' },
          { id: 'hr', name: 'Values & Team Fit', status: 'Passed', date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0], interviewer: 'Engineering Director' },
          { id: 'offer', name: 'Final Offer Discussion', status: 'Passed', date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], interviewer: 'VP of Product' },
        ],
      },
      {
        job_type: 'Private',
        companyName: 'Pathao',
        jobTitle: 'Product Designer (Fintech & Payments)',
        salary: '৳95,000 - ৳125,000 / mo',
        recruiterName: 'Farhana Kabir (People Ops)',
        applicationSource: 'LinkedIn',
        location: 'Dhaka, Bangladesh',
        status: 'Shortlisted',
        priority: 'Medium',
        applicationDate: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
        notes: 'Portfolio review completed. Recruiter confirmed initial screening call next Tuesday.',
        privateInterviewRounds: [
          { id: 'phone', name: 'Portfolio Review Screening', status: 'Pending', date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0], interviewer: 'Design Lead' },
          { id: 'tech', name: 'Design Challenge Presentation', status: 'Pending', date: '', interviewer: 'Product Design Team' },
          { id: 'hr', name: 'Culture Fit Round', status: 'Pending', date: '', interviewer: 'People Operations' },
          { id: 'offer', name: 'Final Offer Discussion', status: 'Pending', date: '', interviewer: 'Head of Product' },
        ],
      },
    ];

    try {
      for (const item of demoItems) {
        await createApplication(item);
      }
      showSuccess('Loaded realistic Bangladesh Govt & Private opportunities into your pipeline!');
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

    if (templateType === 'govt') {
      newApp = {
        job_type: 'Government',
        companyName: 'Bangladesh Public Service Commission (BPSC)',
        jobTitle: 'Assistant Director / General Officer',
        ministryDepartment: 'Ministry of Planning',
        jobGrade: '9th Grade',
        circularId: `BPSC-${today.slice(0, 4)}-CIRCULAR`,
        applicationFee: '৳700',
        paymentStatus: 'Pending',
        admitCardStatus: 'Not Published',
        location: 'Dhaka, Bangladesh',
        status: 'Applied',
        priority: 'High',
        applicationDate: today,
        notes: 'Official application submitted via Teletalk portal. Awaiting SMS fee payment confirmation.',
        govtExamStages: [
          { id: 'prelims', name: 'Preliminary Exam (MCQ)', status: 'Pending', date: '', center: '' },
          { id: 'written', name: 'Written Examination', status: 'Pending', date: '', center: '' },
          { id: 'viva', name: 'Viva-Voce / Practical', status: 'Pending', date: '', center: '' },
          { id: 'final', name: 'Final Recommendation', status: 'Pending', date: '', center: '' },
        ],
      };
    } else if (templateType === 'private_tech') {
      newApp = {
        job_type: 'Private',
        companyName: 'bKash Limited',
        jobTitle: 'Fullstack Software Engineer',
        salary: '৳130,000 - ৳160,000 / mo',
        recruiterName: 'Talent Acquisition Team',
        applicationSource: 'BDjobs',
        location: 'Dhaka, Bangladesh',
        status: 'Applied',
        priority: 'High',
        applicationDate: today,
        notes: 'Application submitted for core fintech payments platform team.',
        privateInterviewRounds: [
          { id: 'phone', name: 'Phone Screening', status: 'Pending', date: '', interviewer: '' },
          { id: 'tech', name: 'Technical Interview', status: 'Pending', date: '', interviewer: '' },
          { id: 'hr', name: 'HR Round', status: 'Pending', date: '', interviewer: '' },
          { id: 'offer', name: 'Final Offer', status: 'Pending', date: '', interviewer: '' },
        ],
      };
    } else {
      newApp = {
        job_type: 'Private',
        companyName: 'Figma',
        jobTitle: 'Senior Frontend Engineer',
        salary: '$160,000 - $190,000 / yr',
        recruiterName: 'Recruiter Outreach',
        applicationSource: 'LinkedIn',
        location: 'Remote',
        status: 'Saved',
        priority: 'Medium',
        applicationDate: today,
        notes: 'Target role for Q4 cycle. Polish portfolio before official submission.',
        privateInterviewRounds: [
          { id: 'phone', name: 'Phone Screening', status: 'Pending', date: '', interviewer: '' },
          { id: 'tech', name: 'Technical Interview', status: 'Pending', date: '', interviewer: '' },
          { id: 'hr', name: 'HR Round', status: 'Pending', date: '', interviewer: '' },
          { id: 'offer', name: 'Final Offer', status: 'Pending', date: '', interviewer: '' },
        ],
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

  // Filtered recent applications respecting job_type and specific workflow stages
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        // Job type distinction filter
        if (jobTypeFilter === 'Government') {
          if (app.job_type !== 'Government' && !app.ministryDepartment) return false;
        } else if (jobTypeFilter === 'Private') {
          if (app.job_type === 'Government' || Boolean(app.ministryDepartment)) return false;
        }

        // Specific workflow stage filter
        if (workflowStageFilter !== 'All') {
          if (jobTypeFilter === 'Government' || app.job_type === 'Government') {
            const stages = app.govtExamStages || [];
            if (workflowStageFilter === 'prelims') {
              const st = stages.find((s) => s.id === 'prelims');
              if (!st || st.status !== 'Pending') return false;
            } else if (workflowStageFilter === 'written') {
              const st = stages.find((s) => s.id === 'written');
              if (!st || st.status !== 'Pending') return false;
            } else if (workflowStageFilter === 'viva') {
              const st = stages.find((s) => s.id === 'viva');
              if (!st || st.status !== 'Pending') return false;
            } else if (workflowStageFilter === 'final') {
              const st = stages.find((s) => s.id === 'final');
              if ((!st || st.status !== 'Passed') && app.status !== 'Offer') return false;
            } else if (workflowStageFilter === 'admit_ready') {
              const s = (app.admitCardStatus || '').toLowerCase();
              if (!s.includes('download') && !s.includes('available')) return false;
            } else if (workflowStageFilter === 'fee_pending') {
              if ((app.paymentStatus || '').toLowerCase() !== 'pending') return false;
            }
          } else {
            const rounds = app.privateInterviewRounds || [];
            if (workflowStageFilter === 'phone_screen') {
              const r = rounds.find((s) => s.id === 'phone');
              if (!r || r.status !== 'Pending') return false;
            } else if (workflowStageFilter === 'tech_round') {
              const r = rounds.find((s) => s.id === 'tech');
              if (!r || r.status !== 'Pending') return false;
            } else if (workflowStageFilter === 'hr_round') {
              const r = rounds.find((s) => s.id === 'hr');
              if (!r || r.status !== 'Pending') return false;
            } else if (workflowStageFilter === 'offer_round') {
              if (app.status !== 'Offer') return false;
            }
          }
        }

        // Tab filtering
        if (activeTab === 'action' && app.status !== 'Interview' && app.priority !== 'High') return false;
        if (activeTab === 'review' && app.status !== 'Applied' && app.status !== 'Shortlisted') return false;
        if (activeTab === 'offers' && app.status !== 'Offer') return false;

        // Pipeline pill filter
        if (selectedPipelineStatus && app.status !== selectedPipelineStatus) return false;

        // Role / Designation filter
        if (roleFilter !== 'All') {
          const combinedTitle = `${app.jobTitle || ''} ${app.ministryDepartment || ''}`.toLowerCase();
          if (!combinedTitle.includes(roleFilter.toLowerCase())) return false;
        }

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
  }, [applications, jobTypeFilter, workflowStageFilter, activeTab, selectedPipelineStatus, roleFilter, locationFilter, sortBy]);

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

  const displayName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Alex';

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
              onClick={() => openAddModal()}
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
              onClick={() => handleCreateTemplate('govt')}
              className="p-space-md rounded-2xl bg-surface-container-lowest border border-surface-container hover:border-emerald-500/40 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  🏛️
                </span>
                <span className="material-symbols-outlined text-outline group-hover:text-emerald-600 transition-colors text-[18px]">
                  arrow_forward
                </span>
              </div>
              <h4 className="font-label-md text-on-surface font-semibold">Bangladesh Govt Job</h4>
              <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                BPSC 9th Grade officer circular with sequential Preliminary, Written, and Viva stages.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleCreateTemplate('private_tech')}
              className="p-space-md rounded-2xl bg-surface-container-lowest border border-surface-container hover:border-primary/40 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">domain</span>
                </span>
                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[18px]">
                  arrow_forward
                </span>
              </div>
              <h4 className="font-label-md text-on-surface font-semibold">Private Tech / MNC</h4>
              <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                Log a role at bKash or MNC with BDjobs/LinkedIn source, recruiter info, and rounds.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleCreateTemplate('wishlist')}
              className="p-space-md rounded-2xl bg-surface-container-lowest border border-surface-container hover:border-primary/40 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">bookmark</span>
                </span>
                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[18px]">
                  arrow_forward
                </span>
              </div>
              <h4 className="font-label-md text-on-surface font-semibold">Dream Company Wishlist</h4>
              <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                Save an upcoming target role to research and prepare before applying.
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
              Dual Pipeline • Bangladesh Govt &amp; Private Jobs
            </span>
          </div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-on-surface font-bold tracking-tight">
            Track your career opportunities with precision.
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
            Monitor Bangladesh Government exam stages (Prelims, Written, Viva) and Private interview pipelines in one unified workspace.
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

      {/* Verification & Live CV Status Banner */}
      <div
        id="dashboard-verification-banner"
        className={`p-space-md rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isVerified
            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40 shadow-xs'
            : 'bg-surface-container-lowest border-surface-container-high/40 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isVerified
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-primary/10 text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">
              {isVerified ? 'verified' : 'badge'}
            </span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                {isVerified
                  ? 'Account Verified • Live CV Ready'
                  : 'Complete Profile to Get Verified & Generate Live CV'}
              </h3>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-semibold">
                  {profileCompleteness || 0}% Done
                </span>
              )}
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant max-w-xl">
              {isVerified
                ? 'আপনার প্রোফাইল তথ্য ১০০% সম্পূর্ণ ও অ্যাকাউন্ট ভেরিফাইড। যেকোনো সময় লাইভ সিভি প্রিন্ট বা আপডেট করতে পারেন।'
                : 'সকল প্রয়োজনীয় ব্যক্তিগত ও পেশাগত তথ্য পূরণ করলে অ্যাকাউন্ট ভেরিফাইড ব্যাজ পাবেন এবং লাইভ সিভি তৈরি হবে।'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Link
            to="/cv"
            id="dashboard-open-cv-btn"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            <span>{isVerified ? 'Live CV দেখুন ও প্রিন্ট করুন' : 'প্রোফাইল সম্পূর্ণ করুন'}</span>
          </Link>
        </div>
      </div>

      {/* Segmented Job Type Distinction Filter Bar */}
      <div
        id="dashboard-job-type-selector"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm p-space-sm rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">filter_alt</span>
          <span className="font-label-md text-xs font-bold uppercase tracking-wider text-outline">
            Pipeline Scope:
          </span>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container overflow-x-auto">
          <button
            type="button"
            id="scope-filter-all"
            onClick={() => {
              setJobTypeFilter('All');
              setWorkflowStageFilter('All');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-label-md text-xs transition-all whitespace-nowrap ${
              jobTypeFilter === 'All'
                ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>All Opportunities</span>
            <span className="px-1.5 py-0.5 rounded-full bg-surface-container-high text-[10px] font-semibold">
              {totalApplications}
            </span>
          </button>

          <button
            type="button"
            id="scope-filter-govt"
            onClick={() => {
              setJobTypeFilter('Government');
              setWorkflowStageFilter('All');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-label-md text-xs transition-all whitespace-nowrap ${
              jobTypeFilter === 'Government'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <span>🏛️ Bangladesh Govt Jobs</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                jobTypeFilter === 'Government' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {govtApps.length}
            </span>
          </button>

          <button
            type="button"
            id="scope-filter-private"
            onClick={() => {
              setJobTypeFilter('Private');
              setWorkflowStageFilter('All');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-label-md text-xs transition-all whitespace-nowrap ${
              jobTypeFilter === 'Private'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-blue-700 dark:text-blue-400 hover:bg-blue-500/10'
            }`}
          >
            <span>💼 Private &amp; MNC Roles</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                jobTypeFilter === 'Private' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {privateApps.length}
            </span>
          </button>
        </div>
      </div>

      {/* 4 Context-Aware Statistic Cards */}
      <section
        id="dashboard-statistics-row"
        className="grid grid-cols-2 lg:grid-cols-4 gap-space-md"
      >
        {jobTypeFilter === 'Government' ? (
          <>
            {/* Govt Card 1: Total Govt Circulars */}
            <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-emerald-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Govt Circulars
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                </div>
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {govtApps.length}
              </div>
              <div className="font-body-sm text-body-sm text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                BPSC &amp; Ministries
              </div>
            </div>

            {/* Govt Card 2: Active Exam Stages */}
            <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Exam Stages Active
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">history_edu</span>
                </div>
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {govtExamProgressApps.length}
              </div>
              <div className="font-body-sm text-body-sm text-outline mt-0.5">
                {govtPrelimsCount} Prelims • {govtWrittenCount} Written • {govtVivaCount} Viva
              </div>
            </div>

            {/* Govt Card 3: Admit Card Status */}
            <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Admit Cards Ready
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">assignment_ind</span>
                </div>
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {govtAdmitCardReadyCount}
              </div>
              <div className="font-body-sm text-body-sm text-blue-600 font-medium mt-0.5">
                Download &amp; roll verified
              </div>
            </div>

            {/* Govt Card 4: Fee Payment Status */}
            <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Application Fee Status
                </span>
                <div className="w-8 h-8 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                </div>
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {govtFeePaidCount} Paid
              </div>
              <div className="font-body-sm text-body-sm text-outline mt-0.5">
                {govtFeePendingCount > 0 ? `${govtFeePendingCount} pending via SMS` : 'All application fees paid'}
              </div>
            </div>
          </>
        ) : jobTypeFilter === 'Private' ? (
          <>
            {/* Private Card 1: Total Private Applications */}
            <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-blue-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Private &amp; MNC Roles
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">domain</span>
                </div>
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {privateApps.length}
              </div>
              <div className="font-body-sm text-body-sm text-blue-600 font-medium mt-0.5">
                Tech, Startups &amp; MNCs
              </div>
            </div>

            {/* Private Card 2: Interviewing Pipeline */}
            <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Interview Pipeline
                </span>
                <div className="w-8 h-8 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">record_voice_over</span>
                </div>
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {privateInterviewCount}
              </div>
              <div className="font-body-sm text-body-sm text-tertiary font-medium mt-0.5">
                Screening, Tech &amp; HR rounds
              </div>
            </div>

            {/* Private Card 3: Offers Received */}
            <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Offers Received
                </span>
                <div className="w-8 h-8 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                </div>
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {privateOfferCount}
              </div>
              <div className="font-body-sm text-body-sm text-secondary font-medium mt-0.5">
                {privateOfferCount > 0 ? 'Review compensation package' : 'Targeting 2 offers'}
              </div>
            </div>

            {/* Private Card 4: In Review / Shortlisted */}
            <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  In Review &amp; Shortlisted
                </span>
                <div className="w-8 h-8 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">manage_search</span>
                </div>
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {appliedCount + shortlistedCount}
              </div>
              <div className="font-body-sm text-body-sm text-outline mt-0.5">
                Awaiting recruiter callback
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Card 1: Total Applications */}
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

            {/* Card 2: Govt Job Track */}
            <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                  🏛️ Govt Track
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                </div>
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {govtApps.length}
              </div>
              <div className="font-body-sm text-body-sm text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                {govtExamProgressApps.length} active exam stages
              </div>
            </div>

            {/* Card 3: Private / MNC Track */}
            <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                  💼 Private Track
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">domain</span>
                </div>
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {privateApps.length}
              </div>
              <div className="font-body-sm text-body-sm text-blue-600 font-medium mt-0.5">
                {privateInterviewCount} in interview stages
              </div>
            </div>

            {/* Card 4: Offers Extended */}
            <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                  Offers &amp; Final
                </span>
                <div className="w-8 h-8 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                </div>
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {offerCount}
              </div>
              <div className="font-body-sm text-body-sm text-secondary font-medium mt-0.5">
                {offerCount > 0 ? 'Decide next steps' : 'Targeting 2 offers'}
              </div>
            </div>
          </>
        )}
      </section>

      {/* 2-Column Split: Next Interview Urgent Card & Weekly Focus Advisor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {/* Next Interview / Exam Stage Card */}
        {(() => {
          const activeEvent = upcomingEvent || (nextInterview ? {
            type: 'Private',
            app: nextInterview,
            title: `${nextInterview.jobTitle} with ${nextInterview.companyName}`,
            stageName: 'Interview Round',
            date: nextInterview.deadline || nextInterview.applicationDate,
            location: nextInterview.location || 'Google Meet / Live Code',
            details: `Package: ${nextInterview.salary || 'Competitive'} • Recruiter: ${nextInterview.recruiterName || 'HR Team'}`,
            badge: 'Interview Scheduled',
            notes: nextInterview.notes,
          } : null);

          return (
            <div
              id="dashboard-next-interview-card"
              className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 flex flex-col justify-between space-y-space-sm"
            >
              <div className="space-y-space-xs">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                      activeEvent?.type === 'Government'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full animate-ping ${
                        activeEvent?.type === 'Government' ? 'bg-emerald-600' : 'bg-error'
                      }`}
                    ></span>
                    {activeEvent
                      ? activeEvent.type === 'Government'
                        ? `🏛️ Upcoming Govt Exam: ${activeEvent.stageName}`
                        : `💼 Upcoming Interview: ${activeEvent.stageName}`
                      : 'Interview / Exam Prep Mode'}
                  </span>
                  <span className="font-body-sm text-body-sm text-outline">
                    {activeEvent?.date ? formatDisplayDate(activeEvent.date) : 'Calendar synced'}
                  </span>
                </div>

                {activeEvent ? (
                  <div className="flex items-start gap-space-sm pt-space-2xs">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${getMonogramStyle(
                        activeEvent.app?.companyName || activeEvent.title
                      )}`}
                    >
                      {getMonogram(activeEvent.app?.companyName || activeEvent.title)}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                        {activeEvent.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[12px] text-outline flex-wrap font-medium">
                        <span className="flex items-center gap-1 text-on-surface-variant font-semibold">
                          <span className="material-symbols-outlined text-[14px]">
                            {activeEvent.type === 'Government' ? 'location_city' : 'videocam'}
                          </span>
                          <span>{activeEvent.location}</span>
                        </span>
                        <span>•</span>
                        <span>{activeEvent.details}</span>
                      </div>
                      <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5 line-clamp-2">
                        {activeEvent.notes ||
                          (activeEvent.type === 'Government'
                            ? 'Review circular syllabus, admit card printout, and previous years BPSC questions.'
                            : 'System Design & Algorithm Round. Review key architectural concepts.')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-space-xs rounded-xl bg-surface-container-low flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-primary text-[28px]">event_available</span>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        No immediate exams or interviews scheduled
                      </h3>
                      <p className="font-body-sm text-[12px] text-on-surface-variant">
                        Submit new applications or update exam stage dates to monitor upcoming deadlines.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-space-xs pt-space-xs border-t border-surface-container-high/30 flex-wrap">
                {activeEvent ? (
                  <>
                    <CalendarExportButtons
                      title={activeEvent.title}
                      description={activeEvent.notes || activeEvent.details}
                      date={activeEvent.date}
                      variant="compact"
                    />
                    <button
                      type="button"
                      onClick={() => openEditModal(activeEvent.app)}
                      className="p-1.5 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                      title="Edit application details"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/applications/${activeEvent.app?.id}`)}
                      className="px-space-sm py-1.5 rounded-xl text-on-surface-variant font-label-md text-label-md hover:bg-surface-container transition-colors font-medium"
                    >
                      {activeEvent.type === 'Government' ? 'Exam Workflow' : 'Prep Notes'}
                    </button>
                    {activeEvent.type === 'Private' ? (
                      <a
                        href={activeEvent.app?.jobUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-space-md py-1.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">videocam</span>
                        <span>Join Meeting</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/applications/${activeEvent.app?.id}`)}
                        className="px-space-md py-1.5 rounded-xl bg-emerald-600 text-white font-label-md text-label-md hover:bg-emerald-700 transition-colors flex items-center gap-1 font-semibold"
                      >
                        <span className="material-symbols-outlined text-[16px]">assignment</span>
                        <span>View Stages</span>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAddModal()}
                    className="px-space-md py-1.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Track Application</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

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
            {/* Job Type Filter Dropdown */}
            <select
              id="filter-job-type-select"
              value={jobTypeFilter}
              onChange={(e) => {
                setJobTypeFilter(e.target.value);
                setWorkflowStageFilter('All');
              }}
              className="px-2.5 py-1.5 bg-surface-container-low rounded-xl font-body-sm text-[12px] text-on-surface border border-outline-variant/40 focus:outline-none font-medium"
            >
              <option value="All">All Types ({totalApplications})</option>
              <option value="Government">🏛️ Govt Circulars ({govtApps.length})</option>
              <option value="Private">💼 Private &amp; MNC ({privateApps.length})</option>
            </select>

            {/* Workflow Stage Filter Dropdown */}
            <select
              id="filter-workflow-stage-select"
              value={workflowStageFilter}
              onChange={(e) => setWorkflowStageFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-container-low rounded-xl font-body-sm text-[12px] text-on-surface border border-outline-variant/40 focus:outline-none font-medium"
            >
              {jobTypeFilter === 'Government' ? (
                <>
                  <option value="All">All Exam Stages</option>
                  <option value="prelims">Preliminary Exam ({govtPrelimsCount})</option>
                  <option value="written">Written Exam ({govtWrittenCount})</option>
                  <option value="viva">Viva-Voce ({govtVivaCount})</option>
                  <option value="final">Final Recommendation ({govtFinalPassedCount})</option>
                  <option value="admit_ready">Admit Card Released ({govtAdmitCardReadyCount})</option>
                  <option value="fee_pending">Fee Pending ({govtFeePendingCount})</option>
                </>
              ) : jobTypeFilter === 'Private' ? (
                <>
                  <option value="All">All Interview Rounds</option>
                  <option value="phone_screen">Phone Screen</option>
                  <option value="tech_round">Technical Round</option>
                  <option value="hr_round">HR Round</option>
                  <option value="offer_round">Offers ({privateOfferCount})</option>
                </>
              ) : (
                <>
                  <option value="All">All Workflow Stages</option>
                  <optgroup label="Government Exam Stages">
                    <option value="prelims">Govt: Preliminary Exam</option>
                    <option value="written">Govt: Written Exam</option>
                    <option value="viva">Govt: Viva-Voce</option>
                    <option value="final">Govt: Final Recommendation</option>
                    <option value="admit_ready">Govt: Admit Card Released</option>
                    <option value="fee_pending">Govt: Fee Pending</option>
                  </optgroup>
                  <optgroup label="Private Interview Rounds">
                    <option value="phone_screen">Private: Phone Screen</option>
                    <option value="tech_round">Private: Technical Round</option>
                    <option value="hr_round">Private: HR Round</option>
                    <option value="offer_round">Private: Offer Discussions</option>
                  </optgroup>
                </>
              )}
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-container-low rounded-xl font-body-sm text-[12px] text-on-surface border border-outline-variant/40 focus:outline-none"
            >
              <option value="All">All Designations</option>
              <option value="Cadre">BCS / Cadre</option>
              <option value="Officer">Officer</option>
              <option value="Engineer">Engineering / Tech</option>
              <option value="Frontend">Frontend</option>
              <option value="Product">Product / Analyst</option>
            </select>

            {/* Location / Modality */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-container-low rounded-xl font-body-sm text-[12px] text-on-surface border border-outline-variant/40 focus:outline-none"
            >
              <option value="All">All Locations</option>
              <option value="Dhaka">Dhaka</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Chittagong">Chittagong</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-container-low rounded-xl font-body-sm text-[12px] text-on-surface border border-outline-variant/40 focus:outline-none"
            >
              <option value="newest">Recent First</option>
              <option value="oldest">Oldest First</option>
              <option value="company">Organization (A-Z)</option>
            </select>
          </div>

          <span className="font-body-sm text-[11px] text-outline">
            Showing {filteredApplications.length} of {totalApplications} records
          </span>
        </div>

        {/* Application Cards Stack */}
        <div className="divide-y divide-surface-container-high/30">
          {filteredApplications.slice(0, 7).map((app) => {
            const isGovt = (app.job_type || 'Private') === 'Government';
            const isRemote = (app.location || '').toLowerCase().includes('remote');
            const isHybrid = (app.location || '').toLowerCase().includes('hybrid');

            return (
              <div
                key={app.id}
                id={`app-item-${app.id}`}
                onClick={() => setCardActionApp(app)}
                title="Click to update status or delete record"
                className="py-space-md flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm hover:bg-surface-container-low/50 rounded-xl px-space-xs transition-colors cursor-pointer group"
              >
                {/* Left: Monogram + Company & Specific Workflow Info */}
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

                      {/* Job Type Badge */}
                      {isGovt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-label-sm text-[10px] font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[12px]">account_balance</span>
                          <span>Govt Circular</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-label-sm text-[10px] font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[12px]">business</span>
                          <span>Private / MNC</span>
                        </span>
                      )}

                      {/* Govt Grade or Work Modality */}
                      {isGovt && app.jobGrade && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-label-sm text-[10px] font-bold">
                          {app.jobGrade}
                        </span>
                      )}
                      {!isGovt && (
                        <span className="px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[10px] font-semibold uppercase">
                          {isRemote ? 'Remote' : isHybrid ? 'Hybrid' : 'On-site'}
                        </span>
                      )}
                    </div>

                    <p className="font-headline-sm text-body-sm font-semibold text-on-surface truncate">
                      {app.jobTitle}
                    </p>

                    {/* Government-Specific Fields Row */}
                    {isGovt ? (
                      <div className="flex items-center gap-space-xs text-[11px] flex-wrap font-body-sm pt-0.5">
                        {app.ministryDepartment && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium">
                            <span className="material-symbols-outlined text-[13px] text-emerald-600">apartment</span>
                            <span>{app.ministryDepartment}</span>
                          </span>
                        )}

                        {app.circularId && (
                          <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-[10px] text-outline font-medium">
                            Ref: {app.circularId}
                          </span>
                        )}

                        {/* Fee & Payment Status */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-[11px] ${
                            (app.paymentStatus || '').toLowerCase().includes('paid')
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">payments</span>
                          <span>
                            {app.applicationFee ? `${app.applicationFee} • ` : ''}
                            {app.paymentStatus || 'Payment Pending'}
                          </span>
                        </span>

                        {/* Admit Card Status */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            (app.admitCardStatus || '').toLowerCase().includes('download') ||
                            (app.admitCardStatus || '').toLowerCase().includes('issued')
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">assignment_ind</span>
                          <span>Admit: {app.admitCardStatus || 'Pending'}</span>
                        </span>

                        {/* Exam Stages Progress Visualizer */}
                        {Array.isArray(app.govtExamStages) && app.govtExamStages.length > 0 && (
                          <div className="flex items-center gap-1 w-full pt-1">
                            <span className="font-label-sm text-[10px] text-outline font-semibold uppercase tracking-wider mr-1">
                              Exam Stages:
                            </span>
                            {app.govtExamStages.map((stage) => {
                              const isPassed = stage.status === 'Passed';
                              const isFailed = stage.status === 'Failed';
                              const isPending = stage.status === 'Pending';
                              return (
                                <span
                                  key={stage.id}
                                  title={`${stage.name}: ${stage.status}${stage.date ? ` (${stage.date})` : ''}${stage.center ? ` at ${stage.center}` : ''}`}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    isPassed
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      : isFailed
                                      ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                                      : isPending && stage.date
                                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                                      : 'bg-surface-container text-outline'
                                  }`}
                                >
                                  {isPassed ? '✓ ' : isFailed ? '✕ ' : '• '}
                                  {stage.name.replace(' Exam', '').replace(' Result / Recommendation', ' Final')}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Private Job Specific Fields Row */
                      <div className="flex items-center gap-space-xs text-[11px] flex-wrap font-body-sm pt-0.5">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary-container/20 dark:bg-primary-950/40 text-primary font-semibold border border-primary/20"
                          title={`Application submission date: ${formatDisplayDate(app.applicationDate)}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                          <span>Applied: {formatDisplayDate(app.applicationDate)}</span>
                        </span>

                        {app.salary && (
                          <span className="px-2 py-0.5 rounded bg-surface-container font-mono-metric text-[10px] text-on-surface font-semibold">
                            Package: {app.salary}
                          </span>
                        )}

                        {app.recruiterName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                            <span className="material-symbols-outlined text-[13px]">contact_mail</span>
                            <span>HR: {app.recruiterName}</span>
                          </span>
                        )}

                        {app.applicationSource && (
                          <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-medium text-[10px]">
                            via {app.applicationSource}
                          </span>
                        )}

                        {app.location && (
                          <span className="flex items-center gap-0.5 text-outline">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            <span className="truncate">{app.location}</span>
                          </span>
                        )}

                        {/* Private Interview Rounds Progress Visualizer */}
                        {Array.isArray(app.privateInterviewRounds) && app.privateInterviewRounds.length > 0 && (
                          <div className="flex items-center gap-1 w-full pt-1">
                            <span className="font-label-sm text-[10px] text-outline font-semibold uppercase tracking-wider mr-1">
                              Interview Pipeline:
                            </span>
                            {app.privateInterviewRounds.map((round) => {
                              const isCompleted = round.status === 'Completed';
                              const isPending = round.status === 'Pending';
                              return (
                                <span
                                  key={round.id}
                                  title={`${round.name}: ${round.status}${round.date ? ` (${round.date})` : ''}`}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    isCompleted
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      : isPending && round.date
                                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                                      : 'bg-surface-container text-outline'
                                  }`}
                                >
                                  {isCompleted ? '✓ ' : '• '}
                                  {round.name.replace(' Interview', '').replace(' Screen', '')}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
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
