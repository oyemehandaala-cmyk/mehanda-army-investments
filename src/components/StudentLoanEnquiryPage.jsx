import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  FileText,
  Loader2,
  MapPin,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  Home,
  Check,
  AlertCircle,
  FileCheck,
  Edit2,
  Image,
  Lock,
  IndianRupee,
  PenLine,
  QrCode,
  Smartphone,
  CreditCard,
  X,
  AlertTriangle,
} from 'lucide-react';
import INDIA_LOCATION_DATA from '../data/indiaLocations.json';
import {
  getDemoApplication,
  getStudentLoanCities,
  searchStudentLoanInstitutions,
  submitDemoApplication,
  uploadStudentLoanDocument,
  removeStudentLoanDocument,
  createSyntheticSampleFile,
  MAX_TEST_DOCUMENT_SIZE,
} from '../lib/studentLoanService';
import EmailOtpVerification from './EmailOtpVerification.jsx';
import StudentLoanTrackingCard from './StudentLoanTrackingCard.jsx';
import CustomerDocumentsSection from './CustomerDocumentViewer.jsx';
import { authService } from '../lib/supabaseClient';
import { loadRazorpayScript, createPaymentOrder, verifyPaymentSignature } from '../lib/paymentService';

const FIELD_CLASS = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#9b7a35] focus:ring-2 focus:ring-[#9b7a35]/15 disabled:bg-slate-100';
const LABEL_CLASS = 'block text-sm font-semibold text-slate-800';
const getFieldClass = (hasError) =>
  `${FIELD_CLASS} ${hasError ? 'border-red-500 ring-2 ring-red-200 bg-red-50/20 text-red-950 focus:border-red-500 focus:ring-red-200' : ''}`;

const QUALIFICATION_OPTIONS = [
  "Senior Secondary (10+2 / 12th)",
  "Diploma / Polytechnic",
  "Undergraduate (B.Tech / B.Sc / B.Com / BA / BCA / BBA / MBBS)",
  "Postgraduate (M.Tech / MBA / M.Sc / M.Com / MCA)",
  "Secondary (10th Standard)",
  "Doctorate / PhD",
  "Professional Certification / Other",
];

const PASSING_YEAR_OPTIONS = [
  '2028', '2027', '2026', '2025', '2024', '2023', '2022', '2021', '2020', 'Prior to 2020'
];

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return '';
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  if (!year || !month || !day) return '';
  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) age -= 1;
  return age >= 0 ? age : '';
}

function normalizedName(value) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-IN');
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

