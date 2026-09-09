import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { getApplications } from '../services/applicationsService';
import { useToast } from '../hooks/useToast';
import { formatDisplayDate } from '../utils/constants';

const STAGE_COLORS = {
  Applied: '#0284c7', // primary sky/blue
  Shortlisted: '#6366f1', // indigo
  Interview: '#d97706', // amber/tertiary
  Offer: '#16a34a', // emerald/green
  Rejected: '#dc2626', // rose/red
};

const MODALITY_COLORS = ['#0284c7', '#d97706', '#64748b'];
const SOURCE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];

export default function Statistics() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 3m, 6m, all
  const { showError } = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await getApplications();
      if (error) {
        showError(error);
      } else {
        setApplications(data || []);
      }
      setLoading(false);
    }
    load();
  }, [showError]);

  // Real Time-Range Filtering
  const filteredApplications = useMemo(() => {
    if (timeRange === 'all') return applications;

    const now = new Date();
    let cutoffDays = 30;
    if (timeRange === '7d') cutoffDays = 7;
    else if (timeRange === '30d') cutoffDays = 30;
    else if (timeRange === '3m') cutoffDays = 90;
    else if (timeRange === '6m') cutoffDays = 180;

    const cutoffTime = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000).getTime();

    return applications.filter((app) => {
      let appTime = null;
      if (app.applicationDate) {
        appTime = new Date(app.applicationDate).getTime();
      } else if (app.createdAt?.toMillis) {
        appTime = app.createdAt.toMillis();
      } else if (app.createdAt) {
        appTime = new Date(app.createdAt).getTime();
      }

      // If no date is available, include it so the user sees their entries
      if (!appTime || isNaN(appTime)) return true;
      return appTime >= cutoffTime;
    });
  }, [applications, timeRange]);

  // Calculations on filtered set
  const total = filteredApplications.length;
  const applied = filteredApplications.filter((a) => a.status === 'Applied').length;
  const shortlisted = filteredApplications.filter((a) => a.status === 'Shortlisted').length;
  const interviewing = filteredApplications.filter((a) => a.status === 'Interview').length;
  const offers = filteredApplications.filter((a) => a.status === 'Offer').length;
  const archived = filteredApplications.filter((a) => a.status === 'Rejected').length;

  const responseRate = total > 0 ? (((shortlisted + interviewing + offers) / total) * 100).toFixed(1) : '0.0';
  const interviewConversion = total > 0 ? (((interviewing + offers) / total) * 100).toFixed(1) : '0.0';
  const offerRate = total > 0 ? ((offers / total) * 100).toFixed(1) : '0.0';

  // Work Modality Breakdown
  const modalityData = useMemo(() => {
    let remote = 0;
    let hybrid = 0;
    let onsite = 0;

    filteredApplications.forEach((a) => {
      const loc = (a.location || '').toLowerCase();
      if (loc.includes('remote') || a.jobType === 'Remote') {
        remote++;
      } else if (loc.includes('hybrid') || a.jobType === 'Hybrid') {
        hybrid++;
      } else {
        onsite++;
      }
    });

    return [
      { name: 'Remote', value: remote },
      { name: 'Hybrid', value: hybrid },
      { name: 'On-site', value: onsite },
    ].filter((item) => item.value > 0);
  }, [filteredApplications]);

  // Source Distribution
  const sourceData = useMemo(() => {
    const counts = {};
    filteredApplications.forEach((a) => {
      const source = a.applicationSource || 'LinkedIn';
      counts[source] = (counts[source] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredApplications]);

  // Stage Distribution Data for BarChart
  const stageChartData = useMemo(() => {
    return [
      { stage: 'Applied', count: applied, fill: STAGE_COLORS.Applied },
      { stage: 'Shortlisted', count: shortlisted, fill: STAGE_COLORS.Shortlisted },
      { stage: 'Interview', count: interviewing, fill: STAGE_COLORS.Interview },
      { stage: 'Offer', count: offers, fill: STAGE_COLORS.Offer },
      { stage: 'Archived', count: archived, fill: STAGE_COLORS.Rejected },
    ];
  }, [applied, shortlisted, interviewing, offers, archived]);

  // Timeline / Velocity Chart Data (Grouped by Date or Week)
  const activityTimelineData = useMemo(() => {
    if (filteredApplications.length === 0) return [];

    // Sort apps by date
    const sorted = [...filteredApplications].sort((a, b) => {
      const timeA = a.applicationDate ? new Date(a.applicationDate).getTime() : 0;
      const timeB = b.applicationDate ? new Date(b.applicationDate).getTime() : 0;
      return timeA - timeB;
    });

    // Group into timeline buckets
    const bucketMap = {};
    sorted.forEach((app) => {
      let key = 'Earlier';
      if (app.applicationDate) {
        const d = new Date(app.applicationDate);
        if (!isNaN(d.getTime())) {
          // Format as 'MMM dd' or 'MMM YYYY' depending on timeRange
          if (timeRange === '7d' || timeRange === '30d') {
            key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          } else {
            key = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
          }
        }
      }
      if (!bucketMap[key]) {
        bucketMap[key] = { label: key, applications: 0, interviews: 0, offers: 0 };
      }
      bucketMap[key].applications++;
      if (app.status === 'Interview') bucketMap[key].interviews++;
      if (app.status === 'Offer') bucketMap[key].offers++;
    });

    return Object.values(bucketMap);
  }, [filteredApplications, timeRange]);

  return (
    <div id="statistics-page" className="space-y-space-lg animate-in fade-in duration-200 max-w-6xl mx-auto">
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Real-time Pipeline Intelligence
            </span>
          </div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-on-surface font-bold tracking-tight">
            Analytics &amp; Insights
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
            Review conversion rates, application velocity, and pipeline telemetry based on real data.
          </p>
        </div>

        {/* Real Time Range Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container self-start sm:self-auto flex-wrap">
          {[
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '3m', label: '3 Months' },
            { key: '6m', label: '6 Months' },
            { key: 'all', label: 'All Time' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTimeRange(t.key)}
              className={`px-3 py-1.5 rounded-lg font-label-sm text-[12px] transition-all font-semibold ${
                timeRange === t.key
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Top 4 KPI Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Total Tracked
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">business_center</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {total}
          </div>
          <div className="font-body-sm text-[11px] text-outline mt-0.5">
            Applications in window
          </div>
        </div>

        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Response Rate
            </span>
            <span className="material-symbols-outlined text-secondary text-[20px]">trending_up</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {responseRate}%
          </div>
          <div className="font-body-sm text-[11px] text-secondary font-medium mt-0.5">
            {shortlisted + interviewing + offers} callbacks received
          </div>
        </div>

        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Interview Conversion
            </span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">conversion_path</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {interviewConversion}%
          </div>
          <div className="font-body-sm text-[11px] text-tertiary font-medium mt-0.5">
            {interviewing + offers} active interview pipelines
          </div>
        </div>

        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Offers Extended
            </span>
            <span className="material-symbols-outlined text-secondary text-[20px]">workspace_premium</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {offers} Offers
          </div>
          <div className="font-body-sm text-[11px] text-secondary font-medium mt-0.5">
            {offerRate}% final conversion
          </div>
        </div>
      </section>

      {/* Row 1 Charts: Application Velocity Activity (AreaChart) & Stage Breakdown (BarChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        {/* Application Velocity Over Time */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 space-y-3">
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/30">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">timeline</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Application Velocity Over Time
              </h2>
            </div>
            <span className="font-body-sm text-[11px] text-outline font-medium">
              {timeRange.toUpperCase()} Window
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {activityTimelineData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-outline text-xs space-y-1">
                <span className="material-symbols-outlined text-[32px]">query_stats</span>
                <span>No application activity recorded in this time range.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    name="Applications Sent"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#velocityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pipeline Stage Distribution BarChart */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 space-y-3">
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/30">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">bar_chart</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Applications by Pipeline Stage
              </h2>
            </div>
            <span className="font-body-sm text-[11px] text-outline font-medium">{total} total</span>
          </div>

          <div className="h-64 w-full pt-2">
            {total === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-outline text-xs space-y-1">
                <span className="material-symbols-outlined text-[32px]">bar_chart</span>
                <span>No applications found to visualize.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Applications" radius={[6, 6, 0, 0]}>
                    {stageChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Conversion Funnel & Work Modality Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        {/* Pipeline Conversion Funnel Breakdown */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 space-y-space-sm">
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/30">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">filter_alt</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Pipeline Conversion Funnel
              </h2>
            </div>
            <span className="font-body-sm text-[11px] text-outline">{total} in current range</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {/* Step 1 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-label-md text-on-surface font-semibold">
                  1. Applications Submitted
                </span>
                <span className="font-mono-metric font-bold text-on-surface">{total} (100%)</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                <div className="h-full bg-primary-container w-full rounded-full" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-label-md text-on-surface font-semibold">
                  2. Recruiter Screening &amp; Shortlist
                </span>
                <span className="font-mono-metric font-bold text-on-surface">
                  {shortlisted + interviewing + offers} ({responseRate}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, Math.max(total > 0 ? 8 : 0, parseFloat(responseRate)))}%` }}
                  className="h-full bg-primary rounded-full transition-all duration-500"
                />
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-label-md text-on-surface font-semibold">
                  3. Technical &amp; Team Interviews
                </span>
                <span className="font-mono-metric font-bold text-on-surface">
                  {interviewing + offers} ({interviewConversion}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, Math.max(total > 0 ? 5 : 0, parseFloat(interviewConversion)))}%` }}
                  className="h-full bg-tertiary rounded-full transition-all duration-500"
                />
              </div>
            </div>

            {/* Step 4 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-label-md text-on-surface font-semibold">
                  4. Formal Offers Extended
                </span>
                <span className="font-mono-metric font-bold text-on-surface">
                  {offers} ({offerRate}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, Math.max(total > 0 ? 3 : 0, parseFloat(offerRate)))}%` }}
                  className="h-full bg-secondary rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Work Modality & Sourcing Distribution (PieChart Donut) */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] border border-surface-container-high/30 space-y-space-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/30">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">pie_chart</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Work Modality Distribution
              </h2>
            </div>
            <span className="font-body-sm text-[11px] text-outline">Target Roles</span>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {modalityData.length === 0 ? (
              <div className="text-center text-outline text-xs">
                No location modality data available for this range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modalityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {modalityData.map((entry, index) => (
                      <Cell
                        key={`cell-mod-${index}`}
                        fill={MODALITY_COLORS[index % MODALITY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-on-surface font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Advice telemetry card */}
          <div className="p-space-sm rounded-xl bg-primary-fixed/30 border border-primary-fixed flex items-start gap-space-xs text-xs">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
              lightbulb
            </span>
            <div className="space-y-0.5">
              <span className="font-headline-sm text-body-sm font-bold text-on-surface">
                Telemetry Advice
              </span>
              <p className="font-body-sm text-on-surface-variant leading-relaxed">
                {total === 0
                  ? 'Submit more job applications to unlock deeper conversion and velocity insights.'
                  : `Currently tracking ${total} applications with ${interviewing} active interview rounds. Maintaining 3+ submissions per week sustains healthy response momentum.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
