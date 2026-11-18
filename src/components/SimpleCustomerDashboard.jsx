import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  GraduationCap,
  Landmark,
  LogOut,
  ShieldCheck,
  TrendingUp,
  Eye,
  FileCheck,
} from 'lucide-react';
import { authService } from '../lib/supabaseClient';
import { submitInvestmentEnquiry } from '../lib/paymentService';
import { getCustomerApplications } from '../lib/studentLoanService';
import { getAllCustomerLoanApplications } from '../lib/loanService';
import BrandVerificationBadge from './BrandVerificationBadge';
import StudentLoanEnquiryPage from './StudentLoanEnquiryPage';
import InvestmentEnquiryPage from './InvestmentEnquiryPage';
import LoanCategoriesPage from './LoanCategoriesPage';
import CaptchaModal from './CaptchaModal';
import { getCustomerInvestmentEnquiries } from '../lib/investmentEnquiryService';

const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#876A2E] focus:ring-2 focus:ring-[#876A2E]/15';
const labelClass = 'block text-sm font-semibold text-slate-800';

function Field({ label, children, className = '' }) {
  return <label className={`${labelClass} ${className}`}>{label}{children}</label>;
}

export default function SimpleCustomerDashboard({ user, initialView = 'home', setCurrentView, setAuthenticatedUser }) {
  const [view, setView] = useState('home');
  const [captchaTargetForm, setCaptchaTargetForm] = useState(null);
  const [captchaVerifiedForms, setCaptchaVerifiedForms] = useState({
    'student-loan': false,
    'investment-info': false,
  });
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState('loading');
  const [recoveryError, setRecoveryError] = useState('');
  const [notificationError, setNotificationError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState('');
  const [selectedLoanApp, setSelectedLoanApp] = useState(null);
  const [investmentEnquiries, setInvestmentEnquiries] = useState([]);
  const [investmentEnquiriesLoading, setInvestmentEnquiriesLoading] = useState(true);
  const [investmentEnquiriesError, setInvestmentEnquiriesError] = useState('');
  const [investmentForm, setInvestmentForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: '',
    investmentHorizon: '',
    plannedAmountBracket: '',
    areasOfInterest: [],
    message: '',
  });
  const [investmentError, setInvestmentError] = useState('');
  const [investmentSuccess, setInvestmentSuccess] = useState('');
  const [investmentSubmitting, setInvestmentSubmitting] = useState(false);

  useEffect(() => {
    if (initialView === 'student-loan' || initialView === 'investment-info') {
      if (captchaVerifiedForms[initialView]) {
        setView(initialView);
      } else {
        setView('home');
        setCaptchaTargetForm(initialView);
      }
    } else {
      setView(initialView);
    }
  }, [initialView, captchaVerifiedForms]);

  const handleRequestOpenForm = (targetForm) => {
    if (captchaVerifiedForms[targetForm]) {
      setView(targetForm);
    } else {
      setView('home');
      setCaptchaTargetForm(targetForm);
    }
  };

  const handleCaptchaVerified = () => {
    const target = captchaTargetForm;
    if (target) {
      setCaptchaVerifiedForms((prev) => ({ ...prev, [target]: true }));
      setCaptchaTargetForm(null);
      setView(target);
    }
  };

  const handleCaptchaClose = () => {
    setCaptchaTargetForm(null);
    setView('home');
    if (setCurrentView) {
      setCurrentView('client-dashboard');
    }
  };

  useEffect(() => {
    let active = true;
    const loadAccountDetails = async () => {
      const [
        { profile: loadedProfile, error: loadedProfileError },
        photoResult,
        { data: recoveryData, error: loadedRecoveryError },
        { notifications, error: loadedNotificationError },
      ] = await Promise.all([
        authService.getProfile(user.id),
        authService.requestProfilePhoto('get'),
        user?.authProviders?.includes('email') && user?.emailVerifiedAt
          ? authService.requestAccountRecovery('status')
          : Promise.resolve({ data: null, error: null }),
        authService.getCustomerNotifications(),
      ]);
      if (!active) return;

      const fallbackProfile = {
        id: user.id,
        full_name: user.fullName || 'Customer',
        email: user.email || '',
        avatar_url: photoResult?.photoUrl || user.avatarUrl || null,
      };
      setProfile(loadedProfile ? {
        ...loadedProfile,
        avatar_url: photoResult?.photoUrl || loadedProfile.avatar_url || user.avatarUrl || null,
      } : fallbackProfile);
      setProfileError(
        loadedProfileError && !loadedProfileError.message?.includes('<') && !loadedProfileError.message?.toLowerCase().includes('json')
          ? `Saved profile details could not be loaded. Showing account information instead. ${loadedProfileError.message}`
          : ''
      );
      if (!user?.authProviders?.includes('email') || !user?.emailVerifiedAt) {
        setRecoveryStatus('not-applicable');
        setRecoveryError('');
      } else if (loadedRecoveryError) {
        setRecoveryStatus('not-set');
        setRecoveryError('');
      } else {
        setRecoveryStatus(recoveryData?.hasRecoveryKey ? 'ready' : 'not-set');
        setRecoveryError('');
      }
      setNotificationError(loadedNotificationError
        ? `Notifications could not be loaded. ${loadedNotificationError.message}`
        : '');
      if (notifications && !loadedNotificationError) {
        setNotificationError('');
      }
    };

    loadAccountDetails().catch((error) => {
      if (!active) return;
      setProfile({
        id: user.id,
        full_name: user.fullName || 'Customer',
        email: user.email || '',
        avatar_url: user.avatarUrl || null,
      });
      setProfileError(`Account details could not be loaded. ${error.message}`);
    });
    return () => { active = false; };
  }, [user]);

  const refreshApplications = async () => {
    setApplicationsLoading(true);
    setApplicationsError('');
    try {
      const records = await getAllCustomerLoanApplications();
      setApplications(Array.isArray(records) ? records : []);
      setApplicationsError('');
    } catch (err) {
      setApplications([]);
      setApplicationsError(err?.message || 'Could not load your loan enquiries.');
    } finally {
      setApplicationsLoading(false);
    }
  };

  const refreshInvestmentEnquiries = async () => {
    setInvestmentEnquiriesLoading(true);
    setInvestmentEnquiriesError('');
    try {
      const records = await getCustomerInvestmentEnquiries();
      setInvestmentEnquiries(Array.isArray(records) ? records : []);
      setInvestmentEnquiriesError('');
    } catch (err) {
      setInvestmentEnquiries([]);
      setInvestmentEnquiriesError(err?.message || 'Could not load your investment enquiries.');
    } finally {
      setInvestmentEnquiriesLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getCustomerInvestmentEnquiries()
      .then((records) => {
        if (active) {
          setInvestmentEnquiries(Array.isArray(records) ? records : []);
          setInvestmentEnquiriesError('');
        }
      })
      .catch((err) => {
        if (active) {
          setInvestmentEnquiries([]);
          setInvestmentEnquiriesError(err?.message || 'Could not load your investment enquiries.');
        }
      })
      .finally(() => {
        if (active) setInvestmentEnquiriesLoading(false);
      });
    return () => { active = false; };
  }, [user.id]);

  useEffect(() => {
    let active = true;
    getAllCustomerLoanApplications()
      .then((records) => {
        if (active) {
          setApplications(Array.isArray(records) ? records : []);
          setApplicationsError('');
        }
      })
      .catch((err) => {
        if (active) {
          setApplications([]);
          setApplicationsError(err?.message || 'Could not load your loan enquiries.');
        }
      })
      .finally(() => {
        if (active) setApplicationsLoading(false);
      });
    return () => { active = false; };
  }, [user.id]);

  const displayName = profile?.full_name || user?.fullName || 'Customer';
  const avatarUrl = profile?.avatar_url || user?.avatarUrl;
  const initials = useMemo(() => displayName.trim().slice(0, 1).toUpperCase() || 'C', [displayName]);

  const handleLogout = async () => {
    setLogoutError('');
    const { error } = await authService.signOut();
    if (error) {
      setLogoutError(`Logout could not be completed. ${error.message}`);
      return;
    }
    setAuthenticatedUser(null);
    setCurrentView('home');
  };

  const updateInvestmentForm = (event) => {
    const { name, value } = event.target;
    setInvestmentForm((current) => ({ ...current, [name]: value }));
    setInvestmentError('');
    setInvestmentSuccess('');
  };

  const toggleInvestmentInterest = (interest) => {
    setInvestmentForm((current) => ({
      ...current,
      areasOfInterest: current.areasOfInterest.includes(interest)
        ? current.areasOfInterest.filter((item) => item !== interest)
        : [...current.areasOfInterest, interest],
    }));
    setInvestmentError('');
    setInvestmentSuccess('');
  };

  const handleInvestmentSubmit = async (event) => {
    event.preventDefault();
    setInvestmentError('');
    setInvestmentSuccess('');
    setInvestmentSubmitting(true);
    try {
      const { accessToken, error } = await authService.getAccessToken();
      if (error || !accessToken) throw new Error('Sign in again before sending your enquiry.');
      const result = await submitInvestmentEnquiry(investmentForm, accessToken);
      if (!result?.success || !result?.enquiryId) {
        throw new Error('The database did not confirm a saved investment enquiry.');
      }
      setInvestmentSuccess(`Your interest enquiry was saved. Reference: ${result.enquiryId}`);
      setInvestmentForm((current) => ({
        ...current,
        city: '',
        investmentHorizon: '',
        plannedAmountBracket: '',
        areasOfInterest: [],
        message: '',
      }));
    } catch (error) {
      setInvestmentError(error.message || 'Your enquiry could not be saved.');
    } finally {
      setInvestmentSubmitting(false);
    }
  };

  const returnHome = () => {
    setCurrentView('client-dashboard');
    setView('home');
    setSelectedLoanApp(null);
    setInvestmentError('');
    setInvestmentSuccess('');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <button type="button" onClick={returnHome} className="flex items-center gap-3 text-left" aria-label="Mehanda Army Investments dashboard">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#10243B] text-[#D5C292]">
              <TrendingUp size={22} />
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-wide text-[#10243B]">MEHANDA ARMY</span>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#876A2E]">
                Investments <BrandVerificationBadge className="h-4 w-4" />
              </span>
            </span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex max-w-[70vw] items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-left hover:border-[#876A2E]/50"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                : <span className="grid h-9 w-9 place-items-center rounded-full bg-[#F6F2E8] text-sm font-bold text-[#725522]">{initials}</span>}
              <span className="max-w-36 truncate text-sm font-semibold text-[#10243B]">{displayName}</span>
              <ChevronDown size={15} className="text-slate-500" />
            </button>
            {accountMenuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <p className="truncate text-sm font-bold text-[#10243B]">{displayName}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{profile?.email || user?.email || user?.phone || 'Signed-in customer'}</p>
                {notificationError && <p role="alert" className="mt-2 text-xs text-red-700">{notificationError}</p>}
                {profileError && <p role="alert" className="mt-2 text-xs text-amber-800">{profileError}</p>}
                {logoutError && <p role="alert" className="mt-2 text-xs text-red-700">{logoutError}</p>}
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#10243B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#183454]"
                  >
                    <LogOut size={15} /> Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {view === 'home' && (
          <>
            <div className="mb-9">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#876A2E]">Customer dashboard</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#10243B] sm:text-4xl">Welcome, {displayName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Choose what you would like help with. Your requests are saved securely to your account.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setView('loan-categories')}
                className="group min-h-56 rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#876A2E]/50 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F6F2E8] text-[#876A2E]"><Landmark size={25} /></span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    4 Categories Available
                  </span>
                </div>
                <span className="mt-6 block text-xl font-bold text-[#10243B]">Loan Facilitation Desk</span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">
                  Explore Student Loan, Dairy Loan, Sheep Loan, and Goat Loan facilities. Submit enquiries and track approval status.
                </span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#725522]">
                  Explore 4 Loan Categories <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleRequestOpenForm('investment-info')}
                className="group min-h-56 rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#876A2E]/50 hover:shadow-lg"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F6F2E8] text-[#876A2E]"><TrendingUp size={24} /></span>
                <span className="mt-6 block text-xl font-bold text-[#10243B]">Investment Information</span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">Learn about available information and submit an interest enquiry only.</span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#725522]">Apply for information <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span>
              </button>
            </div>

            {applications.length > 0 && (
              <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#10243B]">Recent Loan Enquiries</h2>
                    <p className="text-xs text-slate-500">Live records from your account (Student, Dairy, Sheep & Goat loans).</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView('loan-categories')}
                    className="text-xs font-bold text-[#725522] hover:underline inline-flex items-center gap-1"
                  >
                    View All & Track <ArrowRight size={13} />
                  </button>
                </div>
                <div className="mt-4 divide-y divide-slate-100">
                  {applications.slice(0, 4).map((app) => (
                    <div key={app.id || app.refNumber || app.trackingId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{app.categoryLabel || 'Loan Application'}</span>
                          <span className="font-mono font-bold text-[#10243B]">{app.trackingId || app.tracking_id}</span>
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          Amount: ₹{Number(app.loanAmount || app.loan_amount || 0).toLocaleString('en-IN')} · Submitted {new Date(app.submittedAt || app.submitted_at || Date.now()).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 font-bold text-blue-900">
                          {app.status || 'Submitted'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLoanApp(app);
                            setView('loan-categories');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#F6F2E8] px-3 py-1.5 text-xs font-bold text-[#725522] hover:bg-[#ede4d0] transition shadow-2xs"
                        >
                          <Eye size={13} /> View Details & Docs
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {investmentEnquiries.length > 0 && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#10243B]">Recent Investment Enquiries</h2>
                    <p className="text-xs text-slate-500">Portfolio & planning enquiries from your account.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRequestOpenForm('investment-info')}
                    className="text-xs font-bold text-[#725522] hover:underline inline-flex items-center gap-1"
                  >
                    View & Track <ArrowRight size={13} />
                  </button>
                </div>
                <div className="mt-4 divide-y divide-slate-100">
                  {investmentEnquiries.slice(0, 3).map((enq) => (
                    <div key={enq.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                      <div>
                        <span className="font-mono font-bold text-[#10243B] text-sm">{enq.trackingId}</span>
                        <p className="text-slate-500 mt-0.5">{enq.interestCategory || 'Wealth Planning'} · {new Date(enq.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 font-bold text-blue-900">
                        {enq.status || 'Submitted'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {view === 'loan-categories' && (
          <LoanCategoriesPage
            user={user}
            allApplications={applications}
            applicationsLoading={applicationsLoading}
            onRefreshApplications={refreshApplications}
            onSelectStudentLoan={() => handleRequestOpenForm('student-loan')}
            onBack={returnHome}
            initialSelectedApp={selectedLoanApp}
          />
        )}

        {view === 'student-loan' && captchaVerifiedForms['student-loan'] && (
          <StudentLoanEnquiryPage
            user={user}
            applications={applications}
            applicationsLoading={applicationsLoading}
            applicationsError={applicationsError}
            onRefreshApplications={refreshApplications}
            onBack={returnHome}
          />
        )}
        {view === 'student-loan' && !captchaVerifiedForms['student-loan'] && (
          <div className="py-12 text-center max-w-lg mx-auto bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
              <ShieldCheck size={28} />
            </div>
            <h2 className="text-xl font-black text-slate-900">Security Verification Required</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Automated access is restricted. Please complete the Google reCAPTCHA human verification before opening the Student Loan Enquiry form.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => handleRequestOpenForm('student-loan')}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm shadow-blue-500/20"
              >
                Verify Human (रोबोट जांच पूरी करें)
              </button>
              <button
                type="button"
                onClick={returnHome}
                className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-white transition cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

        {view === 'investment-info' && captchaVerifiedForms['investment-info'] && (
          <InvestmentEnquiryPage
            user={user}
            enquiries={investmentEnquiries}
            enquiriesLoading={investmentEnquiriesLoading}
            enquiriesError={investmentEnquiriesError}
            onRefreshEnquiries={refreshInvestmentEnquiries}
            onBack={returnHome}
          />
        )}
        {view === 'investment-info' && !captchaVerifiedForms['investment-info'] && (
          <div className="py-12 text-center max-w-lg mx-auto bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
              <ShieldCheck size={28} />
            </div>
            <h2 className="text-xl font-black text-slate-900">Security Verification Required</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Automated access is restricted. Please complete the Google reCAPTCHA human verification before opening the Investment Information enquiry desk.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => handleRequestOpenForm('investment-info')}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm shadow-blue-500/20"
              >
                Verify Human (रोबोट जांच पूरी करें)
              </button>
              <button
                type="button"
                onClick={returnHome}
                className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-white transition cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>

      <CaptchaModal
        isOpen={Boolean(captchaTargetForm)}
        targetForm={captchaTargetForm}
        onClose={handleCaptchaClose}
        onVerified={handleCaptchaVerified}
      />

      <footer className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#876A2E]" /> Private customer area</span>
        <span className="mx-2">·</span>
        <button type="button" onClick={() => setCurrentView('home')} className="font-semibold text-[#725522] hover:underline">Public website</button>
      </footer>
    </div>
  );
}
