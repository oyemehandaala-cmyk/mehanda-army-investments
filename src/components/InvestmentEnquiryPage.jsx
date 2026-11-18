import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Loader2,
  MapPin,
  TrendingUp,
  User,
  Calendar,
  Phone,
  Mail,
  Home,
  Check,
  AlertCircle,
  FileCheck,
  Edit2,
  ShieldCheck,
  HelpCircle,
  Clock,
  Compass,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Upload,
  FileText,
  Lock,
} from 'lucide-react';
import INDIA_LOCATION_DATA from '../data/indiaLocations.json';
import {
  submitInvestmentEnquiry,
  uploadInvestmentDocument,
  removeInvestmentDocument,
  createSyntheticSampleFile,
  MAX_TEST_DOCUMENT_SIZE,
  INVESTMENT_AMOUNT_RANGES,
  INVESTMENT_DURATIONS,
  INVESTMENT_INTEREST_CATEGORIES,
  INVESTMENT_OBJECTIVES,
  CUSTOMER_EXPECTATIONS,
  RISK_UNDERSTANDING_OPTIONS,
  KNOWLEDGE_LEVEL_OPTIONS,
  INVESTMENT_GOALS_OPTIONS,
} from '../lib/investmentEnquiryService';
import EmailOtpVerification from './EmailOtpVerification.jsx';

const FIELD_CLASS = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#876A2E] focus:ring-2 focus:ring-[#876A2E]/15 disabled:bg-slate-100';
const LABEL_CLASS = 'block text-sm font-semibold text-slate-800';
const getFieldClass = (hasError) =>
  `${FIELD_CLASS} ${hasError ? 'border-red-500 ring-2 ring-red-200 bg-red-50/20 text-red-950 focus:border-red-500 focus:ring-red-200' : ''}`;

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return '';
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  if (!year || !month || !day) return '';
  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) {
    age -= 1;
  }
  return age >= 0 ? age : '';
}

function Field({ label, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className={LABEL_CLASS}>
        {label}
        {children}
      </label>
      {hint && <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
          <AlertCircle size={13} className="shrink-0 text-red-600" />
          {error}
        </p>
      )}
    </div>
  );
}

function formatStatusDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function InvestmentEnquiryPage({
  user,
  enquiries = [],
  enquiriesLoading = false,
  enquiriesError = '',
  onRefreshEnquiries,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState('application'); // 'application' | 'tracking' | 'success'
  const [step, setStep] = useState(1); // 1 to 5

  const [form, setForm] = useState(() => ({
    // Step 1: Personal Details
    fullName: user?.fullName || '',
    dateOfBirth: '',
    mobileNumber: user?.phone || '',
    email: user?.email || '',
    state: '',
    district: '',
    city: '',
    address: '',
    pinCode: '',

    // Step 2: Investment Preferences
    interestCategory: '',
    investmentObjective: '',
    plannedAmountBracket: '',
    investmentHorizon: '',
    customerExpectations: '',
    additionalQuestions: '',

    // Step 3: Suitability & Risk Understanding
    riskUnderstanding: '',
    knowledgeLevel: '',
    investmentGoals: '',
    riskAcknowledged: false,

    // Step 4: Mandatory Document Verification
    documents: {
      investorProof: null,
      investorSignature: null,
    },

    // Step 6: Consents & Declarations
    accuracyConsent: false,
    privacyConsent: false,
    nonBindingConsent: false,
  }));

  const [fieldErrors, setFieldErrors] = useState({});
  const [emailVerification, setEmailVerification] = useState(() => ({
    isVerified: false,
    verifiedEmail: '',
    verifiedAt: null,
    token: '',
  }));
  const [slotProgress, setSlotProgress] = useState({});
  const [slotUploading, setSlotUploading] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savedEnquiry, setSavedEnquiry] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');

  // Tracking lookup state
  const [trackingIdSearch, setTrackingIdSearch] = useState('');
  const [trackedEnquiry, setTrackedEnquiry] = useState(null);
  const [trackingSearchError, setTrackingSearchError] = useState('');

  // Location handling
  const availableDistricts = useMemo(() => {
    if (!form.state) return [];
    const foundState = INDIA_LOCATION_DATA.states.find((s) => s.name === form.state);
    return foundState ? foundState.districts : [];
  }, [form.state]);

  const calculatedAge = useMemo(() => calculateAge(form.dateOfBirth), [form.dateOfBirth]);
  const isAdult = typeof calculatedAge === 'number' && calculatedAge >= 18;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const errors = {};
    if (!form.fullName || form.fullName.trim().length < 3) {
      errors.fullName = 'Enter your legal full name (at least 3 characters).';
    }
    if (!form.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required.';
    } else if (typeof calculatedAge === 'number' && calculatedAge < 18) {
      errors.dateOfBirth = 'Only legally eligible adults (18 years or older) may submit investment enquiries.';
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Enter a valid registered email address.';
    } else if (
      !emailVerification.isVerified ||
      !emailVerification.verifiedEmail ||
      emailVerification.verifiedEmail.toLowerCase() !== form.email.trim().toLowerCase()
    ) {
      errors.email = 'Please verify your Gmail / email address with OTP before proceeding.';
    }
    if (!form.mobileNumber || !/^(?:\+91[- ]?)?[6-9]\d{9}$/.test(form.mobileNumber.trim())) {
      errors.mobileNumber = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!form.state) {
      errors.state = 'Select your State or Union Territory.';
    }
    if (!form.district) {
      errors.district = 'Select your District.';
    }
    if (!form.city || form.city.trim().length < 2) {
      errors.city = 'Enter your City or Town.';
    }
    if (!form.address || form.address.trim().length < 5) {
      errors.address = 'Enter your complete residential address (at least 5 characters).';
    }
    if (!form.pinCode || !/^\d{6}$/.test(form.pinCode.trim())) {
      errors.pinCode = 'Enter a valid 6-digit postal PIN code.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errors = {};
    if (!form.interestCategory) {
      errors.interestCategory = 'Select an investment interest category.';
    }
    if (!form.investmentObjective) {
      errors.investmentObjective = 'Select your primary investment objective.';
    }
    if (!form.plannedAmountBracket) {
      errors.plannedAmountBracket = 'Select a preferred investment amount bracket.';
    }
    if (!form.investmentHorizon) {
      errors.investmentHorizon = 'Select your preferred investment duration / horizon.';
    }
    if (!form.customerExpectations) {
      errors.customerExpectations = 'Select your primary expectation from this consultation.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const errors = {};
    if (!form.riskUnderstanding) {
      errors.riskUnderstanding = 'Select your general risk tolerance understanding.';
    }
    if (!form.knowledgeLevel) {
      errors.knowledgeLevel = 'Select your investment knowledge level.';
    }
    if (!form.investmentGoals) {
      errors.investmentGoals = 'Select your primary investment goal.';
    }
    if (!form.riskAcknowledged) {
      errors.riskAcknowledged = 'You must acknowledge the market volatility and risk disclosure to proceed.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 4 Validation: Mandatory Document Checklist
  const validateStep4 = () => {
    const errors = {};
    if (!form.documents.investorProof?.confirmed) {
      errors.investorProof = 'Investor verification document is required. Please upload or attach a sample verification document.';
    }
    if (!form.documents.investorSignature?.confirmed) {
      errors.investorSignature = 'Investor specimen signature / consultation authorization is required. Please upload or attach a sample verification file.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 6 Validation: Consents & Declarations
  const validateStep6 = () => {
    const errors = {};
    if (!form.accuracyConsent) {
      errors.accuracyConsent = 'You must confirm that entered information is accurate.';
    }
    if (!form.privacyConsent) {
      errors.privacyConsent = 'You must accept the Privacy Policy to proceed.';
    }
    if (!form.nonBindingConsent) {
      errors.nonBindingConsent = 'You must confirm your understanding that this is an enquiry only.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Document upload handler for Investment Enquiry
  const handleUploadFile = async (slotKey, file) => {
    if (!file) return;
    setFieldErrors((current) => ({ ...current, [slotKey]: '' }));

    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const hasValidMime = validMimes.includes(file.type);

    if (!hasValidExt && !hasValidMime) {
      setFieldErrors((current) => ({
        ...current,
        [slotKey]: 'Format validation failed: Only JPG, JPEG, PNG, and PDF files are accepted.',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((current) => ({
        ...current,
        [slotKey]: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 5 MB.`,
      }));
      return;
    }

    setSlotUploading((prev) => ({ ...prev, [slotKey]: true }));
    setSlotProgress((prev) => ({ ...prev, [slotKey]: 15 }));

    try {
      const doc = await uploadInvestmentDocument(file, (pct) => {
        setSlotProgress((prev) => ({ ...prev, [slotKey]: Math.max(pct, 20) }));
      });
      setForm((current) => ({
        ...current,
        documents: {
          ...current.documents,
          [slotKey]: {
            path: doc.path,
            name: doc.fileName,
            fileName: doc.fileName,
            contentType: doc.contentType,
            size: doc.size,
            confirmed: true,
          },
        },
      }));
      setFieldErrors((current) => ({ ...current, [slotKey]: '' }));
    } catch (err) {
      setFieldErrors((current) => ({
        ...current,
        [slotKey]: err.message || 'The verification document upload could not be completed.',
      }));
    } finally {
      setSlotUploading((prev) => ({ ...prev, [slotKey]: false }));
    }
  };

  const handleDocumentSlot = (slotKey, event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadFile(slotKey, file);
    }
  };

  const removeDocumentSlot = async (slotKey) => {
    const existing = form.documents[slotKey];
    if (existing?.path) {
      try {
        await removeInvestmentDocument(existing.path);
      } catch (err) {
        console.warn('Could not remove file from storage:', err);
      }
    }
    setForm((current) => ({
      ...current,
      documents: {
        ...current.documents,
        [slotKey]: null,
      },
    }));
    setSlotProgress((prev) => ({ ...prev, [slotKey]: 0 }));
    setFieldErrors((current) => ({ ...current, [slotKey]: '' }));
  };

  const handleNext = () => {
    setSubmitError('');
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step === 4 && !validateStep4()) return;
    if (step === 5 && (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4())) return;
    setStep((prev) => Math.min(prev + 1, 6));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevious = () => {
    setSubmitError('');
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4() || !validateStep6()) {
      return;
    }
    if (!emailVerification.isVerified || !emailVerification.verifiedEmail || emailVerification.verifiedEmail.toLowerCase() !== form.email.trim().toLowerCase()) {
      setSubmitError('Please verify your Gmail / email address with OTP before submitting.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.mobileNumber.trim(),
        dateOfBirth: form.dateOfBirth,
        age: calculatedAge,
        address: form.address.trim(),
        state: form.state,
        district: form.district,
        city: form.city.trim(),
        pinCode: form.pinCode.trim(),
        interestCategory: form.interestCategory,
        investmentObjective: form.investmentObjective,
        plannedAmountBracket: form.plannedAmountBracket,
        investmentHorizon: form.investmentHorizon,
        customerExpectations: form.customerExpectations,
        message: form.additionalQuestions.trim() || null,
        riskUnderstanding: form.riskUnderstanding,
        knowledgeLevel: form.knowledgeLevel,
        investmentGoals: form.investmentGoals,
        riskAcknowledged: form.riskAcknowledged,
        privacyConsent: form.privacyConsent,
        documents: form.documents,
        emailVerificationToken: emailVerification.token || undefined,
        verifiedEmail: emailVerification.verifiedEmail || undefined,
        emailVerifiedAt: emailVerification.verifiedAt || undefined,
      };

      const result = await submitInvestmentEnquiry(payload);
      if (!result?.enquiryId) {
        throw new Error('Database did not return a confirmed enquiry ID. Please retry.');
      }

      setSavedEnquiry({
        id: result.enquiryId,
        trackingId: result.trackingId || result.enquiryId,
        status: 'Submitted',
        submittedAt: new Date().toISOString(),
      });

      setActiveTab('success');
      await onRefreshEnquiries?.();
    } catch (error) {
      setSubmitError(error.message || 'The enquiry could not be saved. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyTrackingId = async () => {
    if (!savedEnquiry?.trackingId) return;
    try {
      await navigator.clipboard.writeText(savedEnquiry.trackingId);
      setCopyMessage('Reference copied to clipboard!');
      setTimeout(() => setCopyMessage(''), 3000);
    } catch {
      setCopyMessage(`Reference: ${savedEnquiry.trackingId}`);
    }
  };

  const startNewEnquiry = () => {
    setSavedEnquiry(null);
    setStep(1);
    setActiveTab('application');
    setFieldErrors({});
    setSubmitError('');
    setSlotProgress({});
    setSlotUploading({});
    setForm({
      fullName: user?.fullName || '',
      dateOfBirth: '',
      mobileNumber: user?.phone || '',
      email: user?.email || '',
      state: '',
      district: '',
      city: '',
      address: '',
      pinCode: '',
      interestCategory: '',
      investmentObjective: '',
      plannedAmountBracket: '',
      investmentHorizon: '',
      customerExpectations: '',
      additionalQuestions: '',
      riskUnderstanding: '',
      knowledgeLevel: '',
      investmentGoals: '',
      riskAcknowledged: false,
      documents: {
        investorProof: null,
        investorSignature: null,
      },
      accuracyConsent: false,
      privacyConsent: false,
      nonBindingConsent: false,
    });
  };

  const handleTrackSearch = (e) => {
    e.preventDefault();
    setTrackingSearchError('');
    const query = trackingIdSearch.trim().toUpperCase();
    if (!query) {
      setTrackingSearchError('Enter a valid Tracking Reference.');
      return;
    }

    const found = enquiries.find(
      (enq) =>
        (enq.trackingId && enq.trackingId.toUpperCase() === query) ||
        (enq.id && enq.id.toUpperCase() === query)
    );

    if (found) {
      setTrackedEnquiry(found);
    } else {
      setTrackedEnquiry(null);
      setTrackingSearchError(`No enquiry found with reference "${query}". Please check the ID or browse your submitted list below.`);
    }
  };

  return (
    <section className="mx-auto max-w-4xl">
      {/* Back button & Page Header */}
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#725522] transition-colors"
      >
        <ArrowLeft size={16} /> Customer Portal
      </button>

      <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fbf8ef] border border-[#d6c28f] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#725522]">
            <TrendingUp size={14} /> Wealth & Investment Planning
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-[#10243B]">Investment Information Enquiry</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Submit your portfolio planning and investment consultation preferences. Each enquiry is registered securely with an official Tracking Reference.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('application')}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === 'application'
                ? 'bg-[#10243B] text-white shadow-sm'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
          >
            New Enquiry
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('tracking');
              setTrackingIdSearch('');
              setTrackedEnquiry(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === 'tracking'
                ? 'bg-[#10243B] text-white shadow-sm'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
          >
            <MapPin size={15} /> Track Enquiries
          </button>
        </div>
      </div>

      {/* SUCCESS SCREEN */}
      {activeTab === 'success' && savedEnquiry && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 shadow-sm sm:p-10">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <CheckCircle2 size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
                Enquiry Saved
              </span>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Investment Enquiry Submitted Successfully</h2>
              <p className="mt-1 text-sm text-slate-600">
                Your investment information enquiry has been saved in Supabase. Use your official Tracking Reference below to track consultation review progress.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Official Tracking Reference</p>
                  <p className="font-mono text-2xl font-black text-[#10243B]">{savedEnquiry.trackingId}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyTrackingId}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#183454]"
                >
                  <Clipboard size={14} /> Copy Reference
                </button>
              </div>
              {copyMessage && <p role="status" className="mt-2 text-xs font-semibold text-emerald-800">{copyMessage}</p>}

              <div className="mt-6 grid gap-4 rounded-2xl border border-emerald-200/70 bg-white/70 p-5 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-slate-500">Applicant</dt>
                  <dd className="font-semibold text-slate-900">{form.fullName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Submission Date</dt>
                  <dd className="font-semibold text-slate-900">{formatStatusDate(savedEnquiry.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Status</dt>
                  <dd className="inline-flex items-center gap-1 font-bold text-blue-700">
                    <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                    {savedEnquiry.status || 'Submitted'}
                  </dd>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                <strong>Important Notice:</strong> This enquiry is for informational consultation only. It does not constitute an offer, deposit instruction, or investment agreement. Returns on market-linked instruments are never guaranteed.
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={startNewEnquiry}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#10243B] bg-white px-5 py-2.5 text-sm font-bold text-[#10243B] hover:bg-slate-50"
                >
                  Submit Another Enquiry
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#183454]"
                >
                  Return to Dashboard <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRACKING TAB */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-[#10243B]">Track Investment Enquiry</h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter your tracking reference (e.g. MAI-INV-2026-XXXXXX) to view review updates and officer notes.
            </p>
            <form onSubmit={handleTrackSearch} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                aria-label="Tracking Reference"
                className={`${FIELD_CLASS} mt-0 flex-1 font-mono uppercase`}
                value={trackingIdSearch}
                onChange={(e) => setTrackingIdSearch(e.target.value)}
                placeholder=""
                required
                maxLength={40}
              />
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#10243B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183454]"
              >
                <MapPin size={16} /> Check Status
              </button>
            </form>
            {trackingSearchError && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{trackingSearchError}</p>}
          </section>

          {/* Tracked single card */}
          {trackedEnquiry && (
            <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm sm:p-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tracking Reference</span>
                  <p className="font-mono text-xl font-extrabold text-[#10243B]">{trackedEnquiry.trackingId}</p>
                </div>
                <span className="rounded-full bg-blue-100 border border-blue-300 px-3.5 py-1 text-xs font-bold text-blue-900">
                  {trackedEnquiry.status || 'Submitted'}
                </span>
              </div>

              <div className="grid gap-3 text-xs sm:grid-cols-3">
                <div><span className="text-slate-500 block">Submitted At</span><span className="font-semibold text-slate-800">{formatStatusDate(trackedEnquiry.createdAt)}</span></div>
                <div><span className="text-slate-500 block">Interest Category</span><span className="font-semibold text-slate-800">{trackedEnquiry.interestCategory || 'General Guidance'}</span></div>
                <div><span className="text-slate-500 block">Preferred Horizon</span><span className="font-semibold text-slate-800">{trackedEnquiry.investmentHorizon || 'Exploring'}</span></div>
              </div>

              {trackedEnquiry.adminNotes && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
                  <span className="font-bold text-[#876A2E] block mb-1">Advisory Officer Note:</span>
                  <p>{trackedEnquiry.adminNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* List of customer's previous enquiries */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-[#10243B]">My Submitted Investment Enquiries</h2>
            <p className="mt-1 text-sm text-slate-600">
              All investment information enquiries linked to your signed-in customer account.
            </p>

            {enquiriesLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading your enquiries…</p>
            ) : enquiries.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No investment enquiries found on record.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {enquiries.map((enq) => (
                  <article key={enq.id} className="rounded-2xl border border-slate-200 p-5 transition hover:border-[#876A2E]/40 hover:shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-extrabold text-[#10243B]">{enq.trackingId}</span>
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                          {enq.interestCategory || 'Portfolio Planning'}
                        </span>
                      </div>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-900">
                        {enq.status || 'Submitted'}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                      <p><strong>Submitted:</strong> {formatStatusDate(enq.createdAt)}</p>
                      <p><strong>Amount Range:</strong> {enq.plannedAmountBracket || 'Not specified'}</p>
                      <p><strong>Duration:</strong> {enq.investmentHorizon || 'Not specified'}</p>
                    </div>

                    {enq.adminNotes && (
                      <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 border border-slate-100">
                        <strong>Officer Remark:</strong> {enq.adminNotes}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 5-STEP APPLICATION WIZARD */}
      {activeTab === 'application' && (
        <div className="space-y-6">
          {/* STEP PROGRESS INDICATOR */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Step {step} of 6</span>
              <span>
                {step === 1 && 'Personal Information'}
                {step === 2 && 'Investment Preferences'}
                {step === 3 && 'Financial Suitability'}
                {step === 4 && 'Verification Documents'}
                {step === 5 && 'Application Review'}
                {step === 6 && 'Final Submission'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-[#10243B] via-[#876A2E] to-[#D4AF37] transition-all duration-300"
                style={{ width: `${(step / 6) * 100}%` }}
              />
            </div>

            {/* Stepper bubbles */}
            <nav aria-label="Investment Enquiry Progress" className="mt-5 grid grid-cols-6 gap-2 text-center text-xs">
              {[
                { s: 1, title: 'Personal' },
                { s: 2, title: 'Preferences' },
                { s: 3, title: 'Suitability' },
                { s: 4, title: 'Documents' },
                { s: 5, title: 'Review' },
                { s: 6, title: 'Submit' },
              ].map(({ s, title }) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (s < step) setStep(s);
                  }}
                  disabled={s > step}
                  className={`flex flex-col items-center gap-1.5 p-1 transition ${s === step
                      ? 'font-bold text-[#10243B]'
                      : s < step
                        ? 'cursor-pointer font-semibold text-[#876A2E]'
                        : 'cursor-not-allowed opacity-40 text-slate-400'
                    }`}
                >
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${s === step
                        ? 'bg-[#10243B] text-white ring-4 ring-[#876A2E]/20'
                        : s < step
                          ? 'bg-[#876A2E] text-white'
                          : 'border border-slate-300 bg-white text-slate-400'
                      }`}
                  >
                    {s < step ? <Check size={14} /> : s}
                  </span>
                  <span className="hidden sm:inline">{title}</span>
                </button>
              ))}
            </nav>
          </div>

          {submitError && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {submitError}
            </div>
          )}

          {/* STEP 1: PERSONAL INFORMATION */}
          {step === 1 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#876A2E]">Step 1</span>
                <h2 className="text-xl font-bold text-[#10243B]">Personal Details</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Provide verified contact and residential details. Only legally eligible adults may submit investment enquiries.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full Name *" error={fieldErrors.fullName} className="sm:col-span-2">
                  <input
                    className={getFieldClass(fieldErrors.fullName)}
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder=""
                    maxLength={150}
                  />
                </Field>

                <Field label="Date of Birth *" error={fieldErrors.dateOfBirth} hint="Select your date of birth.">
                  <input
                    className={getFieldClass(fieldErrors.dateOfBirth)}
                    type="date"
                    autoComplete="bday"
                    value={form.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  />
                </Field>

                <Field label="Age (Auto-calculated)" hint="Calculated automatically from date of birth.">
                  <div className="flex items-center gap-3">
                    <input
                      className={`${FIELD_CLASS} bg-slate-50 font-bold`}
                      readOnly
                      value={calculatedAge !== '' ? `${calculatedAge} years` : '—'}
                    />
                    {calculatedAge !== '' && (
                      <span className={`text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap ${isAdult ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {isAdult ? 'Adult Eligible (18+)' : 'Ineligible (<18)'}
                      </span>
                    )}
                  </div>
                </Field>

                <div className="sm:col-span-2">
                  <EmailOtpVerification
                    email={form.email}
                    onChangeEmail={(val) => updateField('email', val)}
                    isVerified={emailVerification.isVerified}
                    verifiedEmail={emailVerification.verifiedEmail}
                    verifiedAt={emailVerification.verifiedAt}
                    onVerified={(res) => {
                      setEmailVerification({
                        isVerified: true,
                        verifiedEmail: res.email,
                        verifiedAt: res.verifiedAt,
                        token: res.verificationToken,
                      });
                      setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    onReset={() => {
                      setEmailVerification({
                        isVerified: false,
                        verifiedEmail: '',
                        verifiedAt: null,
                        token: '',
                      });
                    }}
                    error={fieldErrors.email}
                    purpose="Investment Advisory Enquiry"
                    label="Gmail / Email Address *"
                    hint="A real 6-digit OTP will be delivered to this email. Verification is required before submission."
                  />
                </div>

                <Field label="Mobile Number *" error={fieldErrors.mobileNumber} hint="10-digit Indian mobile number.">
                  <input
                    className={getFieldClass(fieldErrors.mobileNumber)}
                    type="tel"
                    autoComplete="tel"
                    value={form.mobileNumber}
                    onChange={(e) => updateField('mobileNumber', e.target.value)}
                    placeholder=""
                    maxLength={15}
                  />
                </Field>

                <Field label="Residential Address *" error={fieldErrors.address} className="sm:col-span-2">
                  <input
                    className={getFieldClass(fieldErrors.address)}
                    autoComplete="street-address"
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder=""
                    maxLength={300}
                  />
                </Field>

                <Field label="State / Union Territory *" error={fieldErrors.state}>
                  <select
                    className={getFieldClass(fieldErrors.state)}
                    value={form.state}
                    onChange={(e) => {
                      updateField('state', e.target.value);
                      updateField('district', '');
                    }}
                  >
                    <option value="">Select State / UT</option>
                    {INDIA_LOCATION_DATA.states.map((s) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="District *" error={fieldErrors.district}>
                  <select
                    className={getFieldClass(fieldErrors.district)}
                    value={form.district}
                    onChange={(e) => updateField('district', e.target.value)}
                    disabled={!form.state}
                  >
                    <option value="">{form.state ? 'Select District' : 'First select a state'}</option>
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </Field>

                <Field label="City / Town *" error={fieldErrors.city}>
                  <input
                    className={getFieldClass(fieldErrors.city)}
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder=""
                    maxLength={80}
                  />
                </Field>

                <Field label="PIN Code *" error={fieldErrors.pinCode}>
                  <input
                    className={getFieldClass(fieldErrors.pinCode)}
                    value={form.pinCode}
                    onChange={(e) => updateField('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder=""
                    maxLength={6}
                  />
                </Field>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183454]"
                >
                  Next: Investment Preferences <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: INVESTMENT PREFERENCES */}
          {step === 2 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#876A2E]">Step 2</span>
                <h2 className="text-xl font-bold text-[#10243B]">Investment Preferences</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Specify the topics and planning parameters you wish to explore. These are consultation preferences only.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 text-[#876A2E] mt-0.5" />
                <p>
                  <strong>Compliance Disclosure:</strong> Selection of preferences does not constitute a financial product purchase, deposit instruction, or investment commitment.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Investment Interest Category *" error={fieldErrors.interestCategory} className="sm:col-span-2">
                  <select
                    className={getFieldClass(fieldErrors.interestCategory)}
                    value={form.interestCategory}
                    onChange={(e) => updateField('interestCategory', e.target.value)}
                  >
                    <option value="">Select an interest category</option>
                    {INVESTMENT_INTEREST_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Primary Investment Objective *" error={fieldErrors.investmentObjective} className="sm:col-span-2">
                  <select
                    className={getFieldClass(fieldErrors.investmentObjective)}
                    value={form.investmentObjective}
                    onChange={(e) => updateField('investmentObjective', e.target.value)}
                  >
                    <option value="">Select an objective</option>
                    {INVESTMENT_OBJECTIVES.map((obj) => (
                      <option key={obj} value={obj}>{obj}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Preferred Investment Amount Range *" error={fieldErrors.plannedAmountBracket} hint="Select your prospective allocation range.">
                  <select
                    className={getFieldClass(fieldErrors.plannedAmountBracket)}
                    value={form.plannedAmountBracket}
                    onChange={(e) => updateField('plannedAmountBracket', e.target.value)}
                  >
                    <option value="">Select amount range</option>
                    {INVESTMENT_AMOUNT_RANGES.map((rng) => (
                      <option key={rng} value={rng}>{rng}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Preferred Investment Duration / Horizon *" error={fieldErrors.investmentHorizon} hint="Target time frame for your goals.">
                  <select
                    className={getFieldClass(fieldErrors.investmentHorizon)}
                    value={form.investmentHorizon}
                    onChange={(e) => updateField('investmentHorizon', e.target.value)}
                  >
                    <option value="">Select horizon</option>
                    {INVESTMENT_DURATIONS.map((dur) => (
                      <option key={dur} value={dur}>{dur}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Customer Expectations *" error={fieldErrors.customerExpectations} className="sm:col-span-2">
                  <select
                    className={getFieldClass(fieldErrors.customerExpectations)}
                    value={form.customerExpectations}
                    onChange={(e) => updateField('customerExpectations', e.target.value)}
                  >
                    <option value="">Select primary expectation</option>
                    {CUSTOMER_EXPECTATIONS.map((exp) => (
                      <option key={exp} value={exp}>{exp}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Additional Questions / Queries (Optional)" className="sm:col-span-2" hint="Enter any specific queries regarding portfolio planning or asset allocation.">
                  <textarea
                    className={`${FIELD_CLASS} resize-y`}
                    rows={4}
                    maxLength={2000}
                    value={form.additionalQuestions}
                    onChange={(e) => updateField('additionalQuestions', e.target.value)}
                    placeholder=""
                  />
                </Field>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={16} /> Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183454]"
                >
                  Next: Financial Suitability <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: FINANCIAL SUITABILITY & RISK UNDERSTANDING */}
          {step === 3 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#876A2E]">Step 3</span>
                <h2 className="text-xl font-bold text-[#10243B]">Financial Suitability & Risk Understanding</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Help us understand your investment familiarity and risk comfort. No sensitive banking credentials or financial documents are collected.
                </p>
              </div>

              {/* Risk Understanding Options */}
              <div>
                <label className={LABEL_CLASS}>General Risk Understanding *</label>
                <p className="text-xs text-slate-500 mb-3">Select your risk tolerance profile.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {RISK_UNDERSTANDING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField('riskUnderstanding', opt.label)}
                      className={`rounded-2xl border p-4 text-left transition ${form.riskUnderstanding === opt.label
                          ? 'border-[#876A2E] bg-[#fbf8ef] ring-2 ring-[#876A2E]/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                      <p className="text-sm font-bold text-[#10243B]">{opt.label}</p>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{opt.description}</p>
                    </button>
                  ))}
                </div>
                {fieldErrors.riskUnderstanding && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">{fieldErrors.riskUnderstanding}</p>
                )}
              </div>

              {/* Knowledge Level Options */}
              <div>
                <label className={LABEL_CLASS}>Investment Knowledge Level *</label>
                <p className="text-xs text-slate-500 mb-3">Indicate your experience with financial markets.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {KNOWLEDGE_LEVEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField('knowledgeLevel', opt.label)}
                      className={`rounded-2xl border p-4 text-left transition ${form.knowledgeLevel === opt.label
                          ? 'border-[#876A2E] bg-[#fbf8ef] ring-2 ring-[#876A2E]/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                      <p className="text-sm font-bold text-[#10243B]">{opt.label}</p>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{opt.description}</p>
                    </button>
                  ))}
                </div>
                {fieldErrors.knowledgeLevel && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">{fieldErrors.knowledgeLevel}</p>
                )}
              </div>

              {/* Primary Investment Goal */}
              <Field label="Primary Investment Goal *" error={fieldErrors.investmentGoals}>
                <select
                  className={FIELD_CLASS}
                  value={form.investmentGoals}
                  onChange={(e) => updateField('investmentGoals', e.target.value)}
                >
                  <option value="">Select a primary goal</option>
                  {INVESTMENT_GOALS_OPTIONS.map((goal) => (
                    <option key={goal} value={goal}>{goal}</option>
                  ))}
                </select>
              </Field>

              {/* Risk Fluctuation Acknowledgment */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    id="riskAcknowledged"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#876A2E] focus:ring-[#876A2E]"
                    checked={form.riskAcknowledged}
                    onChange={(e) => updateField('riskAcknowledged', e.target.checked)}
                  />
                  <label htmlFor="riskAcknowledged" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                    <strong>Market Risk & Volatility Acknowledgment *:</strong> I understand that market-linked investments are subject to fluctuations and principal risk. I acknowledge that Mehanda Army Investments does not assure fixed returns, assured profits, or guaranteed capital appreciation.
                  </label>
                </div>
                {fieldErrors.riskAcknowledged && (
                  <p role="alert" className="text-xs text-red-700 pl-7">{fieldErrors.riskAcknowledged}</p>
                )}
              </div>

              {/* Security & Credentials Warning */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck size={18} className="shrink-0 text-emerald-700 mt-0.5" />
                <p>
                  <strong>Security Guarantee:</strong> Mehanda Army Investments will never request your banking passwords, ATM PINs, UPI PINs, or one-time passwords (OTPs). Do not share confidential credentials with anyone.
                </p>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={16} /> Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183454]"
                >
                  Next: Verification Documents <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: MANDATORY DOCUMENT VERIFICATION */}
          {step === 4 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#876A2E]">Step 4</span>
                <h2 className="text-xl font-bold text-[#10243B]">Document Verification Checklist</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Upload required verification documents. Supported formats: .txt or .json synthetic sample files (up to 1 MB per file).
                </p>
              </div>

              {/* KYC REGULATORY GATE ALERT */}
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-2 text-amber-950">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Lock size={17} className="text-[#876A2E]" />
                  <span>Regulatory Notice: Government Identity (Aadhaar / PAN / Voter ID) Locked</span>
                </div>
                <p className="text-xs leading-5 text-amber-900">
                  In compliance with statutory and privacy safeguards, collection of sensitive government identity numbers (Aadhaar, PAN, Voter ID) and confidential banking credentials is strictly gated. Please attach your non-sensitive synthetic sample consultation documents below.
                </p>
              </div>

              {/* Document upload grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    key: 'investorProof',
                    title: 'Investor Verification Document',
                    desc: 'Investor consultation profile note or verification proof (sample .txt or .json).',
                    required: true,
                  },
                  {
                    key: 'investorSignature',
                    title: 'Investor Specimen Signature / Authorization',
                    desc: 'Specimen signature or consultation authorization note (sample .txt or .json).',
                    required: true,
                  },
                  {
                    key: 'financialPlan',
                    title: 'Financial Planning Note (Sample)',
                    desc: 'Objective or financial planning preference sheet sample (optional).',
                    required: false,
                  },
                  {
                    key: 'supportingDoc',
                    title: 'Supporting Consultation Note (Sample)',
                    desc: 'Additional notes or consultation questions sample file (optional).',
                    required: false,
                  },
                ].map(({ key, title, desc, required }) => {
                  const doc = form.documents[key];
                  const isUploading = slotUploading[key];
                  const progress = slotProgress[key] || 0;
                  const hasError = Boolean(fieldErrors[key]);

                  return (
                    <div
                      key={key}
                      className={`rounded-2xl border p-5 transition ${doc?.confirmed
                          ? 'border-emerald-300 bg-emerald-50/40 shadow-sm'
                          : hasError
                            ? 'border-red-400 bg-red-50/30 ring-1 ring-red-300'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#10243B]">
                            {title} {required && <span className="text-[#876A2E]">*</span>}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                        </div>
                        {doc?.confirmed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 size={12} className="text-emerald-700" /> Confirmed
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${required ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                            {required ? 'Pending Required' : 'Optional'}
                          </span>
                        )}
                      </div>

                      {/* Upload Progress Bar when active */}
                      {isUploading && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-[#876A2E]">
                              <Loader2 size={13} className="animate-spin" /> Uploading to Private Storage...
                            </span>
                            <span className="font-bold">{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full bg-[#876A2E] transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Document Actions & Details */}
                      {!isUploading && (
                        <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                          {doc?.confirmed ? (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileCheck size={16} className="text-emerald-700 shrink-0" />
                                <div className="truncate">
                                  <span className="text-xs font-semibold text-slate-800 block truncate max-w-[200px]">
                                    {doc.fileName || doc.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {(doc.size / 1024).toFixed(1)} KB • Private Storage Confirmed
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeDocumentSlot(key)}
                                className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline px-2 py-1"
                              >
                                Remove & Replace
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 w-full">
                              <div className="flex items-center gap-2">
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition">
                                  <Upload size={14} className="text-[#876A2E]" /> Select File
                                  <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                                    className="sr-only"
                                    onChange={(e) => handleDocumentSlot(key, e)}
                                  />
                                </label>
                              </div>
                              <span className="text-[11px] text-slate-400 block">
                                Accepted formats: JPG, JPEG, PNG, PDF · Maximum size: 5 MB
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {fieldErrors[key] && (
                        <p role="alert" className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-red-700">
                          <AlertCircle size={13} className="shrink-0 text-red-600" />
                          {fieldErrors[key]}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Locked Aadhaar / PAN card slot */}
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-100/70 p-4 opacity-75">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Government KYC (Aadhaar / PAN)</p>
                      <p className="text-xs text-slate-400 mt-0.5">Government ID collection is restricted.</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      <Lock size={10} /> KYC Gate Active
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400 leading-4">
                    Identity validation controls will be enabled following formal regulatory clearance.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={16} /> Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183454] shadow-sm"
                >
                  Next: Application Review <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: COMPLETE APPLICATION REVIEW */}
          {step === 5 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#876A2E]">Step 5</span>
                <h2 className="text-xl font-bold text-[#10243B]">Application Review</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Review all entered details before final submission. Click "Edit" on any section to make corrections.
                </p>
              </div>

              {/* Card 1: Personal Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-[#876A2E]" />
                    <h3 className="text-sm font-bold text-[#10243B]">Personal Details</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#725522] hover:underline"
                  >
                    <Edit2 size={13} /> Edit Personal Details
                  </button>
                </div>
                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <div><dt className="text-slate-500">Full Name</dt><dd className="font-semibold text-slate-900">{form.fullName}</dd></div>
                  <div><dt className="text-slate-500">Date of Birth & Age</dt><dd className="font-semibold text-slate-900">{form.dateOfBirth} ({calculatedAge} years)</dd></div>
                  <div>
                    <dt className="text-slate-500">Email</dt>
                    <dd className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      {form.email}
                      {emailVerification.isVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          Gmail Verified
                        </span>
                      )}
                    </dd>
                  </div>
                  <div><dt className="text-slate-500">Mobile</dt><dd className="font-semibold text-slate-900">{form.mobileNumber}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-slate-500">Address</dt><dd className="font-semibold text-slate-900">{form.address}, {form.city}, {form.district}, {form.state} - {form.pinCode}</dd></div>
                </div>
              </div>

              {/* Card 2: Investment Preferences */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#876A2E]" />
                    <h3 className="text-sm font-bold text-[#10243B]">Investment Preferences</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#725522] hover:underline"
                  >
                    <Edit2 size={13} /> Edit Preferences
                  </button>
                </div>
                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <div><dt className="text-slate-500">Interest Category</dt><dd className="font-semibold text-slate-900">{form.interestCategory || '—'}</dd></div>
                  <div><dt className="text-slate-500">Primary Objective</dt><dd className="font-semibold text-slate-900">{form.investmentObjective || '—'}</dd></div>
                  <div><dt className="text-slate-500">Amount Range</dt><dd className="font-semibold text-slate-900">{form.plannedAmountBracket || '—'}</dd></div>
                  <div><dt className="text-slate-500">Duration / Horizon</dt><dd className="font-semibold text-slate-900">{form.investmentHorizon || '—'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-slate-500">Consultation Expectation</dt><dd className="font-semibold text-slate-900">{form.customerExpectations || '—'}</dd></div>
                  {form.additionalQuestions && (
                    <div className="sm:col-span-2"><dt className="text-slate-500">Additional Questions</dt><dd className="font-semibold text-slate-900 whitespace-pre-wrap">{form.additionalQuestions}</dd></div>
                  )}
                </div>
              </div>

              {/* Card 3: Suitability & Risk Understanding */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#876A2E]" />
                    <h3 className="text-sm font-bold text-[#10243B]">Financial Suitability & Risk Profile</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#725522] hover:underline"
                  >
                    <Edit2 size={13} /> Edit Suitability
                  </button>
                </div>
                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <div><dt className="text-slate-500">Risk Understanding</dt><dd className="font-semibold text-slate-900">{form.riskUnderstanding || '—'}</dd></div>
                  <div><dt className="text-slate-500">Knowledge Level</dt><dd className="font-semibold text-slate-900">{form.knowledgeLevel || '—'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-slate-500">Primary Goal</dt><dd className="font-semibold text-slate-900">{form.investmentGoals || '—'}</dd></div>
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">Volatility Acknowledgment</dt>
                    <dd className="font-semibold text-emerald-800 flex items-center gap-1.5 mt-0.5">
                      <CheckCircle2 size={14} /> Confirmed (Market risks and no guaranteed returns understood)
                    </dd>
                  </div>
                </div>
              </div>

              {/* Card 4: Attached Verification Documents */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-[#876A2E]" />
                    <h3 className="text-sm font-bold text-[#10243B]">Attached Documents</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#725522] hover:underline"
                  >
                    <Edit2 size={13} /> Edit Documents
                  </button>
                </div>
                <div className="space-y-2.5 text-xs">
                  {/* Required Document 1 */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className={form.documents.investorProof?.confirmed ? "text-emerald-600 shrink-0" : "text-amber-500 shrink-0"} />
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">Investor Verification Document *</span>
                        {form.documents.investorProof?.confirmed ? (
                          <span className="text-slate-600 text-[11px]">
                            {form.documents.investorProof.fileName || form.documents.investorProof.name} ({(form.documents.investorProof.size / 1024).toFixed(1)} KB)
                          </span>
                        ) : (
                          <span className="text-red-600 font-semibold text-[11px]">Required — Not uploaded yet</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${form.documents.investorProof?.confirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {form.documents.investorProof?.confirmed ? 'Confirmed' : 'Missing'}
                    </span>
                  </div>

                  {/* Required Document 2 */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className={form.documents.investorSignature?.confirmed ? "text-emerald-600 shrink-0" : "text-amber-500 shrink-0"} />
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">Investor Specimen Signature / Authorization *</span>
                        {form.documents.investorSignature?.confirmed ? (
                          <span className="text-slate-600 text-[11px]">
                            {form.documents.investorSignature.fileName || form.documents.investorSignature.name} ({(form.documents.investorSignature.size / 1024).toFixed(1)} KB)
                          </span>
                        ) : (
                          <span className="text-red-600 font-semibold text-[11px]">Required — Not uploaded yet</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${form.documents.investorSignature?.confirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {form.documents.investorSignature?.confirmed ? 'Confirmed' : 'Missing'}
                    </span>
                  </div>

                  {/* Optional Documents */}
                  {['financialPlan', 'supportingDoc'].map((key) => {
                    const doc = form.documents[key];
                    if (!doc?.confirmed) return null;
                    return (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                            </span>
                            <span className="text-slate-600 text-[11px]">
                              {doc.fileName || doc.name} ({(doc.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          Attached
                        </span>
                      </div>
                    );
                  })}
                </div>

                {(!form.documents.investorProof?.confirmed || !form.documents.investorSignature?.confirmed) && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center justify-between">
                    <span>Both required verification documents must be uploaded before proceeding to final submission.</span>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="px-3 py-1 bg-[#876A2E] text-white rounded-lg font-bold text-xs hover:bg-[#725522]"
                    >
                      Upload Documents
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={16} /> Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183454]"
                >
                  Proceed to Final Submission <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: FINAL SUBMISSION */}
          {step === 6 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#876A2E]">Step 6</span>
                <h2 className="text-xl font-bold text-[#10243B]">Final Submission & Declarations</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Please confirm your agreement to the terms below to submit your genuine investment enquiry.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                {/* Accuracy declaration */}
                <div className="flex items-start gap-3">
                  <input
                    id="accuracyConsent"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#876A2E] focus:ring-[#876A2E]"
                    checked={form.accuracyConsent}
                    onChange={(e) => updateField('accuracyConsent', e.target.checked)}
                  />
                  <label htmlFor="accuracyConsent" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                    <strong>Information Accuracy Declaration *:</strong> I certify that the personal contact details and investment preferences entered in this form are accurate and complete.
                  </label>
                </div>
                {fieldErrors.accuracyConsent && (
                  <p role="alert" className="text-xs text-red-700 pl-7">{fieldErrors.accuracyConsent}</p>
                )}

                {/* Privacy consent */}
                <div className="flex items-start gap-3">
                  <input
                    id="privacyConsent"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#876A2E] focus:ring-[#876A2E]"
                    checked={form.privacyConsent}
                    onChange={(e) => updateField('privacyConsent', e.target.checked)}
                  />
                  <label htmlFor="privacyConsent" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                    <strong>Privacy & Contact Consent *:</strong> I consent to Mehanda Army Investments storing my contact information securely in Supabase and contacting me by phone, email, or WhatsApp regarding this enquiry.
                  </label>
                </div>
                {fieldErrors.privacyConsent && (
                  <p role="alert" className="text-xs text-red-700 pl-7">{fieldErrors.privacyConsent}</p>
                )}

                {/* Non-binding enquiry statement */}
                <div className="flex items-start gap-3">
                  <input
                    id="nonBindingConsent"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#876A2E] focus:ring-[#876A2E]"
                    checked={form.nonBindingConsent}
                    onChange={(e) => updateField('nonBindingConsent', e.target.checked)}
                  />
                  <label htmlFor="nonBindingConsent" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                    <strong>Informational Enquiry Only *:</strong> I understand that this submission is an enquiry for strategic consultation and portfolio planning information only. It does not establish an investment mandate, deposit agreement, or execution contract.
                  </label>
                </div>
                {fieldErrors.nonBindingConsent && (
                  <p role="alert" className="text-xs text-red-700 pl-7">{fieldErrors.nonBindingConsent}</p>
                )}
              </div>

              {/* Legal & Regulatory Notice */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 flex items-start gap-2.5">
                <AlertTriangle size={18} className="shrink-0 text-[#876A2E] mt-0.5" />
                <p>
                  <strong>Regulatory Note:</strong> All client transactions and formal wealth allocations are settled directly through regulated depository participants, asset management companies, and authorized financial intermediaries. Mehanda Army Investments does not take custody of banking balances.
                </p>
              </div>

              {/* Navigation and Final Submit buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ArrowLeft size={16} /> Previous
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#876A2E] hover:bg-[#725522] px-8 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Submitting to Database…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> FINAL SUBMIT
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

