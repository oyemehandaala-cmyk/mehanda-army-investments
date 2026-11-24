import { supabase, authService, isSupabaseConfigured } from './supabaseClient.js';
import { getCustomerApplications as getCustomerStudentLoans } from './studentLoanService.js';
import { getApiUrl } from './apiConfig.js';

export const LOAN_CATEGORIES = {
  student_loan: {
    id: 'student_loan',
    name: 'Student Loan',
    categoryCode: 'SL',
    amountRange: '₹100 – ₹1,000',
    minAmount: 100,
    maxAmount: 1000,
    badgeText: 'Education Financial Assistance',
    purposeDescription: 'Short-term educational loan enquiry and institutional verification assistance.',
    keyPoints: [
      'For enrolled students in recognized institutions',
      'Instant digital enquiry tracking & verification',
      'No collateral requirement for verified students',
      'Zero penalty for early repayment schedule',
    ],
    themeColor: '#876A2E',
    themeBg: '#F6F2E8',
    borderColor: '#D5C292',
    accentGradient: 'from-amber-600 to-amber-800',
  },
  dairy_loan: {
    id: 'dairy_loan',
    name: 'Dairy Loan',
    categoryCode: 'DL',
    amountRange: '₹2,00,000 – ₹50,00,000',
    minAmount: 200000,
    maxAmount: 5000000,
    badgeText: 'Dairy Farming & Cattle Expansion',
    purposeDescription: 'Financing for procurement of high-yield milch cows/buffaloes, shed construction, chilling equipment & fodder.',
    keyPoints: [
      'Minimum Loan: ₹2,00,000 | Maximum: ₹50,00,000',
      'Covers milch animals, milking machinery & cattle sheds',
      'Support for commercial dairy cooperatives & milk societies',
      'Subsidized repayment structure with flexible tenure',
    ],
    themeColor: '#0284c7',
    themeBg: '#f0f9ff',
    borderColor: '#7dd3fc',
    accentGradient: 'from-sky-600 to-blue-800',
  },
  sheep_loan: {
    id: 'sheep_loan',
    name: 'Sheep Loan',
    categoryCode: 'SH',
    amountRange: 'Up to ₹2,00,000',
    minAmount: 10000,
    maxAmount: 200000,
    badgeText: 'Sheep Farming & Wool/Meat Flocks',
    purposeDescription: 'Financial assistance for acquiring quality sheep breeds, shelter construction, grazing fence & healthcare.',
    keyPoints: [
      'Maximum Loan: ₹2,00,000',
      'Purchase of healthy sheep flocks & breeding rams',
      'Shelter fencing and protective grazing sheds',
      'Easy documentation & prompt rural field verification',
    ],
    themeColor: '#16a34a',
    themeBg: '#f0fdf4',
    borderColor: '#86efac',
    accentGradient: 'from-emerald-600 to-green-800',
  },
  goat_loan: {
    id: 'goat_loan',
    name: 'Goat Loan',
    categoryCode: 'GT',
    amountRange: 'Up to ₹2,00,000',
    minAmount: 10000,
    maxAmount: 200000,
    badgeText: 'Commercial Goat Rearing',
    purposeDescription: 'Credit support for stall-fed goat rearing (Beetal, Sirohi, Barbari), shed development & high-protein fodder.',
    keyPoints: [
      'Maximum Loan: ₹2,00,000',
      'Covers doe/buck breeding pairs & flock scaling',
      'Semi-intensive & stall-fed shed modernization',
      'Dedicated veterinary support and market linkages',
    ],
    themeColor: '#d97706',
    themeBg: '#fffbeb',
    borderColor: '#fde68a',
    accentGradient: 'from-amber-500 to-orange-700',
  },
};

async function authorizedRequest(path, options = {}) {
  const { accessToken, error } = await authService.getAccessToken();
  if (error || !accessToken) {
    throw new Error('Please sign in again to submit or track loan applications.');
  }

  const response = await fetch(getApiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
    cache: 'no-store',
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The loan service returned an invalid response.');
  }

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'The loan request could not be completed.');
  }

  return result;
}

