import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import BrandVerificationBadge from './BrandVerificationBadge';

// Official Google reCAPTCHA v2 Test Site Key (Always works for development/testing if no key is configured in env)
const GOOGLE_RECAPTCHA_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

export default function CaptchaModal({
  isOpen,
  targetForm, // 'student-loan' | 'investment-info'
  onClose,
  onVerified,
}) {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const isMountedRef = useRef(true);

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || GOOGLE_RECAPTCHA_TEST_SITE_KEY;
  const formTitle = targetForm === 'student-loan'
    ? 'Student Loan Enquiry'
    : targetForm === 'investment-info'
      ? 'Investment Information'
      : 'Application Form';

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleVerifyToken = async (token) => {
    setVerifying(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          targetForm,
        }),
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'CAPTCHA verification failed. Please try again.');
      }

      if (isMountedRef.current) {
        setVerified(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            onVerified();
          }
        }, 600);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setErrorMessage(err.message || 'Verification failed. Please retry.');
        setVerifying(false);
        if (window.grecaptcha && widgetIdRef.current !== null) {
          try {
            window.grecaptcha.reset(widgetIdRef.current);
          } catch {
            // ignore
          }
        }
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setLoading(true);
      setVerifying(false);
      setVerified(false);
      setErrorMessage('');
      widgetIdRef.current = null;
      return;
    }

    let scriptLoaded = false;

    const renderWidget = () => {
      if (!containerRef.current || !window.grecaptcha || !window.grecaptcha.render) {
        return false;
      }
      try {
        containerRef.current.innerHTML = '';
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            handleVerifyToken(token);
          },
          'expired-callback': () => {
            setErrorMessage('CAPTCHA token expired. Please check the box again.');
          },
          'error-callback': () => {
            setErrorMessage('CAPTCHA connection issue. Please check your network or try again.');
          },
        });
        setLoading(false);
        return true;
      } catch (e) {
        console.warn('[CaptchaModal] render failed:', e);
        return false;
      }
    };

    if (window.grecaptcha && window.grecaptcha.render) {
      renderWidget();
    } else {
      const existingScript = document.getElementById('recaptcha-explicit-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'recaptcha-explicit-script';
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (window.grecaptcha) {
            window.grecaptcha.ready(() => {
              renderWidget();
            });
          }
        };
        script.onerror = () => {
          setLoading(false);
          setErrorMessage('Unable to load Google reCAPTCHA. Please check your internet connection.');
        };
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (window.grecaptcha && window.grecaptcha.render) {
            clearInterval(interval);
            renderWidget();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }
  }, [isOpen, siteKey]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !verifying) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, verifying, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] grid place-items-center overflow-y-auto bg-[#081525]/85 p-4 text-slate-900 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="captcha-dialog-title"
    >
      {/* Click Outside Backdrop to safely abort */}
      <div 
        className="fixed inset-0 -z-10 cursor-pointer" 
        onClick={() => !verifying && onClose?.()} 
        aria-hidden="true" 
      />

      <div className="relative w-full max-w-md rounded-3xl border border-amber-200/40 bg-white p-6 shadow-2xl sm:p-8">
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F6F2E8] text-[#876A2E]">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#10243B]">Mehanda Army</span>
              <BrandVerificationBadge className="h-3.5 w-3.5" />
            </div>
            <h2 id="captcha-dialog-title" className="text-lg font-extrabold text-[#10243B]">
              Security Verification
            </h2>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700">
            Please verify you are human before opening the <strong className="text-[#876A2E]">{formTitle}</strong>.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            This verification protects client application data from automated submissions.
          </p>
        </div>

        {/* reCAPTCHA Widget Container */}
        <div className="mt-6 flex flex-col items-center justify-center min-h-[90px] rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
          {loading && !errorMessage && (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
              <RefreshCw size={16} className="animate-spin text-[#876A2E]" />
              <span>Loading Google reCAPTCHA verification…</span>
            </div>
          )}

          {verifying && (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#876A2E] py-4">
              <RefreshCw size={16} className="animate-spin" />
              <span>Verifying token with secure backend…</span>
            </div>
          )}

          {verified && (
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 py-4">
              <CheckCircle2 size={20} />
              <span>Verification complete! Opening form…</span>
            </div>
          )}

          <div
            ref={containerRef}
            className={`my-1 ${verifying || verified ? 'hidden' : 'block'}`}
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1">
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <span className="text-[11px] text-slate-400">
            Protected by Google reCAPTCHA
          </span>
        </div>
      </div>
    </div>
  );
}

