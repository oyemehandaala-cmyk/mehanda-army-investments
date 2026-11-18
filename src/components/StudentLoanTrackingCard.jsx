import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clipboard,
  Copy,
  LayoutDashboard,
  MessageSquare,
  Share2,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  TRACKING_STAGES,
  formatStageDateTime,
  formatFullDateTime,
  computeStageDetails,
} from '../lib/studentLoanTrackingHelper.js';
import CustomerDocumentsSection from './CustomerDocumentViewer.jsx';

export {
  TRACKING_STAGES,
  formatStageDateTime,
  formatFullDateTime,
  computeStageDetails,
};

export default function StudentLoanTrackingCard({
  application,
  onOpenMyEnquiries,
  onBack,
}) {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  if (!application) return null;

  const { activeIndex, stages, currentStatus, stageSubtext } = computeStageDetails(application);
  const trackingRef = application.trackingId || application.refNumber || '';

  const handleCopyTrackingId = async () => {
    try {
      await navigator.clipboard.writeText(trackingRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {}
  };

  const handleShareTracking = async () => {
    const shareUrl = `${window.location.origin}/?track=${encodeURIComponent(trackingRef)}`;
    const shareData = {
      title: `Student Loan Enquiry Tracking - ${trackingRef}`,
      text: `Track official student loan enquiry status for reference ${trackingRef} on Mehanda Army Investments.`,
      url: shareUrl,
    };

    try {
      if (typeof navigator.share === 'function' && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        setShareFeedback('Tracking link shared successfully!');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback('Safe tracking link copied to clipboard!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setShareFeedback('Safe tracking link copied to clipboard!');
        } catch (_) {
          setShareFeedback(`Tracking Reference: ${trackingRef}`);
        }
      }
    }

    setTimeout(() => setShareFeedback(''), 4000);
  };

  const handleMyEnquiriesClick = () => {
    if (typeof onOpenMyEnquiries === 'function') {
      onOpenMyEnquiries();
      return;
    }
    const myEnqSection = document.getElementById('my-submitted-enquiries');
    if (myEnqSection) {
      myEnqSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (typeof onBack === 'function') {
      onBack();
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 transition-all">
      {/* 1. TOP HEADER & REFERENCE */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#9b7a35]">
            <ShieldCheck size={14} />
            <span>Official Tracking Reference</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h3 className="font-mono text-2xl font-black text-[#10243B] sm:text-3xl tracking-tight">
              {trackingRef}
            </h3>
            <button
              type="button"
              onClick={handleCopyTrackingId}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
              title="Copy Tracking Reference"
              aria-label="Copy Tracking Reference"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide border shadow-sm ${
            activeIndex === 3
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            {currentStatus}
          </span>
          {application.updatedAt && (
            <p className="text-[11px] text-slate-400">
              Updated: {formatStageDateTime(application.updatedAt)}
            </p>
          )}
        </div>
      </div>

      {/* 2. CURRENT STATUS BANNER (ABOVE PROGRESS LINE) */}
      <div className="mt-6 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="relative mt-1 flex h-3.5 w-3.5 shrink-0">
              {activeIndex < 3 && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${
                activeIndex >= 3 ? 'bg-blue-600' : 'bg-emerald-600'
              }`}></span>
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current Status</p>
              <h4 className="text-base sm:text-lg font-black text-[#10243B]">
                {stages[activeIndex]?.label || currentStatus}
              </h4>
              <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                {stageSubtext}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white px-3.5 py-2 border border-slate-200/80 shadow-xs text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Stage Progress</span>
            <span className="text-sm font-extrabold text-[#10243B]">
              Step {activeIndex + 1} of 4
            </span>
          </div>
        </div>
      </div>

      {/* 3. HORIZONTAL TRACKING PROGRESS BAR (AMAZON / FLIPKART STYLE) */}
      <div className="my-8 px-1 sm:px-4">
        <div className="relative">
          {/* Horizontal Connecting Track Behind Nodes */}
          <div className="absolute top-5 sm:top-6 left-[12%] right-[12%] h-1 bg-slate-200 -translate-y-1/2 z-0">
            <div
              className="h-full bg-emerald-500 transition-all duration-700 ease-out rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, (activeIndex / (stages.length - 1)) * 100))}%`,
              }}
            />
          </div>

          {/* 4 Responsive Stage Nodes */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-4 relative z-10">
            {stages.map((stage, idx) => {
              const isDone = stage.state === 'completed';
              const isCurrent = stage.state === 'current';
              const isFuture = stage.state === 'future';

              return (
                <div key={stage.id} className="flex flex-col items-center text-center">
                  {/* Stage Circle */}
                  <div
                    className={`
                      w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300
                      ${isDone ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-4 ring-emerald-50' : ''}
                      ${isCurrent ? 'bg-white text-[#10243B] border-4 border-emerald-600 ring-4 ring-emerald-100 shadow-lg' : ''}
                      ${isFuture ? 'bg-white border-2 border-slate-300 text-slate-400' : ''}
                    `}
                  >
                    {isDone ? (
                      <Check size={18} strokeWidth={3} className="text-white" />
                    ) : isCurrent ? (
                      <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold text-slate-400">
                        {stage.stepNumber}
                      </span>
                    )}
                  </div>

                  {/* Stage Label */}
                  <p
                    className={`mt-2.5 text-[11px] sm:text-xs md:text-sm leading-tight transition-colors ${
                      isCurrent
                        ? 'font-extrabold text-[#10243B]'
                        : isDone
                          ? 'font-bold text-slate-800'
                          : 'font-medium text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </p>

                  {/* Date & Time below completed / current stages */}
                  {stage.date ? (
                    <p className="mt-1 text-[10px] sm:text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100/60 mt-1">
                      {formatStageDateTime(stage.date)}
                    </p>
                  ) : isFuture ? (
                    <p className="mt-1 text-[10px] sm:text-[11px] text-slate-400 italic">
                      Pending
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. OFFICIAL ADMIN REVIEW REMARK (IF ANY) */}
      {application.latestCustomerRemark && (
        <div className="mt-6 rounded-2xl bg-amber-50/70 p-4 sm:p-5 border border-amber-200/80">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
            <MessageSquare size={14} className="text-amber-700" />
            <span>Official Admin Review Remark</span>
          </div>
          <p className="mt-2 text-sm text-slate-800 leading-relaxed font-medium">
            {application.latestCustomerRemark}
          </p>
        </div>
      )}

      {/* 5. ENQUIRY SUMMARY GRID */}
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl bg-slate-50/80 p-4 sm:p-5 border border-slate-200 text-xs">
        <div>
          <dt className="text-slate-500 font-medium">Applicant Name</dt>
          <dd className="mt-1 font-bold text-slate-900 text-sm truncate">
            {application.applicantName || 'Student Applicant'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 font-medium">Enquiry Amount</dt>
          <dd className="mt-1 font-bold text-[#876A2E] text-sm">
            ₹{Number(application.loanAmount || 1000).toLocaleString('en-IN')}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 font-medium">Submission Date</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {formatFullDateTime(application.submittedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 font-medium">Institution / Course</dt>
          <dd className="mt-1 font-semibold text-slate-900 truncate" title={application.institutionName || 'Student Loan'}>
            {application.institutionName || application.courseName || 'Student Loan Enquiry'}
          </dd>
        </div>
      </dl>

      {/* 5.1 ATTACHED VERIFICATION DOCUMENTS (IMAGES & PDFS) */}
      <CustomerDocumentsSection
        documents={application.documents}
        singleDoc={application.document || application.documentMetadata}
        title="Attached Verification Documents"
        subtitle="Verification proofs submitted with this enquiry (Images & PDFs)."
      />

      {/* 6. STATUS HISTORY ACCORDION */}
      {application.statusHistory?.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="w-full flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100 transition text-left text-xs font-bold text-[#10243B]"
          >
            <span className="flex items-center gap-2">
              <Clock size={14} className="text-[#876A2E]" />
              <span>Audit History ({application.statusHistory.length} Updates)</span>
            </span>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showHistory && (
            <div className="p-4 bg-white border-t border-slate-200">
              <ol className="space-y-3.5 border-l-2 border-slate-200 pl-4">
                {application.statusHistory.map((entry, index) => (
                  <li key={`${entry.createdAt || entry.created_at}-${index}`} className="relative text-xs">
                    <span className="absolute -left-[1.38rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#9b7a35]" />
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <p className="font-extrabold text-slate-900 text-sm">
                        {entry.status || entry.new_status}
                      </p>
                      <time className="text-[11px] text-slate-400 font-medium">
                        {formatFullDateTime(entry.createdAt || entry.created_at)}
                      </time>
                    </div>
                    {entry.previousStatus && (
                      <p className="text-[11px] text-slate-500">
                        Previous: {entry.previousStatus}
                      </p>
                    )}
                    {entry.customerRemark && (
                      <p className="mt-1.5 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs leading-relaxed">
                        {entry.customerRemark}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* 7. OFFICIAL STATUTORY DISCLAIMER */}
      <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-amber-50/70 p-3.5 text-xs leading-relaxed text-amber-950 border border-amber-200/70">
        <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
        <p>
          <strong>Official Notice:</strong> This tracking reference confirms an enquiry record only. It is not an approved loan or disbursement. Final eligibility and processing remain subject to institutional verification and regulatory approvals.
        </p>
      </div>

      {/* 8. TWO BOTTOM ACTION BUTTONS (AMAZON / FLIPKART STYLE) */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* BUTTON 1 — SHARE TRACKING */}
          <button
            type="button"
            onClick={handleShareTracking}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-[#10243B] bg-white px-3 sm:px-4 py-3 text-xs sm:text-sm font-extrabold text-[#10243B] shadow-xs transition-all hover:bg-slate-50 hover:border-[#183454] active:scale-[0.98]"
            aria-label="Share Tracking Reference"
          >
            <Share2 size={17} className="text-[#876A2E] shrink-0" />
            <span className="truncate">Share Tracking</span>
          </button>

          {/* BUTTON 2 — MY ENQUIRIES */}
          <button
            type="button"
            onClick={handleMyEnquiriesClick}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#10243B] px-3 sm:px-4 py-3 text-xs sm:text-sm font-extrabold text-white shadow-md transition-all hover:bg-[#183454] active:scale-[0.98]"
            aria-label="View My Enquiries"
          >
            <LayoutDashboard size={17} className="text-[#D5C292] shrink-0" />
            <span className="truncate">My Enquiries</span>
          </button>
        </div>

        {/* Feedback Alert for Share Tracking */}
        {shareFeedback && (
          <div
            role="status"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-800 animate-fadeIn"
          >
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>{shareFeedback}</span>
          </div>
        )}
      </div>
    </section>
  );
}