function generateClientTrackingId(category) {
  const prefixMap = {
    dairy_loan: 'MAI-DL',
    sheep_loan: 'MAI-SH',
    goat_loan: 'MAI-GT',
    student_loan: 'MAI-SL',
  };
  const prefix = prefixMap[category] || 'MAI-FL';
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${year}-${randomSuffix}`;
}

/**
 * Submit Dairy, Sheep, or Goat Loan Application
 */
export async function submitAgricultureLoanApplication(payload) {
  try {
    const result = await authorizedRequest('/api/farm-loans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (result?.application) {
      return result.application;
    }
  } catch (apiErr) {
    console.warn('[loanService] Server endpoint notice, saving directly via Supabase client:', apiErr.message);
    if (isSupabaseConfigured() && supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      const trackingId = generateClientTrackingId(payload.loanCategory || 'dairy_loan');
      const reference = `MAI-FL-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const record = {
        reference,
        tracking_id: trackingId,
        user_id: user?.id || null,
        loan_category: payload.loanCategory || 'dairy_loan',
        applicant_name: payload.applicantName,
        applicant_dob: payload.applicantDob,
        applicant_phone: payload.applicantPhone,
        applicant_email: payload.applicantEmail,
        applicant_state: payload.applicantState,
        applicant_district: payload.applicantDistrict,
        applicant_city: payload.applicantCity,
        applicant_address: payload.applicantAddress,
        applicant_pincode: payload.applicantPincode,
        aadhaar_number: payload.aadhaarNumber,
        pan_number: payload.panNumber,
        voter_id_number: payload.voterIdNumber || null,
        loan_amount: Number(payload.loanAmount),
        loan_purpose: payload.loanPurpose,
        farming_details: payload.farmingDetails || {},
        documents: payload.documents || {},
        status: 'Submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('farm_loan_applications')
        .insert([record])
        .select('*')
        .single();

      if (!error && (data || record)) {
        const saved = data || record;
        return {
          id: saved.id || saved.reference,
          reference: saved.reference,
          trackingId: saved.tracking_id,
          tracking_id: saved.tracking_id,
          loanCategory: saved.loan_category,
          loan_category: saved.loan_category,
          categoryLabel: LOAN_CATEGORIES[saved.loan_category]?.name || 'Dairy Loan',
          applicantName: saved.applicant_name,
          applicant_name: saved.applicant_name,
          applicantEmail: saved.applicant_email,
          applicant_email: saved.applicant_email,
          applicantPhone: saved.applicant_phone,
          applicant_phone: saved.applicant_phone,
          loanAmount: saved.loan_amount,
          loan_amount: saved.loan_amount,
          loanPurpose: saved.loan_purpose,
          status: saved.status,
          submittedAt: saved.submitted_at,
          submitted_at: saved.submitted_at,
          farmingDetails: saved.farming_details,
          documents: saved.documents,
        };
      }
    }
    throw apiErr;
  }
}

/**
 * Fetch Customer's Agriculture Loan Applications
 */
export async function getCustomerFarmLoans() {
  try {
    const result = await authorizedRequest('/api/farm-loans?mine=true', {
      method: 'GET',
    });
    if (Array.isArray(result?.applications)) {
      return result.applications;
    }
  } catch (err) {
    console.warn('[loanService] Server endpoint notice, fetching directly via Supabase client:', err.message);
  }

  // Fallback to direct Supabase query
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        let query = supabase.from('farm_loan_applications').select('*');
        if (user.id && user.email) {
          query = query.or(`user_id.eq.${user.id},applicant_email.eq.${user.email.toLowerCase()}`);
        } else if (user.id) {
          query = query.eq('user_id', user.id);
        } else if (user.email) {
          query = query.eq('applicant_email', user.email.toLowerCase());
        }
        const { data, error } = await query.order('submitted_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          return data.map((row) => ({
            id: row.id || row.reference,
            reference: row.reference,
            trackingId: row.tracking_id,
            tracking_id: row.tracking_id,
            loanCategory: row.loan_category,
            loan_category: row.loan_category,
            categoryLabel: LOAN_CATEGORIES[row.loan_category]?.name || 'Dairy Loan',
            applicantName: row.applicant_name,
            applicant_name: row.applicant_name,
            applicantEmail: row.applicant_email,
            applicant_email: row.applicant_email,
            applicantPhone: row.applicant_phone,
            applicant_phone: row.applicant_phone,
            loanAmount: row.loan_amount,
            loan_amount: row.loan_amount,
            loanPurpose: row.loan_purpose,
            status: row.status,
            submittedAt: row.submitted_at,
            submitted_at: row.submitted_at,
            farmingDetails: row.farming_details,
            documents: row.documents,
            adminNotes: row.admin_notes,
          }));
        }
      }
    } catch (dbErr) {
      console.warn('[loanService] Direct client query notice:', dbErr.message);
    }
  }

  return [];
}

/**
 * Unified getter for ALL 4 loan categories for the logged-in customer:
 * Student Loan, Dairy Loan, Sheep Loan, Goat Loan.
 */
