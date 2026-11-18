import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Milk,
  Wheat,
  Sprout,
  GraduationCap,
  BookOpen,
  Upload,
  FileCheck,
  Building,
  User,
  CreditCard,
  MapPin,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { LOAN_CATEGORIES, submitAgricultureLoanApplication } from '../lib/loanService';
import INDIA_LOCATIONS from '../data/indiaLocations.json';
import EmailOtpVerification from './EmailOtpVerification.jsx';

const PURPOSE_OPTIONS = {
  student_loan: [
    'College Tuition Fees & Semester Dues',
    'Academic Course Books & Reference Materials',
    'Laptop & Digital Study Device Assistance',
    'Examination, Laboratory & Project Fees',
    'Hostel, Mess & Educational Accommodation',
    'Other Educational Purpose',
  ],
  dairy_loan: [
    'Purchase of High-Yield Milch Cows / Buffaloes',
    'Modern Cattle Shed Construction & Flooring',
    'Milking Machines & Bulk Milk Cooler (BMC)',
    'Silage Pit & Green Fodder Cultivation Facility',
    'Commercial Dairy Herd Expansion & Veterinary Care',
    'Other Dairy Farming Purpose',
  ],
  sheep_loan: [
    'Procurement of Quality Breeding Sheep Flock',
    'Protective Sheep Shelter & Perimeter Fencing',
    'Fodder Storage & High-Protein Grazing Support',
    'Veterinary Equipment & Healthcare Infrastructure',
    'Commercial Wool & Livestock Flocks Expansion',
    'Other Sheep Farming Purpose',
  ],
  goat_loan: [
    'Purchase of High-Grade Doe / Buck Breeding Flock (Beetal/Sirohi/Barbari)',
    'Stall-Fed Goat Shed Construction & Slatted Flooring',
    'Green Fodder & Feed Storage Infrastructure',
    'Kid Nursery & Health Management Facility',
    'Commercial Meat & Breeding Farm Scaling',
    'Other Goat Farming Purpose',
  ],
};

