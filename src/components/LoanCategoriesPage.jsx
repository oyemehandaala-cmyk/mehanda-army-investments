import React, { useState } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Milk,
  Wheat,
  Sprout,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Search,
  Share2,
  MessageSquare,
  X,
} from 'lucide-react';
import { LOAN_CATEGORIES, trackLoanByTrackingId } from '../lib/loanService';
import { computeStageDetails, formatStageDateTime } from '../lib/studentLoanTrackingHelper';
import BrandVerificationBadge from './BrandVerificationBadge';
import AgricultureLoanFormModal from './AgricultureLoanFormModal';
import CustomerDocumentsSection from './CustomerDocumentViewer';

export default function LoanCategoriesPage({
  user,
  allApplications = [],
  applicationsLoading = false,
  onRefreshApplications,
  onSelectStudentLoan,
  onBack,
  initialSelectedApp = null,
}) {
  const [selectedAgricultureCategory, setSelectedAgricultureCategory] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [detailModalApp, setDetailModalApp] = useState(initialSelectedApp || null);
  const [trackingSearchQuery, setTrackingSearchQuery] = useState('');
  const [trackingSearchError, setTrackingSearchError] = useState('');
  const [isSearchingTracking, setIsSearchingTracking] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  React.useEffect(() => {
    if (initialSelectedApp) {
      setDetailModalApp(initialSelectedApp);
    }
  }, [initialSelectedApp]);

  const handleCopy = (id) => {
    if (!id) return;
    navigator.clipboard?.writeText?.(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSearchTracking = async (e) => {
    e?.preventDefault?.();
    setTrackingSearchError('');
    const query = trackingSearchQuery.trim().toUpperCase();
    if (!query) {
      setTrackingSearchError('Please enter an application Tracking ID to track status.');
      return;
    }

    setIsSearchingTracking(true);
    try {
      const match = await trackLoanByTrackingId(query, allApplications);
      setDetailModalApp(match);
    } catch (err) {
      setTrackingSearchError(err.message || 'Tracking ID not found.');
    } finally {
      setIsSearchingTracking(false);
    }
  };

  const handleShareTracking = (app) => {
    const tid = app?.trackingId || app?.tracking_id || app?.reference || '';
    if (!tid) return;
    const url = `${window.location.origin}/?track=${encodeURIComponent(tid)}`;
    navigator.clipboard?.writeText?.(url);
    setShareFeedback('Tracking link copied to clipboard!');
    setTimeout(() => setShareFeedback(''), 3000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
      case 'Completed':
      case 'Enquiry Completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Under Review':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Rejected':
      case 'Closed':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Pending':
      case 'Additional Information Required':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'student_loan':
        return <GraduationCap size={20} className="text-[#876A2E]" />;
      case 'dairy_loan':
        return <Milk size={20} className="text-sky-600" />;
      case 'sheep_loan':
        return <Wheat size={20} className="text-emerald-600" />;
      case 'goat_loan':
        return <Sprout size={20} className="text-amber-600" />;
      default:
        return <FileText size={20} className="text-slate-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      
      {/* Top Header Navigation */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#10243B] transition"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-[#10243B] tracking-wide">MEHANDA ARMY</span>
            <span className="text-[10px] font-bold text-[#876A2E] uppercase">Loan Portal</span>
            <BrandVerificationBadge className="h-4 w-4" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        
        {/* Banner Section */}
        <div className="rounded-3xl bg-[#10243B] p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#876A2E]/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#D5C292] border border-[#D5C292]/30 mb-3">
              Official Loan Facilitation Desk
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Four Specialized Loan Categories
            </h1>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-300">
              Select your required financial facility below. Whether advancing your education or expanding your livestock and dairy farming, our dedicated desk ensures seamless digital submission and transparent tracking.
            </p>
          </div>
        </div>

        {/* 4 LOAN CATEGORY CARDS */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* CARD 1: Student Loan */}
          <div className="flex flex-col justify-between rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F6F2E8] text-[#876A2E]">
                  <GraduationCap size={26} />
                </span>
                <span className="rounded-full bg-[#F6F2E8] px-2.5 py-1 text-[10px] font-bold text-[#725522] border border-[#D5C292]/50">
                  Education
                </span>
              </div>
              <h2 className="mt-5 text-xl font-extrabold text-[#10243B]">Student Loan</h2>
              <div className="mt-2 text-sm font-extrabold text-[#876A2E]">
                Range: ₹100 – ₹1,000
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Fast institutional verification assistance for enrolled students. Transparent tracking with 4-stage review process.
              </p>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Enrolled student identity verification</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Zero collateral requirement</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Digital tracking ID assigned instantly</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onSelectStudentLoan || (() => setSelectedAgricultureCategory('student_loan'))}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#10243B] px-4 py-3 text-xs font-bold text-white hover:bg-[#183454] transition shadow-sm"
              >
                Apply Now <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* CARD 2: Dairy Loan */}
          <div className="flex flex-col justify-between rounded-3xl border border-sky-200/80 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                  <Milk size={26} />
                </span>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 border border-sky-200">
                  Dairy Farming
                </span>
              </div>
              <h2 className="mt-5 text-xl font-extrabold text-[#10243B]">Dairy Loan</h2>
              <div className="mt-2 text-sm font-extrabold text-sky-700">
                Range: ₹2,00,000 – ₹50,00,000
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Financial assistance for high-yield milch cows/buffaloes, modern cattle sheds, milking equipment & cooperative setups.
              </p>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Min ₹2,00,000 to Max ₹50,00,000</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Covers cattle, shed & bulk milk coolers</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Flexible tenure & structured repayment</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedAgricultureCategory('dairy_loan')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3 text-xs font-bold text-white hover:bg-sky-800 transition shadow-sm"
              >
                Apply Now <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* CARD 3: Sheep Loan */}
          <div className="flex flex-col justify-between rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Wheat size={26} />
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  Sheep Farming
                </span>
              </div>
              <h2 className="mt-5 text-xl font-extrabold text-[#10243B]">Sheep Loan</h2>
              <div className="mt-2 text-sm font-extrabold text-emerald-700">
                Max Amount: ₹2,00,000
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Support for procuring quality breeding sheep flocks, protective shelters, perimeter fencing, and fodder cultivation.
              </p>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Maximum loan up to ₹2,00,000</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Breeding rams & ewes procurement</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Prompt rural field verification</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedAgricultureCategory('sheep_loan')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-sm"
              >
                Apply Now <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* CARD 4: Goat Loan */}
          <div className="flex flex-col justify-between rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                  <Sprout size={26} />
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 border border-amber-200">
                  Goat Rearing
                </span>
              </div>
              <h2 className="mt-5 text-xl font-extrabold text-[#10243B]">Goat Loan</h2>
              <div className="mt-2 text-sm font-extrabold text-amber-700">
                Max Amount: ₹2,00,000
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Dedicated credit for stall-fed goat rearing (Beetal/Sirohi/Barbari), slatted shed flooring, and feed storage.
              </p>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Maximum loan up to ₹2,00,000</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>High-grade doe & buck breeding stock</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Stall-fed & semi-intensive infrastructure</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedAgricultureCategory('goat_loan')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-xs font-bold text-white hover:bg-amber-800 transition shadow-sm"
              >
                Apply Now <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* APPLICATION TRACKING SECTION */}
        <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {/* Unified Tracking Search Box */}
          <div className="mb-8 rounded-2xl border border-[#876A2E]/20 bg-gradient-to-r from-amber-50/40 via-white to-slate-50 p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#876A2E]/10 text-[#876A2E]">
                  <Search size={16} />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#10243B]">
                    Universal Application Tracking
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Track any Student, Dairy, Sheep, or Goat loan application live using your Tracking ID.
                  </p>
                </div>
              </div>
              {shareFeedback && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {shareFeedback}
                </span>
              )}
            </div>

            <form onSubmit={handleSearchTracking} className="mt-4 flex flex-wrap gap-2.5">
              <div className="relative flex-1 min-w-[260px]">
                <input
                  type="text"
                  value={trackingSearchQuery}
                  onChange={(e) => {
                    setTrackingSearchQuery(e.target.value);
                    setTrackingSearchError('');
                  }}
                  placeholder=""
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-mono font-bold text-[#10243B] uppercase tracking-wide focus:border-[#876A2E] focus:outline-none"
                />
                {trackingSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setTrackingSearchQuery('');
                      setTrackingSearchError('');
                    }}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearchingTracking || !trackingSearchQuery.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#183454] transition shadow-sm disabled:opacity-50"
              >
                {isSearchingTracking ? <Clock size={14} className="animate-spin" /> : <Search size={14} />}
                <span>{isSearchingTracking ? 'Searching…' : 'Track Status'}</span>
              </button>
            </form>

            {trackingSearchError && (
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                <AlertCircle size={14} />
                <span>{trackingSearchError}</span>
              </div>
            )}

            {allApplications.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400">Your Recent Applications:</span>
                {allApplications.slice(0, 5).map((app) => {
                  const tid = app.trackingId || app.tracking_id || app.reference;
                  if (!tid) return null;
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => {
                        setTrackingSearchQuery(tid);
                        setDetailModalApp(app);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-mono font-bold text-slate-700 hover:border-[#876A2E] hover:text-[#10243B] transition"
                    >
                      <span>{tid}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* List Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-[#10243B]">My Submitted Applications</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {allApplications.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Live status of your Student, Dairy, Sheep, and Goat loan enquiries.</p>
            </div>
            <button
              type="button"
              onClick={onRefreshApplications}
              disabled={applicationsLoading}
              className="text-xs font-bold text-[#876A2E] hover:underline disabled:opacity-50"
            >
              {applicationsLoading ? 'Refreshing…' : '↻ Refresh Records'}
            </button>
          </div>

          {applicationsLoading && allApplications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading your loan records…</div>
          ) : allApplications.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No loan applications submitted yet.</p>
              <p className="text-xs text-slate-400 mt-1">Choose any category above to apply for verification.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {allApplications.map((app) => (
                <div
                  key={app.id || app.reference || app.trackingId}
                  className="flex flex-wrap items-center justify-between gap-4 py-4 hover:bg-slate-50/60 rounded-xl px-2 transition"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-slate-100">
                      {getCategoryIcon(app.loanCategory || app.loan_category)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{app.categoryLabel || 'Loan Application'}</span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(app.status)}`}>
                          {app.status || 'Submitted'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-bold text-slate-800">{app.trackingId || app.tracking_id}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(app.trackingId || app.tracking_id)}
                          className="text-slate-400 hover:text-slate-700"
                          title="Copy Tracking ID"
                        >
                          {copiedId === (app.trackingId || app.tracking_id) ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                        <span>·</span>
                        <span>Amount: <strong>₹{Number(app.loanAmount || app.loan_amount || 0).toLocaleString('en-IN')}</strong></span>
                        <span>·</span>
                        <span>Submitted: {new Date(app.submittedAt || app.submitted_at || Date.now()).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailModalApp(app)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#10243B] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#183454] transition shadow-xs"
                    >
                      <Clock size={13} /> Track Live Progress
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* REGULATORY DISCLAIMER */}
        <div className="mt-10 rounded-2xl bg-amber-50/70 border border-amber-200/80 p-5 text-xs text-amber-900 leading-relaxed">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">Statutory & Regulatory Facilitation Notice</p>
              <p className="mt-1 text-amber-900">
                <strong>Mehanda Army Investments</strong> functions strictly as a financial consultancy, lead referral desk, and digital loan facilitation intermediary (DSA model). We are <strong>not a Bank or NBFC</strong> and do not provide direct credit or disburse loans from our own funds. Submitting an application on this platform does not constitute a guaranteed loan sanction, instantaneous disbursement promise, or binding credit contract. Final approval, loan quantum, interest rates, and disbursement terms are solely subject to applicant eligibility, KYC verification, credit assessment, and the prevailing lending criteria of partner financial institutions and authorized RBI-registered lenders.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Agriculture / Student Loan 4-Step Form Modal */}
      {selectedAgricultureCategory && (
        <AgricultureLoanFormModal
          isOpen={Boolean(selectedAgricultureCategory)}
          category={selectedAgricultureCategory}
          user={user}
          onClose={() => setSelectedAgricultureCategory(null)}
          onApplicationSubmitted={() => {
            onRefreshApplications?.();
          }}
        />
      )}

      {/* Comprehensive 4-Stage Application Progress Tracking Modal */}
      {detailModalApp && (() => {
        const stageInfo = computeStageDetails(detailModalApp);
        const { activeIndex, stages, currentStatus, stageSubtext } = stageInfo;
        const trackingRef = detailModalApp.trackingId || detailModalApp.tracking_id || detailModalApp.reference || '';
        const categoryKey = detailModalApp.loanCategory || detailModalApp.loan_category || 'dairy_loan';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 my-6 max-h-[92vh] overflow-y-auto">
              
              {/* Modal Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl bg-slate-100">
                    {getCategoryIcon(categoryKey)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-[#10243B]">
                        {detailModalApp.categoryLabel || 'Loan Application'}
                      </h3>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(currentStatus)}`}>
                        {currentStatus}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800">{trackingRef}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(trackingRef)}
                        className="text-slate-400 hover:text-slate-700"
                        title="Copy Tracking ID"
                      >
                        {copiedId === trackingRef ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleShareTracking(detailModalApp)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    title="Share safe tracking reference"
                  >
                    <Share2 size={13} />
                    <span>Share</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailModalApp(null)}
                    className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              <div className="mt-5 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="relative mt-1 flex h-3 w-3 shrink-0">
                      {activeIndex < 3 && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex h-3 w-3 rounded-full ${
                        activeIndex >= 3 ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}></span>
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Live Stage</p>
                      <h4 className="text-sm font-black text-[#10243B]">
                        {stages[activeIndex]?.label || currentStatus}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {stageSubtext}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white px-3 py-1.5 border border-slate-200/80 text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Progress</span>
                    <span className="text-xs font-extrabold text-[#10243B]">
                      Step {activeIndex + 1} of 4
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-Stage Horizontal Progress Timeline */}
              <div className="my-7 px-2">
                <div className="relative">
                  <div className="absolute top-5 left-[12%] right-[12%] h-1 bg-slate-200 -translate-y-1/2 z-0">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-700 ease-out rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, (activeIndex / (stages.length - 1)) * 100))}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1 relative z-10">
                    {stages.map((stage) => {
                      const isDone = stage.state === 'completed';
                      const isCurrent = stage.state === 'current';
                      const isFuture = stage.state === 'future';

                      return (
                        <div key={stage.id} className="flex flex-col items-center text-center">
                          <div
                            className={`
                              w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300
                              ${isDone ? 'bg-emerald-600 text-white shadow-md ring-4 ring-emerald-50' : ''}
                              ${isCurrent ? 'bg-white text-[#10243B] border-4 border-emerald-600 ring-4 ring-emerald-100 shadow-sm' : ''}
                              ${isFuture ? 'bg-white border-2 border-slate-300 text-slate-400' : ''}
                            `}
                          >
                            {isDone ? (
                              <Check size={16} strokeWidth={3} className="text-white" />
                            ) : isCurrent ? (
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            ) : (
                              <span className="text-xs font-bold text-slate-400">
                                {stage.stepNumber}
                              </span>
                            )}
                          </div>

                          <p
                            className={`mt-2 text-[10px] sm:text-[11px] leading-tight transition-colors ${
                              isCurrent
                                ? 'font-extrabold text-[#10243B]'
                                : isDone
                                  ? 'font-bold text-slate-800'
                                  : 'font-medium text-slate-400'
                            }`}
                          >
                            {stage.label}
                          </p>

                          {stage.date ? (
                            <p className="mt-1 text-[9px] sm:text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/60">
                              {formatStageDateTime(stage.date)}
                            </p>
                          ) : isFuture ? (
                            <p className="mt-1 text-[9px] text-slate-400 italic">Pending</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Admin Remark Box */}
              {(detailModalApp.adminNotes || detailModalApp.latestCustomerRemark) && (
                <div className="mb-4 rounded-2xl bg-amber-50/80 p-4 border border-amber-200/80 text-xs">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-900 mb-1">
                    <MessageSquare size={14} className="text-amber-700" />
                    <span>Official Review Remark</span>
                  </div>
                  <p className="text-slate-800 font-medium leading-relaxed">
                    {detailModalApp.adminNotes || detailModalApp.latestCustomerRemark}
                  </p>
                </div>
              )}

              {/* Application Details Grid */}
              <div className="space-y-3 text-xs text-slate-700">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="block text-[11px] text-slate-500">Requested Amount</span>
                    <span className="text-sm font-extrabold text-[#10243B]">
                      ₹{Number(detailModalApp.loanAmount || detailModalApp.loan_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="block text-[11px] text-slate-500">Submission Date</span>
                    <span className="text-xs font-bold text-slate-900">
                      {new Date(detailModalApp.submittedAt || detailModalApp.submitted_at || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Applicant Name:</span>
                    <span className="font-bold text-slate-900">{detailModalApp.applicantName || detailModalApp.applicant_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contact Number:</span>
                    <span className="font-medium">{detailModalApp.applicantPhone || detailModalApp.applicant_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email Address:</span>
                    <span className="font-medium">{detailModalApp.applicantEmail || detailModalApp.applicant_email}</span>
                  </div>
                  {detailModalApp.loanPurpose && (
                    <div className="pt-1 border-t border-slate-200/60 mt-1">
                      <span className="text-slate-500 block">Stated Purpose:</span>
                      <span className="font-semibold text-slate-900">{detailModalApp.loanPurpose}</span>
                    </div>
                  )}
                </div>

                {/* Educational or Farming Details */}
                {detailModalApp.farmingDetails && Object.keys(detailModalApp.farmingDetails).length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="block text-slate-600 font-bold mb-1.5">
                      {categoryKey === 'student_loan' ? 'Academic Information:' : 'Farming Specifications:'}
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {detailModalApp.farmingDetails.institutionName && (
                        <p><strong>Institution:</strong> {detailModalApp.farmingDetails.institutionName}</p>
                      )}
                      {detailModalApp.farmingDetails.courseName && (
                        <p><strong>Course:</strong> {detailModalApp.farmingDetails.courseName}</p>
                      )}
                      {detailModalApp.farmingDetails.qualification && (
                        <p><strong>Qualification:</strong> {detailModalApp.farmingDetails.qualification}</p>
                      )}
                      {detailModalApp.farmingDetails.rollNumber && (
                        <p><strong>Roll No:</strong> {detailModalApp.farmingDetails.rollNumber}</p>
                      )}
                      {detailModalApp.farmingDetails.currentLivestockCount !== undefined && categoryKey !== 'student_loan' && (
                        <p><strong>Owned Animals:</strong> {detailModalApp.farmingDetails.currentLivestockCount}</p>
                      )}
                      {detailModalApp.farmingDetails.proposedLivestockCount !== undefined && categoryKey !== 'student_loan' && (
                        <p><strong>Proposed Animals:</strong> {detailModalApp.farmingDetails.proposedLivestockCount}</p>
                      )}
                      {detailModalApp.farmingDetails.landArea && categoryKey !== 'student_loan' && (
                        <p><strong>Land Area:</strong> {detailModalApp.farmingDetails.landArea}</p>
                      )}
                      {detailModalApp.farmingDetails.dailyMilkYieldLiters && (
                        <p><strong>Milk Yield:</strong> {detailModalApp.farmingDetails.dailyMilkYieldLiters} L/day</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Attached Application Documents (Images & PDFs) */}
                <CustomerDocumentsSection
                  documents={detailModalApp.documents}
                  singleDoc={detailModalApp.document || detailModalApp.documentMetadata}
                  title="Uploaded Application Documents"
                  subtitle="Official verification proofs attached to this loan enquiry (Images & PDFs)."
                />
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => handleCopy(trackingRef)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#876A2E] hover:underline"
                >
                  <Copy size={13} /> Copy Tracking Reference
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalApp(null)}
                  className="rounded-xl bg-[#10243B] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#183454] transition shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

