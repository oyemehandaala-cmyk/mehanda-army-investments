export const COMPANY = {
  name: 'Mehanda Army Investments',
  legalName: 'Mehanda Army Investments Private Limited',
  phone: '+91 9812947813',
  email: 'Info@mehandaarmy.in',
  whatsapp:
    'https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20would%20like%20to%20know%20more%20about%20your%20services.',
} as const;

export const SERVICES = [
  {
    title: 'Portfolio Planning & Multi-Asset Allocation',
    description:
      'Systematic asset diversification across large-cap equities, high-grade debt instruments, gold hedges, and liquid reserves tailored to a stated time horizon.',
    features: [
      'Personalized risk capacity assessment',
      'Asset correlation analysis to minimize volatility',
      'Disciplined periodic rebalancing schedule',
    ],
    tag: 'Asset architecture',
  },
  {
    title: 'Retirement & Generational Wealth Blueprinting',
    description:
      'Structured long-term planning for cash-flow needs, pension security, and wealth preservation.',
    features: [
      'Systematic Investment Plan (SIP) modeling',
      'Tax-advantaged asset structuring',
      'Emergency buffer and liquidity preservation',
    ],
    tag: 'Long-term planning',
  },
  {
    title: 'Capital Preservation & Downside Risk Hedging',
    description:
      'Planning described by the website as aiming to mitigate drawdowns and protect core capital during volatile cycles. It does not guarantee capital protection.',
    features: [
      'Maximum drawdown containment protocols',
      'Sovereign-backed fixed income integration',
      'Risk-aware allocation planning',
    ],
    tag: 'Risk planning',
  },
] as const;

export const FAQS = [
  {
    question: 'Does the company guarantee investment returns?',
    answer: 'No. The website states that market-linked investments carry risk and past performance does not guarantee future results.',
  },
  {
    question: 'Can I make an investment deposit in this app?',
    answer: 'No. This mobile app does not accept investment deposits or simulate payments.',
  },
  {
    question: 'Can the AI assistant see my account or offer personal advice?',
    answer: 'No. It answers general questions only and cannot access customer records or provide personalized financial advice.',
  },
  {
    question: 'Are phone numbers verified with SMS OTP?',
    answer: 'No SMS OTP provider is configured in the existing website. Phone numbers are optional and are not OTP-verified.',
  },
  {
    question: 'How do I contact official support?',
    answer: `Call ${COMPANY.phone}, email ${COMPANY.email}, or use the WhatsApp contact shown in this app.`,
  },
] as const;

export const LEGAL_CONTENT = {
  privacy: {
    title: 'Privacy policy',
    sections: [
      {
        title: 'Information you provide',
        body: 'The company website says it collects contact details when voluntarily submitted through inquiry or account forms, to respond to consultations, maintain client accounts, and provide agreed updates.',
      },
      {
        title: 'Mobile app data',
        body: 'Authentication uses the company’s Supabase project. The app stores the authentication session in the device secure store. Public company information is bundled with the app; private profile details are requested only after sign-in.',
      },
      {
        title: 'Profile pictures',
        body: 'When configured, profile pictures are uploaded to the existing private profile-photos bucket and processed by the existing authenticated server endpoint. Do not upload sensitive identity documents.',
      },
      {
        title: 'AI support',
        body: 'Questions and recent chat context are sent to the configured company support endpoint for an answer. Do not send account details, passwords, OTPs, PINs, bank information, Aadhaar, or PAN.',
      },
    ],
  },
  terms: {
    title: 'Terms & conditions',
    sections: [
      {
        title: 'Scope of the app',
        body: 'The app provides company information, access to the existing authenticated account service, and general AI support. App access alone is not an investment or execution mandate.',
      },
      {
        title: 'Account security',
        body: 'Keep your credentials private. Never share passwords, OTPs, recovery links, or banking credentials. Sign out on devices you do not control.',
      },
      {
        title: 'Availability and accuracy',
        body: 'Public service descriptions and availability are subject to change. Confirm current details directly with official company support.',
      },
    ],
  },
  risk: {
    title: 'Risk disclosure',
    sections: [
      {
        title: 'Market risk',
        body: 'Securities markets, mutual funds, debt, and market-linked products are subject to market risk. Read scheme-related documents carefully before investing.',
      },
      {
        title: 'No guaranteed returns',
        body: 'Past performance does not guarantee future results. Estimates, examples, and planning tools are not promises or commitments of future gains.',
      },
      {
        title: 'No deposits in this app',
        body: 'This mobile app does not accept investment deposits or claim to verify payment status. Contact the company through the published official channels for questions.',
      },
    ],
  },
} as const;

const configuredApiOrigin = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '') ?? '';

export const SUPPORT_API = {
  baseUrl: configuredApiOrigin,
};
