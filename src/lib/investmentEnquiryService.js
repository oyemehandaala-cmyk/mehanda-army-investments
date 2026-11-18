import { authService, supabase, isSupabaseConfigured } from './supabaseClient.js';
import { getApiUrl } from './apiConfig.js';

export const INVESTMENT_AMOUNT_RANGES = [
  'Below ₹5,000',
  '₹5,000–₹10,000',
  '₹10,000–₹25,000',
  '₹25,000–₹50,000',
  'Above ₹50,000',
  'Not Decided Yet',
];

export const INVESTMENT_DURATIONS = [
  '1–3 Years (Short-to-Medium Term)',
  '3–5 Years (Medium Term)',
  '5–10 Years (Long Term)',
  '10+ Years (Very Long Term)',
  'Exploring / Undecided',
];

export const INVESTMENT_INTEREST_CATEGORIES = [
  'Portfolio Planning & Asset Allocation',
  'Systematic Investment Plan (SIP) Modeling',
  'Retirement & Pension Information',
  'Capital Growth & Wealth Preservation',
  'Higher Education / Family Goal Planning',
  'General Financial Literacy & Guidance',
];

export const INVESTMENT_OBJECTIVES = [
  'Long-Term Wealth Creation',
  'Capital Preservation (Inflation Protection)',
  'Retirement Corpus Building',
  'Child Higher Education / Major Family Goal',
  'Balanced Growth with Calculated Risk',
  'Exploring Portfolio Structures',
];

export const CUSTOMER_EXPECTATIONS = [
  'Information & Strategy Consultation',
  'Portfolio Structure Review',
  'General Asset Allocation Guidance',
  'Educational Discussion on Market Risks',
];

export const RISK_UNDERSTANDING_OPTIONS = [
  {
    value: 'conservative',
    label: 'Conservative / Low Risk',
    description: 'Priority is capital preservation; minimal tolerance for market volatility.',
  },
  {
    value: 'moderate',
    label: 'Moderate / Balanced Risk',
    description: 'Comfortable with modest market fluctuations in exchange for steady medium-term growth potential.',
  },
  {
    value: 'growth',
    label: 'Growth / Aggressive Risk',
    description: 'Long investment horizon; comfortable with short-term market swings for higher long-term potential.',
  },
];

export const KNOWLEDGE_LEVEL_OPTIONS = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'New to personal investing, mutual funds, and asset allocation concepts.',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'Have invested in fixed deposits, mutual funds, or gold; basic market familiarity.',
  },
  {
    value: 'experienced',
    label: 'Experienced',
    description: 'Familiar with multi-asset allocation, economic cycles, and portfolio rebalancing.',
  },
];

export const INVESTMENT_GOALS_OPTIONS = [
  'Wealth Preservation',
  'Balanced Long-Term Growth',
  'Capital Appreciation',
  'Regular Cashflow / Liquidity Planning',
];

export const INVESTMENT_ENQUIRY_STATUSES = [
  'Submitted',
  'Under Review',
  'Additional Information Required',
  'Verification Pending',
  'On Hold',
  'Completed',
  'Enquiry Completed',
  'Closed',
  'Rejected',
  'Contacted',
  'Information Provided',
];

/**
 * Submit an investment information enquiry.
 */
export async function submitInvestmentEnquiry(payload, accessToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  let token = accessToken;
  if (!token && isSupabaseConfigured()) {
    const { accessToken: sessionToken } = await authService.getAccessToken();
    token = sessionToken;
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(getApiUrl('/api/investment-enquiry'), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Investment enquiry service returned an invalid response.');
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to submit investment enquiry.');
  }

  return data;
}

export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
export const MAX_TEST_DOCUMENT_SIZE = MAX_DOCUMENT_SIZE;
export const INVESTMENT_DOCUMENT_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
  ['text/plain', 'txt'],
  ['application/json', 'json'],
]);

