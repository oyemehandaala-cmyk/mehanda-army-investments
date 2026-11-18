import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, GraduationCap, X } from 'lucide-react';

const SESSION_KEY = 'mai_student_loan_announcement_shown';
let announcementShownInCurrentPageLoad = false;

export default function StudentLoanAnnouncement({ onExplore, paused = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (paused) return undefined;
    if (announcementShownInCurrentPageLoad) return undefined;

    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return undefined;
    } catch {
      // Keep the announcement available if session storage is disabled.
    }

    const timer = window.setTimeout(() => {
      announcementShownInCurrentPageLoad = true;
      setIsOpen(true);
      try {
        window.sessionStorage.setItem(SESSION_KEY, 'true');
      } catch {
        // The in-memory dialog still works when session storage is disabled.
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [paused]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button')?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const buttons = dialogRef.current.querySelectorAll('button');
      const firstButton = buttons[0];
      const lastButton = buttons[buttons.length - 1];

      if (event.shiftKey && document.activeElement === firstButton) {
        event.preventDefault();
        lastButton.focus();
      } else if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault();
        firstButton.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => setIsOpen(false);

  return (
    <div className="student-loan-announcement-backdrop">
      <section
        ref={dialogRef}
        className="student-loan-announcement"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-loan-announcement-title"
        aria-describedby="student-loan-announcement-description"
      >
        <button
          type="button"
          className="student-loan-announcement-icon-close"
          onClick={close}
          aria-label="Close student loan announcement"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="student-loan-announcement-icon" aria-hidden="true">
          <GraduationCap size={34} strokeWidth={1.8} />
        </div>

        <p className="student-loan-announcement-brand">MEHANDA ARMY INVESTMENTS</p>
        <p className="student-loan-announcement-eyebrow">NEW SERVICE ANNOUNCEMENT</p>
        <h2 id="student-loan-announcement-title">Student Small Loan</h2>
        <span className="student-loan-announcement-badge">COMING SOON</span>
        <p id="student-loan-announcement-description" className="student-loan-announcement-copy">
          We are preparing a new student-focused small-loan service to support eligible students.
        </p>

        <ul className="student-loan-announcement-details">
          <li>For students aged 18 and above.</li>
          <li>Proposed loan amounts up to ₹1,000.</li>
          <li>Applications will open after the necessary approvals and compliance checks.</li>
        </ul>

        <p className="student-loan-announcement-disclaimer">
          This service is not currently available. No applications or payments are being accepted.
        </p>

        <div className="student-loan-announcement-actions">
          <button
            type="button"
            className="student-loan-announcement-explore"
            onClick={onExplore}
          >
            Explore Student Loan
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="student-loan-announcement-close"
            onClick={close}
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
