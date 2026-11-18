import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  GraduationCap, ShieldAlert, CheckCircle2, AlertTriangle,
  ArrowLeft, BookOpen, Clock, FileText, User, Phone, Mail,
  Calendar, IndianRupee, Building2, Info, ChevronRight, Search, MapPin,
  Loader2, Lock, Eye, EyeOff, BadgeCheck, X, QrCode, Smartphone, CreditCard
} from 'lucide-react';
import {
  LOAN_AMOUNTS, LOAN_TERMS, APPLICATION_STATUS, MIN_AGE,
  submitDemoApplication, getDemoApplication, searchStudentLoanInstitutions,
  uploadStudentLoanDocument, removeStudentLoanDocument
} from '../lib/studentLoanService';
import { authService } from '../lib/supabaseClient';
import { loadRazorpayScript, createPaymentOrder, verifyPaymentSignature } from '../lib/paymentService';
import LiveDateTime from './LiveDateTime';

const APPLICANT_STATES = [
  'Haryana',
  'Punjab',
  'Delhi',
  'Rajasthan',
  'Uttar Pradesh',
  'Himachal Pradesh',
];
const MAX_ID_DOCUMENT_SIZE = 5 * 1024 * 1024;
const ID_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/* ─── helpers ──────────────────────────────────────────────── */
function calcAge(dob) {
  if (!dob) return null;
  const d     = new Date(`${dob}T00:00:00`);
  const today = new Date();
  if (Number.isNaN(d.getTime()) || d > today) return null;
  let   age   = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return isNaN(age) ? null : age;
}