export default function StudentLoanEnquiryPage({
  user,
  applications = [],
  applicationsLoading = false,
  applicationsError = '',
  onRefreshApplications,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState('application'); // 'application' | 'tracking'
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
    verificationName: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: '',
    guardianConsent: false,

    // Step 2: Photo, Education and Loan Amount Details
    photoUrl: user?.avatarUrl || '',
    photoFileName: '',
    qualification: '',
    institutionName: '',
    courseName: '',
    passingYear: '',
    educationNotes: '',
    loanAmount: '',
    isCustomAmount: false,
    customAmount: '',

    // Step 3: Documents (All 4 Mandatory)
    documents: {
      studentId: null,
      signature: null,
      addressProof: null,
      academicMarksheet: null,
    },

    // Step 5: Consents & Verification Fee
    accuracyConsent: false,
    privacyConsent: false,
    enquiryAcknowledgement: false,
    upiUtr: '',
    platformFeePaid: false,
  }));

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [razorpayPayment, setRazorpayPayment] = useState(null);
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [emailVerification, setEmailVerification] = useState(() => ({
    isVerified: false,
    verifiedEmail: '',
    verifiedAt: null,
    token: '',
  }));

  // Location suggestions
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [citySuggestionsError, setCitySuggestionsError] = useState('');
  const [cityNotListed, setCityNotListed] = useState(false);

  // Institution suggestions
  const [institutionSuggestions, setInstitutionSuggestions] = useState([]);
  const [institutionSearchError, setInstitutionSearchError] = useState('');
  const [institutionNotListed, setInstitutionNotListed] = useState(false);

  // Sample document / test document upload for backend compatibility
  const [backendDocument, setBackendDocument] = useState(null);
  const [slotProgress, setSlotProgress] = useState({});
  const [slotUploading, setSlotUploading] = useState({});

  // Final saved application
  const [savedApplication, setSavedApplication] = useState(null);

  // Tracking tab
  const [trackingId, setTrackingId] = useState('');
  const [trackedApplication, setTrackedApplication] = useState(null);
  const [trackingError, setTrackingError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  const age = calculateAge(form.dateOfBirth);
  const isMinor = Number.isInteger(age) && age < 18;

  const selectedState = useMemo(
    () => INDIA_LOCATION_DATA.states.find(
      (item) => item.name.toLowerCase() === (form.state || '').trim().toLowerCase()
    ),
    [form.state]
  );
  const availableDistricts = selectedState?.districts || [];

  const nameMismatch = Boolean(
    form.verificationName.trim() &&
    normalizedName(form.fullName) !== normalizedName(form.verificationName)
  );

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryTrack = urlParams.get('track') || window.sessionStorage?.getItem('mai_tracking_query');
      if (queryTrack && typeof queryTrack === 'string') {
        const cleanTrack = queryTrack.trim().toUpperCase();
        setTrackingId(cleanTrack);
        setActiveTab('tracking');
        window.sessionStorage?.removeItem('mai_tracking_query');

        if (applications?.length) {
          const match = applications.find(
            (a) => (a.trackingId || '').toUpperCase() === cleanTrack || (a.refNumber || '').toUpperCase() === cleanTrack
          );
          if (match) {
            setTrackedApplication(match);
            return;
          }
        }

        setTrackingLoading(true);
        getDemoApplication(cleanTrack)
          .then((app) => {
            setTrackedApplication(app);
            setTrackingError('');
          })
          .catch((err) => {
            setTrackingError(err.message || 'No enquiry found with this Tracking ID for your signed-in account.');
          })
          .finally(() => setTrackingLoading(false));
      }
    } catch (_) {}
  }, [applications]);

  useEffect(() => {
    if (!selectedState || !form.district) {
      setCitySuggestions([]);
      setCitySuggestionsError('');
      return undefined;
    }
    const controller = new AbortController();
    getStudentLoanCities(form.state, form.district, { signal: controller.signal })
      .then((result) => {
        setCitySuggestions(result.cities || []);
        setCitySuggestionsError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setCitySuggestions([]);
          setCitySuggestionsError('City suggestions are unavailable; enter your city manually.');
        }
      });
    return () => controller.abort();
  }, [selectedState, form.state, form.district]);

  useEffect(() => {
    const query = form.institutionName.trim();
    if (institutionNotListed || query.length < 3) {
      setInstitutionSuggestions([]);
      setInstitutionSearchError('');
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchStudentLoanInstitutions({ query, signal: controller.signal })
        .then((result) => {
          setInstitutionSuggestions(result.results || []);
          setInstitutionSearchError('');
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            setInstitutionSuggestions([]);
            setInstitutionSearchError('Institution catalog search unavailable; enter name manually.');
          }
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.institutionName, institutionNotListed]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
  };

  const updateState = (value) => {
    setForm((current) => ({ ...current, state: value, district: '', city: '' }));
    setCitySuggestions([]);
    setCityNotListed(false);
    setFieldErrors((current) => ({ ...current, state: '', district: '', city: '' }));
  };

  const updateDistrict = (value) => {
    setForm((current) => ({ ...current, district: value, city: '' }));
    setCitySuggestions([]);
    setCityNotListed(false);
    setFieldErrors((current) => ({ ...current, district: '', city: '' }));
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const errors = {};
    if (!form.fullName || form.fullName.trim().length < 3) {
      errors.fullName = 'Enter your legal full name (at least 3 characters).';
    }
    if (!form.dateOfBirth || !Number.isInteger(age) || age < 1 || age > 120) {
      errors.dateOfBirth = 'Choose a valid date of birth.';
    } else if (age < 18) {
      if (!form.guardianName || form.guardianName.trim().length < 2) {
        errors.guardianName = 'Parent or legal guardian name is required for applicants under 18.';
      }
      if (!/^(?:\+91[- ]?)?[6-9]\d{9}$/.test(form.guardianPhone.trim())) {
        errors.guardianPhone = 'Enter a valid 10-digit Indian mobile number for the guardian.';
      }
      if (!form.guardianRelationship || form.guardianRelationship.trim().length < 2) {
        errors.guardianRelationship = 'Specify relationship to student (e.g., Father, Mother, Guardian).';
      }
      if (!form.guardianConsent) {
        errors.guardianConsent = 'Parent / Guardian consent is required.';
      }
    }
    if (!/^(?:\+91[- ]?)?[6-9]\d{9}$/.test(form.mobileNumber.trim())) {
      errors.mobileNumber = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Enter a valid registered email address.';
    } else if (user?.email && form.email.trim().toLowerCase() !== user.email.toLowerCase()) {
      errors.email = 'Email must match your authenticated customer account.';
    } else if (
      !emailVerification.isVerified ||
      !emailVerification.verifiedEmail ||
      emailVerification.verifiedEmail.toLowerCase() !== form.email.trim().toLowerCase()
    ) {
      errors.email = 'Please verify your Gmail / email address with OTP before proceeding.';
    }
    if (!selectedState && !form.state.trim()) {
      errors.state = 'Select a State / Union Territory from the official directory.';
    }
    if (!form.district || !form.district.trim()) {
      errors.district = 'Select your district.';
    }
    if (!form.city || form.city.trim().length < 2) {
      errors.city = 'Enter your city, town, or village (at least 2 characters).';
    }
    if (!form.address || form.address.trim().length < 5) {
      errors.address = 'Enter your complete residential address (at least 5 characters).';
    }
    if (!form.pinCode || !/^\d{6}$/.test(form.pinCode.trim())) {
      errors.pinCode = 'PIN code is required (6-digit postal code).';
    }
    if (nameMismatch) {
      errors.verificationName = 'Names do not match after space and letter-case normalization.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errors = {};
    if (!form.qualification) {
      errors.qualification = 'Select your highest education qualification.';
    }
    if (!form.institutionName || form.institutionName.trim().length < 2) {
      errors.institutionName = 'Enter the name of your school, college, or university.';
    }
    if (!form.courseName || form.courseName.trim().length < 2) {
      errors.courseName = 'Enter your enrolled course or degree stream.';
    }
    if (!form.passingYear) {
      errors.passingYear = 'Select passing or expected completion year.';
    }
    if (!form.loanAmount) {
      errors.loanAmount = 'Please select how much amount you need (between ₹100 and ₹1,000).';
    } else {
      const amt = Number(form.loanAmount);
      if (Number.isNaN(amt) || amt < 100 || amt > 1000) {
        errors.loanAmount = 'Loan enquiry amount must be between ₹100 and ₹1,000.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 3 Validation: Mandatory Document Checklist (All 4 Mandatory)
  const validateStep3 = () => {
    const errors = {};
    if (!form.documents.studentId?.confirmed) {
      errors.studentId = 'Student Verification Document is required (Student ID, admission confirmation, or fee receipt).';
    }
    if (!form.documents.signature?.confirmed) {
      errors.signature = 'Student Specimen Signature Note is required (specimen signature or authorization document).';
    }
    if (!form.documents.addressProof?.confirmed) {
      errors.addressProof = 'Residential Address Proof is required (valid residential address proof document).';
    }
    if (!form.documents.academicMarksheet?.confirmed && !form.documents.educationCertificate?.confirmed) {
      errors.academicMarksheet = 'Academic Marksheet / Certificate is required (relevant academic record).';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 5 Validation
  const validateStep5 = () => {
    const errors = {};
    if (!form.accuracyConsent) {
      errors.accuracyConsent = 'Please confirm that all submitted details are accurate.';
    }
    if (!form.privacyConsent) {
      errors.privacyConsent = 'You must accept the Privacy Policy to proceed.';
    }
    if (!form.enquiryAcknowledgement) {
      errors.enquiryAcknowledgement = 'Please acknowledge that this is an enquiry, not an automatic loan approval.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Official Razorpay Checkout for ₹2 Platform Fee
  const handlePayWithRazorpay = async () => {
    setPaymentError('');
    setSubmitError('');
    setInitiatingPayment(true);
    try {
      const { accessToken, error: sessionError } = await authService.getAccessToken();
      if (sessionError || !accessToken) {
        throw new Error('Please ensure you are signed in with a verified account before initiating payment.');
      }

      // Step 1: Create order on server (₹2)
      const order = await createPaymentOrder({
        serviceId: 'srv_student_loan_fee',
        customAmount: 2,
        customerName: (form.fullName || '').trim() || 'Student Applicant',
        customerEmail: (form.email || '').trim() || '',
        customerPhone: (form.mobileNumber || '').trim() || '',
        accessToken
      });

      if (!order?.success) {
        throw new Error(order?.error || 'Unable to initialize Razorpay transaction. Please verify server keys.');
      }

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay Checkout SDK could not be loaded. Please check your internet connection.');
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
          color: '#0B1A2C'
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
              throw new Error(verifyResult?.error || 'Payment signature verification failed. Please contact support.');
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

            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.upiUtr;
              return next;
            });
            setPaymentError('');
          } catch (verifyErr) {
            setPaymentError(verifyErr.message || 'Signature verification error. Payment ID: ' + response.razorpay_payment_id);
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
        setPaymentError(resp.error?.description || 'Payment was unsuccessful or cancelled. Please try again.');
      });
      rzp.open();
    } catch (err) {
      setInitiatingPayment(false);
      setPaymentError(err.message || 'Payment initiation failed.');
    }
  };

  // Photo upload handling (Step 2)
  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFieldErrors((current) => ({ ...current, photo: 'Select an image file (JPG, JPEG, PNG, WebP).' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((current) => ({ ...current, photo: 'Profile photo must be 5 MB or smaller.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        photoUrl: reader.result,
        photoFileName: file.name,
      }));
      setFieldErrors((current) => ({ ...current, photo: '' }));
    };
    reader.readAsDataURL(file);
  };

  // Document upload handler (Step 3: Backend confirmed upload with progress)
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
        [slotKey]: 'Format validation failed: Only JPG, JPEG, PNG, and PDF documents are supported.',
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
      const doc = await uploadStudentLoanDocument(file, (pct) => {
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
      setBackendDocument(doc);
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
        await removeStudentLoanDocument(existing.path);
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

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step === 4 && (!validateStep1() || !validateStep2() || !validateStep3())) return;
    setStep((current) => Math.min(current + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setStep((current) => Math.max(current - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Form Submission
  const handleFinalSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep5()) return;
    if (!emailVerification.isVerified || !emailVerification.verifiedEmail || emailVerification.verifiedEmail.toLowerCase() !== form.email.trim().toLowerCase()) {
      setSubmitError('Please verify your Gmail / email address with OTP before submitting.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const formattedAddress = form.pinCode
        ? `${form.address.trim()}, PIN: ${form.pinCode.trim()}`
        : form.address.trim();

      const combinedCourse = form.qualification
        ? `${form.qualification} - ${form.courseName.trim()}${form.passingYear ? ` (${form.passingYear})` : ''}`
        : form.courseName.trim();

      const payload = {
        idempotencyKey,
        fullName: form.fullName.trim(),
        verificationName: form.verificationName.trim() || null,
        dateOfBirth: form.dateOfBirth,
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        applicantState: form.state,
        applicantDistrict: form.district,
        applicantCity: form.city.trim(),
        applicantAddress: formattedAddress,
        institutionName: form.institutionName.trim(),
        courseName: combinedCourse,
        loanAmount: Number(form.loanAmount),
        requestedAmount: Number(form.loanAmount),
        privacyConsent: true,
        guardianName: isMinor ? form.guardianName.trim() : null,
        guardianPhone: isMinor ? form.guardianPhone.trim() : null,
        guardianRelationship: isMinor ? form.guardianRelationship.trim() : null,
        guardianConsent: isMinor && form.guardianConsent,
        document: backendDocument || (form.documents.studentId?.confirmed ? form.documents.studentId : null),
        documents: form.documents,
        // Enhanced multi-step metadata
        qualification: form.qualification || null,
        passingYear: form.passingYear || null,
        pinCode: form.pinCode.trim() || null,
        educationNotes: form.educationNotes.trim() || null,
        emailVerificationToken: emailVerification.token || undefined,
        verifiedEmail: emailVerification.verifiedEmail || undefined,
        emailVerifiedAt: emailVerification.verifiedAt || undefined,
        platformFee: 2,
        platformFeePaid: true,
        upiUtr: form.upiUtr ? form.upiUtr.trim() : (razorpayPayment?.paymentId || null),
        paymentMethod: 'Razorpay Gateway',
        razorpayPaymentId: razorpayPayment?.paymentId || form.upiUtr || null,
        razorpayOrderId: razorpayPayment?.orderId || null,
        razorpaySignature: razorpayPayment?.signature || null,
      };

      const application = await submitDemoApplication(payload);
      if (!application?.trackingId || !application?.submittedAt) {
        throw new Error('Database did not return a confirmed tracking reference. Please retry.');
      }

      setSavedApplication(application);
      setActiveTab('success');
      await onRefreshApplications?.();
    } catch (error) {
      setSubmitError(error.message || 'The enquiry could not be saved. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Tracking Lookup
  const handleTrack = async (event) => {
    event.preventDefault();
    setTrackingError('');
    setTrackedApplication(null);
    setTrackingLoading(true);
    try {
      const application = await getDemoApplication(trackingId.trim().toUpperCase());
      setTrackedApplication(application);
    } catch (error) {
      setTrackingError(error.message || 'No enquiry found with this Tracking ID for your signed-in account.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCopyTrackingId = async () => {
    try {
      await navigator.clipboard.writeText(savedApplication.trackingId);
      setCopyMessage('Tracking ID copied to clipboard!');
      setTimeout(() => setCopyMessage(''), 3000);
    } catch {
      setCopyMessage('Could not copy automatically. Please select and copy manually.');
    }
  };

  const startNewEnquiry = () => {
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
      verificationName: '',
      guardianName: '',
      guardianPhone: '',
      guardianRelationship: '',
      guardianConsent: false,
      photoUrl: user?.avatarUrl || '',
      photoFileName: '',
      qualification: '',
      institutionName: '',
      courseName: '',
      passingYear: '',
      educationNotes: '',
      documents: {
        signature: null,
        addressProof: null,
        studentId: null,
        educationCertificate: null,
        otherSupporting: null,
      },
      accuracyConsent: false,
      privacyConsent: false,
      enquiryAcknowledgement: false,
    });
    setStep(1);
    setSavedApplication(null);
    setSubmitError('');
    setFieldErrors({});
    setIdempotencyKey(crypto.randomUUID());
    setActiveTab('application');
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
            <GraduationCap size={14} /> Student Loan Services
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-[#10243B]">Student Loan Enquiry</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Submit your student loan enquiry through our structured 5-step application. Each submission is assigned an official Tracking Reference.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('application')}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'application'
                ? 'bg-[#10243B] text-white shadow-sm'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            New Application
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('tracking');
              setTrackingId('');
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'tracking'
                ? 'bg-[#10243B] text-white shadow-sm'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <MapPin size={15} /> Track Enquiry
          </button>
        </div>
      </div>

      {/* SUCCESS SCREEN */}
      {activeTab === 'success' && savedApplication && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 shadow-sm sm:p-10">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <CheckCircle2 size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
                Application Received
              </span>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Enquiry Submitted Successfully</h2>
              <p className="mt-1 text-sm text-slate-600">
                Your student loan enquiry has been registered in the database. Use your official Tracking Reference below to monitor verification status.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Official Tracking Reference</p>
                  <p className="font-mono text-2xl font-black text-[#10243B]">{savedApplication.trackingId}</p>
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

              <div className="mt-6 grid gap-4 rounded-2xl border border-emerald-200/70 bg-white/70 p-5 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Applicant</dt>
                  <dd className="font-semibold text-slate-900">{form.fullName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Requested Amount</dt>
                  <dd className="font-bold text-[#876A2E]">₹{Number(savedApplication.loanAmount || form.loanAmount || 0).toLocaleString('en-IN')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Submission Date</dt>
                  <dd className="font-semibold text-slate-900">{formatStatusDate(savedApplication.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Initial Status</dt>
                  <dd className="inline-flex items-center gap-1 font-bold text-blue-700">
                    <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                    {savedApplication.status || 'Submitted'}
                  </dd>
                </div>
              </div>

              {form.upiUtr && (
                <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/70 p-3.5 text-xs text-emerald-950 flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                    <span>Platform Verification Fee (₹2.00) Paid via Razorpay</span>
                  </span>
                  <span className="font-mono font-bold bg-white px-2.5 py-1 rounded-md border border-emerald-300 text-emerald-900">
                    Payment ID: {form.upiUtr}
                  </span>
                </div>
              )}

              {/* Uploaded Documents List & Viewer */}
              <CustomerDocumentsSection
                documents={form.documents || savedApplication.documents}
                singleDoc={savedApplication.document || savedApplication.documentMetadata}
                title="Attached Application Documents (Images & PDFs)"
                subtitle="Confirmed digital copies securely attached to your submitted application."
              />

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                <strong>Important Notice:</strong> This tracking reference confirms an enquiry record only. It is not a loan sanction or approval. Final eligibility and processing remain subject to institutional verification and regulatory approvals.
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTrackingId(savedApplication.trackingId);
                    setTrackedApplication(savedApplication);
                    setActiveTab('tracking');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 shadow-sm transition"
                >
                  <MapPin size={16} /> Track Live Progress
                </button>
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
            <h2 className="text-xl font-bold text-[#10243B]">Track Submitted Enquiry</h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter your tracking reference (e.g. MAI-2026-000001) to look up real-time enquiry review status.
            </p>
            <form onSubmit={handleTrack} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                aria-label="Tracking ID"
                className={`${FIELD_CLASS} mt-0 flex-1 font-mono uppercase`}
                value={trackingId}
                onChange={(event) => setTrackingId(event.target.value)}
                placeholder=""
                required
                maxLength={32}
              />
              <button
                type="submit"
                disabled={trackingLoading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#10243B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183454] disabled:opacity-60"
              >
                {trackingLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                {trackingLoading ? 'Looking up…' : 'Check Status'}
              </button>
            </form>
            {trackingError && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{trackingError}</p>}
          </section>

          {trackedApplication && (
            <StudentLoanTrackingCard
              application={trackedApplication}
              onBack={onBack}
              onOpenMyEnquiries={() => {
                document.getElementById('my-submitted-enquiries')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          )}

          {/* List of customer's previous applications */}
          <section id="my-submitted-enquiries" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 scroll-mt-6">
            <h2 className="text-xl font-bold text-[#10243B]">My Submitted Enquiries</h2>
            <p className="mt-1 text-sm text-slate-600">
              All student loan enquiries linked to your verified account.
            </p>

            {applicationsLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading your enquiries…</p>
            ) : applications.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No applications found on record.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {applications.map((app) => (
                  <article key={app.refNumber} className="rounded-2xl border border-slate-200 p-5 transition hover:border-[#9b7a35]/40 hover:shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-extrabold text-[#10243B]">{app.trackingId}</span>
                        {app.isMinor && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Guardian-Assisted</span>}
                      </div>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-900">
                        {app.status || 'Submitted'}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                      <p><strong>Submitted:</strong> {formatStatusDate(app.submittedAt)}</p>
                      <p><strong>Institution:</strong> {app.institutionName || 'Student Enquiry'}</p>
                      <p><strong>Requested Amount:</strong> <span className="font-bold text-[#876A2E]">₹{Number(app.loanAmount || 1000).toLocaleString('en-IN')}</span></p>
                    </div>

                    {app.latestCustomerRemark && (
                      <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 border border-slate-100">
                        <strong>Review Note:</strong> {app.latestCustomerRemark}
                      </p>
                    )}

                    {/* Attached Verification Documents (Images & PDFs) */}
                    <CustomerDocumentsSection
                      documents={app.documents}
                      singleDoc={app.document || app.documentMetadata}
                      title="Attached Verification Documents"
                      subtitle="Student verification proofs, signature note, address proof & marksheets (Images & PDFs)."
                    />

                    {app.statusHistory?.length > 0 && (
                      <details className="mt-3 text-xs">
                        <summary className="cursor-pointer font-bold text-[#725522] hover:underline">
                          View timeline ({app.statusHistory.length} updates)
                        </summary>
                        <ol className="mt-3 space-y-2.5 border-l-2 border-slate-200 pl-3">
                          {app.statusHistory.map((historyItem, idx) => (
                            <li key={idx} className="text-slate-600">
                              <p className="font-semibold text-slate-800">{historyItem.status} · <span className="font-normal text-slate-400">{formatStatusDate(historyItem.createdAt)}</span></p>
                              {historyItem.customerRemark && <p className="mt-0.5 text-slate-600">{historyItem.customerRemark}</p>}
                            </li>
                          ))}
                        </ol>
                      </details>
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
              <span>Step {step} of 5</span>
              <span>
                {step === 1 && 'Personal Information'}
                {step === 2 && 'Photo & Education'}
                {step === 3 && 'Document Upload'}
                {step === 4 && 'Application Review'}
                {step === 5 && 'Final Submission'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-[#10243B] via-[#876A2E] to-[#D4AF37] transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>

            {/* Stepper bubbles */}
            <nav aria-label="Application Progress" className="mt-5 grid grid-cols-5 gap-2 text-center text-xs">
              {[
                { s: 1, title: 'Personal' },
                { s: 2, title: 'Education' },
                { s: 3, title: 'Documents' },
                { s: 4, title: 'Review' },
                { s: 5, title: 'Submit' },
              ].map(({ s, title }) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (s < step) setStep(s);
                  }}
                  disabled={s > step}
                  className={`flex flex-col items-center gap-1.5 p-1 transition ${
                    s === step
                      ? 'font-bold text-[#10243B]'
                      : s < step
                      ? 'cursor-pointer font-semibold text-[#876A2E]'
                      : 'cursor-not-allowed opacity-40 text-slate-400'
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                      s === step
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
                <p className="text-xs text-slate-500 mt-1">Provide accurate personal and residential contact information.</p>
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
                    max={new Date().toISOString().slice(0, 10)}
                    value={form.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  />
                </Field>

                <Field label="Calculated Age" hint="Computed automatically from Date of Birth.">
                  <div className="relative">
                    <input
                      className={`${FIELD_CLASS} font-semibold`}
                      type="text"
                      value={age ? `${age} years old` : 'Enter Date of Birth'}
                      readOnly
                      aria-readonly="true"
                    />
                    {Number.isInteger(age) && (
                      <span
                        className={`absolute right-3 top-3 rounded-md px-2 py-0.5 text-xs font-bold ${
                          age >= 18 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {age >= 18 ? 'Adult (Eligible)' : 'Under 18 (Guardian Required)'}
                      </span>
                    )}
                  </div>
                </Field>

                {/* Under 18 Minor Notice & Guardian details */}
                {isMinor && (
                  <div className="sm:col-span-2 rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <AlertCircle size={18} />
                      <h3>Applicant is Under 18 Years of Age</h3>
                    </div>
                    <p className="text-xs text-amber-800 leading-5">
                      Applicants below 18 years cannot submit an independent loan enquiry. A parent or legal guardian must provide contact details and consent to proceed.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2 pt-2">
                      <Field label="Parent / Guardian Full Name *" error={fieldErrors.guardianName}>
                        <input
                          className={getFieldClass(fieldErrors.guardianName)}
                          value={form.guardianName}
                          onChange={(e) => updateField('guardianName', e.target.value)}
                          placeholder=""
                          maxLength={150}
                        />
                      </Field>

                      <Field label="Guardian Mobile Number *" error={fieldErrors.guardianPhone}>
                        <input
                          className={getFieldClass(fieldErrors.guardianPhone)}
                          type="tel"
                          value={form.guardianPhone}
                          onChange={(e) => updateField('guardianPhone', e.target.value)}
                          placeholder=""
                          maxLength={16}
                        />
                      </Field>

                      <Field label="Relationship to Student *" error={fieldErrors.guardianRelationship} className="sm:col-span-2">
                        <input
                          className={getFieldClass(fieldErrors.guardianRelationship)}
                          value={form.guardianRelationship}
                          onChange={(e) => updateField('guardianRelationship', e.target.value)}
                          placeholder=""
                          maxLength={80}
                        />
                      </Field>

                      <label className="flex items-start gap-3 rounded-xl bg-white p-4 text-xs font-semibold text-slate-800 sm:col-span-2 border border-amber-200">
                        <input
                          type="checkbox"
                          checked={form.guardianConsent}
                          onChange={(e) => updateField('guardianConsent', e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[#9b7a35]"
                        />
                        <span>I am the parent or legal guardian of the applicant and authorize this student loan enquiry.</span>
                      </label>
                      {fieldErrors.guardianConsent && (
                        <p role="alert" className="text-xs text-red-700 sm:col-span-2">{fieldErrors.guardianConsent}</p>
                      )}
                    </div>
                  </div>
                )}

                <Field label="Mobile Number *" error={fieldErrors.mobileNumber}>
                  <input
                    className={getFieldClass(fieldErrors.mobileNumber)}
                    type="tel"
                    autoComplete="tel"
                    value={form.mobileNumber}
                    onChange={(e) => updateField('mobileNumber', e.target.value)}
                    placeholder=""
                    maxLength={16}
                  />
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
                    purpose="Student Education Loan Enquiry"
                    label="Gmail / Email Address *"
                    hint="A real 6-digit OTP will be delivered to this email. Verification is required before submission."
                  />
                </div>

                <Field label="State / Union Territory *" error={fieldErrors.state}>
                  <select
                    className={getFieldClass(fieldErrors.state)}
                    value={form.state}
                    onChange={(e) => updateState(e.target.value)}
                    autoComplete="address-level1"
                  >
                    <option value="">Select State / Union Territory</option>
                    {INDIA_LOCATION_DATA.states.map((item) => (
                      <option key={item.code} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="District *" error={fieldErrors.district}>
                  <select
                    className={getFieldClass(fieldErrors.district)}
                    value={form.district}
                    disabled={!selectedState}
                    onChange={(e) => updateDistrict(e.target.value)}
                    autoComplete="address-level2"
                  >
                    <option value="">{selectedState ? "Select District" : "Select State first"}</option>
                    {availableDistricts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                    <option value="Other">Other / Not Listed</option>
                  </select>
                </Field>

                <Field label="City / Town / Village *" error={fieldErrors.city}>
                  <input
                    type="text"
                    className={getFieldClass(fieldErrors.city)}
                    list="mai-wizard-cities"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Enter your City, Town, or Village"
                    autoComplete="address-level2"
                  />
                  {citySuggestions.length > 0 && (
                    <datalist id="mai-wizard-cities">
                      {citySuggestions.map((city) => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                  )}
                </Field>

                <Field label="PIN Code (Postal Code) *" error={fieldErrors.pinCode}>
                  <input
                    className={getFieldClass(fieldErrors.pinCode)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pinCode}
                    onChange={(e) => updateField('pinCode', e.target.value.replace(/\D/g, ''))}
                    placeholder=""
                    autoComplete="postal-code"
                  />
                </Field>

                <Field label="Complete Residential Address *" error={fieldErrors.address} className="sm:col-span-2">
                  <textarea
                    className={`${getFieldClass(fieldErrors.address)} min-h-24 resize-y`}
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder=""
                    maxLength={500}
                    autoComplete="street-address"
                  />
                </Field>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183454] shadow-sm"
                >
                  Next: Photo & Education Details <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PHOTOGRAPH AND EDUCATION DETAILS */}
          {step === 2 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#876A2E]">Step 2</span>
                <h2 className="text-xl font-bold text-[#10243B]">Photograph & Education Information</h2>
                <p className="text-xs text-slate-500 mt-1">Provide your profile photograph and details of your enrolled education.</p>
              </div>

              {/* Profile Photo Upload and Preview Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
                <label className={LABEL_CLASS}>Applicant Profile Photograph</label>
                <p className="text-xs text-slate-500 mt-1">Upload a clear passport-style face photo (JPG, PNG, WebP up to 5 MB).</p>

                <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white shadow-inner grid place-items-center">
                    {form.photoUrl ? (
                      <img src={form.photoUrl} alt="Applicant Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <User size={36} />
                        <span className="text-[10px] font-semibold mt-1">No Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#10243B] px-4 py-2 text-xs font-bold text-white hover:bg-[#183454] transition shadow-sm">
                        <Upload size={14} />
                        {form.photoUrl ? 'Change Photograph' : 'Upload Photograph'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={handlePhotoUpload}
                        />
                      </label>
                      {form.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setForm((c) => ({ ...c, photoUrl: '', photoFileName: '' }))}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>
                    {form.photoFileName && (
                      <p className="text-xs text-slate-600 font-medium">Selected: {form.photoFileName}</p>
                    )}
                    {fieldErrors.photo && (
                      <p role="alert" className="text-xs font-medium text-red-700">{fieldErrors.photo}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Highest Education Qualification *" error={fieldErrors.qualification} className="sm:col-span-2">
                  <select
                    className={getFieldClass(fieldErrors.qualification)}
                    value={form.qualification}
                    onChange={(e) => updateField('qualification', e.target.value)}
                  >
                    <option value="">Select your qualification level</option>
                    {QUALIFICATION_OPTIONS.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </Field>

                <Field label="School / College / Institution Name *" error={fieldErrors.institutionName} className="sm:col-span-2">
                  <input
                    className={getFieldClass(fieldErrors.institutionName)}
                    value={form.institutionName}
                    onChange={(e) => updateField('institutionName', e.target.value)}
                    placeholder=""
                    maxLength={200}
                    autoComplete="organization"
                  />
                  {institutionSuggestions.length > 0 && !institutionNotListed && (
                    <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white shadow-md">
                      {institutionSuggestions.slice(0, 6).map((inst) => (
                        <button
                          key={inst.id}
                          type="button"
                          onClick={() => updateField('institutionName', inst.name)}
                          className="block w-full border-b border-slate-100 px-3.5 py-2.5 text-left text-sm hover:bg-amber-50 last:border-0"
                        >
                          <span className="font-semibold text-slate-900">{inst.name}</span>
                          <span className="block text-xs text-slate-500">
                            {[inst.city, inst.district, inst.state].filter(Boolean).join(', ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={institutionNotListed}
                      onChange={(e) => setInstitutionNotListed(e.target.checked)}
                      className="h-4 w-4 accent-[#9b7a35]"
                    />
                    My institution is not in the list — I am typing it manually
                  </div>
                </Field>

                <Field label="Course / Stream *" error={fieldErrors.courseName}>
                  <input
                    className={getFieldClass(fieldErrors.courseName)}
                    value={form.courseName}
                    onChange={(e) => updateField('courseName', e.target.value)}
                    placeholder=""
                    maxLength={160}
                  />
                </Field>

                <Field label="Passing / Expected Year" error={fieldErrors.passingYear}>
                  <select
                    className={getFieldClass(fieldErrors.passingYear)}
                    value={form.passingYear}
                    onChange={(e) => updateField('passingYear', e.target.value)}
                  >
                    <option value="">Select Passing Year</option>
                    {PASSING_YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Additional Education Information (Optional)" className="sm:col-span-2">
                  <textarea
                    className={`${FIELD_CLASS} min-h-20 resize-y`}
                    value={form.educationNotes}
                    onChange={(e) => updateField('educationNotes', e.target.value)}
                    placeholder=""
                    maxLength={500}
                  />
                </Field>

                {/* How Much Amount Do You Need? Section */}
                <div className="sm:col-span-2 mt-2 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <IndianRupee className="h-5 w-5 text-[#876A2E]" />
                    <h3 className="text-base font-bold text-[#10243B]">How Much Amount Do You Need? *</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Select an enquiry amount up to ₹1,000 or specify a custom amount between ₹100 and ₹1,000.
                  </p>

                  {/* 10 Selectable Options Grid: ₹100 to ₹1,000 */}
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((amt) => {
                      const isSelected = !form.isCustomAmount && Number(form.loanAmount) === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            updateField('loanAmount', amt);
                            updateField('isCustomAmount', false);
                            updateField('customAmount', '');
                            if (fieldErrors.loanAmount) {
                              setFieldErrors((prev) => ({ ...prev, loanAmount: '' }));
                            }
                          }}
                          className={`flex items-center justify-center rounded-xl border py-3 px-2 text-sm font-bold transition-all ${
                            isSelected
                              ? 'border-[#876A2E] bg-[#876A2E] text-white shadow-sm ring-2 ring-[#876A2E]/20 scale-[1.02]'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-[#876A2E]/50 hover:bg-[#FDFBF7]'
                          }`}
                        >
                          ₹{amt.toLocaleString('en-IN')}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Amount Button & Input */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        updateField('isCustomAmount', true);
                        if (!form.customAmount) {
                          updateField('loanAmount', '');
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                        form.isCustomAmount
                          ? 'border-[#876A2E] bg-[#FDFBF7] text-[#876A2E] ring-1 ring-[#876A2E]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <PenLine size={13} /> Custom Amount
                    </button>

                    {form.isCustomAmount && (
                      <div className="flex-1 min-w-[200px] max-w-xs">
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">₹</span>
                          <input
                            type="number"
                            min={100}
                            max={1000}
                            step={50}
                            value={form.customAmount || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              updateField('customAmount', val);
                              updateField('loanAmount', val ? Number(val) : '');
                              if (fieldErrors.loanAmount) {
                                setFieldErrors((prev) => ({ ...prev, loanAmount: '' }));
                              }
                            }}
                            placeholder=""
                            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-7 pr-3 text-sm font-bold text-slate-900 focus:border-[#876A2E] focus:outline-none focus:ring-1 focus:ring-[#876A2E]"
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">Allowed range: ₹100 to ₹1,000.</p>
                      </div>
                    )}
                  </div>

                  {/* Selected Summary Chip */}
                  {form.loanAmount && !fieldErrors.loanAmount && (
                    <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-[#F6F2E8] border border-[#C8A65D]/40 px-3.5 py-2 text-xs text-[#725522]">
                      <CheckCircle2 size={15} className="text-[#876A2E] shrink-0" />
                      <span>
                        Selected Amount: <strong className="text-sm font-black text-[#10243B]">₹{Number(form.loanAmount).toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  )}

                  {/* Error validation */}
                  {fieldErrors.loanAmount && (
                    <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                      {fieldErrors.loanAmount}
                    </p>
                  )}

                  {/* Legal notice */}
                  <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-[11px] text-slate-600 leading-relaxed">
                    <AlertCircle size={14} className="mt-0.5 text-slate-400 shrink-0" />
                    <span>
                      <strong>Notice:</strong> This is an enquiry preference only, not a loan offer or sanction. Lending operations remain disabled until all applicable statutory, regulatory, and security verifications are finalized. Only legally eligible adults may submit applications.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={16} /> Previous
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183454] shadow-sm"
                >
                  Next: Document Upload <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DOCUMENT UPLOAD SECTION */}
          {step === 3 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#876A2E]">Step 3</span>
                <h2 className="text-xl font-bold text-[#10243B]">Document Upload Section</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Upload required verification documents. Supported formats: JPG, JPEG, PNG, PDF (up to 5 MB per file).
                </p>
              </div>

              {/* KYC REGULATORY GATE ALERT */}
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-2 text-amber-950">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Lock size={17} className="text-[#876A2E]" />
                  <span>Regulatory Notice: Government Identity (Aadhaar / PAN / Voter ID) Locked</span>
                </div>
                <p className="text-xs leading-5 text-amber-900">
                  In compliance with RBI/NBFC guidelines and legal standards, collection of sensitive government identity numbers (Aadhaar, PAN, Voter ID) is temporarily gated pending formal regulatory authorization. Please attach your institutional Student ID and student proofs below.
                </p>
              </div>

              {/* Document upload grid — All 4 Mandatory */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    key: 'studentId',
                    title: 'Student Verification Document',
                    desc: 'Student ID card, admission confirmation, or current fee receipt.',
                    required: true,
                  },
                  {
                    key: 'signature',
                    title: 'Student Specimen Signature Note',
                    desc: 'Specimen signature or student loan application authorization document.',
                    required: true,
                  },
                  {
                    key: 'addressProof',
                    title: 'Residential Address Proof',
                    desc: 'Valid residential address proof: utility bill, domicile certificate, or rent agreement.',
                    required: true,
                  },
                  {
                    key: 'academicMarksheet',
                    title: 'Academic Marksheet / Certificate',
                    desc: 'Relevant academic record, latest examination marksheet, or passing certificate.',
                    required: true,
                  },
                ].map(({ key, title, desc, required }) => {
                  const doc = form.documents[key] || (key === 'academicMarksheet' ? form.documents.educationCertificate : null);
                  const isUploading = slotUploading[key];
                  const progress = slotProgress[key] || 0;
                  const hasError = Boolean(fieldErrors[key]);

                  return (
                    <div
                      key={key}
                      className={`rounded-2xl border p-5 transition ${
                        doc?.confirmed
                          ? 'border-emerald-300 bg-emerald-50/40 shadow-sm'
                          : hasError
                          ? 'border-red-400 bg-red-50/30 ring-1 ring-red-300'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#10243B]">
                            {title} <span className="text-red-500">*</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                        </div>
                        {doc?.confirmed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 size={12} className="text-emerald-700" /> Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Required *
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
                                    {doc.size > 1024 * 1024
                                      ? `${(doc.size / (1024 * 1024)).toFixed(2)} MB`
                                      : `${(doc.size / 1024).toFixed(1)} KB`} • Private Storage Confirmed
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeDocumentSlot(key)}
                                className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline px-2 py-1"
                              >
                                Remove &amp; Replace
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
                    Controls will be unlocked automatically following legal, privacy, and regulatory approvals.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={16} /> Previous
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183454] shadow-sm"
                >
                  Next: Review Application <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETE APPLICATION REVIEW */}
          {step === 4 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#876A2E]">Step 4</span>
                <h2 className="text-xl font-bold text-[#10243B]">Review Your Application</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Please review all entered details carefully before final submission. Click Edit on any section to correct mistakes.
                </p>
              </div>

              {/* CARD 1: PERSONAL DETAILS */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-[#876A2E]" />
                    <h3 className="font-bold text-slate-900 text-sm">Personal Information</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-[#876A2E] hover:bg-slate-50"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                </div>

                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div><dt className="text-slate-500">Full Name</dt><dd className="font-semibold text-slate-900 text-sm">{form.fullName}</dd></div>
                  <div><dt className="text-slate-500">Date of Birth & Age</dt><dd className="font-semibold text-slate-900">{form.dateOfBirth} ({age} years)</dd></div>
                  <div><dt className="text-slate-500">Mobile Number</dt><dd className="font-semibold text-slate-900">{form.mobileNumber}</dd></div>
                  <div>
                    <dt className="text-slate-500">Email Address</dt>
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
                  <div className="sm:col-span-2"><dt className="text-slate-500">Residential Address</dt><dd className="font-semibold text-slate-900">{form.address}, {form.city}, {form.district}, {form.state} {form.pinCode ? `- ${form.pinCode}` : ''}</dd></div>
                  {isMinor && (
                    <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                      <dt className="text-amber-800 font-bold">Guardian Assistance</dt>
                      <dd className="font-medium text-slate-800">{form.guardianName} ({form.guardianRelationship}) · {form.guardianPhone}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* CARD 2: EDUCATION DETAILS & PHOTO */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={18} className="text-[#876A2E]" />
                    <h3 className="font-bold text-slate-900 text-sm">Education Information</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-[#876A2E] hover:bg-slate-50"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                  {form.photoUrl && (
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-300 shadow-sm">
                      <img src={form.photoUrl} alt="Applicant" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <dl className="grid flex-1 gap-3 text-xs sm:grid-cols-2">
                    <div><dt className="text-slate-500">Qualification</dt><dd className="font-semibold text-slate-900">{form.qualification || 'Not specified'}</dd></div>
                    <div><dt className="text-slate-500">Course / Stream</dt><dd className="font-semibold text-slate-900">{form.courseName}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-slate-500">Institution</dt><dd className="font-semibold text-slate-900">{form.institutionName}</dd></div>
                    {form.passingYear && <div><dt className="text-slate-500">Passing Year</dt><dd className="font-semibold text-slate-900">{form.passingYear}</dd></div>}
                  </dl>
                </div>
              </div>

              {/* CARD 2B: REQUESTED LOAN AMOUNT */}
              <div className="rounded-2xl border border-[#C8A65D]/40 bg-gradient-to-br from-[#FDFBF7] to-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <IndianRupee size={18} className="text-[#876A2E]" />
                    <h3 className="font-bold text-slate-900 text-sm">Requested Loan Enquiry Amount</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-[#876A2E] hover:bg-slate-50"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enquiry Amount</span>
                    <p className="text-3xl font-black text-[#10243B] mt-0.5">
                      ₹{Number(form.loanAmount || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Amount requested for academic fees and study materials.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#F6F2E8] border border-[#C8A65D]/40 px-3.5 py-1.5 text-xs font-bold text-[#725522]">
                    Enquiry Preference (Max ₹1,000)
                  </span>
                </div>
              </div>

              {/* CARD 3: DOCUMENT CHECKLIST */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-[#876A2E]" />
                    <h3 className="font-bold text-slate-900 text-sm">Attached Documents</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-[#876A2E] hover:bg-slate-50"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                </div>

                <div className="mt-4 space-y-2.5 text-xs">
                  {form.photoUrl && (
                    <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <span className="font-semibold">Applicant Profile Photograph</span>
                    </div>
                  )}

                  {/* All 4 Mandatory Documents in Review */}
                  {[
                    {
                      key: 'studentId',
                      label: 'Student Verification Document',
                      doc: form.documents.studentId,
                    },
                    {
                      key: 'signature',
                      label: 'Student Specimen Signature Note',
                      doc: form.documents.signature,
                    },
                    {
                      key: 'addressProof',
                      label: 'Residential Address Proof',
                      doc: form.documents.addressProof,
                    },
                    {
                      key: 'academicMarksheet',
                      label: 'Academic Marksheet / Certificate',
                      doc: form.documents.academicMarksheet || form.documents.educationCertificate,
                    },
                  ].map(({ key, label, doc }) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={16} className={doc?.confirmed ? "text-emerald-600 shrink-0" : "text-red-500 shrink-0"} />
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">{label} <span className="text-red-500">*</span></span>
                          {doc?.confirmed ? (
                            <span className="text-slate-600 text-[11px]">
                              {doc.fileName || doc.name} ({doc.size > 1024 * 1024 ? `${(doc.size / (1024 * 1024)).toFixed(2)} MB` : `${(doc.size / 1024).toFixed(1)} KB`})
                            </span>
                          ) : (
                            <span className="text-red-600 font-semibold text-[11px]">Required — Not uploaded yet</span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        doc?.confirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {doc?.confirmed ? 'Confirmed' : 'Missing'}
                      </span>
                    </div>
                  ))}
                </div>

                {(!form.documents.studentId?.confirmed ||
                  !form.documents.signature?.confirmed ||
                  !form.documents.addressProof?.confirmed ||
                  (!form.documents.academicMarksheet?.confirmed && !form.documents.educationCertificate?.confirmed)) && (
                  <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-300 text-xs text-red-900 flex flex-wrap items-center justify-between gap-2">
                    <span>All four mandatory documents must be uploaded and confirmed before final submission.</span>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-3 py-1 bg-[#876A2E] text-white rounded-lg font-bold text-xs hover:bg-[#725522] transition"
                    >
                      Upload Missing Documents
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={16} /> Previous
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10243B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183454] shadow-sm"
                >
                  Proceed to Final Submit <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: FINAL SUBMISSION */}
          {step === 5 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#876A2E]">Step 5</span>
                <h2 className="text-xl font-bold text-[#10243B]">Final Submission & Declarations</h2>
                <p className="text-xs text-slate-500 mt-1">Review the declarations below and click FINAL SUBMIT to record your enquiry.</p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 space-y-2 text-blue-950">
                <p className="font-bold text-sm">Important Service Notice</p>
                <p className="text-xs leading-5 text-blue-900">
                  Mehanda Army Investments provides transparent student loan assistance. This submission is an <strong>Enquiry Request</strong> for verification and information. It is NOT an automatic loan sanction, approval, or disbursement.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-800 transition hover:bg-white">
                  <input
                    type="checkbox"
                    checked={form.accuracyConsent}
                    onChange={(e) => updateField('accuracyConsent', e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#9b7a35]"
                  />
                  <span>
                    <strong>Information Accuracy:</strong> I declare that all information provided in this student loan enquiry is complete, true, and correct to the best of my knowledge.
                  </span>
                </label>
                {fieldErrors.accuracyConsent && (
                  <p role="alert" className="text-xs text-red-700 pl-2">{fieldErrors.accuracyConsent}</p>
                )}

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-800 transition hover:bg-white">
                  <input
                    type="checkbox"
                    checked={form.privacyConsent}
                    onChange={(e) => updateField('privacyConsent', e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#9b7a35]"
                  />
                  <span>
                    <strong>Privacy & Verification:</strong> I agree to the Privacy Policy and authorize Mehanda Army Investments to securely process these details to assess my student loan enquiry.
                  </span>
                </label>
                {fieldErrors.privacyConsent && (
                  <p role="alert" className="text-xs text-red-700 pl-2">{fieldErrors.privacyConsent}</p>
                )}

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-800 transition hover:bg-white">
                  <input
                    type="checkbox"
                    checked={form.enquiryAcknowledgement}
                    onChange={(e) => updateField('enquiryAcknowledgement', e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#9b7a35]"
                  />
                  <span>
                    <strong>Enquiry Terms:</strong> I understand that this enquiry does not constitute a loan offer or binding financial agreement, and no upfront advance fee is required.
                  </span>
                </label>
                {fieldErrors.enquiryAcknowledgement && (
                  <p role="alert" className="text-xs text-red-700 pl-2">{fieldErrors.enquiryAcknowledgement}</p>
                )}
              </div>

              {submitError && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-red-600" />
                  {submitError}
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ArrowLeft size={16} /> Back to Review
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#10243B] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#183454] shadow-md disabled:cursor-wait disabled:opacity-60"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Registering Enquiry in Database…' : 'Submit Loan Application'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TrackingCard(props) {
  return <StudentLoanTrackingCard {...props} />;
}
