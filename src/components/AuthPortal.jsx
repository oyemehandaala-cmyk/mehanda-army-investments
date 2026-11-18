import React, { useEffect, useRef, useState } from 'react';
import { 
  TrendingUp, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  HelpCircle,
  ExternalLink,
  Copy,
  Download,
  Printer,
  ShieldCheck,
  ChevronDown,
  Clock,
  RefreshCw,
  Home,
  MessageCircle,
} from 'lucide-react';
import {
  authService,
  getSupabaseConfigurationDiagnostic,
  isSupabaseConfigured,
  toAuthenticatedUser,
} from '../lib/supabaseClient';
import { getAuthErrorMessage } from '../lib/authError';
import { getApiUrl } from '../lib/apiConfig';
import PhoneOtpForm from './PhoneOtpForm';
import BrandVerificationBadge from './BrandVerificationBadge';
import ScenicLandscapeBackground from './ScenicLandscapeBackground';
import GoogleBrandedSignInButton from './GoogleBrandedSignInButton';

const ACCOUNT_SERVICES_UNAVAILABLE = 'Account services are temporarily unavailable. Please try again later.';
const SAFE_AUTH_ERROR_CODES = new Set([
  'email_address_invalid',
  'email_address_not_authorized',
  'email_exists',
  'email_not_confirmed',
  'invalid_api_key',
  'invalid_credentials',
  'over_email_send_rate_limit',
  'over_sms_send_rate_limit',
  'over_request_rate_limit',
  'otp_expired',
  'phone_exists',
  'phone_not_confirmed',
  'signup_disabled',
  'user_already_exists',
  'user_already_registered',
  'weak_password',
]);

function logAuthFailure(operation, error) {
  if (import.meta.env.DEV) {
    const safeCode = typeof error?.code === 'string' && SAFE_AUTH_ERROR_CODES.has(error.code)
      ? error.code
      : 'unclassified';
    const safeStatus = Number.isInteger(error?.status) ? error.status : null;
    console.warn('Supabase authentication request failed.', {
      operation,
      code: safeCode,
      status: safeStatus,
    });
  }
}

function logConfigurationFailure(operation) {
  if (import.meta.env.DEV) {
    console.warn('Supabase authentication is not configured.', {
      operation,
      ...getSupabaseConfigurationDiagnostic(),
    });
  }
}

