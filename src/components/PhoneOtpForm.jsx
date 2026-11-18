import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Phone } from 'lucide-react';
import { getAuthErrorMessage } from '../lib/authError';
import {
  formatCountdown,
  normalizePhoneNumber,
  PHONE_COUNTRY_CODES,
  PHONE_OTP_COOLDOWN_SECONDS,
  PHONE_OTP_EXPIRY_SECONDS,
} from '../lib/phoneAuth';
import { authService } from '../lib/supabaseClient';

export default function PhoneOtpForm({ mode = 'sign-in', currentPhone, onVerified }) {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneInput, setPhoneInput] = useState('');
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!challenge) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  const secondsUntilResend = challenge
    ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000))
    : 0;
  const secondsUntilExpiry = challenge
    ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000))
    : 0;
  const isExpired = Boolean(challenge && secondsUntilExpiry === 0);

  const requestOtp = async (phone = normalizePhoneNumber(phoneInput, countryCode)) => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!phone) {
      setErrorMessage('Enter a valid phone number with its country code.');
      return;
    }
    if (mode === 'link' && phone === currentPhone) {
      setErrorMessage('This phone number is already verified on your account. Enter a different number to change it.');
      return;
    }

    setBusy(true);
    const { error } = mode === 'link'
      ? await authService.requestPhoneChange(phone)
      : await authService.signInWithPhoneOtp(phone);
    setBusy(false);

    if (error) {
      setErrorMessage(getAuthErrorMessage(error, 'phone'));
      return;
    }

    const sentAt = Date.now();
    setChallenge({
      phone,
      expiresAt: sentAt + PHONE_OTP_EXPIRY_SECONDS * 1000,
      resendAt: sentAt + PHONE_OTP_COOLDOWN_SECONDS * 1000,
    });
    setNow(sentAt);
    setOtp('');
    setSuccessMessage(`A verification code was sent to ${phone}.`);
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!challenge) return;
    if (isExpired) {
      setErrorMessage('That verification code has expired. Request a new code.');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setErrorMessage('Enter the 6-digit code from the SMS.');
      return;
    }

    setBusy(true);
    const { data, error } = mode === 'link'
      ? await authService.verifyPhoneChangeOtp(challenge.phone, otp)
      : await authService.verifyPhoneOtp(challenge.phone, otp);
    setBusy(false);

    if (error) {
      setErrorMessage(getAuthErrorMessage(error, 'phone'));
      return;
    }
    if (!data?.user || !data.user.phone_confirmed_at) {
      setErrorMessage('The phone number could not be verified by Supabase. Request a new code and try again.');
      return;
    }

    setSuccessMessage(mode === 'link' ? 'Your phone number is now verified and linked.' : 'Your phone number has been verified.');
    setChallenge(null);
    setOtp('');
    await onVerified?.(data.user);
  };

  const handlePhoneInputChange = (event) => {
    setPhoneInput(event.target.value);
    setErrorMessage('');
  };

  return (
    <section className="space-y-3" aria-label={mode === 'link' ? 'Link a verified phone number' : 'Phone number sign in'}>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
        Mobile number
        <span className="mt-1 flex gap-2 normal-case tracking-normal">
          <select
            aria-label="Country calling code"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            disabled={Boolean(challenge) || busy}
            className="w-40 shrink-0 rounded-xl border border-gray-300 bg-white px-2 py-2.5 text-sm text-slate-900 disabled:bg-gray-100"
          >
            {PHONE_COUNTRY_CODES.map(({ country, dialCode }) => (
              <option key={`${country}-${dialCode}`} value={dialCode}>
                {country} ({dialCode})
              </option>
            ))}
          </select>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            required
            placeholder=""
            value={phoneInput}
            onChange={handlePhoneInputChange}
            disabled={Boolean(challenge) || busy}
            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#50745A] disabled:bg-gray-100"
          />
        </span>
      </label>

      {challenge ? (
        <form onSubmit={verifyOtp} className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            SMS verification code
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm tracking-[0.3em] text-slate-900 outline-none focus:ring-2 focus:ring-[#50745A]"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span role="timer">
              {isExpired ? 'Code expired' : `Code expires in ${formatCountdown(secondsUntilExpiry)}`}
            </span>
            <button
              type="button"
              onClick={() => requestOtp(challenge.phone)}
              disabled={busy || secondsUntilResend > 0}
              className="font-semibold text-[#876A2E] disabled:text-gray-400"
            >
              {secondsUntilResend > 0 ? `Resend in ${formatCountdown(secondsUntilResend)}` : 'Resend code'}
            </button>
          </div>
          <button
            type="submit"
            disabled={busy || isExpired}
            className="w-full rounded-xl bg-[#50745A] py-3 text-sm font-bold text-slate-950 disabled:bg-gray-300"
          >
            {busy ? 'Verifying…' : mode === 'link' ? 'Verify and link phone' : 'Verify code and continue'}
          </button>
          <button
            type="button"
            onClick={() => { setChallenge(null); setOtp(''); setErrorMessage(''); setSuccessMessage(''); }}
            disabled={busy}
            className="w-full py-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            Use a different phone number
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => requestOtp()}
          disabled={busy}
          className="w-full rounded-xl border border-[#50745A]/40 bg-[#50745A]/10 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-[#50745A]/20 disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-2">
            <Phone size={16} />
            {busy ? 'Sending SMS…' : 'Send SMS verification code'}
          </span>
        </button>
      )}

      {errorMessage && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          {successMessage}
        </p>
      )}
    </section>
  );
}
