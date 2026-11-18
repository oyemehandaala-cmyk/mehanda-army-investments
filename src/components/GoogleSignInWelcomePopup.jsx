import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Phone, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  TrendingUp,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { authService, isSupabaseConfigured, toAuthenticatedUser } from '../lib/supabaseClient';
import { getAuthErrorMessage } from '../lib/authError';
import BrandVerificationBadge from './BrandVerificationBadge';
import PhoneOtpForm from './PhoneOtpForm';
import ScenicLandscapeBackground from './ScenicLandscapeBackground';
import GoogleBrandedSignInButton from './GoogleBrandedSignInButton';

export default function GoogleSignInWelcomePopup({
  onClose,
  initialErrorMessage = '',
  setCurrentView,
  setAuthenticatedUser,
}) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'signup-otp' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneLoginExpanded, setPhoneLoginExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' | 'facebook' | null
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);
  const [successMessage, setSuccessMessage] = useState('');

  // 6-digit Email OTP state for Account Registration
  const [signupOtp, setSignupOtp] = useState('');
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const cooldownTimerRef = useRef(null);
  const expiryTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, []);

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

  // Option A: Real Google OAuth
  const handleGoogleSignIn = async () => {
    if (oauthLoading || isSigningIn) return;
    setErrorMessage('');
    setSuccessMessage('');
    if (!hasConfiguredBackend) {
      setErrorMessage('Authentication service is not configured. Please contact support.');
      return;
    }

    setOauthLoading('google');
    try {
      const { data, error } = await authService.signInWithGoogle();
      if (error || !data?.url) {
        setErrorMessage(
          error
            ? getAuthErrorMessage(error, 'oauth')
            : 'Google sign-in could not be started. Confirm Google OAuth is enabled in Supabase.'
        );
        setOauthLoading(null);
      }
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'oauth'));
      setOauthLoading(null);
    }
  };

  // Option C: Real Facebook OAuth
  const handleFacebookSignIn = async () => {
    if (oauthLoading || isSigningIn) return;
    setErrorMessage('');
    setSuccessMessage('');
    if (!hasConfiguredBackend) {
      setErrorMessage('Authentication service is not configured. Please contact support.');
      return;
    }

    setOauthLoading('facebook');
    try {
      const { data, error } = await authService.signInWithFacebook();
      if (error || !data?.url) {
        setErrorMessage(
          error
            ? getAuthErrorMessage(error, 'oauth')
            : 'Facebook sign-in could not be started. Confirm Facebook OAuth is enabled in Supabase.'
        );
        setOauthLoading(null);
      }
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'oauth'));
      setOauthLoading(null);
    }
  };

  // Option B: Real Email & Password Login
  const handleEmailPasswordLogin = async (e) => {
    e.preventDefault();
    if (isSigningIn) return;
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (!hasConfiguredBackend) {
      setErrorMessage('Authentication service is not configured.');
      return;
    }

    setIsSigningIn(true);
    try {
      const { data, error } = await authService.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMessage(getAuthErrorMessage(error, 'login'));
      } else if (!data?.session || !data?.user) {
        setErrorMessage('Login response was invalid. Please try again.');
      } else if (!data.user.email_confirmed_at && !data.user.phone_confirmed_at) {
        await authService.signOut();
        setErrorMessage('Please verify your email address before signing in.');
      } else {
        if (setAuthenticatedUser) {
          setAuthenticatedUser(toAuthenticatedUser(data.user));
        }
        if (setCurrentView) {
          setCurrentView('client-dashboard');
        }
        onClose();
      }
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err, 'login'));
    } finally {
      setIsSigningIn(false);
    }
  };

  // Create New Account inline Step 1: Validate & Send Gmail OTP
  const handleInitiateSignup = async (e) => {
    e.preventDefault();
    if (isSigningIn) return;
    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password.trim()) {
      setErrorMessage('Please provide your full legal name, email, and password.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid Gmail / email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsSigningIn(true);
    try {
      const response = await fetch('/api/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          purpose: 'Account Registration',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      setMode('signup-otp');
      setSignupOtp('');
      setOtpResendCooldown(data.resendCooldownSeconds || 60);
      setOtpExpiresIn(data.expiresInSeconds || 300);
      setSuccessMessage(`A 6-digit verification code has been sent to ${cleanEmail}. Enter it below to complete registration.`);
    } catch (err) {
      setErrorMessage(err.message || 'Could not send verification code. Please check your email and try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Resend 6-digit OTP for Registration
  const handleResendSignupOtp = async () => {
    if (otpResendCooldown > 0 || isSigningIn) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsSigningIn(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const response = await fetch('/api/send-email-otp', {
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
      setSuccessMessage(`A fresh 6-digit verification code was sent to ${cleanEmail}.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Create New Account inline Step 2: Verify OTP and create user
  const handleVerifyAndRegister = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanOtp = String(signupOtp || '').trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter the 6-digit numeric verification code sent to your email.');
      return;
    }

    setIsSigningIn(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const response = await fetch('/api/register-user', {
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

      // Automatically sign in the freshly created & verified user
      const { data: signInData, error: signInError } = await authService.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError || !signInData?.user) {
        setMode('login');
        setSuccessMessage('Account registered and verified successfully! Please sign in with your password.');
        return;
      }

      if (setAuthenticatedUser) {
        setAuthenticatedUser(toAuthenticatedUser(signInData.user));
      }
      if (setCurrentView) {
        setCurrentView('client-dashboard');
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Forgot Password inline
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (isSigningIn) return;
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsSigningIn(true);
    try {
      const { error } = await authService.resetPassword(email.trim().toLowerCase());
      if (error) {
        setErrorMessage(getAuthErrorMessage(error, 'recovery'));
      } else {
        setSuccessMessage('A password recovery email has been sent. Check your inbox.');
      }
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err, 'recovery'));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[125] grid place-items-center overflow-y-auto bg-slate-950/80 p-4 text-white backdrop-blur-md animate-fadeIn">
      {/* Background scenic landscape overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-30 select-none overflow-hidden" aria-hidden="true">
        <ScenicLandscapeBackground />
      </div>

      <section
        className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/70 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl z-10 my-auto"
        role="dialog"
        aria-labelledby="mai-login-modal-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close login popup"
        >
          <X size={20} />
        </button>

        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 border border-[#C8A65D]/40 text-[#F2D58E]" aria-hidden="true">
            <TrendingUp size={20} />
          </span>
          <div className="text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F2D58E] flex items-center gap-1.5">
              MEHANDA ARMY <BrandVerificationBadge className="h-3.5 w-3.5" />
            </span>
            <p className="text-[10px] tracking-wider text-white/70 font-semibold">INVESTMENTS PORTAL</p>
          </div>
        </div>

        {/* Dynamic Titles according to mode */}
        {mode === 'login' && (
          <>
            <div className="text-center mb-6">
              <h1 id="mai-login-modal-title" className="text-2xl font-black text-white tracking-tight">
                Sign In
              </h1>
              <p className="text-xs text-white/70 mt-1">
                New to Mehanda Army?{' '}
                <button
                  type="button"
                  onClick={() => { setErrorMessage(''); setSuccessMessage(''); setMode('signup'); }}
                  className="text-[#4D7CFF] hover:underline font-semibold"
                >
                  Create Account
                </button>
              </p>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                  EMAIL
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=""
                    className="w-full px-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/20 focus:border-[#4D7CFF] rounded-xl text-sm text-white placeholder-transparent outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    className="w-full px-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/20 focus:border-[#4D7CFF] rounded-xl text-sm text-white placeholder-transparent outline-none pr-11 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/50 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <button
                  type="button"
                  onClick={() => { setErrorMessage(''); setSuccessMessage(''); setMode('forgot'); }}
                  className="text-white/70 hover:text-white transition-colors underline underline-offset-2"
                >
                  Forgot password?
                </button>
                <a
                  href="https://wa.me/919812947813"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/50 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <HelpCircle size={13} />
                  <span>Support</span>
                </a>
              </div>

              {/* Primary Royal Blue Button */}
              <button
                type="submit"
                disabled={isSigningIn || Boolean(oauthLoading)}
                className="w-full py-3.5 bg-[#4D7CFF] hover:bg-[#3B6AE8] active:bg-[#2F5BD8] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {isSigningIn ? 'Signing In…' : 'Sign In'}
              </button>
            </form>

            {/* Social Divider & Circular Buttons */}
            <div className="mt-5">
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-white/20" />
                <span className="text-[11px] text-white/60 tracking-wider">
                  or sign in with
                </span>
                <div className="h-px flex-1 bg-white/20" />
              </div>

              <div className="flex items-center justify-center gap-4">
                {/* Facebook Button (Blue circle with white 'f') */}
                <button
                  type="button"
                  onClick={handleFacebookSignIn}
                  disabled={Boolean(oauthLoading) || isSigningIn}
                  aria-label="Continue with Facebook"
                  title="Continue with Facebook"
                  className="w-12 h-12 rounded-full bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>

                {/* Google Button with Official Branding & Icon */}
                <GoogleBrandedSignInButton
                  onSuccess={(user) => {
                    if (setAuthenticatedUser) setAuthenticatedUser(user);
                    if (setCurrentView) setCurrentView('client-dashboard');
                    onClose();
                  }}
                  onError={(msg) => setErrorMessage(msg)}
                  setLoading={(l) => setOauthLoading(l ? 'google' : null)}
                  disabled={Boolean(oauthLoading) || isSigningIn}
                  buttonSize={48}
                />
              </div>

              {/* Phone SMS OTP Option */}
              <div className="mt-4 pt-3 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setPhoneLoginExpanded((expanded) => !expanded);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-white/70 hover:text-white inline-flex items-center gap-1.5 py-1 transition-colors"
                >
                  <Phone size={13} />
                  <span>{phoneLoginExpanded ? 'Hide Phone SMS Login' : 'Sign in with Phone SMS OTP'}</span>
                  <ChevronDown size={14} className={phoneLoginExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
                {phoneLoginExpanded && (
                  <div className="mt-3 text-left">
                    <PhoneOtpForm
                      mode="sign-in"
                      onVerified={(authUser) => {
                        if (setAuthenticatedUser) setAuthenticatedUser(authUser);
                        if (setCurrentView) setCurrentView('client-dashboard');
                        onClose();
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Signup Mode */}
        {mode === 'signup' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => { setErrorMessage(''); setSuccessMessage(''); setMode('login'); }}
                className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Back to login"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 id="mai-login-modal-title" className="text-2xl font-black text-white tracking-tight">
                Create Account
              </h1>
            </div>
            <p className="text-xs text-white/70 mb-5">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setErrorMessage(''); setSuccessMessage(''); setMode('login'); }}
                className="text-[#4D7CFF] hover:underline font-semibold"
              >
                Sign In
              </button>
            </p>

            <form onSubmit={handleInitiateSignup} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder=""
                  className="w-full px-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/20 focus:border-[#4D7CFF] rounded-xl text-sm text-white placeholder-transparent outline-none transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                  EMAIL
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=""
                  className="w-full px-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/20 focus:border-[#4D7CFF] rounded-xl text-sm text-white placeholder-transparent outline-none transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    className="w-full px-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/20 focus:border-[#4D7CFF] rounded-xl text-sm text-white placeholder-transparent outline-none pr-11 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/50 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1.5">
                  PHONE NUMBER <span className="text-white/40 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder=""
                  className="w-full px-4 py-2.5 bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/20 focus:border-[#4D7CFF] rounded-xl text-sm text-white placeholder-transparent outline-none transition-all shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full py-3.5 bg-[#4D7CFF] hover:bg-[#3B6AE8] active:bg-[#2F5BD8] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {isSigningIn ? 'Sending Verification Code...' : 'Create Account (Send Gmail OTP)'}
              </button>
            </form>

            {/* Social Divider & Circular Buttons */}
            <div className="mt-5">
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-white/20" />
                <span className="text-[11px] text-white/60 tracking-wider">
                  or sign up with
                </span>
                <div className="h-px flex-1 bg-white/20" />
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleFacebookSignIn}
                  disabled={Boolean(oauthLoading) || isSigningIn}
                  aria-label="Continue with Facebook"
                  title="Continue with Facebook"
                  className="w-12 h-12 rounded-full bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>

                {/* Google Button with Official Branding & Icon */}
                <GoogleBrandedSignInButton
                  onSuccess={(user) => {
                    if (setAuthenticatedUser) setAuthenticatedUser(user);
                    if (setCurrentView) setCurrentView('client-dashboard');
                    onClose();
                  }}
                  onError={(msg) => setErrorMessage(msg)}
                  setLoading={(l) => setOauthLoading(l ? 'google' : null)}
                  disabled={Boolean(oauthLoading) || isSigningIn}
                  buttonSize={48}
                />
              </div>
            </div>
          </>
        )}

        {/* OTP Verification Mode */}
        {mode === 'signup-otp' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => { setErrorMessage(''); setMode('signup'); }}
                className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Back to details"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 id="mai-login-modal-title" className="text-2xl font-black text-white tracking-tight">
                Verify Your Email
              </h1>
            </div>
            <p className="text-xs text-white/70 mb-4">
              Enter the 6-digit verification code sent to <strong className="text-white">{email}</strong>.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-2 text-center">
                  6-Digit Verification Code
                </label>
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
                    if (e.key === 'Enter' && signupOtp.length === 6 && !isSigningIn) {
                      handleVerifyAndRegister(e);
                    }
                  }}
                  className="w-full rounded-2xl border-2 border-[#4D7CFF] bg-white/10 py-3.5 px-3 text-center font-mono text-3xl font-extrabold tracking-[0.35em] text-white focus:outline-none focus:ring-2 focus:ring-[#4D7CFF]/50 shadow-inner"
                />
              </div>

              {/* Timer & Resend Controls */}
              <div className="flex items-center justify-between text-xs text-white/60 pt-1">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className={otpExpiresIn <= 60 ? 'text-red-400 animate-pulse' : 'text-white/60'} />
                  <span className={otpExpiresIn <= 60 ? 'text-red-400 font-bold' : ''}>
                    Expires in: {formatTime(otpExpiresIn)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResendSignupOtp}
                  disabled={otpResendCooldown > 0 || isSigningIn}
                  className="text-xs font-bold text-[#F2D58E] hover:underline disabled:text-white/40 disabled:no-underline inline-flex items-center gap-1"
                >
                  <RefreshCw size={12} className={isSigningIn ? 'animate-spin' : ''} />
                  {otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/70 leading-normal">
                ℹ <strong>Spam / Junk Reminder:</strong> If the code does not appear in your primary inbox, please check your Gmail <strong>Spam</strong> or <strong>Updates</strong> folder.
              </div>

              <button
                type="button"
                onClick={handleVerifyAndRegister}
                disabled={isSigningIn || signupOtp.length !== 6}
                className="w-full py-3.5 bg-[#4D7CFF] hover:bg-[#3B6AE8] active:bg-[#2F5BD8] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {isSigningIn ? 'Verifying OTP & Creating Account…' : 'Verify OTP & Complete Registration'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErrorMessage(''); }}
                  className="text-xs text-white/60 hover:text-white font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft size={13} /> Edit Name or Email
                </button>
              </div>
            </div>
          </>
        )}

        {/* Forgot Password Mode */}
        {mode === 'forgot' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => { setErrorMessage(''); setSuccessMessage(''); setMode('login'); }}
                className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Back to login"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 id="mai-login-modal-title" className="text-2xl font-black text-white tracking-tight">
                Reset Password
              </h1>
            </div>
            <p className="text-xs text-white/70 mb-4">
              Enter your registered email and we will send you a password recovery link.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                  EMAIL
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=""
                    className="w-full px-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/20 focus:border-[#4D7CFF] rounded-xl text-sm text-white placeholder-transparent outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full py-3.5 bg-[#4D7CFF] hover:bg-[#3B6AE8] active:bg-[#2F5BD8] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50"
              >
                {isSigningIn ? 'Sending Recovery Link…' : 'Send Recovery Link'}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-white/60">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => { setErrorMessage(''); setSuccessMessage(''); setMode('login'); }}
                className="font-bold text-[#F2D58E] hover:underline ml-1"
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-950/70 p-3 text-xs text-red-200 backdrop-blur-md animate-fadeIn" role="alert">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1 leading-relaxed">
              <span>{errorMessage}</span>
              {errorMessage.includes('already exists') && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                  }}
                  className="block mt-1.5 text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer"
                >
                  Click here to Sign In →
                </button>
              )}
              {errorMessage.includes('No account found') && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage('');
                  }}
                  className="block mt-1.5 text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer"
                >
                  Click here to Create an Account →
                </button>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/70 p-3 text-xs text-emerald-200 backdrop-blur-md animate-fadeIn" role="alert">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Footer */}
        <p className="mt-6 text-center text-[10px] text-white/50 tracking-wider">
          © 2026 Mehanda Army Investments • Smart Finance. Secure Future. • 100% Secure Client Portal
        </p>
      </section>
    </div>
  );
}
