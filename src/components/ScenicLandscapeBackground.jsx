import React from 'react';

/**
 * ScenicLandscapeBackground
 * High-fidelity vector illustration inspired by Reference Image 2:
 * - Dusk sky gradient (deep twilight slate-navy -> dusky violet -> warm coral sunset -> peach horizon)
 * - Twinkling stars in the upper atmosphere
 * - Soft evening horizon clouds
 * - Layered mountain silhouettes with purplish twilight mist
 * - Stylized conifer / pine tree ridges with golden amber and coral foliage
 * - Calm lake water with soft horizontal reflections of the evening sky and mountains
 */
export default function ScenicLandscapeBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0" aria-hidden="true">
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full object-cover"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Sky Gradient */}
          <linearGradient id="scenicSkyGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#121D31" />
            <stop offset="28%" stopColor="#1E2F49" />
            <stop offset="48%" stopColor="#3B2E4E" />
            <stop offset="65%" stopColor="#7B4254" />
            <stop offset="78%" stopColor="#C96558" />
            <stop offset="90%" stopColor="#E2866E" />
            <stop offset="100%" stopColor="#F4A785" />
          </linearGradient>

          {/* Lake Water Gradient */}
          <linearGradient id="scenicWaterGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#25374C" />
            <stop offset="22%" stopColor="#1C2C3E" />
            <stop offset="55%" stopColor="#162333" />
            <stop offset="100%" stopColor="#0E1722" />
          </linearGradient>

          {/* Distant Mountain Gradient */}
          <linearGradient id="distMountainGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#3F3957" />
            <stop offset="100%" stopColor="#22233C" />
          </linearGradient>

          {/* Midground Mountain Gradient */}
          <linearGradient id="midMountainGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#262F4A" />
            <stop offset="100%" stopColor="#181D33" />
          </linearGradient>

          {/* Foreground Hill Gradient */}
          <linearGradient id="foreHillGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#1A283B" />
            <stop offset="100%" stopColor="#101925" />
          </linearGradient>

          {/* Warm Foliage Gradient for Pine Trees */}
          <linearGradient id="amberTreeGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#F5A852" />
            <stop offset="45%" stopColor="#E37234" />
            <stop offset="100%" stopColor="#B34220" />
          </linearGradient>

          <linearGradient id="coralTreeGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#F19A62" />
            <stop offset="50%" stopColor="#D95C3B" />
            <stop offset="100%" stopColor="#8C2C24" />
          </linearGradient>

          <linearGradient id="darkTreeGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#22334A" />
            <stop offset="100%" stopColor="#111B28" />
          </linearGradient>

          {/* Subtle Ambient Glow */}
          <radialGradient id="scenicHorizonGlow" cx="50%" cy="65%" r="60%">
            <stop offset="0%" stopColor="#F7B28B" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#D66D57" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#121D31" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. SKY */}
        <rect width="1440" height="900" fill="url(#scenicSkyGrad)" />

        {/* Ambient Horizon Glow */}
        <rect width="1440" height="700" fill="url(#scenicHorizonGlow)" />

        {/* 2. STARS in upper dusk sky */}
        <g opacity="0.75">
          <circle cx="120" cy="85" r="1.2" fill="#FFFFFF" opacity="0.9" />
          <circle cx="210" cy="45" r="1.5" fill="#FFF3D6" opacity="0.7" />
          <circle cx="340" cy="110" r="1" fill="#FFFFFF" opacity="0.6" />
          <circle cx="480" cy="70" r="1.6" fill="#FFFFFF" opacity="0.8" />
          <circle cx="620" cy="50" r="1.2" fill="#FFEFD0" opacity="0.9" />
          <circle cx="790" cy="95" r="1.4" fill="#FFFFFF" opacity="0.75" />
          <circle cx="950" cy="60" r="1" fill="#FFFFFF" opacity="0.65" />
          <circle cx="1120" cy="80" r="1.8" fill="#FFF8E7" opacity="0.85" />
          <circle cx="1280" cy="40" r="1.3" fill="#FFFFFF" opacity="0.7" />
          <circle cx="1370" cy="100" r="1.5" fill="#FFFFFF" opacity="0.8" />
          {/* 4-point subtle sparkles */}
          <path d="M280,60 L282,65 L287,67 L282,69 L280,74 L278,69 L273,67 L278,65 Z" fill="#FFE8A3" opacity="0.8" />
          <path d="M1210,110 L1211.5,114 L1216,115.5 L1211.5,117 L1210,121 L1208.5,117 L1204,115.5 L1208.5,114 Z" fill="#FFFFFF" opacity="0.7" />
        </g>

        {/* 3. SOFT CLOUDS */}
        <g opacity="0.45" fill="#FCE2D4">
          <path d="M220 230 C250 215, 310 215, 340 230 C370 230, 400 240, 420 250 C400 260, 240 260, 220 230 Z" />
          <path d="M880 210 C920 195, 1000 195, 1040 210 C1080 215, 1120 230, 1140 240 C1100 245, 900 245, 880 210 Z" />
          <path d="M60 215 C90 205, 150 205, 180 218 C150 228, 80 228, 60 215 Z" />
        </g>

        {/* 4. DISTANT MOUNTAIN RANGES */}
        <path
          d="M-50 490 L80 340 L220 440 L410 300 L610 450 L840 320 L1080 430 L1260 280 L1490 480 L1490 700 L-50 700 Z"
          fill="url(#distMountainGrad)"
          opacity="0.95"
        />

        {/* 5. MIDGROUND MOUNTAINS */}
        <path
          d="M-40 540 L160 380 L380 500 L560 370 L780 510 L980 360 L1200 480 L1480 350 L1480 700 L-40 700 Z"
          fill="url(#midMountainGrad)"
        />

        {/* 6. PINE TREES ON HILLSIDES (Vibrant orange/amber foliage as in Reference Image 2) */}
        {/* Left Tree Cluster */}
        <g>
          {/* Back dark trees */}
          <polygon points="40,480 65,390 90,480" fill="url(#darkTreeGrad)" />
          <polygon points="80,500 105,400 130,500" fill="url(#darkTreeGrad)" />
          <polygon points="120,510 145,420 170,510" fill="url(#darkTreeGrad)" />

          {/* Vibrant Amber/Orange Conifer Trees (Left Ridge) */}
          <polygon points="20,540 45,380 70,540" fill="url(#amberTreeGrad)" />
          <polygon points="50,530 80,340 110,530" fill="url(#amberTreeGrad)" />
          <polygon points="85,550 120,330 155,550" fill="url(#coralTreeGrad)" />
          <polygon points="130,540 160,360 190,540" fill="url(#amberTreeGrad)" />
          <polygon points="165,560 195,390 225,560" fill="url(#coralTreeGrad)" />
          <polygon points="200,570 225,430 250,570" fill="url(#amberTreeGrad)" />
          <polygon points="230,580 250,470 270,580" fill="url(#coralTreeGrad)" />
          <polygon points="260,590 280,490 300,590" fill="url(#amberTreeGrad)" />

          {/* Rounded shrub layers below trees */}
          <ellipse cx="60" cy="565" rx="45" ry="32" fill="#D35738" />
          <ellipse cx="120" cy="575" rx="55" ry="38" fill="#2B3654" />
          <ellipse cx="180" cy="580" rx="50" ry="35" fill="#4B3B60" />
          <ellipse cx="230" cy="590" rx="42" ry="30" fill="#202C45" />
        </g>

        {/* Right Tree Cluster */}
        <g>
          {/* Back dark trees */}
          <polygon points="1280,510 1305,420 1330,510" fill="url(#darkTreeGrad)" />
          <polygon points="1320,500 1345,400 1370,500" fill="url(#darkTreeGrad)" />
          <polygon points="1360,480 1385,390 1410,480" fill="url(#darkTreeGrad)" />

          {/* Vibrant Amber/Orange Conifer Trees (Right Ridge) */}
          <polygon points="1150,590 1170,490 1190,590" fill="url(#amberTreeGrad)" />
          <polygon points="1180,580 1200,470 1220,580" fill="url(#coralTreeGrad)" />
          <polygon points="1210,570 1235,430 1260,570" fill="url(#amberTreeGrad)" />
          <polygon points="1245,560 1275,390 1305,560" fill="url(#coralTreeGrad)" />
          <polygon points="1280,540 1310,360 1340,540" fill="url(#amberTreeGrad)" />
          <polygon points="1315,550 1350,330 1385,550" fill="url(#coralTreeGrad)" />
          <polygon points="1360,530 1390,340 1420,530" fill="url(#amberTreeGrad)" />
          <polygon points="1400,540 1425,380 1450,540" fill="url(#amberTreeGrad)" />

          {/* Rounded shrub layers below trees */}
          <ellipse cx="1230" cy="590" rx="42" ry="30" fill="#202C45" />
          <ellipse cx="1280" cy="580" rx="50" ry="35" fill="#4B3B60" />
          <ellipse cx="1340" cy="575" rx="55" ry="38" fill="#2B3654" />
          <ellipse cx="1400" cy="565" rx="45" ry="32" fill="#D35738" />
        </g>

        {/* 7. FOREGROUND SHORELINE / HILLS */}
        <path
          d="M-20 620 Q180 580 380 625 Q580 645 740 630 Q920 620 1120 635 Q1320 610 1460 625 L1460 700 L-20 700 Z"
          fill="url(#foreHillGrad)"
        />

        {/* Shoreline Rocks / Islets */}
        <ellipse cx="110" cy="655" rx="70" ry="22" fill="#1C2D42" />
        <ellipse cx="230" cy="660" rx="60" ry="18" fill="#243750" />
        <ellipse cx="1230" cy="660" rx="60" ry="18" fill="#243750" />
        <ellipse cx="1340" cy="655" rx="70" ry="22" fill="#1C2D42" />

        {/* 8. SERENE LAKE WATER AT BOTTOM */}
        <rect x="0" y="650" width="1440" height="250" fill="url(#scenicWaterGrad)" />

        {/* Water Surface Ripple Reflections (Mirrors dusk sky, sunset glow & tree silhouettes) */}
        <g opacity="0.45">
          {/* Sky glow reflection */}
          <path d="M480 670 Q720 665 960 670" stroke="#EFA87C" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M520 690 Q720 684 920 690" stroke="#F4A785" strokeWidth="2" strokeLinecap="round" />
          <path d="M420 715 Q720 708 1020 715" stroke="#C96558" strokeWidth="3" strokeLinecap="round" />
          <path d="M360 745 Q720 738 1080 745" stroke="#7B4254" strokeWidth="3" strokeLinecap="round" />
          <path d="M260 780 Q720 770 1180 780" stroke="#3B2E4E" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M160 820 Q720 810 1280 820" stroke="#25374C" strokeWidth="4" strokeLinecap="round" />
          <path d="M60 865 Q720 855 1380 865" stroke="#1C2C3E" strokeWidth="4" strokeLinecap="round" />

          {/* Left orange reflection highlights */}
          <path d="M80 675 Q160 672 240 675" stroke="#E37234" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <path d="M110 705 Q190 702 270 705" stroke="#E37234" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <path d="M60 735 Q150 732 230 735" stroke="#E37234" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

          {/* Right orange reflection highlights */}
          <path d="M1200 675 Q1280 672 1360 675" stroke="#E37234" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <path d="M1170 705 Q1250 702 1330 705" stroke="#E37234" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <path d="M1210 735 Q1290 732 1380 735" stroke="#E37234" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        </g>
      </svg>

      {/* Subtle Dark Vignette Overlay to ensure perfect text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1321]/70 via-transparent to-[#0B1321]/40 pointer-events-none" />
    </div>
  );
}

