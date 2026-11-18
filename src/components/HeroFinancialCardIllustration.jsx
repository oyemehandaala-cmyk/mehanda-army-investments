import React from 'react';
import { GraduationCap, TrendingUp, ArrowUpRight } from 'lucide-react';

/**
 * HeroFinancialCardIllustration
 * Precise vector illustration matching Reference Image 1:
 * - Glowing circular golden stage/pedestal with concentric radiant rings
 * - Floating central horizontal card with EMV gold microchip, contactless waves, and rising 3D gold chart bars
 * - Left floating frosted glass tablet: "Personal Loan" with graduation cap
 * - Right floating frosted glass smartphone: "Invest More" with bar chart
 * - Stacks of golden coins flanking the stage
 * - Dimensional golden arrow soaring upward into the sky
 */
export default function HeroFinancialCardIllustration() {
  return (
    <div className="relative w-full max-w-[340px] xs:max-w-[420px] sm:max-w-[480px] lg:max-w-[580px] aspect-[1.15/1] flex items-center justify-center select-none mx-auto" aria-hidden="true">
      {/* Background Volumetric Gold Glow */}
      <div className="absolute inset-0 bg-radial from-amber-400/20 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />

      <svg
        viewBox="0 0 640 520"
        className="w-full h-full object-contain filter drop-shadow-[0_20px_45px_rgba(0,0,0,0.85)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic Gold Gradients */}
          <linearGradient id="goldPlateGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF2BF" />
            <stop offset="25%" stopColor="#E5B652" />
            <stop offset="55%" stopColor="#C89632" />
            <stop offset="85%" stopColor="#F9DB87" />
            <stop offset="100%" stopColor="#9E6E17" />
          </linearGradient>

          <linearGradient id="goldRimGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE899" />
            <stop offset="50%" stopColor="#C89632" />
            <stop offset="100%" stopColor="#634509" />
          </linearGradient>

          <linearGradient id="goldBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF0B3" />
            <stop offset="40%" stopColor="#E5B652" />
            <stop offset="100%" stopColor="#966C1E" />
          </linearGradient>

          <linearGradient id="cardFaceGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E2330" />
            <stop offset="50%" stopColor="#141822" />
            <stop offset="100%" stopColor="#0B0E14" />
          </linearGradient>

          <linearGradient id="arrow3DGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#C89632" />
            <stop offset="50%" stopColor="#F7DA83" />
            <stop offset="100%" stopColor="#FFF4D1" />
          </linearGradient>

          <linearGradient id="pedestalBaseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A303F" />
            <stop offset="40%" stopColor="#151922" />
            <stop offset="100%" stopColor="#0A0C10" />
          </linearGradient>

          {/* Radial pedestal ambient light */}
          <radialGradient id="pedestalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E5B652" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#C89632" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#090D16" stopOpacity="0" />
          </radialGradient>

          {/* Frosted Glass Gradient */}
          <linearGradient id="glassCardGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.04" />
          </linearGradient>

          {/* Drop Shadows */}
          <filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
            <feOffset dx="0" dy="12" result="offsetblur" />
            <feFlood floodColor="#E5B652" floodOpacity="0.25" />
            <feComposite in2="offsetblur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. PEDESTAL GLOW & CONCENTRIC GOLDEN RINGS */}
        <g id="pedestal-rings">
          <ellipse cx="320" cy="380" rx="270" ry="85" fill="url(#pedestalGlow)" />

          {/* Outer Ring */}
          <ellipse cx="320" cy="380" rx="260" ry="78" fill="none" stroke="#E5B652" strokeWidth="1.5" strokeOpacity="0.35" />
          <ellipse cx="320" cy="380" rx="240" ry="70" fill="none" stroke="#E5B652" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="6 6" />

          {/* Solid 3D Base Platform */}
          {/* Base bottom curve */}
          <path d="M90 380 C90 440, 550 440, 550 380 L550 395 C550 455, 90 455, 90 395 Z" fill="#0C0E14" />
          <ellipse cx="320" cy="392" rx="230" ry="65" fill="#141822" stroke="url(#goldRimGrad)" strokeWidth="2.5" />

          {/* Inner Raised Gold Disc */}
          <ellipse cx="320" cy="382" rx="215" ry="58" fill="url(#pedestalBaseGrad)" stroke="url(#goldPlateGrad)" strokeWidth="3" />
          <ellipse cx="320" cy="380" rx="205" ry="52" fill="#181D29" stroke="#E5B652" strokeWidth="1" strokeOpacity="0.6" />
          <ellipse cx="320" cy="378" rx="190" ry="46" fill="#0D1017" />
        </g>

        {/* 2. LEFT COIN STACKS */}
        <g id="left-coins">
          {/* Back small stack */}
          <g transform="translate(190, 315)">
            {[0, 6, 12, 18, 24].map((y) => (
              <g key={`lcb-${y}`}>
                <path d={`M0 ${y} C0 ${y + 8}, 36 ${y + 8}, 36 ${y} L36 ${y + 3} C36 ${y + 11}, 0 ${y + 11}, 0 ${y + 3} Z`} fill="url(#goldRimGrad)" />
                <ellipse cx="18" cy={y} rx="18" ry="6" fill="url(#goldPlateGrad)" stroke="#FFECA3" strokeWidth="0.5" />
              </g>
            ))}
          </g>

          {/* Front taller stack */}
          <g transform="translate(170, 335)">
            {[0, 6, 12, 18].map((y) => (
              <g key={`lcf-${y}`}>
                <path d={`M0 ${y} C0 ${y + 9}, 40 ${y + 9}, 40 ${y} L40 ${y + 4} C40 ${y + 13}, 0 ${y + 13}, 0 ${y + 4} Z`} fill="url(#goldRimGrad)" />
                <ellipse cx="20" cy={y} rx="20" ry="7" fill="url(#goldPlateGrad)" stroke="#FFF2B8" strokeWidth="0.6" />
              </g>
            ))}
          </g>
        </g>

        {/* 3. RIGHT COIN STACKS */}
        <g id="right-coins">
          {/* Back tall stack */}
          <g transform="translate(485, 260)">
            {[0, 7, 14, 21, 28, 35, 42, 49, 56].map((y) => (
              <g key={`rcb-${y}`}>
                <path d={`M0 ${y} C0 ${y + 10}, 44 ${y + 10}, 44 ${y} L44 ${y + 4} C44 ${y + 14}, 0 ${y + 14}, 0 ${y + 4} Z`} fill="url(#goldRimGrad)" />
                <ellipse cx="22" cy={y} rx="22" ry="7.5" fill="url(#goldPlateGrad)" stroke="#FFECA3" strokeWidth="0.6" />
              </g>
            ))}
          </g>

          {/* Front mid stack */}
          <g transform="translate(450, 330)">
            {[0, 7, 14, 21, 28].map((y) => (
              <g key={`rcf-${y}`}>
                <path d={`M0 ${y} C0 ${y + 10}, 46 ${y + 10}, 46 ${y} L46 ${y + 4} C46 ${y + 14}, 0 ${y + 14}, 0 ${y + 4} Z`} fill="url(#goldRimGrad)" />
                <ellipse cx="23" cy={y} rx="23" ry="8" fill="url(#goldPlateGrad)" stroke="#FFF2B8" strokeWidth="0.6" />
              </g>
            ))}
          </g>
        </g>

        {/* 4. LEFT FLOATING FROSTED GLASS TABLET ("Personal Loan") */}
        <g id="personal-loan-card" transform="translate(170, 160) rotate(-4)">
          {/* Frosted glass backdrop */}
          <rect width="80" height="120" rx="14" fill="url(#glassCardGrad)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
          <rect width="78" height="118" x="1" y="1" rx="13" fill="none" stroke="url(#goldPlateGrad)" strokeWidth="0.8" strokeOpacity="0.6" />

          {/* Card Label */}
          <text x="12" y="24" fill="#FFFFFF" fontSize="8.5" fontWeight="700" letterSpacing="0.2">Personal</text>
          <text x="12" y="35" fill="#E5B652" fontSize="8.5" fontWeight="700" letterSpacing="0.2">Loan</text>

          {/* Graduation Cap Gold Icon */}
          <g transform="translate(24, 52)">
            <path d="M16 4 L30 10 L16 16 L2 10 Z" fill="url(#goldPlateGrad)" stroke="#FFE899" strokeWidth="0.5" />
            <path d="M8 13.5 L8 21 C8 24 24 24 24 21 L24 13.5" fill="none" stroke="url(#goldPlateGrad)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M28 11 L28 20" stroke="#FFE899" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>

        {/* 5. RIGHT FLOATING FROSTED GLASS SMARTPHONE ("Invest More") */}
        <g id="invest-more-card" transform="translate(470, 135) rotate(4)">
          {/* Glass Phone Shell */}
          <rect width="76" height="125" rx="14" fill="url(#glassCardGrad)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
          <rect width="74" height="123" x="1" y="1" rx="13" fill="none" stroke="url(#goldPlateGrad)" strokeWidth="0.8" strokeOpacity="0.6" />

          {/* Card Label */}
          <text x="10" y="22" fill="#FFFFFF" fontSize="8.5" fontWeight="700">Invest</text>
          <text x="10" y="33" fill="#E5B652" fontSize="8.5" fontWeight="700">More</text>

          {/* Mini Gold Rising Graph */}
          <g transform="translate(36, 42)">
            <path d="M0 24 L10 16 L18 20 L28 8" fill="none" stroke="#E5B652" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 8 L28 8 L28 12" fill="none" stroke="#E5B652" strokeWidth="2" strokeLinecap="round" />
            {/* Bars */}
            <rect x="2" y="18" width="4" height="12" rx="1" fill="url(#goldBarGrad)" />
            <rect x="10" y="14" width="4" height="16" rx="1" fill="url(#goldBarGrad)" />
            <rect x="18" y="10" width="4" height="20" rx="1" fill="url(#goldBarGrad)" />
            <rect x="26" y="4" width="4" height="26" rx="1" fill="url(#goldBarGrad)" />
          </g>
        </g>

        {/* 6. CENTRAL FLOATING HORIZONTAL CARD WITH RISING FINANCIAL CHART */}
        <g id="central-financial-card" transform="translate(245, 190)" filter="url(#cardGlow)">
          {/* Card Body (Slightly tilted forward in 3D perspective) */}
          <rect
            width="215"
            height="135"
            rx="18"
            fill="url(#cardFaceGrad)"
            stroke="url(#goldPlateGrad)"
            strokeWidth="2.5"
          />

          {/* Card Inner Glow Border */}
          <rect
            width="209"
            height="129"
            x="3"
            y="3"
            rx="15"
            fill="none"
            stroke="rgba(229,182,82,0.35)"
            strokeWidth="1"
          />

          {/* EMV Gold Microchip */}
          <g transform="translate(20, 42)">
            <rect width="25" height="20" rx="4" fill="url(#goldPlateGrad)" stroke="#FFECA3" strokeWidth="0.8" />
            <line x1="12.5" y1="0" x2="12.5" y2="20" stroke="#875E14" strokeWidth="0.8" />
            <line x1="0" y1="10" x2="25" y2="10" stroke="#875E14" strokeWidth="0.8" />
            <rect x="7" y="5" width="11" height="10" rx="2" fill="none" stroke="#875E14" strokeWidth="0.8" />
          </g>

          {/* Contactless Wave Icon */}
          <g transform="translate(54, 46)" stroke="#E5B652" strokeWidth="1.5" strokeLinecap="round" fill="none">
            <path d="M0 4 A6 6 0 0 1 0 12" />
            <path d="M4 2 A10 10 0 0 1 4 14" />
            <path d="M8 0 A14 14 0 0 1 8 16" />
          </g>

          {/* Rising Chart Bars Inside / Breaking Out of the Card */}
          <g transform="translate(90, 35)">
            {/* 3D Rising Gold Bars */}
            <rect x="0" y="52" width="12" height="28" rx="2" fill="url(#goldBarGrad)" />
            <rect x="18" y="40" width="12" height="40" rx="2" fill="url(#goldBarGrad)" />
            <rect x="36" y="28" width="12" height="52" rx="2" fill="url(#goldBarGrad)" />
            <rect x="54" y="16" width="12" height="64" rx="2" fill="url(#goldBarGrad)" />
            <rect x="72" y="2" width="14" height="78" rx="2" fill="url(#goldBarGrad)" />

            {/* Glowing Trend Line Connecting Tops */}
            <path
              d="M6 50 L24 38 L42 26 L60 14 L78 0"
              fill="none"
              stroke="#FFF5D1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Upward Gold Arrow Head */}
            <path d="M70 -5 L82 -1 L80 11 Z" fill="url(#goldPlateGrad)" stroke="#FFF5D1" strokeWidth="1" />
          </g>
        </g>

        {/* 7. LARGE 3D GOLDEN ARROW SOARING UPWARDS (Top Right) */}
        <g id="soaring-3d-arrow" transform="translate(370, 130)">
          {/* Arrow Body (Dynamic Diagonal) */}
          <path
            d="M0 120 L100 20 L105 24 L10 126 Z"
            fill="url(#arrow3DGrad)"
            opacity="0.9"
          />
          {/* Giant 3D Arrowhead */}
          <g transform="translate(85, 5)">
            {/* Left face */}
            <path d="M0 25 L45 0 L25 45 L18 28 Z" fill="url(#goldPlateGrad)" stroke="#FFF6D6" strokeWidth="1.2" />
            {/* Depth shadow */}
            <path d="M25 45 L18 28 L10 32 Z" fill="#9E6E17" />
          </g>
        </g>

        {/* 8. SPARKLING LIGHT ACCENTS (✦) */}
        <g fill="#FFECA3" opacity="0.85">
          <circle cx="280" cy="170" r="2" />
          <circle cx="460" cy="190" r="1.8" />
          <circle cx="340" cy="110" r="2.5" />
          <circle cx="490" cy="115" r="1.5" />
          <circle cx="160" cy="220" r="2" />
          {/* Sparkle Stars */}
          <path d="M340 100 L342 107 L349 109 L342 111 L340 118 L338 111 L331 109 L338 107 Z" fill="#FFFBE6" />
          <path d="M485 105 L486.5 110 L491.5 111.5 L486.5 113 L485 118 L483.5 113 L478.5 111.5 L483.5 110 Z" fill="#FFFBE6" />
        </g>
      </svg>
    </div>
  );
}
