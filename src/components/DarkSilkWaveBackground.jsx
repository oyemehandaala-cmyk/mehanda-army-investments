import React from 'react';

/**
 * DarkSilkWaveBackground
 * High-fidelity vector background inspired by Reference Image 2:
 * - Deep matte obsidian / charcoal background (#0B0D13)
 * - Fluid, organic 3D silky waves and ribbon curves flowing across the right side
 * - Soft dark vignette to ensure perfect contrast for the left-aligned login card
 */
export default function DarkSilkWaveBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0" aria-hidden="true">
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full object-cover"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Base Dark Canvas Gradient */}
          <linearGradient id="silkBgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0A0C11" />
            <stop offset="50%" stopColor="#0E1118" />
            <stop offset="100%" stopColor="#080A0E" />
          </linearGradient>

          {/* Silky Wave Gradients with subtle 3D lighting */}
          <linearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E2433" stopOpacity="0.8" />
            <stop offset="45%" stopColor="#131722" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0A0C11" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="waveGrad2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A3245" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#171C28" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#0C0F15" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="waveGrad3" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#1A202C" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#090B0F" stopOpacity="0.8" />
          </linearGradient>

          {/* Delicate Rim Highlights */}
          <linearGradient id="rimLight1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4A5568" stopOpacity="0" />
            <stop offset="40%" stopColor="#718096" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#A0AEC0" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2D3748" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="rimLight2" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#2D3748" stopOpacity="0" />
            <stop offset="50%" stopColor="#4A5568" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1A202C" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. Base Dark Canvas */}
        <rect width="1440" height="900" fill="url(#silkBgGrad)" />

        {/* 2. Abstract 3D Silky Wave Curves (Flowing dynamically on the right and center) */}
        <g opacity="0.9">
          {/* Wave Layer 1 (Deep background fold) */}
          <path
            d="M500 0 C700 200, 850 450, 1100 550 C1300 630, 1440 500, 1440 450 L1440 0 Z"
            fill="url(#waveGrad3)"
          />

          {/* Wave Layer 2 (Main curving silk fold) */}
          <path
            d="M620 0 C780 260, 920 480, 1220 620 C1360 680, 1440 650, 1440 600 L1440 180 C1300 220, 1000 120, 800 0 Z"
            fill="url(#waveGrad1)"
          />
          {/* Rim light along fold 2 */}
          <path
            d="M620 0 C780 260, 920 480, 1220 620 C1360 680, 1440 650, 1440 600"
            fill="none"
            stroke="url(#rimLight1)"
            strokeWidth="1.8"
          />

          {/* Wave Layer 3 (Soft undulating foreground ribbon) */}
          <path
            d="M740 0 C900 320, 1050 560, 1380 720 C1420 740, 1440 730, 1440 700 L1440 380 C1250 420, 1050 220, 880 0 Z"
            fill="url(#waveGrad2)"
          />
          {/* Rim light along fold 3 */}
          <path
            d="M740 0 C900 320, 1050 560, 1380 720 C1420 740, 1440 730, 1440 700"
            fill="none"
            stroke="url(#rimLight1)"
            strokeWidth="2.2"
          />

          {/* Wave Layer 4 (Bottom sweeping fold) */}
          <path
            d="M850 280 C1020 540, 1180 720, 1440 850 L1440 600 C1300 520, 1150 400, 1000 240 Z"
            fill="url(#waveGrad1)"
          />
          <path
            d="M850 280 C1020 540, 1180 720, 1440 850"
            fill="none"
            stroke="url(#rimLight2)"
            strokeWidth="1.5"
          />

          {/* Wave Layer 5 (Bottom subtle curve) */}
          <path
            d="M950 450 C1100 680, 1260 810, 1440 900 L1440 760 C1320 700, 1200 600, 1080 430 Z"
            fill="url(#waveGrad3)"
          />
        </g>

        {/* Ambient Dark Volumetric Vignette (Giving the left side pure focus and clarity) */}
        <radialGradient id="leftFocusVignette" cx="25%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#080A0E" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#080A0E" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#080A0E" stopOpacity="0.95" />
        </radialGradient>
        <rect width="700" height="900" fill="url(#leftFocusVignette)" />
      </svg>
    </div>
  );
}