export default function AuthPortal({ 
  initialMode = 'login', 
  setCurrentView, 
  setAuthenticatedUser,
  targetView,
  targetViewTitle,
}) {
  const [authMode, setAuthMode] = useState(
    initialMode === 'recovery-key' || initialMode === 'rotate-recovery-key' ? 'login' : initialMode
  ); // 'login', 'signup', 'signup-otp', 'forgot', 'reset-password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneLoginExpanded, setPhoneLoginExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 6-digit Email OTP state for Account Registration
  const [signupOtp, setSignupOtp] = useState('');
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const cooldownTimerRef = useRef(null);
  const expiryTimerRef = useRef(null);


  // Sync initialMode if changed by parent router
  useEffect(() => {
    if (initialMode && initialMode !== authMode) {
      setAuthMode(initialMode);
    }
  }, [initialMode]);

  // Clear timers on unmount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (
        hash.includes('error=access_denied') ||
        hash.includes('otp_expired') ||
        search.includes('error=access_denied') ||
        search.includes('otp_expired')
      ) {
        setErrorMessage('This password reset link has expired or has already been used. Please request a new password reset link.');
      }
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (otpResendCooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setOtpResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(cooldownTimerRef.current);
    }
  }, [otpResendCooldown]);

  // Expiration countdown timer (300s = 5m)
  useEffect(() => {
    if (otpExpiresIn > 0) {
      expiryTimerRef.current = setInterval(() => {
        setOtpExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(expiryTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(expiryTimerRef.current);
    }
  }, [otpExpiresIn]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const hasConfiguredBackend = isSupabaseConfigured();

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!hasConfiguredBackend) {
      logConfigurationFailure('google-login');
      setErrorMessage(ACCOUNT_SERVICES_UNAVAILABLE);
      return;
    }

    try {
      if (targetView) {
        window.sessionStorage.setItem('mai_auth_redirect_target', targetView);
      }
    } catch {
      // ignore
    }

    setGoogleLoading(true);
    const { error } = await authService.signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      logAuthFailure('google-login', error);
      setErrorMessage(getAuthErrorMessage(error, 'oauth'));
    }
  };

  const handleFacebookSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!hasConfiguredBackend) {
      logConfigurationFailure('facebook-login');
      setErrorMessage(ACCOUNT_SERVICES_UNAVAILABLE);
      return;
    }

    try {
      if (targetView) {
        window.sessionStorage.setItem('mai_auth_redirect_target', targetView);
      }
    } catch {
      // ignore
    }

    setFacebookLoading(true);
    const { error } = await authService.signInWithFacebook();
    setFacebookLoading(false);
    if (error) {
      logAuthFailure('facebook-login', error);
      setErrorMessage(getAuthErrorMessage(error, 'oauth'));
    }
  };

  // 1. Step 1 of Registration: Validate input and dispatch 6-digit OTP to user's Gmail
  const handleInitiateSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password.trim()) {
      setErrorMessage('Please fill in all required fields (Full Name, Email Address, and Password).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid Gmail / email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/send-email-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          purpose: 'Account Registration',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setAuthMode('signup-otp');
      setSignupOtp('');
      setOtpResendCooldown(data.resendCooldownSeconds || 60);
      setOtpExpiresIn(data.expiresInSeconds || 300);
      setSuccessMessage(`A 6-digit verification code was sent to ${cleanEmail}. Please enter it below to complete registration.`);
    } catch (err) {
      setErrorMessage(err.message || 'Could not send verification code. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Resend 6-digit OTP for Registration
  const handleResendSignupOtp = async () => {
    if (otpResendCooldown > 0 || loading) return;
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const response = await fetch(getApiUrl('/api/send-email-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          purpose: 'Account Registration',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend verification code.');
      }

      setSignupOtp('');
      setOtpResendCooldown(data.resendCooldownSeconds || 60);
      setOtpExpiresIn(data.expiresInSeconds || 300);
      setSuccessMessage(`A fresh 6-digit verification code has been dispatched to ${cleanEmail}.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Step 2 of Registration: Verify 6-digit OTP and create verified user in Supabase
  const handleVerifyAndRegister = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanOtp = String(signupOtp || '').trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter the 6-digit numeric verification code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const response = await fetch(getApiUrl('/api/register-user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          fullName: fullName.trim(),
          phone: phoneNumber.trim() || null,
          otp: cleanOtp,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Account registration failed.');
      }

      // Automatically sign in the freshly created & confirmed user
      const { data: signInData, error: signInError } = await authService.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError || !signInData?.user) {
        setAuthMode('login');
        setSuccessMessage('Account registered and email verified successfully! Please sign in with your password.');
        return;
      }

      try {
        if (targetView) {
          window.sessionStorage.setItem('mai_auth_redirect_target', targetView);
        }
      } catch {
        // ignore
      }
      setAuthenticatedUser(toAuthenticatedUser(signInData.user));
      setCurrentView(targetView || 'client-dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Real Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (!hasConfiguredBackend) {
      logConfigurationFailure('login');
      setErrorMessage(ACCOUNT_SERVICES_UNAVAILABLE);
      return;
    }

    setLoading(true);
    const { data, error } = await authService.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (error) {
      logAuthFailure('login', error);
      setErrorMessage(getAuthErrorMessage(error, 'login'));
    } else if (!data?.session || !data?.user) {
      logAuthFailure('login', new Error('Authentication response did not include a verified session.'));
      setErrorMessage('Login could not be verified by the authentication server.');
    } else if (!data.user.email_confirmed_at) {
      await authService.signOut();
      setErrorMessage('Please verify your email address before signing in.');
    } else {
      try {
        if (targetView) {
          window.sessionStorage.setItem('mai_auth_redirect_target', targetView);
        }
      } catch {
        // ignore
      }
      setAuthenticatedUser(toAuthenticatedUser(data.user));
      setCurrentView(targetView || 'client-dashboard');
    }
  };

  // Handle Password Reset Request
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid registered email address.');
      return;
    }

    if (!hasConfiguredBackend) {
      logConfigurationFailure('recovery');
      setErrorMessage(ACCOUNT_SERVICES_UNAVAILABLE);
      return;
    }

    setLoading(true);
    const { error } = await authService.resetPassword(email.trim().toLowerCase());
    setLoading(false);
    if (error) {
      logAuthFailure('recovery', error);
      setErrorMessage(getAuthErrorMessage(error, 'recovery'));
    } else {
      setSuccessMessage('If an account exists for that address, a password reset link has been sent to your email. Click the link to choose a new password.');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('The passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      // Update password directly via Supabase authenticated session
      const res = await authService.updatePassword(password);
      setLoading(false);

      if (res?.error) {
        logAuthFailure('password-reset', res.error);
        setErrorMessage(getAuthErrorMessage(res.error, 'password-reset') || 'We could not update your password. The link may have expired. Please request a new password reset link.');
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setSuccessMessage('Password reset successfully! Please sign in with your new password.');
      setAuthMode('login');

      const callbackUrl = new URL(window.location.href);
      callbackUrl.searchParams.delete('auth');
      window.history.replaceState({}, document.title, callbackUrl.toString());
    } catch (err) {
      setLoading(false);
      logAuthFailure('password-reset', err);
      setErrorMessage('We could not complete password reset. Please request a new verification link.');
    }
  };

  const navigateToSection = (sectionId) => {
    setCurrentView('home');
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200/60 text-slate-900">
      {/* Background Subtle Corporate Radial Highlights */}
      <div className="pointer-events-none absolute -top-40 right-10 h-[45rem] w-[45rem] rounded-full bg-radial from-blue-400/10 via-indigo-200/5 to-transparent blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[40rem] w-[40rem] rounded-full bg-radial from-emerald-400/10 via-teal-100/5 to-transparent blur-3xl" aria-hidden="true" />

      {/* Subtle Corporate Grid Texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(#1E40AF_1px,transparent_1px)] [background-size:24px_24px]" aria-hidden="true" />

      {/* 2. TOP EXECUTIVE CORPORATE HEADER */}
      <header className="relative z-20 w-full px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-200/90 bg-white/90 backdrop-blur-md shadow-xs">
        {/* Brand Logo & Name */}
        <button
          type="button"
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
          aria-label="Return to Mehanda Army Investments Home"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform text-white">
            <TrendingUp size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="block text-xs font-black tracking-[0.16em] text-slate-900 uppercase">
              MEHANDA ARMY
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">
              Investments
              <BrandVerificationBadge className="h-3.5 w-3.5" />
            </span>
          </div>
        </button>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600 tracking-wide">
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className="hover:text-blue-700 transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => navigateToSection('services')}
            className="hover:text-blue-700 transition-colors cursor-pointer"
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => navigateToSection('contact')}
            className="hover:text-blue-700 transition-colors cursor-pointer"
          >
            Contact
          </button>
          <button
            type="button"
            onClick={() => navigateToSection('about')}
            className="hover:text-blue-700 transition-colors cursor-pointer"
          >
            About
          </button>
        </nav>

        {/* Right Action: Back to Home Pill */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Home size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Back to Home</span>
          </button>
        </div>
      </header>

      {/* 3. CENTERED INSTITUTIONAL CLIENT PORTAL CARD */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-2.5 sm:px-4 py-3 sm:py-12 my-auto">
        <div className="w-[96%] sm:w-[430px] max-w-[440px] mx-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-xl sm:shadow-2xl text-slate-900">

          {/* Segmented Pill Switcher (Sign In ⟷ Create Account) */}
          {(authMode === 'login' || authMode === 'signup') && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-3.5 sm:mb-5 border border-slate-200/80">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`py-1.5 sm:py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`py-1.5 sm:py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Heading & Subtitle */}
          <div className="text-center mb-3 sm:mb-5">
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
              {authMode === 'login' && 'Client Sign In'}
              {authMode === 'signup' && 'Create Your Account'}
              {authMode === 'signup-otp' && 'Verify Gmail OTP'}
              {authMode === 'forgot' && 'Reset Password'}
              {authMode === 'reset-password' && 'Choose New Password'}
            </h2>

            {/* Subtitle / Mode Toggle for non-main modes */}
            {authMode === 'signup-otp' && (
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1">
                Code sent to <span className="font-bold text-blue-700">{email}</span>
              </p>
            )}

            {authMode === 'forgot' && (
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1">
                Enter your registered email to receive a password reset link.
              </p>
            )}
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 leading-relaxed">
                <span>{errorMessage}</span>
                {errorMessage.includes('already exists') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setErrorMessage('');
                    }}
                    className="block mt-1 text-blue-700 hover:underline font-bold cursor-pointer"
                  >
                    Click here to Sign In →
                  </button>
                )}
                {errorMessage.includes('No account found') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setErrorMessage('');
                    }}
                    className="block mt-1 text-blue-700 hover:underline font-bold cursor-pointer"
                  >
                    Click here to Create an Account →
                  </button>
                )}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-2.5 sm:space-y-3.5">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5 sm:mb-1">
                  Email Address
                </label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=""
                  className="w-full h-[38px] sm:h-[42px] px-3 sm:px-3.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5 sm:mb-1">
                  Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    className="w-full h-[38px] sm:h-[42px] pl-3 sm:pl-3.5 pr-9 sm:pr-10 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] sm:text-xs pt-0.5">
                <button 
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setErrorMessage(''); setSuccessMessage(''); }}
                  className="text-slate-600 hover:text-blue-700 transition-colors underline underline-offset-2 cursor-pointer font-medium"
                >
                  Forgot password?
                </button>
                <a 
                  href="https://wa.me/919812947813" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-slate-500 hover:text-blue-700 flex items-center gap-1 transition-colors font-medium"
                >
                  <HelpCircle size={12} />
                  <span>Helpdesk</span>
                </a>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full h-[40px] sm:h-[44px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 active:scale-98 disabled:opacity-50 mt-1 sm:mt-2 cursor-pointer"
              >
                {loading ? 'Signing In...' : 'Sign In to Portal →'}
              </button>
            </form>
          )}

          {/* 2. SIGN UP FORM (STEP 1: DETAILS & SEND GMAIL OTP) */}
          {authMode === 'signup' && (
            <form onSubmit={handleInitiateSignUp} className="space-y-2 sm:space-y-3">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5 sm:mb-1">
                  Full Name
                </label>
                <input 
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder=""
                  className="w-full h-[38px] sm:h-[42px] px-3 sm:px-3.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5 sm:mb-1">
                  Email Address
                </label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=""
                  className="w-full h-[38px] sm:h-[42px] px-3 sm:px-3.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5 sm:mb-1">
                  Password (min 8 chars)
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    className="w-full h-[38px] sm:h-[42px] pl-3 sm:pl-3.5 pr-9 sm:pr-10 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 sm:mb-1">
                  Phone Number <span className="font-normal lowercase">(optional)</span>
                </label>
                <input 
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder=""
                  className="w-full h-[38px] sm:h-[42px] px-3 sm:px-3.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                />
              </div>

              {/* Required Exact Button Label & Functionality */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full h-[40px] sm:h-[44px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 active:scale-98 disabled:opacity-50 mt-1 sm:mt-2 cursor-pointer"
              >
                <Mail size={14} />
                <span>{loading ? 'Sending Verification Code...' : 'Create Account (Send Gmail OTP)'}</span>
              </button>
            </form>
          )}

          {/* SOCIAL LOGIN / DIVIDER (Facebook and Google circular buttons) */}
          {(authMode === 'login' || authMode === 'signup') && (
            <div className="mt-3 sm:mt-4">
              <div className="flex items-center gap-2.5 my-2.5 sm:my-3.5">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] sm:text-[11px] text-slate-500 tracking-wider">
                  {authMode === 'login' ? 'or sign in with' : 'or sign up with'}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Social Buttons: Facebook & Google */}
              <div className="flex items-center justify-center gap-3 sm:gap-3.5">
                {/* Facebook Button */}
                <button
                  type="button"
                  onClick={handleFacebookSignIn}
                  disabled={loading || googleLoading || facebookLoading}
                  aria-label="Continue with Facebook"
                  title="Continue with Facebook"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>

                {/* Google Button with Identity Services Branding */}
                <GoogleBrandedSignInButton
                  onSuccess={(user) => {
                    try {
                      if (targetView) {
                        window.sessionStorage.setItem('mai_auth_redirect_target', targetView);
                      }
                    } catch {
                      // ignore
                    }
                    if (setAuthenticatedUser) setAuthenticatedUser(user);
                    if (setCurrentView) setCurrentView(targetView || 'client-dashboard');
                  }}
                  onError={(msg) => setErrorMessage(msg)}
                  setLoading={setGoogleLoading}
                  disabled={loading || googleLoading || facebookLoading}
                  buttonSize={40}
                />
              </div>

              {/* Phone OTP option for login */}
              {authMode === 'login' && (
                <div className="mt-2.5 sm:mt-3.5 pt-2 sm:pt-2.5 border-t border-slate-200 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneLoginExpanded((expanded) => !expanded);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-[11px] sm:text-xs text-slate-600 hover:text-blue-700 inline-flex items-center gap-1.5 py-0.5 transition-colors cursor-pointer font-medium"
                  >
                    <Phone size={13} className="text-slate-500" />
                    <span>{phoneLoginExpanded ? 'Hide Phone SMS Login' : 'Sign in with Phone SMS OTP'}</span>
                    <ChevronDown size={14} className={phoneLoginExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>

                  {phoneLoginExpanded && (
                    <div className="mt-2 p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-slate-900">
                      <PhoneOtpForm
                        onVerified={(user) => {
                          try {
                            if (targetView) {
                              window.sessionStorage.setItem('mai_auth_redirect_target', targetView);
                            }
                          } catch {
                            // ignore
                          }
                          setAuthenticatedUser(toAuthenticatedUser(user));
                          setCurrentView(targetView || 'client-dashboard');
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. STEP 2: VERIFY 6-DIGIT GMAIL OTP */}
          {authMode === 'signup-otp' && (
            <div className="space-y-2.5 sm:space-y-3.5">
              <div className="text-center py-0.5">
                <div className="mx-auto w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 mb-1.5 sm:mb-2 shadow-xs">
                  <Mail size={18} />
                </div>
                <h3 className="text-xs sm:text-base font-bold text-slate-900">
                  Enter 6-Digit Verification Code
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Sent to <span className="font-bold text-blue-700">{email}</span>
                </p>
              </div>

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder=""
                  value={signupOtp}
                  onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && signupOtp.length === 6 && !loading) {
                      handleVerifyAndRegister(e);
                    }
                  }}
                  className="w-full h-[40px] sm:h-[46px] px-3 bg-slate-50 border-2 border-blue-500 focus:bg-white rounded-xl text-center font-mono text-lg sm:text-2xl tracking-[0.25em] sm:tracking-[0.35em] font-extrabold text-blue-700 outline-none shadow-xs"
                />
              </div>

              {/* Timer & Resend Controls */}
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className={otpExpiresIn <= 60 ? 'text-red-500 animate-pulse' : 'text-slate-400'} />
                  <span className={otpExpiresIn <= 60 ? 'text-red-600 font-bold' : ''}>
                    Expires: {formatTime(otpExpiresIn)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResendSignupOtp}
                  disabled={otpResendCooldown > 0 || loading}
                  className="font-bold text-blue-700 hover:underline disabled:text-slate-400 disabled:no-underline inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                  {otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] sm:text-[11px] text-slate-600 leading-relaxed">
                ℹ <strong>Spam / Junk:</strong> Check your Gmail <strong>Spam</strong> or <strong>Updates</strong> folder if not in Inbox.
              </div>

              <button
                type="button"
                onClick={handleVerifyAndRegister}
                disabled={loading || signupOtp.length !== 6}
                className="w-full h-[40px] sm:h-[44px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed mt-1 cursor-pointer"
              >
                {loading ? 'Verifying OTP & Creating Account...' : 'Verify OTP & Complete Registration'}
              </button>

              <div className="text-center pt-0.5 sm:pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-slate-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} /> Edit Name or Email
                </button>
              </div>
            </div>
          )}

          {/* 4. FORGOT PASSWORD */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-2.5 sm:space-y-3.5">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5 sm:mb-1">
                  Enter Your Registered Email
                </label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=""
                  className="w-full h-[38px] sm:h-[42px] px-3 sm:px-3.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full h-[40px] sm:h-[44px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Sending Verification Email...' : 'Send Verification Link'}
              </button>

              <p className="text-[10px] sm:text-[11px] text-slate-500 text-center leading-relaxed">
                For security, we will send a password reset link to your verified email address.
              </p>

              <div className="text-center pt-0.5 sm:pt-1">
                <button 
                  type="button"
                  onClick={() => { setAuthMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
                  className="text-xs font-semibold text-slate-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} /> Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* 5. RESET PASSWORD FORM */}
          {authMode === 'reset-password' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-2.5 sm:space-y-3.5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs leading-relaxed">
                ✓ Email verified. Enter your new password below to reset your account credentials.
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5 sm:mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  className="w-full h-[38px] sm:h-[42px] px-3 sm:px-3.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5 sm:mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder=""
                  className="w-full h-[38px] sm:h-[42px] px-3 sm:px-3.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all shadow-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[40px] sm:h-[44px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Saving New Password…' : 'Save New Password'}
              </button>

              <div className="text-center pt-0.5 sm:pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const callbackUrl = new URL(window.location.href);
                    callbackUrl.searchParams.delete('auth');
                    window.history.replaceState({}, document.title, callbackUrl.toString());
                    setAuthMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                    setCurrentView('auth-login');
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} /> Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Back to Public Website Link */}
          <div className="mt-3.5 sm:mt-5 pt-2.5 sm:pt-3.5 border-t border-slate-200 text-center">
            <button 
              type="button"
              onClick={() => setCurrentView('home')}
              className="text-xs text-slate-500 hover:text-blue-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
            >
              <ArrowLeft size={13} />
              <span>Back to Public Website</span>
            </button>
          </div>

        </div>
      </main>

      {/* 4. SCENIC FOOTER NOTICE */}
      <footer className="relative z-10 w-full px-4 py-3 sm:py-3.5 text-center text-xs text-slate-500 border-t border-slate-200 bg-white/90 backdrop-blur-md">
        <p className="flex items-center justify-center gap-1.5 flex-wrap">
          <span className="text-slate-800 font-semibold">&copy; {new Date().getFullYear()} Mehanda Army Investments</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600">Smart Finance. Secure Future.</span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 font-semibold">100% Secure Client Portal</span>
        </p>
      </footer>
    </div>
  );
}
