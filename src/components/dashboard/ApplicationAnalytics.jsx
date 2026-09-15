import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ডেমো ডেটা (পরবর্তীতে এগুলো Firebase থেকে আসবে)
const DEFAULT_BAR_CHART_DATA = [
  { name: "Applied", Govt: 5, Private: 3 },
  { name: "Written Exam", Govt: 2, Private: 1 },
  { name: "Interview", Govt: 1, Private: 4 },
  { name: "Selected", Govt: 0, Private: 1 },
  { name: "Rejected", Govt: 2, Private: 1 },
];

const DEFAULT_PIE_CHART_DATA = [
  { name: "Govt Jobs", value: 10 },
  { name: "Private Jobs", value: 10 },
];

// চার্টের কালার (Govt = সবুজ, Private = নীল)
const COLORS = ["#16a34a", "#2563eb"];

// Summary Card-এর সিম্পল ডিজাইন
const summaryCardStyle = {
  flex: "1 1 200px",
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  textAlign: "center",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  borderTop: "4px solid #3b82f6",
  borderLeft: "1px solid #e2e8f0",
  borderRight: "1px solid #e2e8f0",
  borderBottom: "1px solid #e2e8f0",
};

export default function ApplicationAnalytics({ applications = [] }) {
  const [useLiveFirebase, setUseLiveFirebase] = useState(true);

  // Calculate live statistics from Firebase applications if available
  const liveStats = useMemo(() => {
    if (!applications || applications.length === 0) {
      return null;
    }

    const govtApps = applications.filter(
      (a) => a.job_type === "Government" || Boolean(a.ministryDepartment)
    );
    const privateApps = applications.filter(
      (a) => a.job_type !== "Government" && !a.ministryDepartment
    );

    // Stages mapping
    // 1. Applied
    const govtApplied = govtApps.filter(
      (a) => a.status === "Applied" || a.status === "Saved"
    ).length;
    const privateApplied = privateApps.filter(
      (a) => a.status === "Applied" || a.status === "Saved"
    ).length;

    // 2. Written Exam / Screening
    const govtWritten = govtApps.filter((a) => {
      const stages = a.govtExamStages || [];
      return stages.some(
        (s) => (s.id === "prelims" || s.id === "written") && (s.status === "Pending" || s.status === "Passed")
      ) || a.status === "Shortlisted";
    }).length;

    const privateWritten = privateApps.filter((a) => {
      const rounds = a.privateInterviewRounds || [];
      return rounds.some(
        (r) => (r.id === "tech" || r.id === "phone") && (r.status === "Pending" || r.status === "Passed")
      ) || a.status === "Shortlisted";
    }).length;

    // 3. Interview / Viva
    const govtInterview = govtApps.filter(
      (a) => a.status === "Interview" || (a.govtExamStages || []).some((s) => s.id === "viva" && s.status === "Pending")
    ).length;
    const privateInterview = privateApps.filter(
      (a) => a.status === "Interview"
    ).length;

    // 4. Selected / Offer
    const govtSelected = govtApps.filter((a) => a.status === "Offer").length;
    const privateSelected = privateApps.filter((a) => a.status === "Offer").length;

    // 5. Rejected / Archived
    const govtRejected = govtApps.filter((a) => a.status === "Rejected").length;
    const privateRejected = privateApps.filter((a) => a.status === "Rejected").length;

    const barData = [
      { name: "Applied", Govt: govtApplied, Private: privateApplied },
      { name: "Written Exam", Govt: govtWritten, Private: privateWritten },
      { name: "Interview", Govt: govtInterview, Private: privateInterview },
      { name: "Selected", Govt: govtSelected, Private: privateSelected },
      { name: "Rejected", Govt: govtRejected, Private: privateRejected },
    ];

    const pieData = [
      { name: "Govt Jobs", value: govtApps.length || 0 },
      { name: "Private Jobs", value: privateApps.length || 0 },
    ];

    const totalApplied = applications.length;
    const interviewsFaced = govtInterview + privateInterview;
    const totalOffers = govtSelected + privateSelected;
    const successRate =
      totalApplied > 0 ? ((totalOffers / totalApplied) * 100).toFixed(1) : "0";

    return {
      barData,
      pieData: pieData.every((p) => p.value === 0) ? DEFAULT_PIE_CHART_DATA : pieData,
      totalApplied,
      interviewsFaced,
      successRate: `${successRate}%`,
    };
  }, [applications]);

  const hasLiveEntries = Boolean(liveStats && liveStats.totalApplied > 0);
  const activeMode = useLiveFirebase && hasLiveEntries ? "live" : "demo";

  const barChartData =
    activeMode === "live" ? liveStats.barData : DEFAULT_BAR_CHART_DATA;
  const pieChartData =
    activeMode === "live" ? liveStats.pieData : DEFAULT_PIE_CHART_DATA;
  const totalApplied =
    activeMode === "live" ? liveStats.totalApplied : 20;
  const interviewsFaced =
    activeMode === "live" ? liveStats.interviewsFaced : 5;
  const successRate =
    activeMode === "live" ? liveStats.successRate : "5%";

  return (
    <div
      id="application-analytics-section"
      style={{
        padding: "24px",
        fontFamily: "inherit",
        background: "var(--color-surface-container-lowest, #f8fafc)",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
      }}
      className="shadow-sm transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2
            style={{
              color: "#334155",
              margin: 0,
              fontSize: "1.35rem",
              fontWeight: 700,
            }}
            className="flex items-center gap-2"
          >
            <span>📊 Application Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            সরকারি ও বেসরকারি চাকরির স্ট্যাটাস ট্র্যাকিং ও অনুপাত বিশ্লেষণ (Govt = সবুজ, Private = নীল)
          </p>
        </div>

        {/* Live vs Demo Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">
            {activeMode === "live" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                লাইভ ডেটা ({applications.length} টি চাকরি)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                ডেমো প্রিভিউ মোড
              </span>
            )}
          </span>

          {hasLiveEntries && (
            <button
              type="button"
              onClick={() => setUseLiveFirebase(!useLiveFirebase)}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            >
              {useLiveFirebase ? "ডেমো ডেটা দেখুন" : "লাইভ ডেটা দেখুন"}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          justifyContent: "space-between",
        }}
      >
        {/* Bar Chart: স্ট্যাটাস ট্র্যাকিং */}
        <div
          style={{
            flex: "1 1 500px",
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #f1f5f9",
          }}
        >
          <h3
            style={{
              textAlign: "center",
              color: "#475569",
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            Job Pipeline Status (সরকারি vs বেসরকারি)
          </h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barChartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend />
                <Bar dataKey="Govt" name="Govt (সরকারি)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Private" name="Private (বেসরকারি)" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: সরকারি বনাম বেসরকারি */}
        <div
          style={{
            flex: "1 1 300px",
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #f1f5f9",
          }}
        >
          <h3
            style={{
              textAlign: "center",
              color: "#475569",
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            Govt vs Private Ratio
          </h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={95}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginTop: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={summaryCardStyle}>
          <h4 style={{ margin: 0, fontSize: "14px", color: "#64748b", fontWeight: 600 }}>Total Applied</h4>
          <p
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#0f172a",
              margin: "6px 0 0 0",
            }}
          >
            {totalApplied}
          </p>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>মোট চাকরির আবেদন</span>
        </div>

        <div style={summaryCardStyle}>
          <h4 style={{ margin: 0, fontSize: "14px", color: "#64748b", fontWeight: 600 }}>Interviews Faced</h4>
          <p
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#d97706",
              margin: "6px 0 0 0",
            }}
          >
            {interviewsFaced}
          </p>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>ভাইভা ও ইন্টারভিউ স্টেজ</span>
        </div>

        <div style={summaryCardStyle}>
          <h4 style={{ margin: 0, fontSize: "14px", color: "#64748b", fontWeight: 600 }}>Success Rate</h4>
          <p
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#16a34a",
              margin: "6px 0 0 0",
            }}
          >
            {successRate}
          </p>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>চূড়ান্ত অফার / সিলেকশন রেট</span>
        </div>
      </div>
    </div>
  );
}
