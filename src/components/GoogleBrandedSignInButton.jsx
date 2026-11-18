import React, { useEffect, useRef, useState } from 'react';
import { authService, toAuthenticatedUser } from '../lib/supabaseClient';
import { getAuthErrorMessage } from '../lib/authError';

export default function GoogleBrandedSignInButton({
  onSuccess,
  onError,
  setLoading,
  disabled = false,
  className = '',
  buttonSize = 40,
}) {
  const containerRef = useRef(null);
  const [gisReady, setGisReady] = useState(false);

  useEffect(() => {
    let timer = null;
    let attempts = 0;

    const setupGsi = () => {
      if (typeof window === 'undefined' || !window.google?.accounts?.id) {
        return false;
      }

      const clientId =
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '676015131291-fso0hqvjjllr1tdr9h06serd280a29e3.apps.googleusercontent.com';

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response?.credential) return;
            if (setLoading) setLoading(true);
            try {
              const { data, error } = await authService.signInWithGoogleIdToken(response.credential);
              if (error) {
                if (onError) onError(getAuthErrorMessage(error, 'oauth'));
              } else if (data?.user) {
                if (onSuccess) onSuccess(toAuthenticatedUser(data.user));
              }
            } catch (err) {
              if (onError) onError(getAuthErrorMessage(err, 'oauth'));
            } finally {
              if (setLoading) setLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(containerRef.current, {
            type: 'icon',
            shape: 'circle',
            size: 'large',
            theme: 'outline',
          });
        }
        setGisReady(true);
        return true;
      } catch (e) {
        return false;
      }
    };

    if (!setupGsi()) {
      timer = setInterval(() => {
        attempts += 1;
        if (setupGsi() || attempts >= 25) {
          clearInterval(timer);
        }
      }, 200);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [onSuccess, onError, setLoading]);

  const handleButtonClick = () => {
    if (disabled) return;
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (_) {}
    }
  };

  return (
    <div
      className={`relative rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{ width: `${buttonSize}px`, height: `${buttonSize}px` }}
      title="Continue with Google"
    >
      {/* 1. Real button with the exact Google G logo image uploaded by the user: ALWAYS 100% VISIBLE */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        aria-label="Continue with Google"
        className="absolute inset-0 w-full h-full rounded-full bg-white hover:bg-slate-50 border border-slate-300 flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer p-2 z-0"
      >
        <img
          src="/google-icon.png"
          alt="Google"
          className="w-full h-full object-contain pointer-events-none"
        />
      </button>

      {/* 2. Google Identity Services iframe container overlaid on top for native interaction */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full rounded-full flex items-center justify-center z-10 overflow-hidden cursor-pointer"
        style={{
          opacity: gisReady ? 0.05 : 0,
        }}
      />
    </div>
  );
}
