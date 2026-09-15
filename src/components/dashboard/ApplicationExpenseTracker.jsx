import React, { useMemo, useState } from 'react';
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
} from 'recharts';

export const parseFeeAmount = (feeStr) => {
  if (!feeStr) return 0;
  if (typeof feeStr === 'number') return feeStr;
  const clean = String(feeStr).replace(/[^0-9.]/g, '');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
};

export default function ApplicationExpenseTracker({ applications = [] }) {
  const [filterType, setFilterType] = useState('All'); // 'All' | 'Government' | 'Private'

  const expenseData = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let govtPaid = 0;
    let govtPending = 0;
    let privatePaid = 0;
    let privatePending = 0;
    let paidCount = 0;
    let pendingCount = 0;

    const items = [];

    applications.forEach((app) => {
      const fee = parseFeeAmount(app.applicationFee);
      const isGovt = (app.job_type || 'Private') === 'Government' || Boolean(app.ministryDepartment);
      const pStatus = (app.paymentStatus || '').toLowerCase();
      const isPaid = pStatus.includes('paid');
      const isExempt = pStatus.includes('exempt') || pStatus.includes('free');
      const isPending = !isPaid && !isExempt && fee > 0;

      if (isPaid) {
        totalPaid += fee;
        paidCount++;
        if (isGovt) govtPaid += fee;
        else privatePaid += fee;
      } else if (isPending) {
        totalPending += fee;
        pendingCount++;
        if (isGovt) govtPending += fee;
        else privatePending += fee;
      }

      if (fee > 0 || app.applicationFee) {
        items.push({
          id: app.id,
          name: app.companyName || app.jobTitle || 'Job',
          fullName: `${app.companyName || ''} - ${app.jobTitle || ''}`,
          fee,
          isGovt,
          isPaid,
          isPending,
          statusText: isPaid ? 'Paid' : isPending ? 'Pending' : 'Free',
          typeText: isGovt ? 'Govt' : 'Private',
          paidFee: isPaid ? fee : 0,
          pendingFee: isPending ? fee : 0,
        });
      }
    });

    // Default sample data if no applications have fees entered yet
    const hasAnyFees = items.length > 0;
    const chartItems = hasAnyFees
      ? items
      : [
          { name: '46th BCS', fullName: 'BPSC - 46th BCS Exam', fee: 700, paidFee: 700, pendingFee: 0, isGovt: true, isPaid: true, typeText: 'Govt' },
          { name: 'Bangladesh Bank', fullName: 'Bangladesh Bank - Assistant Director', fee: 200, paidFee: 200, pendingFee: 0, isGovt: true, isPaid: true, typeText: 'Govt' },
          { name: 'NBR Tax Dept', fullName: 'NBR - Assistant Revenue Officer', fee: 500, paidFee: 0, pendingFee: 500, isGovt: true, isPaid: false, typeText: 'Govt' },
          { name: 'bKash Exam', fullName: 'bKash - Software Engineer Assessment', fee: 300, paidFee: 300, pendingFee: 0, isGovt: false, isPaid: true, typeText: 'Private' },
        ];

    const displayPaid = hasAnyFees ? totalPaid : 1200;
    const displayPending = hasAnyFees ? totalPending : 500;
    const displayTotal = displayPaid + displayPending;

    const pieBreakdown = [
      { name: 'পরিশোধিত ফি (Paid)', value: displayPaid, color: '#16a34a' },
      { name: 'বকেয়া ফি (Unpaid/Pending)', value: displayPending, color: '#f59e0b' },
    ];

    const typeBreakdown = [
      { name: 'সরকারি চাকরি (Govt)', value: hasAnyFees ? (govtPaid + govtPending) : 1400, color: '#059669' },
      { name: 'বেসরকারি (Private)', value: hasAnyFees ? (privatePaid + privatePending) : 300, color: '#2563eb' },
    ];

    return {
      hasRealData: hasAnyFees,
      totalPaid: displayPaid,
      totalPending: displayPending,
      totalFee: displayTotal,
      paidCount: hasAnyFees ? paidCount : 3,
      pendingCount: hasAnyFees ? pendingCount : 1,
      chartItems: chartItems.filter((i) => {
        if (filterType === 'Government') return i.isGovt;
        if (filterType === 'Private') return !i.isGovt;
        return true;
      }),
      pieBreakdown,
      typeBreakdown,
    };
  }, [applications, filterType]);

  return (
    <div
      id="application-expense-tracker-section"
      className="p-5 md:p-6 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] space-y-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-container-high/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </span>
            <h2 className="font-headline-sm text-lg font-bold text-on-surface">
              আবেদন ফি ও মোট খরচ ট্র্যাকার (Application Cost &amp; Expense)
            </h2>
          </div>
          <p className="font-body-sm text-xs text-on-surface-variant">
            চাকরিগুলোতে আবেদন করতে মোট কত টাকা খরচ হলো এবং কত বকেয়া আছে তার বিস্তারিত চার্ট
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterType('All')}
            className={`px-3 py-1 rounded-lg font-label-sm text-xs font-semibold transition-all ${
              filterType === 'All'
                ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            সব চাকরি (All)
          </button>
          <button
            type="button"
            onClick={() => setFilterType('Government')}
            className={`px-3 py-1 rounded-lg font-label-sm text-xs font-semibold transition-all ${
              filterType === 'Government'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            🏛️ সরকারি
          </button>
          <button
            type="button"
            onClick={() => setFilterType('Private')}
            className={`px-3 py-1 rounded-lg font-label-sm text-xs font-semibold transition-all ${
              filterType === 'Private'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-blue-700 dark:text-blue-400 hover:bg-blue-500/10'
            }`}
          >
            💼 বেসরকারি
          </button>
        </div>
      </div>

      {/* KPI Metric Highlights Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Spent / Paid */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              মোট পরিশোধিত খরচ (Total Paid)
            </span>
            <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
          </div>
          <div className="my-2">
            <div className="font-headline-lg text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-200">
              ৳ {expenseData.totalPaid.toLocaleString()}
            </div>
            <p className="font-body-sm text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
              {expenseData.paidCount} টি আবেদনের ফি সফলভাবে পরিশোধিত
            </p>
          </div>
        </div>

        {/* Card 2: Total Pending / Unpaid */}
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              বকেয়া ফি (Pending / Unpaid)
            </span>
            <span className="material-symbols-outlined text-[20px] text-amber-600">pending</span>
          </div>
          <div className="my-2">
            <div className="font-headline-lg text-2xl md:text-3xl font-bold text-amber-900 dark:text-amber-200">
              ৳ {expenseData.totalPending.toLocaleString()}
            </div>
            <p className="font-body-sm text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 font-medium">
              {expenseData.pendingCount > 0 ? `${expenseData.pendingCount} টি আবেদনের ফি পরিশোধ বাকি` : 'সব ফি পরিশোধ করা হয়েছে'}
            </p>
          </div>
        </div>

        {/* Card 3: Total Application Budget */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs font-bold text-outline uppercase tracking-wider">
              সর্বমোট আবেদন বাজেট (Grand Total)
            </span>
            <span className="material-symbols-outlined text-[20px] text-primary">payments</span>
          </div>
          <div className="my-2">
            <div className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface">
              ৳ {expenseData.totalFee.toLocaleString()}
            </div>
            <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5 font-medium">
              পরিশোধিত + বকেয়া মিলিয়ে মোট খরচ
            </p>
          </div>
        </div>
      </div>

      {/* Visual Charts: Bar Chart per Application + Ratio Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Main Bar Chart: প্রতি আবেদনের ফি ও স্ট্যাটাস */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span>
              <span>প্রতি আবেদনে খরচ (Application Fees in Taka)</span>
            </h3>
            <span className="text-[11px] text-outline font-medium">
              পরিশোধিত (সবুজ) • বকেয়া (হলুদ)
            </span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseData.chartItems} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `৳${val}`}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="p-3 bg-surface-container-lowest rounded-xl shadow-lg border border-surface-container-high/50 text-xs space-y-1">
                          <p className="font-bold text-on-surface">{item.fullName || item.name}</p>
                          <p className="text-on-surface-variant">ধরন: {item.isGovt ? '🏛️ সরকারি চাকরি' : '💼 বেসরকারি চাকরি'}</p>
                          <p className="font-bold text-emerald-600">
                            আবেদন ফি: ৳{item.fee.toLocaleString()}
                          </p>
                          <p className={`font-semibold ${item.isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                            স্ট্যাটাস: {item.isPaid ? '✓ Paid (পরিশোধিত)' : '⏳ Unpaid / Pending'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="paidFee" name="পরিশোধিত ফি (Paid ৳)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pendingFee" name="বকেয়া ফি (Unpaid ৳)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Paid vs Unpaid Ratio */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/30 flex flex-col justify-between">
          <div>
            <h3 className="font-headline-sm text-sm font-bold text-on-surface mb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">pie_chart</span>
              <span>খরচ অনুপাত (Payment Ratio)</span>
            </h3>
            <p className="font-body-sm text-[11px] text-on-surface-variant">
              মোট বাজেটের কত শতাংশ পরিশোধ হয়েছে
            </p>
          </div>

          <div className="w-full h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData.pieBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {expenseData.pieBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`৳${value.toLocaleString()}`, 'পরিমাণ']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-surface-container-high/30 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>পরিশোধিত (Paid)</span>
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                {expenseData.totalFee > 0
                  ? `${((expenseData.totalPaid / expenseData.totalFee) * 100).toFixed(0)}%`
                  : '0%'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>বকেয়া (Pending)</span>
              </span>
              <span className="font-bold text-amber-700 dark:text-amber-300">
                {expenseData.totalFee > 0
                  ? `${((expenseData.totalPending / expenseData.totalFee) * 100).toFixed(0)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