export async function getAllCustomerLoanApplications() {
  const [studentLoansResult, farmLoansResult] = await Promise.allSettled([
    getCustomerStudentLoans(),
    getCustomerFarmLoans(),
  ]);

  const rawStudentLoans = studentLoansResult.status === 'fulfilled' && Array.isArray(studentLoansResult.value)
    ? studentLoansResult.value
    : [];

  const rawFarmLoans = farmLoansResult.status === 'fulfilled' && Array.isArray(farmLoansResult.value)
    ? farmLoansResult.value
    : [];

  // Normalize Student Loans to unified loan shape
  const studentLoans = rawStudentLoans.map((app) => ({
    id: app.reference || app.trackingId,
    reference: app.reference,
    trackingId: app.trackingId,
    tracking_id: app.trackingId,
    loanCategory: 'student_loan',
    loan_category: 'student_loan',
    categoryLabel: 'Student Loan',
    loanAmount: app.loanAmount,
    loan_amount: app.loanAmount,
    status: app.status || 'Submitted',
    applicantName: app.applicantName,
    applicantEmail: app.applicantEmail,
    applicantPhone: app.applicantPhone,
    submittedAt: app.submittedAt || app.createdAt,
    submitted_at: app.submittedAt || app.createdAt,
    documents: app.documents || (app.documentMetadata ? { supportingDocument: app.documentMetadata } : null),
    document: app.document || app.documentMetadata || null,
    farmingDetails: app.farmingDetails || {
      institutionName: app.institutionName,
      courseName: app.courseName,
      qualification: app.studentStatus,
    },
    statusHistory: app.statusHistory || [],
    adminNotes: app.latestCustomerRemark || app.adminNotes || null,
    rawRecord: app,
  }));

  // Normalize Farm Loans
  const farmLoans = rawFarmLoans.map((app) => ({
    id: app.id || app.reference || app.trackingId,
    reference: app.reference,
    trackingId: app.trackingId,
    tracking_id: app.trackingId,
    loanCategory: app.loanCategory || app.loan_category,
    loan_category: app.loanCategory || app.loan_category,
    categoryLabel: LOAN_CATEGORIES[app.loanCategory || app.loan_category]?.name || 'Farm Loan',
    loanAmount: app.loanAmount,
    loan_amount: app.loanAmount,
    status: app.status || 'Submitted',
    applicantName: app.applicantName,
    applicantEmail: app.applicantEmail,
    applicantPhone: app.applicantPhone,
    loanPurpose: app.loanPurpose,
    farmingDetails: app.farmingDetails,
    documents: app.documents,
    submittedAt: app.submittedAt || app.createdAt,
    submitted_at: app.submittedAt || app.createdAt,
    rawRecord: app,
  }));

  // Merge and sort newest first
  return [...studentLoans, ...farmLoans].sort((a, b) => {
    const timeA = new Date(a.submittedAt || 0).getTime();
    const timeB = new Date(b.submittedAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Admin: Update Farm Loan Status
 */
export async function updateFarmLoanStatus(body) {
  const result = await authorizedRequest('/api/farm-loans', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return result;
}

/**
 * Universal Loan Tracker: Search by Tracking ID across all loan categories
 * Supports: Student Loan (MAI-SL-..., MAI-2026-...), Dairy Loan (MAI-DL-...),
 * Sheep Loan (MAI-SH-...), and Goat Loan (MAI-GT-...).
 */
export async function trackLoanByTrackingId(trackingId, existingApplications = []) {
  if (!trackingId || typeof trackingId !== 'string') {
    throw new Error('Please enter an application tracking ID.');
  }

  const query = trackingId.trim().toUpperCase();

  // 1. Instant check in local application state if available
  if (Array.isArray(existingApplications) && existingApplications.length > 0) {
    const match = existingApplications.find((app) => {
      const tid = (app.trackingId || app.tracking_id || app.reference || '').trim().toUpperCase();
      return tid === query || tid.includes(query);
    });
    if (match) {
      return match;
    }
  }

  // 2. Query Farm / Multi-Category Loan endpoint
  try {
    const res = await fetch(`/api/farm-loans?trackingId=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.application) {
        return json.application;
      }
    }
  } catch (_) {}

  // 3. Fallback: Query Student Loan endpoint
  try {
    const res2 = await fetch(`/api/student-loans?trackingId=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (res2.ok) {
      const json2 = await res2.json();
      if (json2.success && json2.application) {
        const app = json2.application;
        return {
          id: app.reference || app.trackingId,
          reference: app.reference,
          trackingId: app.trackingId,
          tracking_id: app.trackingId,
          loanCategory: 'student_loan',
          loan_category: 'student_loan',
          categoryLabel: 'Student Loan',
          loanAmount: app.loanAmount,
          loan_amount: app.loanAmount,
          status: app.status || 'Submitted',
          applicantName: app.applicantName,
          applicantEmail: app.applicantEmail,
          applicantPhone: app.applicantPhone,
          submittedAt: app.submittedAt || app.createdAt,
          submitted_at: app.submittedAt || app.createdAt,
          statusHistory: app.statusHistory || [],
          adminNotes: app.latestCustomerRemark || null,
          documents: app.documents || (app.documentMetadata ? { supportingDocument: app.documentMetadata } : null),
          document: app.document || app.documentMetadata || null,
          farmingDetails: app.farmingDetails || {
            institutionName: app.institutionName,
            courseName: app.courseName,
            qualification: app.studentStatus,
          },
          rawRecord: app,
        };
      }
    }
  } catch (_) {}

  throw new Error(`No loan application was found for Tracking ID "${query}". Please verify the reference and try again.`);
}