export function createSyntheticSampleFile(docTitle, applicantName = 'Investor Applicant') {
  const content = JSON.stringify({
    documentType: docTitle,
    applicantName: (applicantName || 'Investor Applicant').trim(),
    generatedAt: new Date().toISOString(),
    documentStatus: 'SYNTHETIC_TEST_SAMPLE',
    safetyNotice: 'Non-sensitive synthetic test document for Mehanda Army Investments investor verification testing.',
  }, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const sanitizedTitle = docTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return new File([blob], `sample-${sanitizedTitle}.json`, { type: 'application/json' });
}

export async function uploadInvestmentDocument(file, onProgress) {
  if (!(file instanceof File)) {
    throw new Error('Please select a valid document file.');
  }

  const isImageOrPdf = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ].includes(file.type) || /\.(jpe?g|png|webp|pdf)$/i.test(file.name);

  const isTextOrJson = [
    'text/plain',
    'application/json',
  ].includes(file.type) || /\.(txt|json)$/i.test(file.name);

  if (!isImageOrPdf && !isTextOrJson) {
    throw new Error('Supported document formats are JPG, JPEG, PNG, and PDF (up to 5 MB per file).');
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 5 MB.`);
  }

  let effectiveContentType = file.type;
  if (!effectiveContentType || effectiveContentType === 'application/octet-stream') {
    if (/\.jpe?g$/i.test(file.name)) effectiveContentType = 'image/jpeg';
    else if (/\.png$/i.test(file.name)) effectiveContentType = 'image/png';
    else if (/\.webp$/i.test(file.name)) effectiveContentType = 'image/webp';
    else if (/\.pdf$/i.test(file.name)) effectiveContentType = 'application/pdf';
    else if (/\.txt$/i.test(file.name)) effectiveContentType = 'text/plain';
    else if (/\.json$/i.test(file.name)) effectiveContentType = 'application/json';
  }

  const { accessToken, error } = await authService.getAccessToken();
  if (error || !accessToken) {
    throw new Error('Sign in again before uploading a verification file.');
  }

  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The selected document file could not be read.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const separator = dataUrl.indexOf(',');
      if (separator < 0) {
        reject(new Error('The selected document file could not be encoded.'));
        return;
      }
      resolve(dataUrl.slice(separator + 1));
    };
    reader.readAsDataURL(file);
  });

  return new Promise((resolve, reject) => {
    const upload = new XMLHttpRequest();
    upload.open('POST', '/api/student-loan-documents');
    upload.setRequestHeader('Content-Type', 'application/json');
    upload.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    upload.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    upload.onerror = () => reject(new Error('The verification file could not be uploaded.'));
    upload.onload = () => {
      let result;
      try {
        result = JSON.parse(upload.responseText);
      } catch {
        reject(new Error('The verification file service returned an invalid response.'));
        return;
      }
      if (upload.status < 200 || upload.status >= 300 || !result.success) {
        reject(new Error(result.error || 'The verification file could not be uploaded.'));
        return;
      }
      onProgress?.(100);
      resolve(result.document);
    };
    upload.send(JSON.stringify({
      fileName: file.name,
      contentType: effectiveContentType,
      size: file.size,
      contentBase64,
    }));
  });
}

export async function removeInvestmentDocument(path) {
  const { accessToken, error } = await authService.getAccessToken();
  if (error || !accessToken) {
    throw new Error('Sign in again to remove verification files.');
  }
  const response = await fetch(getApiUrl('/api/student-loan-documents'), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ path }),
  });
  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'Could not remove verification file.');
  }
  return data.document;
}

/**
 * Fetch the authenticated customer's investment enquiries.
 * Uses direct Supabase client with RLS to ensure customers only access their own records.
 */
export async function getCustomerInvestmentEnquiries() {
  if (!isSupabaseConfigured()) return [];

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return [];

  const userId = userData.user.id;
  const userEmail = (userData.user.email || '').toLowerCase();

  const { data, error } = await supabase
    .from('investment_enquiries')
    .select('*')
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[investment-service] could not fetch enquiries via supabase', error.message);
    return [];
  }

  return (data || []).map(normalizeEnquiryRecord);
}

/**
 * Update investment enquiry status (for Admin Portal).
 */
export async function updateInvestmentEnquiryStatus({
  id,
  status,
  adminNotes = '',
}) {
  const response = await fetch(getApiUrl('/api/investment-enquiry'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      id,
      status,
      adminNotes,
    }),
    cache: 'no-store',
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Investment enquiry service returned an invalid response.');
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to update enquiry status.');
  }

  return data;
}

function normalizeEnquiryRecord(record) {
  return {
    id: record.id,
    trackingId: record.tracking_id || record.reference || record.id,
    fullName: record.full_name || record.name || '',
    email: record.email || '',
    phone: record.phone || '',
    city: record.city || '',
    state: record.state || '',
    district: record.district || '',
    address: record.address || '',
    pinCode: record.pin_code || '',
    dateOfBirth: record.date_of_birth || '',
    age: record.age || null,
    interestCategory: record.interest_category || (record.areas_of_interest?.[0] || ''),
    investmentObjective: record.investment_objective || '',
    plannedAmountBracket: record.planned_amount_bracket || '',
    investmentHorizon: record.investment_horizon || '',
    customerExpectations: record.customer_expectations || '',
    riskUnderstanding: record.risk_understanding || '',
    knowledgeLevel: record.knowledge_level || '',
    investmentGoals: record.investment_goals || '',
    message: record.message || '',
    areasOfInterest: record.areas_of_interest || [],
    status: record.status || 'Submitted',
    adminNotes: record.admin_notes || null,
    createdAt: record.created_at || new Date().toISOString(),
    updatedAt: record.updated_at || record.created_at || new Date().toISOString(),
  };
}

