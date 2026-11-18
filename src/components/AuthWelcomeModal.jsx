import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, LockKeyhole, Phone, TrendingUp, X } from 'lucide-react';
import { authService, isSupabaseConfigured } from '../lib/supabaseClient';
import { getAuthErrorMessage } from '../lib/authError';
import BrandVerificationBadge from './BrandVerificationBadge';

const WELCOME_SESSION_KEY = 'mai_auth_welcome_seen';

export default function AuthWelcomeModal({ onClose, onEmailSignIn, onPhoneSignIn, onCreateAccount }) {
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const closeButtonRef = useRef(null);
  const googleConfigured = isSupabaseConfigured();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = event.currentTarget.querySelector('[role="dialog"]');
      const focusable = dialog?.querySelectorAll('button:not(:disabled), a[href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [onClose]);

  const handleGoogleSignIn = async () => {
    if (isSigningInWithGoogle) return;
    setErrorMessage('');
    setIsSigningInWithGoogle(true);

    const { data, error } = await authService.signInWithGoogle();
    if (error || !data?.url) {
      setIsSigningInWithGoogle(false);
      setErrorMessage(
        (error && getAuthErrorMessage(error, 'oauth')) ||
        'Google sign-in could not be started. Confirm Google OAuth is enabled in Supabase and try again.'
      );
    }
  };

  return (
    <div className="mai-auth-welcome-backdrop">
      <section
        className="mai-auth-welcome-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mai-auth-welcome-title"
        aria-describedby="mai-auth-welcome-description"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="mai-auth-welcome-close"
          onClick={onClose}
          aria-label="Close sign-in welcome dialog"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="mai-auth-welcome-brand">
          <span className="mai-auth-welcome-logo" aria-hidden="true">
            <TrendingUp size={26} strokeWidth={2.2} />
          </span>
          <span>
            <strong>MEHANDA ARMY</strong>
            <small className="inline-flex items-center gap-1">
              INVESTMENTS
              <BrandVerificationBadge className="h-4 w-4" />
            </small>
          </span>
        </div>

        <div className="mai-auth-welcome-accent" aria-hidden="true" />
        <p className="mai-auth-welcome-eyebrow">A more thoughtful way to plan</p>
        <h1 id="mai-auth-welcome-title">Welcome to Mehanda Army Investments</h1>
        <p id="mai-auth-welcome-description" className="mai-auth-welcome-copy">
          Sign in to your account or create one to access client features. You can also close this window and continue browsing.
        </p>

        <div className="mai-auth-welcome-actions">
          <button
            type="button"
            className="mai-auth-google-button"
            onClick={handleGoogleSignIn}
            disabled={isSigningInWithGoogle}
          >
            <span className="mai-auth-google-mark" aria-hidden="true">G</span>
            {isSigningInWithGoogle ? 'Connecting to Google…' : 'Continue with Google'}
          </button>
          <p className="mai-auth-google-note">
            Requires Google provider credentials and redirect URLs configured in Supabase.
            {!googleConfigured && ' Supabase project settings are not configured in this environment.'}
          </p>

          <div className="mai-auth-welcome-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="mai-auth-email-button"
            onClick={onEmailSignIn}
          >
            Sign in with Email
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mai-auth-email-button"
            onClick={onPhoneSignIn || onEmailSignIn}
          >
            <Phone size={16} aria-hidden="true" />
            Continue with Phone Number
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mai-auth-create-button"
            onClick={onCreateAccount}
          >
            Create a New Account
          </button>
        </div>

        {errorMessage && (
          <p className="mai-auth-welcome-error" role="alert">
            {errorMessage}
          </p>
        )}

        <button type="button" className="mai-auth-welcome-browse" onClick={onClose}>
          Continue browsing as a guest
        </button>
      </section>
    </div>
  );
}

export function markAuthWelcomeSeen() {
  try {
    window.sessionStorage.setItem(WELCOME_SESSION_KEY, 'true');
  } catch {
    // The app also tracks display state in memory for restricted browser storage.
  }
}

export function hasSeenAuthWelcome() {
  try {
    return window.sessionStorage.getItem(WELCOME_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}