export default function AgricultureLoanFormModal({
  isOpen,
  category = 'dairy_loan',
  user,
  onClose,
  onApplicationSubmitted,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successApplication, setSuccessApplication] = useState(null);
  const [copiedTrackingId, setCopiedTrackingId] = useState(false);
  const [emailVerification, setEmailVerification] = useState(() => ({
    isVerified: Boolean(user?.email && (user?.email_confirmed_at || user?.confirmed_at)),
    verifiedEmail: (user?.email && (user?.email_confirmed_at || user?.confirmed_at)) ? user.email : '',
    verifiedAt: (user?.email && (user?.email_confirmed_at || user?.confirmed_at)) ? new Date().toISOString() : null,
    token: '',
  }));

  const categoryConfig = LOAN_CATEGORIES[category] || LOAN_CATEGORIES.dairy_loan;

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal & Contact
    fullName: user?.fullName || user?.user_metadata?.full_name || '',
    dateOfBirth: '',
    phone: user?.phone || '',
    email: user?.email || '',
    state: 'Haryana',
    district: '',
    city: '',
    address: '',
    pincode: '',

    // Step 2: KYC & Identification
    aadhaarNumber: '',
    panNumber: '',
    voterId: '',

    // Step 3: Loan Details
    loanAmount: category === 'dairy_loan' ? 300000 : category === 'student_loan' ? 1000 : 100000,
    loanPurpose: PURPOSE_OPTIONS[category]?.[0] || (category === 'student_loan' ? 'College Tuition Fees & Semester Dues' : 'Livestock Farming'),
    customPurpose: '',

    // Step 3: Student Education Details
    institutionName: '',
    courseName: '',
    qualification: 'Undergraduate Degree',
    passingYear: '2026',
    rollNumber: '',

    // Step 3: Farming Details
    currentLivestockCount: '0',
    proposedLivestockCount: category === 'dairy_loan' ? '4' : '20',
    landArea: '2 Acres',
    landOwnership: 'Owned',
    experienceYears: '3',
    dailyMilkYieldLiters: '0',
    milkBuyerOrCooperative: 'Local Cooperative / Dairy Society',
    breedType: category === 'dairy_loan' ? 'Murrah / HF Cross' : category === 'sheep_loan' ? 'Nali / Marwari' : 'Beetal / Sirohi',
    shedStatus: 'Available & Ready',

    // Step 4: Documents & Declarations
    documents: {
      aadhaarProof: 'sample-aadhaar-kyc.pdf',
      panProof: 'sample-pan-card.pdf',
      farmProof: category === 'student_loan' ? 'sample-student-id.pdf' : 'sample-land-ownership-proof.pdf',
      bankPassbook: category === 'student_loan' ? 'sample-fee-receipt.pdf' : 'sample-bank-statement.pdf',
    },
    consentAccurate: false,
    consentTerms: false,
  });

  // Available districts based on selected state
  const availableDistricts = useMemo(() => {
    const found = INDIA_LOCATIONS.states.find(
      (s) => s.name.toLowerCase() === formData.state.toLowerCase()
    );
    return found ? found.districts : [];
  }, [formData.state]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setFormError('');
  };

  const handleFileUpload = (docKey, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must not exceed 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          [docKey]: {
            fileName: file.name,
            contentType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
            size: file.size,
            dataUrl: reader.result,
          },
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCopyTrackingId = (id) => {
    if (!id) return;
    navigator.clipboard?.writeText?.(id);
    setCopiedTrackingId(true);
    setTimeout(() => setCopiedTrackingId(false), 2500);
  };

  // Step Validation
  const validateCurrentStep = () => {
    setFormError('');
    if (currentStep === 1) {
      if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
        setFormError('Please enter applicant full name (at least 2 characters).');
        return false;
      }
      if (!formData.dateOfBirth) {
        setFormError('Please select applicant Date of Birth.');
        return false;
      }
      // Check Age >= 18
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) {
        setFormError('Applicant must be at least 18 years old to apply for an agricultural loan.');
        return false;
      }
      const cleanPhone = formData.phone.trim().replace(/[\s\-+]/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        setFormError('Please enter a valid 10-digit Indian mobile number.');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        setFormError('Please enter a valid email address for application updates.');
        return false;
      }
      if (!emailVerification.isVerified || !emailVerification.verifiedEmail || emailVerification.verifiedEmail.toLowerCase() !== formData.email.trim().toLowerCase()) {
        setFormError('Please verify your email address via Gmail OTP before continuing.');
        return false;
      }
      if (!formData.state || !formData.district) {
        setFormError('Please select State and District.');
        return false;
      }
      if (!formData.city.trim()) {
        setFormError('Please enter City or Village.');
        return false;
      }
      if (!formData.address.trim() || formData.address.trim().length < 5) {
        setFormError('Please enter complete farm/residential address.');
        return false;
      }
    }

    if (currentStep === 2) {
      const cleanAadhaar = formData.aadhaarNumber.replace(/[\s\-]/g, '');
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        setFormError('Please enter a valid 12-digit Aadhaar number.');
        return false;
      }
      const cleanPan = formData.panNumber.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleanPan)) {
        setFormError('Please enter a valid 10-character PAN number (e.g. ABCDE1234F).');
        return false;
      }
    }

    if (currentStep === 3) {
      const amount = Number(formData.loanAmount);
      if (isNaN(amount) || amount < categoryConfig.minAmount) {
        setFormError(`Minimum loan amount for ${categoryConfig.name} is ₹${categoryConfig.minAmount.toLocaleString('en-IN')}.`);
        return false;
      }
      if (amount > categoryConfig.maxAmount) {
        setFormError(`Maximum loan amount for ${categoryConfig.name} is ₹${categoryConfig.maxAmount.toLocaleString('en-IN')}.`);
        return false;
      }
      if (!formData.loanPurpose) {
        setFormError('Please specify loan purpose.');
        return false;
      }
      if (category === 'student_loan') {
        if (!formData.institutionName.trim() || formData.institutionName.trim().length < 3) {
          setFormError('Please enter valid College / University / School Name (at least 3 characters).');
          return false;
        }
        if (!formData.courseName.trim()) {
          setFormError('Please enter enrolled Course or Degree name.');
          return false;
        }
      }
    }

    if (currentStep === 4) {
      if (!formData.consentAccurate) {
        setFormError('Please confirm that the provided information is true and accurate.');
        return false;
      }
      if (!formData.consentTerms) {
        setFormError('Please acknowledge the terms and understand that this enquiry is subject to verification.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setFormError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        loanCategory: category,
        applicantName: formData.fullName.trim(),
        applicantDob: formData.dateOfBirth,
        applicantPhone: formData.phone.trim().replace(/[\s\-+]/g, ''),
        applicantEmail: formData.email.trim(),
        verifiedEmail: emailVerification.verifiedEmail || formData.email.trim(),
        emailVerificationToken: emailVerification.token || undefined,
        emailVerifiedAt: emailVerification.verifiedAt || undefined,
        applicantState: formData.state,
        applicantDistrict: formData.district,
        applicantCity: formData.city.trim(),
        applicantAddress: formData.address.trim(),
        applicantPincode: formData.pincode.trim(),
        aadhaarNumber: formData.aadhaarNumber.trim(),
        panNumber: formData.panNumber.trim().toUpperCase(),
        voterIdNumber: formData.voterId.trim() || null,
        loanAmount: Number(formData.loanAmount),
        loanPurpose: formData.loanPurpose === 'Other Dairy Farming Purpose' || formData.loanPurpose.startsWith('Other')
          ? formData.customPurpose || formData.loanPurpose
          : formData.loanPurpose,
        farmingDetails: category === 'student_loan' ? {
          category: 'student_loan',
          institutionName: formData.institutionName.trim(),
          courseName: formData.courseName.trim(),
          qualification: formData.qualification,
          passingYear: formData.passingYear,
          rollNumber: formData.rollNumber.trim(),
        } : {
          currentLivestockCount: Number(formData.currentLivestockCount || 0),
          proposedLivestockCount: Number(formData.proposedLivestockCount || 0),
          landArea: formData.landArea,
          landOwnership: formData.landOwnership,
          experienceYears: Number(formData.experienceYears || 0),
          dailyMilkYieldLiters: category === 'dairy_loan' ? Number(formData.dailyMilkYieldLiters || 0) : null,
          milkBuyerOrCooperative: category === 'dairy_loan' ? formData.milkBuyerOrCooperative : null,
          breedType: formData.breedType,
          shedStatus: formData.shedStatus,
        },
        documents: formData.documents,
      };

      const result = await submitAgricultureLoanApplication(payload);
      setSuccessApplication(result);
      onApplicationSubmitted?.(result);
    } catch (err) {
      setFormError(err.message || 'Failed to submit application. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'student_loan':
        return <GraduationCap size={22} className="text-[#876A2E]" />;
      case 'dairy_loan':
        return <Milk size={22} className="text-sky-600" />;
      case 'sheep_loan':
        return <Wheat size={22} className="text-emerald-600" />;
      case 'goat_loan':
        return <Sprout size={22} className="text-amber-600" />;
      default:
        return <Building size={22} className="text-[#876A2E]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#10243B] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white">
              {getCategoryIcon()}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">{categoryConfig.name} Application</h2>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-400/30">
                  {categoryConfig.amountRange}
                </span>
              </div>
              <p className="text-xs text-slate-300">Dedicated Agriculture & Livestock Financing Facilitation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition"
            aria-label="Close form"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success View */}
        {successApplication ? (
          <div className="p-6 sm:p-10 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 mb-6 shadow-inner">
              <CheckCircle2 size={44} />
            </div>
            <h3 className="text-2xl font-extrabold text-[#10243B]">Application Submitted Successfully!</h3>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              Your application for <strong>{categoryConfig.name}</strong> has been saved securely to your account.
            </p>

            {/* Tracking ID Card */}
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-blue-200 bg-blue-50/70 p-5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Application Tracking ID</span>
                <button
                  type="button"
                  onClick={() => handleCopyTrackingId(successApplication.trackingId || successApplication.tracking_id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900"
                >
                  {copiedTrackingId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedTrackingId ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>
              <div className="mt-2 font-mono text-xl font-bold text-[#10243B] tracking-wide">
                {successApplication.trackingId || successApplication.tracking_id}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600 border-t border-blue-200/60 pt-3">
                <span>Requested Amount: <strong>₹{Number(successApplication.loanAmount || formData.loanAmount).toLocaleString('en-IN')}</strong></span>
                <span className="font-semibold text-blue-700">Status: Submitted</span>
              </div>
            </div>

            {/* What's next banner */}
            <div className="mt-6 mx-auto max-w-md rounded-xl bg-slate-50 p-4 border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-600" /> What Happens Next?
              </p>
              <p>
                1. Our verification desk will review your applicant details and {category === 'student_loan' ? 'academic credentials' : 'farming proposal'} within 2–3 business days.
              </p>
              <p>2. You can track this application in your Customer Dashboard anytime using your Tracking ID.</p>
              <p>3. A confirmation receipt has also been queued to your registered email.</p>
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#10243B] px-8 py-3 text-sm font-bold text-white hover:bg-[#183454] transition shadow-md"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Step Progress Indicator */}
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#10243B] font-bold' : ''}`}>
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${currentStep >= 1 ? 'bg-[#10243B] text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
                  <span className="hidden sm:inline">Applicant Info</span>
                </div>
                <div className="h-0.5 flex-1 mx-2 bg-slate-200" />
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#10243B] font-bold' : ''}`}>
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${currentStep >= 2 ? 'bg-[#10243B] text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
                  <span className="hidden sm:inline">KYC & Identity</span>
                </div>
                <div className="h-0.5 flex-1 mx-2 bg-slate-200" />
                <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-[#10243B] font-bold' : ''}`}>
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${currentStep >= 3 ? 'bg-[#10243B] text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
                  <span className="hidden sm:inline">{category === 'student_loan' ? 'Education & Loan' : 'Loan & Farming'}</span>
                </div>
                <div className="h-0.5 flex-1 mx-2 bg-slate-200" />
                <div className={`flex items-center gap-2 ${currentStep >= 4 ? 'text-[#10243B] font-bold' : ''}`}>
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${currentStep >= 4 ? 'bg-[#10243B] text-white' : 'bg-slate-200 text-slate-600'}`}>4</span>
                  <span className="hidden sm:inline">Documents & Submit</span>
                </div>
              </div>
            </div>

            {/* Error Message Box */}
            {formError && (
              <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 sm:p-7 max-h-[70vh] overflow-y-auto">

              {/* STEP 1: Personal & Contact Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <User size={16} className="text-[#876A2E]" /> Step 1: Applicant Profile & Contact Details
                    </h3>
                    <p className="text-xs text-slate-500">Applicant must be at least 18 years old.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Full Name (as per Aadhaar) *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder=""
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Date of Birth * (Min 18 Yrs)</label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Mobile Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder=""
                        maxLength={10}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <EmailOtpVerification
                      email={formData.email}
                      onChangeEmail={(val) => {
                        setFormData((prev) => ({ ...prev, email: val }));
                        if (emailVerification.isVerified && emailVerification.verifiedEmail !== val) {
                          setEmailVerification({ isVerified: false, verifiedEmail: '', verifiedAt: null, token: '' });
                        }
                      }}
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
                        setFormError('');
                      }}
                      onReset={() => {
                        setEmailVerification({
                          isVerified: false,
                          verifiedEmail: '',
                          verifiedAt: null,
                          token: '',
                        });
                      }}
                      purpose={`${categoryConfig.name} Application`}
                      label="Applicant Email Address (Gmail OTP Verification) *"
                      hint="A 6-digit OTP will be sent to your Gmail for mandatory verification before submission."
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">State *</label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={(e) => {
                          handleChange(e);
                          setFormData((prev) => ({ ...prev, district: '' }));
                        }}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                      >
                        <option value="">Select State</option>
                        {INDIA_LOCATIONS.states.map((s) => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">District *</label>
                      <select
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                      >
                        <option value="">Select District</option>
                        {availableDistricts.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                        <option value="Other">Other / Not Listed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">City / Village *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder=""
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700">Complete Farm / Residential Address *</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder=""
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">PIN Code</label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        placeholder=""
                        maxLength={6}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: KYC & Identification */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard size={16} className="text-[#876A2E]" /> Step 2: KYC & Government Identification
                    </h3>
                    <p className="text-xs text-slate-500">Government identity is verified securely for credit assessment.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">Aadhaar Card Number *</label>
                    <input
                      type="text"
                      name="aadhaarNumber"
                      value={formData.aadhaarNumber}
                      onChange={handleChange}
                      placeholder=""
                      maxLength={14}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono focus:border-[#876A2E] focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Stored securely and masked in compliance with UIDAI regulations.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">Permanent Account Number (PAN) *</label>
                    <input
                      type="text"
                      name="panNumber"
                      value={formData.panNumber}
                      onChange={(e) => setFormData((p) => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                      placeholder=""
                      maxLength={10}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono uppercase focus:border-[#876A2E] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">Voter ID Card Number (Optional)</label>
                    <input
                      type="text"
                      name="voterId"
                      value={formData.voterId}
                      onChange={(e) => setFormData((p) => ({ ...p, voterId: e.target.value.toUpperCase() }))}
                      placeholder=""
                      maxLength={16}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono uppercase focus:border-[#876A2E] focus:outline-none"
                    />
                  </div>

                  <div className="rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2.5">
                    <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Identity Protection Guarantee</p>
                      <p className="mt-0.5 text-amber-800">Your identification data is encrypted and accessible only to authorized administrative loan officers. Sensitive KYC information is never published.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Loan Amount & Proposal / Academic Details */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {category === 'student_loan' ? (
                        <GraduationCap size={16} className="text-[#876A2E]" />
                      ) : (
                        <Wheat size={16} className="text-[#876A2E]" />
                      )}
                      <span>
                        {category === 'student_loan'
                          ? 'Step 3: Education & Loan Request'
                          : 'Step 3: Loan Amount & Farming Proposal'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      {category === 'student_loan'
                        ? 'Specify requested educational assistance and institutional enrollment details.'
                        : 'Specify requested credit and livestock operational details.'}
                    </p>
                  </div>

                  {/* Loan Amount & Purpose */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">
                        Requested Loan Amount (₹) *
                      </label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          name="loanAmount"
                          value={formData.loanAmount}
                          onChange={handleChange}
                          min={categoryConfig.minAmount}
                          max={categoryConfig.maxAmount}
                          step={category === 'student_loan' ? 100 : 10000}
                          className="w-full rounded-xl border border-slate-200 pl-7 pr-3.5 py-2.5 text-xs font-bold text-[#10243B] focus:border-[#876A2E] focus:outline-none"
                        />
                      </div>
                      {category === 'student_loan' ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[100, 200, 500, 800, 1000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, loanAmount: amt }))}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition ${
                                Number(formData.loanAmount) === amt
                                  ? 'bg-[#10243B] text-white border-[#10243B]'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              ₹{amt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Allowed range: ₹{categoryConfig.minAmount.toLocaleString('en-IN')} – ₹{categoryConfig.maxAmount.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700">Loan Purpose *</label>
                      <select
                        name="loanPurpose"
                        value={formData.loanPurpose}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                      >
                        {(PURPOSE_OPTIONS[category] || []).map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {formData.loanPurpose.startsWith('Other') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Specify Custom Purpose</label>
                      <input
                        type="text"
                        name="customPurpose"
                        value={formData.customPurpose}
                        onChange={handleChange}
                        placeholder=""
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                      />
                    </div>
                  )}

                  {/* STUDENT LOAN SPECIFIC ACADEMIC FIELDS */}
                  {category === 'student_loan' ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700">College / School / University Name *</label>
                          <input
                            type="text"
                            name="institutionName"
                            value={formData.institutionName}
                            onChange={handleChange}
                            placeholder=""
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700">Enrolled Course / Degree *</label>
                          <input
                            type="text"
                            name="courseName"
                            value={formData.courseName}
                            onChange={handleChange}
                            placeholder=""
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700">Current Qualification</label>
                          <select
                            name="qualification"
                            value={formData.qualification}
                            onChange={handleChange}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                          >
                            <option value="Undergraduate Degree">Undergraduate (B.Tech / B.Sc / BCA / B.Com)</option>
                            <option value="Postgraduate Degree">Postgraduate (M.Tech / MBA / MCA / M.Sc)</option>
                            <option value="Higher Secondary (11th/12th)">Higher Secondary (11th / 12th)</option>
                            <option value="Diploma / Polytechnic">Diploma / Polytechnic / ITI</option>
                            <option value="Vocational / Other">Vocational / Professional Certification</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700">Passing / Completion Year</label>
                          <select
                            name="passingYear"
                            value={formData.passingYear}
                            onChange={handleChange}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                          >
                            {['2024', '2025', '2026', '2027', '2028', '2029', '2030'].map((yr) => (
                              <option key={yr} value={yr}>{yr}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700">Student Roll / Enrollment No.</label>
                          <input
                            type="text"
                            name="rollNumber"
                            value={formData.rollNumber}
                            onChange={handleChange}
                            placeholder=""
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* AGRICULTURE LOAN SPECIFIC LIVESTOCK FIELDS */
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700">
                            {category === 'dairy_loan' ? 'Cattle Currently Owned' : category === 'sheep_loan' ? 'Sheep Flock Currently Owned' : 'Goats Currently Owned'}
                          </label>
                          <input
                            type="number"
                            name="currentLivestockCount"
                            value={formData.currentLivestockCount}
                            onChange={handleChange}
                            min="0"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700">
                            {category === 'dairy_loan' ? 'Proposed Cattle to Purchase' : category === 'sheep_loan' ? 'Proposed Sheep to Purchase' : 'Proposed Goats to Purchase'}
                          </label>
                          <input
                            type="number"
                            name="proposedLivestockCount"
                            value={formData.proposedLivestockCount}
                            onChange={handleChange}
                            min="1"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700">Land / Shed Area Available</label>
                          <input
                            type="text"
                            name="landArea"
                            value={formData.landArea}
                            onChange={handleChange}
                            placeholder=""
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700">Land Ownership Status</label>
                          <select
                            name="landOwnership"
                            value={formData.landOwnership}
                            onChange={handleChange}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                          >
                            <option value="Owned">Self-Owned Land</option>
                            <option value="Ancestral">Family / Ancestral Land</option>
                            <option value="Leased">Leased / Rented Land</option>
                          </select>
                        </div>
                      </div>

                      {category === 'dairy_loan' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-700">Current Daily Milk Yield (Liters/Day)</label>
                            <input
                              type="number"
                              name="dailyMilkYieldLiters"
                              value={formData.dailyMilkYieldLiters}
                              onChange={handleChange}
                              min="0"
                              placeholder=""
                              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700">Milk Selling Center / Dairy Cooperative</label>
                            <input
                              type="text"
                              name="milkBuyerOrCooperative"
                              value={formData.milkBuyerOrCooperative}
                              onChange={handleChange}
                              placeholder=""
                              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700">Farming Experience (Years)</label>
                          <input
                            type="number"
                            name="experienceYears"
                            value={formData.experienceYears}
                            onChange={handleChange}
                            min="0"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700">Shed & Shelter Condition</label>
                          <select
                            name="shedStatus"
                            value={formData.shedStatus}
                            onChange={handleChange}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#876A2E] focus:outline-none"
                          >
                            <option value="Available & Ready">Existing Shed Available & Functional</option>
                            <option value="Needs Renovation">Existing Shed Needs Repair / Modernization</option>
                            <option value="New Construction Planned">New Shed Construction Planned from Loan</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* STEP 4: Documents Upload & Declarations */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileCheck size={16} className="text-[#876A2E]" /> Step 4: Documents Verification & Final Submission
                    </h3>
                    <p className="text-xs text-slate-500">Confirm documentation readiness and regulatory declarations.</p>
                  </div>

                  {/* Documents checklist */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                    <p className="text-xs font-bold text-slate-900">
                      {category === 'student_loan'
                        ? 'Required Student Verification & Identity Documents (Digital Copy Attached):'
                        : 'Required KYC & Farm Verification Documents (Digital Copy Attached):'}
                    </p>
                    <div className="grid gap-2.5 sm:grid-cols-2 text-xs text-slate-700">
                      {[
                        {
                          key: 'aadhaarProof',
                          label: category === 'student_loan' ? 'Student ID / Admission Proof' : 'Aadhaar Card (Front & Back)',
                        },
                        {
                          key: 'panProof',
                          label: category === 'student_loan' ? 'Aadhaar / Age Proof' : 'PAN Card',
                        },
                        {
                          key: 'farmProof',
                          label: category === 'student_loan' ? 'Latest Marksheet / Fee Receipt' : 'Land Record / Farm Proof',
                        },
                        {
                          key: 'bankPassbook',
                          label: category === 'student_loan' ? 'Bank Passbook / Statement' : 'Bank Passbook (6-Month)',
                        },
                      ].map((docItem) => {
                        const currentDoc = formData.documents?.[docItem.key];
                        const isCustom = typeof currentDoc === 'object' && currentDoc?.fileName;
                        const fileName = isCustom ? currentDoc.fileName : currentDoc;
                        return (
                          <div key={docItem.key} className="flex flex-col justify-between p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                                <span className="font-bold text-slate-900 truncate">{docItem.label}</span>
                              </div>
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200 shrink-0">
                                {isCustom ? 'Uploaded' : 'Digital KYC'}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px]">
                              <span className="text-slate-500 truncate max-w-[150px]" title={fileName}>
                                {fileName}
                              </span>
                              <label className="cursor-pointer inline-flex items-center gap-1 font-bold text-[#876A2E] hover:underline">
                                <Upload size={11} /> {isCustom ? 'Replace' : 'Upload'}
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,application/pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(docItem.key, e.target.files?.[0])}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {category === 'student_loan'
                        ? 'Digital verification is conducted online with partner educational finance desks.'
                        : 'Our field officer will verify originals at the time of pre-sanction inspection.'}
                    </p>
                  </div>

                  {/* Application Summary Box */}
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-xs text-slate-700 space-y-1.5">
                    <div className="flex justify-between font-bold text-blue-950 border-b border-blue-200/60 pb-2">
                      <span>Category: {categoryConfig.name}</span>
                      <span className="text-emerald-700">Amount: ₹{Number(formData.loanAmount).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="pt-1"><strong>Applicant:</strong> {formData.fullName} (Age: {new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear()} Yrs)</p>
                    <p><strong>Mobile / Email:</strong> {formData.phone} · {formData.email}</p>
                    <p><strong>Location:</strong> {formData.city}, {formData.district}, {formData.state}</p>
                    <p><strong>Purpose:</strong> {formData.loanPurpose}</p>
                    {category === 'student_loan' && formData.institutionName && (
                      <p><strong>Institution / Course:</strong> {formData.institutionName} · {formData.courseName} ({formData.qualification})</p>
                    )}
                  </div>

                  {/* Legal Disclaimers & Consents */}
                  <div className="space-y-3 pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                      <input
                        type="checkbox"
                        name="consentAccurate"
                        checked={formData.consentAccurate}
                        onChange={handleChange}
                        className="mt-0.5 rounded border-slate-300 text-[#10243B] focus:ring-[#876A2E]"
                      />
                      <span>
                        <strong>Information Accuracy:</strong> I solemnly declare that all information provided in this loan enquiry is accurate, true, and complete to the best of my knowledge.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                      <input
                        type="checkbox"
                        name="consentTerms"
                        checked={formData.consentTerms}
                        onChange={handleChange}
                        className="mt-0.5 rounded border-slate-300 text-[#10243B] focus:ring-[#876A2E]"
                      />
                      <span>
                        <strong>Non-Guarantee & Regulatory Terms:</strong> I understand that submitting this enquiry does not constitute a guaranteed loan sanction. Final approval and disbursement are solely subject to lender credit policy, applicant eligibility, document verification, and applicable terms of partner lending institutions.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Form Navigation Action Buttons */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 rounded-xl bg-[#10243B] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#183454] transition shadow-sm"
                  >
                    Continue <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-8 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md disabled:opacity-60"
                  >
                    {isSubmitting ? 'Submitting Application…' : 'Submit Loan Application'}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

