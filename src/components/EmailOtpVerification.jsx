import React, { useState, useEffect, useRef } from 'react';
import { Mail, CheckCircle2, Clock, RefreshCw, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';

export default function EmailOtpVerification({
  email = '',
  onChangeEmail,
  isVerified = false,
  verifiedEmail = '',
  verifiedAt = null,
  onVerified,
  onReset,
  error = '',
  disabled = false,
  purpose = 'Application Verification',
  label = 'Gmail / Email Address *',
  hint = 'A real 6-digit OTP will be sent to your Gmail / email address for mandatory identity verification.',
}) {
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sendError, setSendError] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const [successNotice, setSuccessNotice] = useState('');

  const cooldownTimerRef = useRef(null);
  const expiryTimerRef = useRef(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(cooldownTimerRef.current);
    }
  }, [resendCooldown]);

  // Expiry countdown (5 minutes = 300s)
  useEffect(() => {
    if (expiresIn > 0) {
      expiryTimerRef.current = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(expiryTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(expiryTimerRef.current);
    }
  }, [expiresIn]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    onChangeEmail(val);
    // If the email was verified, any edit invalidates verification (Requirement 13)
    if (isVerified) {
      if (onReset) onReset();
    }
    setSendError('');
    setVerifyError('');
    setSuccessNotice('');
  };

  const handleSendOtp = async (isResend = false) => {
    const targetEmail = (email || '').trim().toLowerCase();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setSendError('Please enter a valid Gmail / email address first.');
      return;
    }

    setSendError('');
    setVerifyError('');
    setSuccessNotice('');
    setIsSending(true);

    try {
      const response = await fetch('/api/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, purpose }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to deliver OTP to the entered email address.');
      }

      setOtpSent(true);
      setOtp('');
      setResendCooldown(data.resendCooldownSeconds || 60);
      setExpiresIn(data.expiresInSeconds || 300);
      setSuccessNotice(`A 6-digit verification code was sent to ${targetEmail}. Valid for 5 minutes.`);
    } catch (err) {
      setSendError(err.message || 'Could not send verification OTP. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanOtp = String(otp || '').trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setVerifyError('Please enter the 6-digit numeric OTP sent to your email.');
      return;
    }

    setVerifyError('');
    setIsVerifying(true);

    try {
      const response = await fetch('/api/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: (email || '').trim().toLowerCase(), otp: cleanOtp }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.verified) {
        throw new Error(data.error || 'Verification failed. Please check the code and try again.');
      }

      setOtpSent(false);
      setOtp('');
      setExpiresIn(0);
      setSuccessNotice('Email address verified successfully!');

      if (onVerified) {
        onVerified({
          email: data.email,
          verifiedAt: data.verifiedAt,
          verificationToken: data.verificationToken,
        });
      }
    } catch (err) {
      setVerifyError(err.message || 'Incorrect or expired verification code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetVerification = () => {
    setOtpSent(false);
    setOtp('');
    setSendError('');
    setVerifyError('');
    setSuccessNotice('');
    if (onReset) onReset();
  };

  const verifiedMatches = Boolean(
    isVerified &&
    verifiedEmail &&
    email &&
    verifiedEmail.toLowerCase() === email.trim().toLowerCase()
  );

  return (
    <div className="space-y-3">
      {/* Label & Status Badge */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-800">
          {label}
        </label>
        {verifiedMatches && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Gmail Verified
          </span>
        )}
      </div>

      {/* Input Group */}
      <div className="relative flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Mail size={16} />
          </div>
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            disabled={disabled || isVerified}
            placeholder=""
            maxLength={120}
            className={`w-full rounded-xl border bg-white pl-9 pr-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#9b7a35] focus:ring-2 focus:ring-[#9b7a35]/15 disabled:bg-slate-50 disabled:text-slate-700 ${
              error || sendError ? 'border-red-400 ring-1 ring-red-300' : verifiedMatches ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-slate-300'
            }`}
          />
        </div>

        {/* Action Button */}
        {verifiedMatches ? (
          <button
            type="button"
            onClick={handleResetVerification}
            className="shrink-0 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            Change Email
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSendOtp(false)}
            disabled={isSending || disabled || !email || resendCooldown > 0}
            className={`shrink-0 px-5 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
              resendCooldown > 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-[#10243B] hover:bg-[#1a385c] text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                Sending OTP…
              </>
            ) : resendCooldown > 0 ? (
              <>
                <Clock size={13} />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                Send OTP
                <ArrowRight size={13} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Verified timestamp notice */}
      {verifiedMatches && verifiedAt && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 text-xs text-emerald-800 border border-emerald-200">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
          <span>
            Verified on: <strong>{new Date(verifiedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong>. Form submission is authorized.
          </span>
        </div>
      )}

      {/* OTP verification box if OTP was sent and not yet verified */}
      {otpSent && !verifiedMatches && (
        <div className="mt-3 rounded-xl border-2 border-[#876A2E]/30 bg-[#faf8f2] p-4 shadow-sm animate-fadeIn">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-[#10243B] uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-[#876A2E]" />
                Enter 6-Digit Email Verification Code
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Check inbox and spam folder of <strong>{email}</strong>.
              </p>
            </div>
            {expiresIn > 0 && (
              <span className="shrink-0 text-xs font-mono font-bold text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-md">
                Expires in {formatTime(expiresIn)}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(val);
                setVerifyError('');
              }}
              placeholder=""
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-center font-mono text-base font-bold tracking-widest text-slate-900 outline-none placeholder:text-slate-400 placeholder:tracking-normal focus:border-[#9b7a35] focus:ring-2 focus:ring-[#9b7a35]/15"
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={isVerifying || otp.length !== 6}
              className="shrink-0 px-6 py-2.5 rounded-xl bg-[#50745A] hover:bg-[#3d5a45] text-white text-xs font-bold shadow-sm transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Verify OTP
                </>
              )}
            </button>
          </div>

          {verifyError && (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5">
              <AlertCircle size={13} className="shrink-0" />
              {verifyError}
            </p>
          )}

          <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
            <span>Didn't receive the email?</span>
            <button
              type="button"
              onClick={() => handleSendOtp(true)}
              disabled={resendCooldown > 0 || isSending}
              className="font-semibold text-[#876A2E] hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </div>
      )}

      {/* Helper text / error displays */}
      {hint && !verifiedMatches && !otpSent && (
        <p className="text-xs text-slate-500 leading-relaxed">{hint}</p>
      )}
      {sendError && (
        <p role="alert" className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
          <AlertCircle size={13} className="shrink-0" />
          {sendError}
        </p>
      )}
      {error && !sendError && !verifyError && !verifiedMatches && (
        <p role="alert" className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

