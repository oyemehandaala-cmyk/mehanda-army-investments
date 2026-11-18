import React, { useEffect, useRef, useState } from 'react';
import { Clock3, ShieldCheck } from 'lucide-react';
import { createSessionInactivityTimer } from '../lib/sessionReminder';

export default function SessionReminder() {
  const [stage, setStage] = useState('active');
  const [showExitInstructions, setShowExitInstructions] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const timer = createSessionInactivityTimer({ onStageChange: setStage });
    timerRef.current = timer;
    return () => {
      timer.stop();
      timerRef.current = null;
    };
  }, []);

  const continueBrowsing = () => {
    setShowExitInstructions(false);
    timerRef.current?.resume();
  };

  const closeWebsite = () => {
    setShowExitInstructions(true);
    window.setTimeout(() => window.close(), 0);
  };

  if (stage === 'active') return null;

  if (stage === 'warning') {
    return (
      <aside
        data-session-reminder
        className="fixed right-4 top-24 z-[85] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[#D5C292]/50 bg-[#10243B] p-4 text-white shadow-2xl sm:right-6"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <Clock3 size={20} className="mt-0.5 shrink-0 text-[#D5C292]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">Still browsing?</p>
            <p className="mt-1 text-sm leading-relaxed text-white/75">
              Your browsing session will pause in 1 minute due to inactivity.
            </p>
            <button
              type="button"
              onClick={continueBrowsing}
              className="mt-3 min-h-10 rounded-lg bg-[#D5C292] px-4 text-sm font-bold text-[#10243B] transition hover:bg-[#E4D6B2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div
      data-session-reminder
      className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-[#081525]/95 p-4 text-white backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <section className="w-full max-w-lg rounded-3xl border border-[#D5C292]/35 bg-[#10243B] p-6 shadow-2xl sm:p-9">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[#D5C292]/30 bg-[#D5C292]/10 text-[#D5C292]">
          {showExitInstructions
            ? <ShieldCheck size={26} aria-hidden="true" />
            : <Clock3 size={26} aria-hidden="true" />}
        </div>
        <h1 id="session-expired-title" className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
          {showExitInstructions ? 'You can close this website' : 'Your browsing session has expired.'}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-white/75 sm:text-base">
          {showExitInstructions
            ? 'Your account and saved information have not been changed. Close this browser tab or window manually to leave the website.'
            : 'For your security, this session has been paused due to inactivity.'}
        </p>
        {showExitInstructions ? (
          <>
            <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/80">
              If this tab stayed open, your browser does not allow websites to close it automatically.
            </p>
            <button
              type="button"
              onClick={() => window.close()}
              className="mt-5 min-h-12 w-full rounded-xl border border-[#D5C292]/50 px-5 text-sm font-bold text-[#E6D7B3] transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D5C292]"
            >
              Try closing this tab
            </button>
          </>
        ) : (
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={continueBrowsing}
              className="min-h-12 rounded-xl bg-[#D5C292] px-5 text-sm font-bold text-[#10243B] transition hover:bg-[#E4D6B2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Continue Browsing
            </button>
            <button
              type="button"
              onClick={closeWebsite}
              className="min-h-12 rounded-xl border border-white/20 px-5 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D5C292]"
            >
              Close Website
            </button>
          </div>
        )}
        {!showExitInstructions && (
          <p className="mt-5 text-center text-xs text-white/50">
            This reminder does not sign you out or change your saved records.
          </p>
        )}
      </section>
    </div>
  );
}
