import { useState } from 'react';
import { Link } from 'react-router-dom';
import LiveCvBuilder from '../components/cv/LiveCvBuilder';
import { useAuth } from '../hooks/useAuth';

export default function CvBuilder() {
  const { userProfile, isVerified } = useAuth();
  const [activeView, setActiveView] = useState('both'); // 'both', 'editor', 'preview'

  return (
    <div id="cv-builder-page" className="space-y-space-md animate-in fade-in duration-200">
      {/* Top Banner Navigation & Status */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-xs border-b border-surface-container-high/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="text-outline hover:text-on-surface text-body-sm flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Settings</span>
            </Link>
            <span className="text-outline/40">•</span>
            <span className="font-label-sm text-outline uppercase tracking-wider">
              Live Interactive Document
            </span>
          </div>

          <div className="flex items-center gap-space-xs">
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
              Live CV Builder & Print Studio
            </h1>
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Verified Account
              </span>
            )}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            আপনার প্রোফাইল তথ্য দিয়ে লাইভ সিভি তৈরি করুন, রিয়েল-টাইম প্রিভিউ দেখুন এবং প্রফেশনাল A4
            ফরম্যাটে সেভ বা প্রিন্ট করুন।
          </p>
        </div>

        {/* View Toggle on smaller viewports */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Link
            to="/dashboard"
            className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-label-md transition-colors"
          >
            ড্যাশবোর্ড
          </Link>
          <Link
            to="/settings"
            className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-label-md transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
            <span>প্রোফাইল সেটিংস</span>
          </Link>
        </div>
      </div>

      {/* Embedded Live Builder Component */}
      <LiveCvBuilder />
    </div>
  );
}
