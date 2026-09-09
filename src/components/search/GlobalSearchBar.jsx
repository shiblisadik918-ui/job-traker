import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApplications } from '../../services/applicationsService';
import { createReminder } from '../../services/remindersService';
import { APPLICATION_STATUSES, formatDisplayDate } from '../../utils/constants';
import { useToast } from '../../hooks/useToast';

const SEARCH_FIELDS = [
  { id: 'all', label: 'All Fields', icon: 'search' },
  { id: 'jobTitle', label: 'Job Title', icon: 'badge' },
  { id: 'companyName', label: 'Company Name', icon: 'domain' },
];

const MONOGRAM_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
];

export default function GlobalSearchBar() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [query, setQuery] = useState('');
  const [searchField, setSearchField] = useState('all'); // 'all' | 'jobTitle' | 'companyName'
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isOpen, setIsOpen] = useState(false);
  const [applications, setApplications] = useState([]);
  const [schedulingAppId, setSchedulingAppId] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch applications for instant search
  const fetchApplications = useCallback(async () => {
    const { data } = await getApplications();
    if (data) setApplications(data);
  }, []);

  useEffect(() => {
    fetchApplications();
    const handleAppChanged = () => fetchApplications();
    window.addEventListener('jobtrack:application-changed', handleAppChanged);
    return () => window.removeEventListener('jobtrack:application-changed', handleAppChanged);
  }, [fetchApplications]);

  // Global Keyboard Shortcut (/ or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in a textarea or input
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') {
        if (e.key === 'Escape' && isOpen) {
          setIsOpen(false);
          inputRef.current?.blur();
        }
        return;
      }

      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered matching applications
  const filteredResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    return applications.filter((app) => {
      // 1. Status Filter
      if (selectedStatus !== 'All' && app.status !== selectedStatus) {
        return false;
      }

      // If no query string, return all matching the status filter (capped at 8)
      if (!trimmed) {
        return true;
      }

      // 2. Field Matching
      const titleMatch = (app.jobTitle || '').toLowerCase().includes(trimmed);
      const companyMatch = (app.companyName || '').toLowerCase().includes(trimmed);
      const locationMatch = (app.location || '').toLowerCase().includes(trimmed);

      if (searchField === 'jobTitle') {
        return titleMatch;
      }
      if (searchField === 'companyName') {
        return companyMatch;
      }
      // 'all'
      return titleMatch || companyMatch || locationMatch;
    });
  }, [applications, query, searchField, selectedStatus]);

  // Helper for company monogram
  const getMonogram = (name) => {
    if (!name) return 'JB';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getMonogramStyle = (name) => {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
    }
    return MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length];
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Applied':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300';
      case 'Shortlisted':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300';
      case 'Interview':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
      case 'Offer':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'Rejected':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      default:
        return 'bg-surface-container text-outline';
    }
  };

  // 1-Click Automatic Schedule Follow-up
  const handleQuickScheduleFollowUp = async (e, app) => {
    e.stopPropagation();
    setSchedulingAppId(app.id);

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
      notes: `Auto-scheduled follow-up check for ${app.jobTitle} position at ${app.companyName}.`,
    };

    const { error } = await createReminder(reminderPayload);
    setSchedulingAppId(null);

    if (error) {
      showError(error || 'Failed to schedule follow-up.');
    } else {
      showSuccess(`Follow-up automatically scheduled for ${app.companyName} on ${formatDisplayDate(dateStr)}!`);
      window.dispatchEvent(new CustomEvent('jobtrack:reminder-changed', { detail: { action: 'create' } }));
    }
  };

  const handleSelectApp = (appId) => {
    setIsOpen(false);
    navigate(`/applications/${appId}`);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setIsOpen(false);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (selectedStatus !== 'All') params.set('status', selectedStatus);
    navigate(`/applications?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs sm:max-w-md md:max-w-lg z-50">
      {/* Search Input Bar */}
      <form onSubmit={handleFormSubmit} className="relative">
        <div
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-surface-container-lowest dark:bg-surface-container-low shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border transition-all ${
            isOpen
              ? 'border-primary ring-2 ring-primary/20 bg-surface-container-lowest'
              : 'border-outline-variant/30 hover:border-outline-variant/60'
          }`}
        >
          <span className="material-symbols-outlined text-outline text-[20px] shrink-0">
            search
          </span>

          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            placeholder={
              searchField === 'jobTitle'
                ? 'Search by job title...'
                : searchField === 'companyName'
                ? 'Search by company name...'
                : 'Search applications by title, company, status...'
            }
            className="w-full bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
            autoComplete="off"
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded text-outline hover:text-on-surface transition-colors"
              title="Clear search"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}

          <kbd
            onClick={() => inputRef.current?.focus()}
            className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-outline-variant/40 font-mono text-[10px] text-outline bg-surface-container-low select-none cursor-pointer"
            title="Press / or Cmd+K to search"
          >
            /
          </kbd>
        </div>
      </form>

      {/* Global Search Popover / Command Palette Dropdown */}
      {isOpen && (
        <div
          id="global-search-palette"
          className="absolute left-0 right-0 top-full mt-2 bg-surface-container-lowest dark:bg-surface-container-low rounded-2xl shadow-2xl border border-surface-container-high/60 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Filter Bar: Target Fields */}
          <div className="p-2.5 border-b border-surface-container-high/40 bg-surface-container-low/40 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-outline font-semibold">
              <span>Filter Search By:</span>
              <span>{filteredResults.length} application{filteredResults.length !== 1 ? 's' : ''} found</span>
            </div>

            {/* Target Field Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {SEARCH_FIELDS.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => setSearchField(field.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    searchField === field.id
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{field.icon}</span>
                  <span>{field.label}</span>
                </button>
              ))}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pt-1">
              <span className="text-[10px] uppercase font-bold text-outline mr-1">Status:</span>
              {['All', ...APPLICATION_STATUSES].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                    selectedStatus === status
                      ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                      : 'bg-surface-container-lowest text-outline hover:text-on-surface border border-outline-variant/30'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Results Stream */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-surface-container-high/30">
            {filteredResults.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <span className="material-symbols-outlined text-outline text-[36px] opacity-60">
                  search_off
                </span>
                <p className="text-xs font-semibold text-on-surface">No applications found</p>
                <p className="text-[11px] text-outline max-w-xs mx-auto">
                  Try adjusting your query, switching search field, or resetting the status filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSelectedStatus('All');
                    setSearchField('all');
                  }}
                  className="mt-1 px-3 py-1 rounded-lg text-xs text-primary font-semibold hover:underline"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              filteredResults.slice(0, 8).map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleSelectApp(app.id)}
                  className="p-3 hover:bg-surface-container/60 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  {/* Company & Role */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${getMonogramStyle(
                        app.companyName
                      )}`}
                    >
                      {getMonogram(app.companyName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-semibold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                          {app.jobTitle}
                        </h4>
                        <span className="text-outline text-xs">•</span>
                        <span className="text-xs text-on-surface-variant font-medium truncate">
                          {app.companyName}
                        </span>
                      </div>

                      {/* Application Date Highlight */}
                      <div className="flex items-center gap-2 text-[11px] text-outline pt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-primary font-semibold">
                          <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                          <span>Applied: {formatDisplayDate(app.applicationDate)}</span>
                        </span>
                        {app.location && (
                          <span>• {app.location}</span>
                        )}
                        {app.salary && (
                          <span className="font-mono text-secondary font-semibold">• {app.salary}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stage Badge & Quick Schedule Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                        app.status
                      )}`}
                    >
                      {app.status}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleQuickScheduleFollowUp(e, app)}
                      disabled={schedulingAppId === app.id}
                      className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-primary/10 transition-colors border border-outline-variant/30"
                      title="Automatically schedule follow-up"
                    >
                      <span className="material-symbols-outlined text-[16px]">alarm_add</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 bg-surface-container-low/80 border-t border-surface-container-high/40 flex items-center justify-between text-xs">
            <span className="text-outline text-[11px] hidden sm:inline">
              Press <kbd className="font-mono px-1 py-0.5 bg-surface-container rounded border border-outline-variant/30">Enter</kbd> to see full list
            </span>

            <button
              type="button"
              onClick={handleFormSubmit}
              className="text-primary font-semibold hover:underline ml-auto flex items-center gap-1"
            >
              <span>View in Applications</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
