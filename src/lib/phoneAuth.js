export const PHONE_OTP_COOLDOWN_SECONDS = 60;
export const PHONE_OTP_EXPIRY_SECONDS = 300;

export const PHONE_COUNTRY_CODES = [
  { country: 'India', dialCode: '+91' },
  { country: 'United States / Canada', dialCode: '+1' },
  { country: 'United Kingdom', dialCode: '+44' },
  { country: 'Australia', dialCode: '+61' },
  { country: 'United Arab Emirates', dialCode: '+971' },
  { country: 'Saudi Arabia', dialCode: '+966' },
  { country: 'Singapore', dialCode: '+65' },
  { country: 'Malaysia', dialCode: '+60' },
  { country: 'Bangladesh', dialCode: '+880' },
  { country: 'Pakistan', dialCode: '+92' },
  { country: 'Nepal', dialCode: '+977' },
  { country: 'Sri Lanka', dialCode: '+94' },
  { country: 'Philippines', dialCode: '+63' },
  { country: 'Indonesia', dialCode: '+62' },
  { country: 'Japan', dialCode: '+81' },
  { country: 'China', dialCode: '+86' },
  { country: 'South Korea', dialCode: '+82' },
  { country: 'New Zealand', dialCode: '+64' },
  { country: 'Germany', dialCode: '+49' },
  { country: 'France', dialCode: '+33' },
  { country: 'Italy', dialCode: '+39' },
  { country: 'Spain', dialCode: '+34' },
  { country: 'Netherlands', dialCode: '+31' },
  { country: 'Ireland', dialCode: '+353' },
  { country: 'South Africa', dialCode: '+27' },
  { country: 'Nigeria', dialCode: '+234' },
  { country: 'Kenya', dialCode: '+254' },
  { country: 'Ghana', dialCode: '+233' },
  { country: 'Egypt', dialCode: '+20' },
  { country: 'Turkey', dialCode: '+90' },
  { country: 'Thailand', dialCode: '+66' },
  { country: 'Vietnam', dialCode: '+84' },
  { country: 'Brazil', dialCode: '+55' },
  { country: 'Mexico', dialCode: '+52' },
  { country: 'Russia / Kazakhstan', dialCode: '+7' },
  { country: 'Qatar', dialCode: '+974' },
  { country: 'Kuwait', dialCode: '+965' },
  { country: 'Oman', dialCode: '+968' },
  { country: 'Bahrain', dialCode: '+973' },
  { country: 'Hong Kong', dialCode: '+852' },
];

export function normalizePhoneNumber(value, dialCode) {
  const raw = typeof value === 'string' ? value.trim() : '';
  const digits = raw.replace(/\D/g, '');
  const countryDigits = typeof dialCode === 'string' ? dialCode.replace(/\D/g, '') : '';
  if (!digits || !countryDigits) return null;

  const number = raw.startsWith('+')
    ? `+${digits}`
    : `+${countryDigits}${digits.replace(/^0/, '')}`;
  return /^\+[1-9]\d{7,14}$/.test(number) ? number : null;
}

export function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}
