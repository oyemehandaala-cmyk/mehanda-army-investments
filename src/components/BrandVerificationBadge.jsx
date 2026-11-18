import React from 'react';

const BADGE_LABEL = 'Mehanda Army brand badge — not third-party verification';

export default function BrandVerificationBadge({ className = 'h-5 w-5' }) {
  return (
    <span
      className={`inline-flex shrink-0 ${className}`}
      role="img"
      aria-label={BADGE_LABEL}
      title={BADGE_LABEL}
    >
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
        <path
          fill="#1688F8"
          d="M12 1.4c1.05 0 1.35 1.65 2.35 1.92s2.2-.86 3.1-.35-.5 2.16.27 2.93 2.41.36 2.93 1.27-0.86 2.1-.6 3.1S22 11.55 22 12.6s-1.65 1.35-1.92 2.35.86 2.2.35 3.1-2.16-.5-2.93.27-.36 2.41-1.27 2.93-2.1-.86-3.1-.6S13.05 22.6 12 22.6s-1.35-1.65-2.35-1.92-2.2.86-3.1.35.5-2.16-.27-2.93-2.41-.36-2.93-1.27.86-2.1.6-3.1S2 13.65 2 12.6s1.65-1.35 1.92-2.35-.86-2.2-.35-3.1 2.16.5 2.93-.27.36-2.41 1.27-2.93 2.1.86 3.1.6S10.95 1.4 12 1.4Z"
        />
        <path
          d="m7.3 12.15 3.05 3.05 6.45-6.55"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