function statusColor(status) {
  switch (status) {
    case APPLICATION_STATUS.APPROVED:     return 'text-[#50745A] bg-emerald-500/15 border-emerald-500/30';
    case APPLICATION_STATUS.REJECTED:     return 'text-red-400 bg-red-500/15 border-red-500/30';
    case APPLICATION_STATUS.UNDER_REVIEW: return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    default:                              return 'text-blue-400 bg-blue-500/15 border-blue-500/30';
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/* ─── Minimum repayment date (today + 7 days) ──────────────── */
function minRepayDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

function todayDate() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function StudentLoan({ currentUser, setCurrentView }) {
  const [view, setView] = useState('info'); // 'info' | 'apply' | 'success' | 'my-apps'
  const [submittedRef, setSubmittedRef] = useState('');
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const [referenceInput, setReferenceInput] = useState('');
  const [lookedUpApplication, setLookedUpApplication] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [institutionQuery, setInstitutionQuery] = useState('');
  const [institutionResults, setInstitutionResults] = useState([]);
  const [institutionSearchActive, setInstitutionSearchActive] = useState('');
  const [institutionSearchLoading, setInstitutionSearchLoading] = useState(false);
  const [institutionSearchError, setInstitutionSearchError] = useState('');
  const [institutionHasMore, setInstitutionHasMore] = useState(false);
  const [institutionCursor, setInstitutionCursor] = useState(null);
  const [manualInstitution, setManualInstitution] = useState(false);
  const [institutionFilters, setInstitutionFilters] = useState({
    state: '',
    district: '',
    management: ''
  });
  const institutionSearchGeneration = useRef(0);

  /* ─── Form state ──────────────────────────────────────────── */
  const INITIAL_FORM = {
    fullName        : currentUser?.fullName || '',
    dateOfBirth     : '',
    mobileNumber    : currentUser?.phone || '',
    email           : currentUser?.email || '',
    applicantState  : '',
    applicantDistrict: '',
    applicantCity   : '',
    studentStatus   : '',
    institutionId   : '',
    institutionName : '',
    institutionState: '',
    institutionDistrict: '',
    institutionCity : '',
    institutionPinCode: '',
    institutionType : '',
    institutionCategory: '',
    courseName      : '',
    voterIdNumber   : '',
    panCardNumber   : '',
    loanAmount      : '',
    repaymentDate   : '',
    loanPurpose     : '',
    privacyConsent  : false,
    termsConsent    : false,
    guardianName    : '',
    guardianPhone   : '',
    guardianRelationship: '',
    guardianConsent : false,
    upiUtr          : '',
    platformFeePaid : false,
  };

  const [form,         setForm]         = useState(INITIAL_FORM);
  const [errors,       setErrors]       = useState({});
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState('');
  const [identityDocument, setIdentityDocument] = useState(null);
  const [razorpayPayment, setRazorpayPayment] = useState(null);
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  /* ─── Computed ─────────────────────────────────────────────── */
  const age = calcAge(form.dateOfBirth);

  useEffect(() => {
    const generation = ++institutionSearchGeneration.current;
    const query = institutionQuery.trim();
    if (view !== 'apply' || manualInstitution || query.length < 3) {
      setInstitutionResults([]);
      setInstitutionHasMore(false);
      setInstitutionCursor(null);
      setInstitutionSearchError('');
      setInstitutionSearchLoading(false);
      return undefined;
    }

    setInstitutionResults([]);
    setInstitutionHasMore(false);
    setInstitutionCursor(null);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setInstitutionSearchLoading(true);
      setInstitutionSearchError('');
      try {
        const result = await searchStudentLoanInstitutions({
          query,
          ...institutionFilters,
          signal: controller.signal
        });
        if (generation !== institutionSearchGeneration.current) return;
        setInstitutionResults(result.results);
        setInstitutionHasMore(result.hasMore);
        setInstitutionCursor(result.cursor);
      } catch (error) {
        if (error.name !== 'AbortError' && generation === institutionSearchGeneration.current) {
          setInstitutionResults([]);
          setInstitutionHasMore(false);
          setInstitutionCursor(null);
          setInstitutionSearchError(error.message || 'Institution search could not be completed.');
        }
      } finally {
        if (generation === institutionSearchGeneration.current) {
          setInstitutionSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [institutionQuery, institutionFilters, manualInstitution, view]);

  /* ─── Validation ───────────────────────────────────────────── */
  const validate = useCallback(() => {
    const e = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 3)
      e.fullName = 'Full name must be at least 3 characters.';

    if (!form.dateOfBirth)
      e.dateOfBirth = 'Date of birth is required.';
    else if (calcAge(form.dateOfBirth) === null || calcAge(form.dateOfBirth) < MIN_AGE)
      e.dateOfBirth = `You must be at least ${MIN_AGE} years old to apply.`;

    if (!/^[6-9]\d{9}$/.test(form.mobileNumber))
      e.mobileNumber = 'Enter a valid 10-digit Indian mobile number.';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address.';

    if (!form.applicantState)
      e.applicantState = 'Select your state.';
    if (!form.applicantDistrict.trim())
      e.applicantDistrict = 'Enter your district.';
    if (!form.applicantCity.trim())
      e.applicantCity = 'Enter your city or village.';

    if (!form.studentStatus)
      e.studentStatus = 'Please select your student status.';

    if (!form.institutionName.trim() || form.institutionName.trim().length < 3)
      e.institutionName = 'Institution name must be at least 3 characters.';
    if (!form.institutionState.trim())
      e.institutionState = 'Institution state is required.';
    if (!form.institutionDistrict.trim())
      e.institutionDistrict = 'Institution district is required.';
    if (form.institutionPinCode && !/^\d{6}$/.test(form.institutionPinCode))
      e.institutionPinCode = 'Enter a valid 6-digit PIN code.';
    if (!form.institutionType)
      e.institutionType = 'Select the institution type.';
    if (!form.institutionCategory)
      e.institutionCategory = 'Select Government or Private.';
    if (!form.courseName.trim() || form.courseName.trim().length < 2)
      e.courseName = 'Enter your course or stream.';
    if (!/^[A-Z]{3}[0-9]{7}$/.test(form.voterIdNumber.trim().toUpperCase()))
      e.voterIdNumber = 'Enter a valid 10-character Voter ID number.';
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panCardNumber.trim().toUpperCase()))
      e.panCardNumber = 'Enter a valid 10-character PAN card number.';
    if (identityDocument && (
      !ID_DOCUMENT_TYPES.has(identityDocument.type) ||
      identityDocument.size > MAX_ID_DOCUMENT_SIZE
    )) {
      e.identityDocument = 'Choose a JPEG, PNG, WebP, or PDF file no larger than 5 MB.';
    }

    if (!form.loanAmount)
      e.loanAmount = 'Please select a loan amount.';

    if (!form.repaymentDate)
      e.repaymentDate = 'Please select a preferred repayment date.';
    else if (form.repaymentDate < minRepayDate())
      e.repaymentDate = 'Repayment date must be at least 7 days from today.';

    if (!form.privacyConsent)
      e.privacyConsent = 'You must acknowledge the privacy notice.';

    if (!form.termsConsent)
      e.termsConsent = 'You must agree to the loan terms and facilitation policy.';

    return e;
  }, [form, identityDocument]);

  const handleInstitutionSearchChange = (value, origin) => {
    setInstitutionQuery(value);
    setManualInstitution(false);
    setInstitutionSearchActive(origin);
    setInstitutionResults([]);
    setInstitutionHasMore(false);
    setInstitutionCursor(null);
    setInstitutionSearchError('');
    setForm((previous) => ({
      ...previous,
      institutionId: '',
      institutionName: '',
      institutionState: '',
      institutionDistrict: '',
      institutionCity: '',
      institutionPinCode: '',
      institutionType: '',
      institutionCategory: ''
    }));
    setErrors((previous) => ({
      ...previous,
      institutionName: '',
      institutionState: '',
      institutionDistrict: '',
      institutionType: '',
      institutionCategory: '',
      institutionPinCode: ''
    }));
  };

  const handleManualInstitutionChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    if (name === 'institutionName') setInstitutionQuery(value);
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setSubmitError('');
  };

  const selectInstitution = (institution) => {
    setForm((previous) => ({
      ...previous,
      institutionId: institution.id,
      institutionName: institution.name,
      institutionState: institution.state,
      institutionDistrict: institution.district,
      institutionCity: institution.city || '',
      institutionPinCode: institution.pinCode || '',
      institutionType: institution.type,
      institutionCategory: institution.category
    }));
    setInstitutionQuery(institution.name);
    setInstitutionSearchActive('');
    setManualInstitution(false);
    setInstitutionSearchError('');
    setErrors((previous) => ({
      ...previous,
      institutionName: '',
      institutionState: '',
      institutionDistrict: '',
      institutionType: '',
      institutionCategory: ''
    }));
  };

  const enableManualInstitution = () => {
    setForm((previous) => ({
      ...previous,
      institutionId: '',
      institutionName: previous.institutionName || institutionQuery.trim(),
      institutionState: '',
      institutionDistrict: '',
      institutionCity: '',
      institutionPinCode: '',
      institutionType: '',
      institutionCategory: ''
    }));
    setManualInstitution(true);
    setInstitutionSearchActive('');
    setInstitutionSearchError('');
    setTimeout(() => {
      document.getElementById('field-institutionName')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 0);
  };

  const loadMoreInstitutions = async () => {
    if (!institutionHasMore || !institutionCursor || institutionSearchLoading) return;
    const generation = institutionSearchGeneration.current;
    setInstitutionSearchLoading(true);
    setInstitutionSearchError('');
    try {
      const result = await searchStudentLoanInstitutions({
        query: institutionQuery.trim(),
        ...institutionFilters,
        cursor: institutionCursor
      });
      if (generation !== institutionSearchGeneration.current) return;
      setInstitutionResults((previous) => [...previous, ...result.results]);
      setInstitutionHasMore(result.hasMore);
      setInstitutionCursor(result.cursor);
    } catch (error) {
      if (generation === institutionSearchGeneration.current) {
        setInstitutionSearchError(error.message || 'More institutions could not be loaded.');
      }
    } finally {
      if (generation === institutionSearchGeneration.current) {
        setInstitutionSearchLoading(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setSubmitError('');
  };

  const handleGovernmentIdChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value.toUpperCase() }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setSubmitError('');
  };

  const handleIdentityDocumentChange = (event) => {
    const file = event.target.files?.[0] || null;
    setIdentityDocument(file);
    setErrors((previous) => ({ ...previous, identityDocument: '' }));
    setSubmitError('');
  };

  const handlePayWithRazorpay = async () => {
    setPaymentError('');
    setSubmitError('');
    setInitiatingPayment(true);
    try {
      const { accessToken, error: sessionError } = await authService.getAccessToken();
      if (sessionError || !accessToken) {
        throw new Error('Please ensure you are signed in before paying the platform fee.');
      }

      const order = await createPaymentOrder({
        serviceId: 'srv_student_loan_fee',
        customAmount: 2,
        customerName: (form.fullName || '').trim() || 'Student Applicant',
        customerEmail: (form.email || '').trim() || '',
        customerPhone: (form.mobileNumber || '').trim() || '',
        accessToken
      });

      if (!order?.success) {
        throw new Error(order?.error || 'Unable to initialize Razorpay transaction.');
      }

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay Checkout SDK could not be loaded.');
      }

      const options = {
        key: order.keyId,
        amount: order.amountInPaise,
        currency: 'INR',
        name: 'Mehanda Army Investments',
        description: 'Student Loan Platform Verification Fee (₹2.00)',
        order_id: order.orderId,
        prefill: {
          name: form.fullName || '',
          email: form.email || '',
          contact: form.mobileNumber || ''
        },
        theme: {
          color: '#0A1628'
        },
        handler: async function (response) {
          try {
            setInitiatingPayment(true);
            const { accessToken: currentToken } = await authService.getAccessToken();
            const verifyResult = await verifyPaymentSignature({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              customer: {
                name: (form.fullName || '').trim(),
                email: (form.email || '').trim(),
                phone: (form.mobileNumber || '').trim(),
                paymentMethod: 'Razorpay Gateway'
              },
              service: {
                id: 'srv_student_loan_fee',
                name: 'Student Loan Platform Verification Fee',
                amount: 2
              },
              accessToken: currentToken || accessToken
            });

            if (!verifyResult?.verified) {
              throw new Error(verifyResult?.error || 'Payment signature verification failed.');
            }

            setRazorpayPayment({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              amount: 2,
              verifiedAt: new Date().toISOString()
            });

            setForm((prev) => ({
              ...prev,
              platformFeePaid: true,
              upiUtr: response.razorpay_payment_id
            }));
            setSubmitError('');
            setPaymentError('');
          } catch (verifyErr) {
            setPaymentError(verifyErr.message || 'Signature verification error: ' + response.razorpay_payment_id);
          } finally {
            setInitiatingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setInitiatingPayment(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setInitiatingPayment(false);
        setPaymentError(resp.error?.description || 'Payment was cancelled or unsuccessful.');
      });
      rzp.open();
    } catch (err) {
      setInitiatingPayment(false);
      setPaymentError(err.message || 'Payment initiation failed.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      const fieldId = firstKey === 'institutionName' && !manualInstitution
        ? 'school-institution-search'
        : `field-${firstKey}`;
      document.getElementById(fieldId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    let uploadedDocumentPath = null;

    try {
      if (identityDocument) {
        uploadedDocumentPath = await uploadStudentLoanDocument(identityDocument);
      }
      const application = await submitDemoApplication({
        dateOfBirth: form.dateOfBirth,
        applicantState: form.applicantState,
        applicantDistrict: form.applicantDistrict,
        applicantCity: form.applicantCity,
        voterIdNumber: form.voterIdNumber,
        panCardNumber: form.panCardNumber,
        documentPath: uploadedDocumentPath,
        studentStatus: form.studentStatus,
        fullName: form.fullName,
        email: form.email,
        mobileNumber: form.mobileNumber,
        loanAmount: Number(form.loanAmount),
        repaymentDate: form.repaymentDate,
        loanPurpose: form.loanPurpose,
        privacyConsent: form.privacyConsent,
        demoConsent: form.termsConsent,
        institutionId: form.institutionId || null,
        institutionName: form.institutionName,
        institutionState: form.institutionState,
        institutionDistrict: form.institutionDistrict,
        institutionCity: form.institutionCity,
        institutionPinCode: form.institutionPinCode,
        institutionType: form.institutionType,
        institutionCategory: form.institutionCategory,
        platformFee: 2,
        platformFeePaid: true,
        upiUtr: form.upiUtr.trim(),
        paymentMethod: 'Razorpay Gateway',
        razorpayPaymentId: razorpayPayment?.paymentId || form.upiUtr.trim() || null,
        razorpayOrderId: razorpayPayment?.orderId || null,
        razorpaySignature: razorpayPayment?.signature || null,
      });
      if (!application?.trackingId || !application?.submittedAt) {
        throw new Error('The saved test enquiry did not include its tracking details. Please contact support before retrying.');
      }
      setSubmittedRef(application.refNumber);
      setSubmittedApplication(application);
      setLookedUpApplication(application);
      setForm(INITIAL_FORM);
      setIdentityDocument(null);
      setView('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (uploadedDocumentPath) {
        try {
          await removeStudentLoanDocument(uploadedDocumentPath);
        } catch (cleanupError) {
          console.error('[student-loan] uploaded document cleanup failed', cleanupError);
        }
      }
      setSubmitError(error.message || 'The test enquiry could not be saved. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckApps = async (e) => {
    e.preventDefault();
    setLookupError('');
    setLookedUpApplication(null);
    setLookupLoading(true);
    try {
      const application = await getDemoApplication(referenceInput.trim().toUpperCase());
      setLookedUpApplication(application);
    } catch (err) {
      setLookupError(err.message || 'Unable to retrieve the application.');
    } finally {
      setLookupLoading(false);
    }
  };

  /* ══════════════════════════════════════════════════════════
     VIEW: SUCCESS
  ══════════════════════════════════════════════════════════ */
  const [copiedId, setCopiedId] = useState(false);
  const formattedTrackingId = submittedApplication?.trackingId || '';
  const submissionTimestamp = submittedApplication?.submittedAt
    ? formatDate(submittedApplication.submittedAt)
    : '';

  const handleCopyTrackingId = async () => {
    try {
      await navigator.clipboard.writeText(formattedTrackingId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      // fallback
    }
  };

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#081525] to-[#0f1e33] text-white font-sans pb-20">
        <NavBar setCurrentView={setCurrentView} />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-16 text-center">
          <div className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-6 ring-2 ring-emerald-500/30">
            <CheckCircle2 size={42} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-white">
            Your enquiry has been submitted successfully.
          </h2>
          <p className="text-gray-300 text-sm mb-6 leading-relaxed">
            Your student loan test enquiry has been received and registered in the test database.
          </p>

          <div className="bg-[#10243B] border border-white/15 rounded-2xl p-6 mb-6 text-left space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#c5a880]">Enquiry Tracking ID</span>
              <button
                type="button"
                onClick={handleCopyTrackingId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 transition-colors"
              >
                {copiedId ? (
                  <>
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <span>Copy Tracking ID</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-xl sm:text-2xl font-bold text-white tracking-wider text-emerald-400">
                {formattedTrackingId}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                <div>
                  <span className="text-slate-400">Submission Date:</span>
                  <p className="font-medium text-white">{submissionTimestamp}</p>
                </div>
                <div>
                  <span className="text-slate-400">Current Status:</span>
                  <p className="font-bold text-blue-400">{lookedUpApplication?.status || submittedApplication?.status || APPLICATION_STATUS.SUBMITTED}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400">Internal Reference:</span>
                  <p className="font-mono text-[11px] text-slate-300 break-all">{submittedRef}</p>
                </div>
                {form.upiUtr && (
                  <div className="sm:col-span-2 pt-2 border-t border-white/10">
                    <span className="text-slate-400 block mb-0.5">Platform Verification Fee:</span>
                    <p className="font-semibold text-emerald-300 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>₹2.00 Paid via Razorpay · Payment ID: <span className="font-mono text-white font-bold">{form.upiUtr}</span></span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 text-xs text-slate-400 leading-relaxed">
              Save your Tracking ID to view real-time review progress in your private Customer Portal.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
            <button
              onClick={() => {
                try {
                  window.sessionStorage.setItem('mai_active_dashboard_tab', 'applications');
                } catch {}
                setCurrentView('client-dashboard');
              }}
              className="px-6 py-3 bg-[#c5a880] hover:bg-[#b5956a] text-[#081525] font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <FileText size={16} /> View My Applications
            </button>
            <button
              onClick={() => {
                try {
                  window.sessionStorage.setItem('mai_active_dashboard_tab', 'tracking');
                  window.sessionStorage.setItem('mai_tracking_query', formattedTrackingId);
                } catch {}
                setCurrentView('client-dashboard');
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Search size={16} /> Track Application
            </button>
            <button
              onClick={() => setCurrentView('home')}
              className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Return to Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     VIEW: MY APPLICATIONS
  ══════════════════════════════════════════════════════════ */
  if (view === 'my-apps') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#081525] to-[#0f1e33] text-white font-sans pb-20">
        <NavBar setCurrentView={setCurrentView} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-12">
          <button onClick={() => setView('info')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#876A2E] mb-6 transition-colors">
            <ArrowLeft size={14} /> Back to Loan Section
          </button>
          <h2 className="text-2xl font-extrabold mb-2">My Loan Applications</h2>
          <p className="text-gray-400 text-sm mb-6">Enter your tracking ID to view the latest status of your test enquiry.</p>

          <form onSubmit={handleCheckApps} className="bg-[#10243B] border border-white/10 rounded-2xl p-6 mb-8">
            <label className="block text-xs font-bold text-gray-300 mb-1.5" htmlFor="application-reference">Application Tracking ID</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="application-reference"
                type="text"
                value={referenceInput}
                onChange={(e) => setReferenceInput(e.target.value)}
                required
                maxLength={48}
                className="flex-1 px-4 py-2.5 bg-[#081525] border border-white/15 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#50745A]"
              />
              <button type="submit" disabled={lookupLoading} className="px-5 py-2.5 bg-[#50745A] hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                {lookupLoading ? <Loader2 size={15} className="animate-spin" /> : null}
                {lookupLoading ? 'Checking…' : 'Check Status'}
              </button>
            </div>
            {lookupError && <p role="alert" className="mt-3 text-xs text-red-300">{lookupError}</p>}
          </form>

          {lookedUpApplication && (
            <ApplicationCard app={lookedUpApplication} />
          )}
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     VIEW: APPLICATION FORM
  ══════════════════════════════════════════════════════════ */
  if (view === 'apply') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#081525] to-[#0f1e33] text-white font-sans pb-20">
        <NavBar setCurrentView={setCurrentView} />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-10">
          <button onClick={() => setView('info')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#876A2E] mb-6 transition-colors">
            <ArrowLeft size={14} /> Back to Loan Info
          </button>

          {/* Form Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 py-1.5 px-3 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold mb-3">
              <ShieldCheck size={13} /> Official Student Loan Application Desk
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Student Education Loan Application</h1>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              Apply online for fast-track student education financing. Your personal, academic, and contact details are securely transmitted to our loan facilitation desk for institutional partner lender sanction.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-8">
            <FormSection
              title="Search Your School, College or University"
              icon={<Search size={16} className="text-[#50745A]" />}
              notice="Search by institution name, state, district, city, or PIN code. Results come from the official institution catalog."
            >
              <InstitutionSearchBox
                id="global-institution-search"
                label="Institution search"
                query={institutionQuery}
                active={institutionSearchActive === 'global'}
                onFocus={() => setInstitutionSearchActive('global')}
                onChange={(value) => handleInstitutionSearchChange(value, 'global')}
                results={institutionResults}
                loading={institutionSearchLoading}
                error={institutionSearchError}
                hasMore={institutionHasMore}
                onLoadMore={loadMoreInstitutions}
                onSelect={selectInstitution}
                onManual={enableManualInstitution}
                manual={manualInstitution}
              />
              {manualInstitution && (
                <p className="text-xs text-amber-200">
                  Institution Not Listed. Enter the institution details in Student Information below.
                </p>
              )}
            </FormSection>

            {/* ── Section 1: Personal Details ── */}
            <FormSection title="Personal Information" icon={<User size={16} className="text-[#876A2E]" />}>
              <FieldGroup id="field-fullName" label="Full Name *" error={errors.fullName}>
                <input
                  id="field-fullName"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  className={inputCls(errors.fullName)}
                  autoComplete="off"
                />
              </FieldGroup>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FieldGroup id="field-dateOfBirth" label="Date of Birth *" error={errors.dateOfBirth}
                  hint={age !== null ? `Age: ${age} year${age !== 1 ? 's' : ''}` : null}>
                  <input
                    id="field-dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    max={todayDate()}
                    className={inputCls(errors.dateOfBirth)}
                  />
                  {age !== null && age < MIN_AGE && (
                    <div role="alert" className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                      <p className="flex items-start gap-2">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        Applicants under 18 cannot submit an application independently. A parent or legal guardian may make an enquiry on their behalf; no loan approval is promised.
                      </p>
                      <a
                        href="mailto:info@mehandaarmy.net?subject=Guardian-assisted%20student%20enquiry"
                        className="mt-2 inline-flex items-center gap-1.5 font-bold text-white underline underline-offset-2"
                      >
                        <Mail size={12} /> Guardian-assisted enquiry
                      </a>
                    </div>
                  )}
                </FieldGroup>

                <FieldGroup id="field-mobileNumber" label="Mobile Number *" error={errors.mobileNumber}>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm font-semibold">+91</span>
                    <input
                      id="field-mobileNumber"
                      name="mobileNumber"
                      type="tel"
                      value={form.mobileNumber}
                      onChange={handleChange}
                      maxLength={10}
                      className={`${inputCls(errors.mobileNumber)} pl-12`}
                      autoComplete="off"
                    />
                  </div>
                </FieldGroup>
              </div>

              <FieldGroup id="field-email" label="Email Address *" error={errors.email}>
                <input
                  id="field-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputCls(errors.email)}
                  autoComplete="off"
                />
              </FieldGroup>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldGroup id="field-applicantState" label="State *" error={errors.applicantState}>
                  <select
                    id="field-applicantState"
                    name="applicantState"
                    value={form.applicantState}
                    onChange={handleChange}
                    className={selectCls(errors.applicantState)}
                    required
                  >
                    <option value="">Select your state</option>
                    {APPLICANT_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </FieldGroup>
                <FieldGroup id="field-applicantDistrict" label="District *" error={errors.applicantDistrict}>
                  <input
                    id="field-applicantDistrict"
                    name="applicantDistrict"
                    type="text"
                    value={form.applicantDistrict}
                    onChange={handleChange}
                    maxLength={100}
                    className={inputCls(errors.applicantDistrict)}
                    required
                  />
                </FieldGroup>
                <FieldGroup id="field-applicantCity" label="City / Village *" error={errors.applicantCity}>
                  <input
                    id="field-applicantCity"
                    name="applicantCity"
                    type="text"
                    value={form.applicantCity}
                    onChange={handleChange}
                    maxLength={120}
                    className={inputCls(errors.applicantCity)}
                    required
                  />
                </FieldGroup>
              </div>
            </FormSection>

            {/* ── Section 2: Student Details ── */}
            <FormSection title="Student Information" icon={<GraduationCap size={16} className="text-[#50745A]" />}>
              <FieldGroup id="field-studentStatus" label="Student Status *" error={errors.studentStatus}>
                <select
                  id="field-studentStatus"
                  name="studentStatus"
                  value={form.studentStatus}
                  onChange={handleChange}
                  className={selectCls(errors.studentStatus)}
                >
                  <option value="">Select your current status</option>
                  <option value="school">School Student (Class 11–12)</option>
                  <option value="undergraduate">Undergraduate (UG)</option>
                  <option value="postgraduate">Postgraduate (PG)</option>
                  <option value="diploma">Diploma / Polytechnic</option>
                  <option value="professional">Professional Course (Law / Medicine / CA)</option>
                  <option value="vocational">Vocational / Skill Training</option>
                </select>
              </FieldGroup>

              {!manualInstitution ? (
                <>
                  <InstitutionSearchBox
                    id="school-institution-search"
                    label="School / College Name *"
                    query={institutionQuery}
                    active={institutionSearchActive === 'school'}
                    onFocus={() => setInstitutionSearchActive('school')}
                    onChange={(value) => handleInstitutionSearchChange(value, 'school')}
                    results={institutionResults}
                    loading={institutionSearchLoading}
                    error={institutionSearchError}
                    hasMore={institutionHasMore}
                    onLoadMore={loadMoreInstitutions}
                    onSelect={selectInstitution}
                    onManual={enableManualInstitution}
                    manual={manualInstitution}
                    fieldError={errors.institutionName}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block text-xs font-bold text-gray-300">
                      Filter by State
                      <input
                        type="text"
                        value={institutionFilters.state}
                        onChange={(event) => setInstitutionFilters((current) => ({ ...current, state: event.target.value }))}
                        placeholder=""
                        className={`${inputCls('')} mt-1.5`}
                        maxLength={100}
                      />
                    </label>
                    <label className="block text-xs font-bold text-gray-300">
                      Filter by District
                      <input
                        type="text"
                        value={institutionFilters.district}
                        onChange={(event) => setInstitutionFilters((current) => ({ ...current, district: event.target.value }))}
                        placeholder=""
                        className={`${inputCls('')} mt-1.5`}
                        maxLength={100}
                      />
                    </label>
                    <label className="block text-xs font-bold text-gray-300">
                      Institution Category
                      <select
                        value={institutionFilters.management}
                        onChange={(event) => setInstitutionFilters((current) => ({ ...current, management: event.target.value }))}
                        className={`${selectCls('')} mt-1.5`}
                      >
                        <option value="">Government and Private</option>
                        <option value="Government">Government</option>
                        <option value="Private">Private</option>
                      </select>
                    </label>
                  </div>
                  {form.institutionId && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-100">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      <span>
                        Verified catalog selection: {form.institutionName}, {form.institutionDistrict}, {form.institutionState} · {form.institutionCategory}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4 rounded-xl border border-white/10 bg-[#0B192C] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-amber-200">Institution Not Listed — enter details manually</p>
                    <button
                      type="button"
                      onClick={() => setManualInstitution(false)}
                      className="text-xs font-semibold text-[#50745A] underline underline-offset-2"
                    >
                      Search official catalog
                    </button>
                  </div>
                  <FieldGroup id="field-institutionName" label="School / College Name *" error={errors.institutionName}>
                    <input
                      id="field-institutionName"
                      name="institutionName"
                      type="text"
                      value={form.institutionName}
                      onChange={handleManualInstitutionChange}
                      maxLength={200}
                      className={inputCls(errors.institutionName)}
                    />
                  </FieldGroup>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldGroup id="field-institutionState" label="State / Union Territory *" error={errors.institutionState}>
                      <input
                        id="field-institutionState"
                        name="institutionState"
                        type="text"
                        value={form.institutionState}
                        onChange={handleManualInstitutionChange}
                        maxLength={100}
                        className={inputCls(errors.institutionState)}
                      />
                    </FieldGroup>
                    <FieldGroup id="field-institutionDistrict" label="District *" error={errors.institutionDistrict}>
                      <input
                        id="field-institutionDistrict"
                        name="institutionDistrict"
                        type="text"
                        value={form.institutionDistrict}
                        onChange={handleManualInstitutionChange}
                        maxLength={100}
                        className={inputCls(errors.institutionDistrict)}
                      />
                    </FieldGroup>
                    <FieldGroup id="field-institutionCity" label="City">
                      <input
                        id="field-institutionCity"
                        name="institutionCity"
                        type="text"
                        value={form.institutionCity}
                        onChange={handleManualInstitutionChange}
                        maxLength={120}
                        className={inputCls('')}
                      />
                    </FieldGroup>
                    <FieldGroup id="field-institutionPinCode" label="PIN Code" error={errors.institutionPinCode}>
                      <input
                        id="field-institutionPinCode"
                        name="institutionPinCode"
                        type="text"
                        inputMode="numeric"
                        value={form.institutionPinCode}
                        onChange={handleManualInstitutionChange}
                        maxLength={6}
                        className={inputCls(errors.institutionPinCode)}
                      />
                    </FieldGroup>
                    <FieldGroup id="field-institutionType" label="Institution Type *" error={errors.institutionType}>
                      <select
                        id="field-institutionType"
                        name="institutionType"
                        value={form.institutionType}
                        onChange={handleChange}
                        className={selectCls(errors.institutionType)}
                      >
                        <option value="">Select type</option>
                        <option value="school">School</option>
                        <option value="college">College</option>
                        <option value="university">University</option>
                        <option value="other">Recognised educational institution</option>
                      </select>
                    </FieldGroup>
                    <FieldGroup id="field-institutionCategory" label="Government / Private *" error={errors.institutionCategory}>
                      <select
                        id="field-institutionCategory"
                        name="institutionCategory"
                        value={form.institutionCategory}
                        onChange={handleChange}
                        className={selectCls(errors.institutionCategory)}
                      >
                        <option value="">Select category</option>
                        <option value="Government">Government</option>
                        <option value="Private">Private</option>
                      </select>
                    </FieldGroup>
                  </div>
                </div>
              )}

              <FieldGroup id="field-courseName" label="Course / Stream *" error={errors.courseName}>
                <input
                  id="field-courseName"
                  name="courseName"
                  type="text"
                  value={form.courseName}
                  onChange={handleChange}
                  maxLength={160}
                  className={inputCls(errors.courseName)}
                  required
                />
              </FieldGroup>
            </FormSection>

            {/* ── Section 3: Loan Details ── */}
            <FormSection title="Loan Details" icon={<IndianRupee size={16} className="text-[#876A2E]" />}>

              {/* Loan Amount Selector */}
              <FieldGroup id="field-loanAmount" label="How Much Amount Do You Need? *">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {LOAN_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => { setForm(p => ({ ...p, loanAmount: String(amt) })); setErrors(p => ({ ...p, loanAmount: '' })); }}
                      className={`py-3 px-2 rounded-xl border text-sm font-bold transition-all ${
                        form.loanAmount === String(amt)
                          ? 'border-[#876A2E] bg-[#876A2E] text-white shadow-md'
                          : 'border-white/15 bg-white/5 text-gray-300 hover:border-[#876A2E]/50 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-sm font-bold">₹{amt.toLocaleString('en-IN')}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Amount option */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-gray-400">₹</span>
                    <input
                      type="number"
                      min={100}
                      max={1000}
                      step={50}
                      value={!LOAN_AMOUNTS.includes(Number(form.loanAmount)) && form.loanAmount ? form.loanAmount : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setForm(p => ({ ...p, loanAmount: val }));
                        setErrors(p => ({ ...p, loanAmount: '' }));
                      }}
                      placeholder="Custom (₹100–₹1,000)"
                      className="w-full rounded-xl border border-white/15 bg-[#081525] py-2 pl-7 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#876A2E]"
                    />
                  </div>
                  {form.loanAmount && (
                    <span className="text-xs font-semibold text-emerald-400">
                      Selected: ₹{Number(form.loanAmount).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                {errors.loanAmount && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertTriangle size={11} />{errors.loanAmount}</p>}
              </FieldGroup>

              <FieldGroup id="field-repaymentDate" label="Preferred Repayment Date *" error={errors.repaymentDate}
                hint="Minimum 7 days from today. Final repayment schedule will be confirmed upon approval.">
                <input
                  id="field-repaymentDate"
                  name="repaymentDate"
                  type="date"
                  value={form.repaymentDate}
                  onChange={handleChange}
                  min={minRepayDate()}
                  className={inputCls(errors.repaymentDate)}
                />
              </FieldGroup>

              <FieldGroup id="field-loanPurpose" label="Loan Purpose" error={errors.loanPurpose}>
                <textarea
                  id="field-loanPurpose"
                  name="loanPurpose"
                  value={form.loanPurpose}
                  onChange={handleChange}
                  rows={3}
                  className={inputCls(errors.loanPurpose) + ' resize-none'}
                />
              </FieldGroup>
            </FormSection>

            {/* ── Section 4: KYC Verification Status ── */}
            <FormSection
              title="Government ID Details"
              icon={<BadgeCheck size={16} className="text-blue-400" />}
              notice="Enter only the requested Voter ID and PAN details. Uploaded files are stored in a private bucket and are accessible only to the account owner and authorized server processes."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup id="field-voterIdNumber" label="Voter ID Number *" error={errors.voterIdNumber}>
                  <input
                    id="field-voterIdNumber"
                    name="voterIdNumber"
                    type="text"
                    value={form.voterIdNumber}
                    onChange={handleGovernmentIdChange}
                    maxLength={10}
                    autoCapitalize="characters"
                    className={inputCls(errors.voterIdNumber)}
                    required
                  />
                </FieldGroup>
                <FieldGroup id="field-panCardNumber" label="PAN Card Number *" error={errors.panCardNumber}>
                  <input
                    id="field-panCardNumber"
                    name="panCardNumber"
                    type="text"
                    value={form.panCardNumber}
                    onChange={handleGovernmentIdChange}
                    maxLength={10}
                    autoCapitalize="characters"
                    className={inputCls(errors.panCardNumber)}
                    required
                  />
                </FieldGroup>
              </div>
              <FieldGroup id="field-identityDocument" label="Supporting ID Proof (Photo or PDF)" error={errors.identityDocument}
                hint="Optional. JPEG, PNG, WebP, or PDF; maximum 5 MB.">
                <input
                  id="field-identityDocument"
                  name="identityDocument"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleIdentityDocumentChange}
                  className={`${inputCls(errors.identityDocument)} file:mr-3 file:rounded-lg file:border-0 file:bg-[#50745A] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white`}
                />
              </FieldGroup>
            </FormSection>

            {/* ── Section 5: Consent ── */}
            <FormSection title="Consent & Acknowledgements" icon={<FileText size={16} className="text-[#50745A]" />}>
              <div className="space-y-4">
                <ConsentField
                  id="privacyConsent"
                  name="privacyConsent"
                  checked={form.privacyConsent}
                  onChange={handleChange}
                  error={errors.privacyConsent}
                  label={
                    <>I have read the <strong className="text-white">Privacy Notice</strong> and consent to my personal, contact, academic, and identity details being securely processed for loan appraisal. Any supporting ID proof upload is stored securely in access-controlled storage.</>
                  }
                />
                <ConsentField
                  id="termsConsent"
                  name="termsConsent"
                  checked={form.termsConsent}
                  onChange={handleChange}
                  error={errors.termsConsent}
                  label={
                    <>I understand that Mehanda Army Investments is a loan facilitation platform and final sanction and disbursement are subject to partner bank/NBFC underwriting criteria and document verification.</>
                  }
                />
              </div>
            </FormSection>

            {/* Submit Error */}
            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                {submitError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || (age !== null && age < MIN_AGE)}
              className="w-full py-4 bg-[#876A2E] hover:bg-[#725522] disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.98]"
            >
              {submitting ? (
                <><Loader2 size={18} className="animate-spin" /> Submitting Application…</>
              ) : (
                age !== null && age < MIN_AGE
                  ? <><ShieldAlert size={18} /> Guardian Enquiry Required</>
                  : <><GraduationCap size={18} /> Submit Application</>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     VIEW: INFO (Landing)
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#081525] via-[#10243B] to-[#081525] text-white font-sans">
      <NavBar setCurrentView={setCurrentView} />

      {/* Hero */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-[#876A2E] opacity-5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-[#50745A] opacity-5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* Portal Information Banner */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="flex items-center gap-2 py-2 px-4 rounded-full bg-amber-500/10 border border-amber-500/30 text-[#876A2E] text-xs font-bold">
              <AlertTriangle size={14} />
              STUDENT ENQUIRY PORTAL — Information & Verification Only
            </div>
          </div>

          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#876A2E] to-[#876A2E] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
              <GraduationCap size={30} className="text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#50745A] block mb-3">
              Small Loan for Students
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Student Small Loan
            </h1>
            <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Student loan enquiry portal for amounts up to <strong className="text-white">₹1,000</strong>. Verified submission through the authenticated customer portal.
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
            {[
              { label: 'Max Loan',      value: '₹1,000',    color: 'text-[#876A2E]' },
              { label: 'Min Age',       value: '18 Years',  color: 'text-[#50745A]' },
              { label: 'Repayment',     value: '30 Days',   color: 'text-blue-400'  },
              { label: 'Process Time',  value: 'Not active', color: 'text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className={`text-2xl font-extrabold ${color} mb-1`}>{value}</p>
                <p className="text-xs text-gray-400 font-semibold">{label}</p>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => { setView('apply'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="px-8 py-4 bg-[#876A2E] hover:bg-[#725522] text-white font-extrabold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.98]"
            >
              <GraduationCap size={18} /> Apply for Loan
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setView('my-apps')}
              className="px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              <Eye size={16} /> Check My Application
            </button>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">

            {/* Eligibility */}
            <InfoCard
              title="Eligibility Criteria"
              icon={<CheckCircle2 size={18} className="text-[#50745A]" />}
              accent="border-[#50745A]/30"
            >
              <ul className="space-y-2.5">
                {LOAN_TERMS.eligibility.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle2 size={14} className="text-[#50745A] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </InfoCard>

            {/* Loan Amounts */}
            <InfoCard
              title="Available Loan Amounts"
              icon={<IndianRupee size={18} className="text-[#876A2E]" />}
              accent="border-[#876A2E]/30"
            >
              <div className="grid grid-cols-3 gap-3 mb-4">
                {LOAN_AMOUNTS.map((amt) => (
                  <div key={amt} className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                    <p className="text-lg font-extrabold text-[#876A2E]">₹{amt}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Maximum loan amount is ₹1,000. Amount selection is subject to review and approval. No partial amounts available at this time.
              </p>
            </InfoCard>

            {/* Repayment Terms */}
            <InfoCard
              title="Repayment Terms"
              icon={<Clock size={18} className="text-blue-400" />}
              accent="border-blue-400/30"
            >
              <div className="space-y-3 text-sm">
                <TermRow label="Repayment Period"  value={LOAN_TERMS.repaymentDays} />
                <TermRow label="Charges"           value={LOAN_TERMS.serviceFee} />
                <TermRow label="Processing"       value={LOAN_TERMS.processingTime} />
                <TermRow label="Disbursement"     value="Direct institutional bank transfer" />
              </div>
            </InfoCard>

            {/* Charges & Approvals */}
            <InfoCard
              title="Charges & Approval Process"
              icon={<ShieldAlert size={18} className="text-amber-400" />}
              accent="border-amber-400/30"
            >
              <ul className="space-y-2.5">
                {[
                  'Zero upfront advance application fees.',
                  'Transparent interest rates and flexible repayment schedules.',
                  'Evaluation coordinated directly with institutional partner lenders.',
                  'Sanctions are subject to KYC verification and institutional criteria.',
                  'Paperless digital workflow with live SMS and tracking updates.',
                  'Disbursal executed directly by partner bank/NBFC to verified account.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <Info size={12} className="text-amber-400 shrink-0 mt-1" />
                    {item}
                  </li>
                ))}
              </ul>
            </InfoCard>
          </div>

          {/* Compliance Notice */}
          <div className="bg-[#10243B] border border-white/10 rounded-2xl p-6 mb-12">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <ShieldAlert size={16} className="text-[#876A2E]" /> Legal & Compliance Notice
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Mehanda Army Investments operates strictly as a digital loan facilitation and referral platform connecting applicants with government & RBI-registered lenders. We do not provide direct loans or credit from our own balance sheet. All loan facilities, underwriting, and disbursements are executed exclusively by partner financial institutions. This enquiry system is for pre-assessment and facilitation only.
            </p>
          </div>

          {/* Privacy Notice */}
          <div className="bg-[#0B192C] border border-white/10 rounded-2xl p-6 text-xs text-gray-400 leading-relaxed">
            <p className="font-bold text-white mb-2 flex items-center gap-2"><Lock size={13} /> Privacy Notice</p>
            <p>This DIGITAL LOAN FACILITATION SYSTEM stores the applicant name, date of birth, registered email, contact number, state, district, city or village, Voter ID number, PAN card number, loan amount, student status, course, enquiry purpose, repayment preference, institution details, consent records, and workflow status in a private account-linked database record. Optional supporting ID proof uploads are kept in a private Supabase Storage bucket. These sensitive details are not included in the customer tracking response; database record reads are restricted by row-level security and column grants, and document uploads are restricted to the owner&apos;s storage folder. Aadhaar and bank details are not requested. Institution details entered manually are not independently verified. For access or data deletion requests, contact <a href="mailto:info@mehandaarmy.net?subject=Student%20loan%20data%20request" className="text-[#50745A] underline">info@mehandaarmy.net</a>; requests will be verified before an authorised administrator handles them.</p>
          </div>

        </div>
      </section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */

function NavBar({ setCurrentView }) {
  return (
    <div className="bg-[#10243B]/80 backdrop-blur border-b border-white/10 sticky top-0 z-40 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <button
        onClick={() => setCurrentView('home')}
        className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Mehanda Army Investments
      </button>
      <LiveDateTime className="order-3 w-full justify-center sm:order-2 sm:w-auto" />
      <div className="flex items-center gap-2 text-xs font-bold text-[#876A2E] bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full">
        <GraduationCap size={13} /> Student Small Loan
      </div>
    </div>
  );
}

function InstitutionSearchBox({
  id,
  label,
  query,
  active,
  onFocus,
  onChange,
  results,
  loading,
  error,
  hasMore,
  onLoadMore,
  onSelect,
  onManual,
  manual,
  fieldError
}) {
  const searchReady = query.trim().length >= 3;

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-gray-300">{label}</label>
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-gray-400" aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={query}
          onFocus={onFocus}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search your School, College or University..."
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={active && searchReady && !manual}
          aria-controls={`${id}-results`}
          className={`${inputCls(fieldError)} py-3 pl-10`}
        />
      </div>
      {fieldError && (
        <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-red-400">
          <AlertTriangle size={11} />{fieldError}
        </p>
      )}
      {active && !manual && !searchReady && query.trim().length > 0 && (
        <p className="mt-2 text-xs text-gray-400">Enter at least 3 letters or numbers to search.</p>
      )}
      {manual && (
        <p className="mt-2 text-xs text-amber-200">
          Institution Not Listed. Enter details manually below.
        </p>
      )}
      {active && !manual && searchReady && (
        <div
          id={`${id}-results`}
          role="listbox"
          aria-label="Institution search results"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-white/15 bg-[#081525] p-2 shadow-2xl"
        >
          {loading && results.length === 0 && (
            <p className="flex items-center gap-2 px-3 py-3 text-xs text-gray-300">
              <Loader2 size={14} className="animate-spin" /> Searching official institution catalog…
            </p>
          )}
          {error && <p role="alert" className="px-3 py-3 text-xs text-red-300">{error}</p>}
          {!loading && !error && results.length === 0 && (
            <p className="px-3 py-3 text-xs text-gray-300">No results found.</p>
          )}
          {results.map((institution) => (
            <button
              key={institution.id}
              type="button"
              role="option"
              aria-selected="false"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(institution)}
              className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/10 focus:bg-white/10 focus:outline-none"
            >
              <span className="block text-sm font-semibold text-white">{institution.name}</span>
              <span className="mt-1 flex items-start gap-1.5 text-xs text-gray-400">
                <MapPin size={12} className="mt-0.5 shrink-0" />
                {[institution.city, institution.district, institution.state, institution.pinCode]
                  .filter(Boolean)
                  .join(', ')}
              </span>
              <span className="mt-1 inline-block rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#d9c594]">
                {institution.category} · {institution.type}
              </span>
            </button>
          ))}
          {hasMore && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onLoadMore}
              disabled={loading}
              className="mt-1 w-full rounded-lg px-3 py-2 text-center text-xs font-bold text-[#50745A] hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load more institutions'}
            </button>
          )}
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onManual}
            className="mt-1 w-full rounded-lg border-t border-white/10 px-3 py-3 text-left text-xs font-bold text-amber-200 hover:bg-white/10"
          >
            Institution Not Listed — enter manually
          </button>
        </div>
      )}
    </div>
  );
}

function FormSection({ title, icon, notice, children }) {
  return (
    <div className="bg-[#10243B] border border-white/10 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      {notice && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 flex items-start gap-2">
          <Info size={12} className="shrink-0 mt-0.5" />{notice}
        </div>
      )}
      {children}
    </div>
  );
}

function FieldGroup({ id, label, error, hint, children }) {
  return (
    <div id={`${id}-group`}>
      <label htmlFor={id} className="block text-xs font-bold text-gray-300 mb-1.5">{label}</label>
      {children}
      {hint && !error && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}
    </div>
  );
}

function ConsentField({ id, name, checked, onChange, label, error }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="mt-0.5 h-4 w-4 rounded border-white/30 bg-[#081525] accent-[#50745A] cursor-pointer shrink-0"
        />
        <span className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">{label}</span>
      </label>
      {error && <p className="text-xs text-red-400 mt-1.5 ml-7 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}
    </div>
  );
}

function InfoCard({ title, icon, accent = '', children }) {
  return (
    <div className={`bg-[#10243B] border rounded-2xl p-6 ${accent || 'border-white/10'}`}>
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">{icon}{title}</h3>
      {children}
    </div>
  );
}

function TermRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 text-xs shrink-0">{label}</span>
      <span className="text-white text-xs font-semibold text-right">{value}</span>
    </div>
  );
}

function StatusRow({ label, value, color }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className={`text-xs font-semibold ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}

function ApplicationCard({ app }) {
  return (
    <div className="bg-[#10243B] border border-white/10 rounded-2xl p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400">Tracking ID</p>
          <p className="font-mono text-sm font-bold text-white">{app.trackingId}</p>
          <p className="text-xs text-gray-400 mt-0.5">Submitted {formatDate(app.submittedAt)}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusColor(app.status)}`}>
          {app.status}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-white/10">
        <div><p className="text-gray-500 mb-0.5">Amount</p><p className="font-bold text-white">₹{app.loanAmount}</p></div>
        <div><p className="text-gray-500 mb-0.5">Repayment Date</p><p className="font-bold text-white">{app.repaymentDate}</p></div>
      </div>
      <p className="text-[11px] text-gray-500">Application status is updated by our loan facilitation desk in coordination with partner lenders.</p>
    </div>
  );
}

/* ─── Input class helpers ───────────────────────────────────── */
function inputCls(error) {
  return `w-full px-4 py-2.5 bg-[#081525] border ${error ? 'border-red-500/60' : 'border-white/15'} rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500/40' : 'focus:ring-[#50745A]/50'} transition-all`;
}

function selectCls(error) {
  return `w-full px-4 py-2.5 bg-[#081525] border ${error ? 'border-red-500/60' : 'border-white/15'} rounded-xl text-sm text-white focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500/40' : 'focus:ring-[#50745A]/50'} transition-all`;
}
