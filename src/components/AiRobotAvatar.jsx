import React from 'react';

/**
 * AiRobotAvatar
 * High-fidelity 3D-style futuristic friendly robot avatar matching the user's reference image:
 * - Glossy white aerodynamic robot head with smooth lighting highlights
 * - Curved dark blue face visor
 * - Dual glowing circular cyan/blue eyes with realistic specular shine
 * - Friendly curved smile
 * - Modern headphones/earpieces on both sides with cyan accent rings
 * - Sleek metallic collar base with glowing power indicator
 */
export default function AiRobotAvatar({ className = "w-24 h-24", animated = true }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className} select-none`} aria-hidden="true">
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-xl ${animated ? 'transition-transform duration-300 hover:scale-105' : ''}`}
      >
        <defs>
          {/* Head White Gloss Gradient */}
          <linearGradient id="robotHeadGrad" x1="50" y1="20" x2="150" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#F0F4FA" />
            <stop offset="70%" stopColor="#D5E0EE" />
            <stop offset="100%" stopColor="#9AB2CE" />
          </linearGradient>

          {/* Top Head Highlight */}
          <linearGradient id="robotHeadHighlight" x1="100" y1="25" x2="100" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Visor / Faceplate Gradient */}
          <linearGradient id="robotVisorGrad" x1="100" y1="55" x2="100" y2="125" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0B1322" />
            <stop offset="50%" stopColor="#132035" />
            <stop offset="100%" stopColor="#1E3250" />
          </linearGradient>

          {/* Eye Outer Glow */}
          <radialGradient id="eyeGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="45%" stopColor="#2979FF" />
            <stop offset="85%" stopColor="#1A237E" />
            <stop offset="100%" stopColor="#0D1B2A" />
          </radialGradient>

          {/* Earphone Outer Gradient */}
          <linearGradient id="earphoneGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#C4D4E8" />
            <stop offset="100%" stopColor="#6C829F" />
          </linearGradient>

          {/* Earphone Cyan Ring */}
          <linearGradient id="cyanRingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="100%" stopColor="#0072FF" />
          </linearGradient>

          {/* Neck / Base Gradient */}
          <linearGradient id="robotNeckGrad" x1="100" y1="140" x2="100" y2="175" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E2A3A" />
            <stop offset="50%" stopColor="#2E3F57" />
            <stop offset="100%" stopColor="#0F1722" />
          </linearGradient>

          {/* Soft Drop Shadow Filter */}
          <filter id="robotShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#001833" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Neck / Collar Stand */}
        <path
          d="M82 144C82 144 88 162 100 162C112 162 118 144 118 144L128 172C128 174 116 177 100 177C84 177 72 174 72 172L82 144Z"
          fill="url(#robotNeckGrad)"
          stroke="#415570"
          strokeWidth="1.2"
        />
        {/* Glowing Collar Ring */}
        <ellipse cx="100" cy="165" rx="22" ry="4.5" fill="#00E5FF" fillOpacity="0.75" />
        <ellipse cx="100" cy="165" rx="14" ry="2.5" fill="#FFFFFF" fillOpacity="0.9" />

        {/* Left Earphone Stem & Cup */}
        <g>
          {/* Antenna / Stem */}
          <rect x="36" y="48" width="4" height="26" rx="2" fill="#9FB2C8" />
          <circle cx="38" cy="48" r="3.5" fill="#00E5FF" />
          
          {/* Outer Ear Cup */}
          <ellipse cx="37" cy="92" rx="12" ry="24" fill="url(#earphoneGrad)" stroke="#7D93AF" strokeWidth="1" />
          {/* Inner Accent Ring */}
          <ellipse cx="38" cy="92" rx="7" ry="17" fill="url(#cyanRingGrad)" />
          {/* Ear Cushion Center */}
          <ellipse cx="39" cy="92" rx="4" ry="11" fill="#111B28" />
        </g>

        {/* Right Earphone Stem & Cup */}
        <g>
          {/* Antenna / Stem */}
          <rect x="160" y="48" width="4" height="26" rx="2" fill="#9FB2C8" />
          <circle cx="162" cy="48" r="3.5" fill="#00E5FF" />

          {/* Outer Ear Cup */}
          <ellipse cx="163" cy="92" rx="12" ry="24" fill="url(#earphoneGrad)" stroke="#7D93AF" strokeWidth="1" />
          {/* Inner Accent Ring */}
          <ellipse cx="162" cy="92" rx="7" ry="17" fill="url(#cyanRingGrad)" />
          {/* Ear Cushion Center */}
          <ellipse cx="161" cy="92" rx="4" ry="11" fill="#111B28" />
        </g>

        {/* Main Robot Head Capsule */}
        <rect
          x="44"
          y="28"
          width="112"
          height="120"
          rx="52"
          fill="url(#robotHeadGrad)"
          stroke="#B9CCE3"
          strokeWidth="1.5"
        />

        {/* Top Forehead Gloss Reflection */}
        <path
          d="M68 40C78 34 89 32 100 32C111 32 122 34 132 40C122 46 112 48 100 48C88 48 78 46 68 40Z"
          fill="url(#robotHeadHighlight)"
        />

        {/* Forehead Blue Accent Arch */}
        <path
          d="M86 44C92 41 108 41 114 44"
          stroke="#00E5FF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />

        {/* Visor Screen Mask Area (Faceplate) */}
        <rect
          x="58"
          y="56"
          width="84"
          height="54"
          rx="24"
          fill="url(#robotVisorGrad)"
          stroke="#2A3D56"
          strokeWidth="1.5"
        />

        {/* Visor Diagonal Reflection Sheen */}
        <path
          d="M62 68C66 61 74 58 84 58L72 108C65 106 62 100 62 94L62 68Z"
          fill="#FFFFFF"
          fillOpacity="0.08"
        />

        {/* LEFT EYE */}
        <g>
          {/* Eye Socket / Outer Glow Ring */}
          <circle cx="82" cy="83" r="14" fill="#08101C" stroke="#00E5FF" strokeWidth="1.8" strokeOpacity="0.8" />
          {/* Blue Glowing Iris */}
          <circle cx="82" cy="83" r="11" fill="url(#eyeGlowGrad)" />
          {/* Pupil */}
          <circle cx="82" cy="83" r="6" fill="#050C15" />
          {/* Specular White Catchlights (Gleam) */}
          <circle cx="79" cy="80" r="3" fill="#FFFFFF" fillOpacity="0.95" />
          <circle cx="85" cy="86" r="1.3" fill="#FFFFFF" fillOpacity="0.8" />
        </g>

        {/* RIGHT EYE */}
        <g>
          {/* Eye Socket / Outer Glow Ring */}
          <circle cx="118" cy="83" r="14" fill="#08101C" stroke="#00E5FF" strokeWidth="1.8" strokeOpacity="0.8" />
          {/* Blue Glowing Iris */}
          <circle cx="118" cy="83" r="11" fill="url(#eyeGlowGrad)" />
          {/* Pupil */}
          <circle cx="118" cy="83" r="6" fill="#050C15" />
          {/* Specular White Catchlights (Gleam) */}
          <circle cx="115" cy="80" r="3" fill="#FFFFFF" fillOpacity="0.95" />
          <circle cx="121" cy="86" r="1.3" fill="#FFFFFF" fillOpacity="0.8" />
        </g>

        {/* Friendly Curved Smile Line */}
        <path
          d="M84 124C90 132 110 132 116 124"
          stroke="#2E435E"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M85 124.5C90.5 131.5 109.5 131.5 115 124.5"
          stroke="#4F6D94"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Rosy/Cyan Cheeks Highlights */}
        <ellipse cx="68" cy="118" rx="4.5" ry="2.5" fill="#00E5FF" fillOpacity="0.25" />
        <ellipse cx="132" cy="118" rx="4.5" ry="2.5" fill="#00E5FF" fillOpacity="0.25" />
      </svg>
    </div>
  );
}

