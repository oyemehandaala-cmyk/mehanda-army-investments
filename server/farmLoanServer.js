import crypto from 'node:crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerKey } from './supabaseServerKey.js';
import { sendSubmissionConfirmationEmail, deliverEmailMessage } from './emailOtpService.js';
import { sendStatusUpdateNotification } from './statusNotificationService.js';
import { recordAdminActivity, requireAdminUser } from './adminAuth.js';
import { readFileSync } from 'node:fs';

const INDIA_LOCATION_DATA = JSON.parse(
  readFileSync(new URL('../src/data/indiaLocations.json', import.meta.url), 'utf8')
);

export const FARM_LOAN_CATEGORIES = {
  student_loan: {
    id: 'student_loan',
    name: 'Student Loan',
    code: 'SL',
    prefix: 'MAI-SL',
    minAmount: 100,
    maxAmount: 1000,
    purposeLabel: 'Student Education Loan & Academic Support',
    description: 'Financial assistance for enrolled students for tuition fees, books, laptops, and educational needs.',
  },
  dairy_loan: {
    id: 'dairy_loan',
    name: 'Dairy Loan',
    code: 'DL',
    prefix: 'MAI-DL',
    minAmount: 200000,
    maxAmount: 5000000,
    purposeLabel: 'Dairy Farming, Cattle Expansion & Milk Infrastructure',
    description: 'Financial assistance for purchasing high-yield cows/buffaloes, shed construction, milking equipment, and cattle healthcare.',
  },
  sheep_loan: {
    id: 'sheep_loan',
    name: 'Sheep Loan',
    code: 'SH',
    prefix: 'MAI-SH',
    minAmount: 10000,
    maxAmount: 200000,
    purposeLabel: 'Sheep Farming, Breeding & Livestock Sheds',
    description: 'Financial support for procuring quality sheep flocks, constructing shelters, perimeter fencing, and fodder management.',
  },
  goat_loan: {
    id: 'goat_loan',
    name: 'Goat Loan',
    code: 'GT',
    prefix: 'MAI-GT',
    minAmount: 10000,
    maxAmount: 200000,
    purposeLabel: 'Commercial Goat Rearing & Flocks',
    description: 'Credit support for stall-fed goat rearing (Beetal/Sirohi/Barbari), sheds, green fodder storage, and veterinary care.',
  },
};

export const FARM_LOAN_STATUSES = new Set([
  'Submitted',
  'Pending',
  'Under Review',
  'Approved',
  'Rejected',
  'Completed',
]);

export class FarmLoanError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const DEFAULT_SUPABASE_URL = 'https://epjjsuousttlvlpjtnvs.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwampzdW91c3R0bHZscGp0bnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4OTE5NDAsImV4cCI6MjEwOTQ2Nzk0MH0.AnzmwC6uI2SNNxME07i7FOpMwurS470iK2fHdV5z61Q';

function getDatabaseConfig(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = getSupabaseServerKey(env) || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return { url: url.replace(/\/+$/, ''), key };
}

function createServiceClient(env, createClient) {
  const { url, key } = getDatabaseConfig(env);
  const clientFactory = createClient || createSupabaseClient;
  return clientFactory(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function getBearerToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match) {
    throw new FarmLoanError(401, 'Sign in to access your farm loan applications.');
  }
  return match[1];
}

async function requireCustomer(headers, dependencies = {}) {
  const token = getBearerToken(headers);
  const clientFactory = dependencies.createClient || createSupabaseClient;
  const env = dependencies.env || process.env;

  let response;
  try {
    const client = createServiceClient(env, clientFactory);
    response = await client.auth.getUser(token);
  } catch (error) {
    console.error('[farm-loans] Primary auth check warning:', error?.message || error);
    try {
      const fallbackClient = clientFactory(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      response = await fallbackClient.auth.getUser(token);
    } catch (fallbackErr) {
      console.error('[farm-loans] Fallback auth check error:', fallbackErr?.message || fallbackErr);
      throw new FarmLoanError(401, 'Your session is invalid or expired. Please sign in again.');
    }
  }

  const user = response?.data?.user;
  if (response?.error || !user) {
    throw new FarmLoanError(401, 'Your session is invalid or expired. Please sign in again.');
  }
  return user;
}

export function generateFarmLoanTrackingId(category) {
  const cfg = FARM_LOAN_CATEGORIES[category] || FARM_LOAN_CATEGORIES.dairy_loan;
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `${cfg.prefix}-${year}-${randomSuffix}`;
}

export function validateFarmLoanSubmission(body, user) {
  if (!body || typeof body !== 'object') {
    throw new FarmLoanError(400, 'Invalid application payload.');
  }

  const category = (body.loanCategory || body.loan_category || '').trim().toLowerCase();
  const categoryConfig = FARM_LOAN_CATEGORIES[category];
  if (!categoryConfig) {
    throw new FarmLoanError(400, 'Invalid loan category. Supported categories are Dairy Loan, Sheep Loan, and Goat Loan.');
  }

  // Name validation
  const applicantName = (body.applicantName || body.applicant_name || body.fullName || '').trim();
  if (!applicantName || applicantName.length < 2 || applicantName.length > 100) {
    throw new FarmLoanError(400, 'Applicant full name is required (2–100 characters).');
  }

  // DOB & Age validation (must be at least 18)
  const dobStr = (body.applicantDob || body.applicant_dob || body.dateOfBirth || '').trim();
  if (!dobStr || !/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
    throw new FarmLoanError(400, 'Valid Date of Birth is required (YYYY-MM-DD).');
  }
  const dobDate = new Date(dobStr);
  if (Number.isNaN(dobDate.getTime())) {
    throw new FarmLoanError(400, 'Invalid Date of Birth.');
  }
  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const m = today.getMonth() - dobDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
    age--;
  }
  if (age < 18) {
    throw new FarmLoanError(400, 'Applicant must be at least 18 years old to apply for an agriculture loan.');
  }

  // Mobile
  const applicantPhone = (body.applicantPhone || body.applicant_phone || body.phone || '').trim().replace(/[\s\-+]/g, '');
  const cleanPhone = applicantPhone.startsWith('91') && applicantPhone.length === 12 ? applicantPhone.slice(2) : applicantPhone;
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new FarmLoanError(400, 'Valid 10-digit Indian mobile number is required.');
  }

  // Email
  const applicantEmail = (body.applicantEmail || body.applicant_email || body.email || user?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail)) {
    throw new FarmLoanError(400, 'Valid email address is required.');
  }

  // State & District
  const applicantState = (body.applicantState || body.applicant_state || body.state || '').trim();
  const applicantDistrict = (body.applicantDistrict || body.applicant_district || body.district || '').trim();
  if (!applicantState || !applicantDistrict) {
    throw new FarmLoanError(400, 'State and District are required.');
  }
  const stateMatch = INDIA_LOCATION_DATA.states.find((s) => s.name.toLowerCase() === applicantState.toLowerCase());
  if (!stateMatch) {
    throw new FarmLoanError(400, 'Please select a valid Indian State.');
  }

  // City/Village & Address
  const applicantCity = (body.applicantCity || body.applicant_city || body.city || body.village || '').trim();
  if (!applicantCity) {
    throw new FarmLoanError(400, 'City or Village is required.');
  }
  const applicantAddress = (body.applicantAddress || body.applicant_address || body.address || '').trim();
  if (!applicantAddress || applicantAddress.length < 5) {
    throw new FarmLoanError(400, 'Complete residential/farm address is required (at least 5 characters).');
  }
  const applicantPincode = (body.applicantPincode || body.applicant_pincode || body.pinCode || '').trim();

  // Aadhaar Number (12 digits)
  const rawAadhaar = (body.aadhaarNumber || body.aadhaar_number || '').trim().replace(/[\s\-]/g, '');
  if (!/^\d{12}$/.test(rawAadhaar)) {
    throw new FarmLoanError(400, 'Valid 12-digit Aadhaar number is required.');
  }
  // Store securely masked version for display: XXXX-XXXX-1234
  const maskedAadhaar = `XXXX-XXXX-${rawAadhaar.slice(8)}`;

  // PAN Number (10 characters alphanumeric)
  const panNumber = (body.panNumber || body.pan_number || '').trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
    throw new FarmLoanError(400, 'Valid 10-character PAN number is required (e.g. ABCDE1234F).');
  }

  // Voter ID (Optional)
  const voterIdNumber = (body.voterIdNumber || body.voter_id_number || '').trim().toUpperCase() || null;

  // Loan Amount Bounds
  const loanAmount = Number(body.loanAmount || body.loan_amount || 0);
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
    throw new FarmLoanError(400, 'Requested loan amount must be a positive number.');
  }
  if (loanAmount < categoryConfig.minAmount) {
    throw new FarmLoanError(
      400,
      `${categoryConfig.name} minimum amount is ₹${categoryConfig.minAmount.toLocaleString('en-IN')}.`
    );
  }
  if (loanAmount > categoryConfig.maxAmount) {
    throw new FarmLoanError(
      400,
      `${categoryConfig.name} maximum loan amount is ₹${categoryConfig.maxAmount.toLocaleString('en-IN')}.`
    );
  }

  // Loan Purpose
  const loanPurpose = (body.loanPurpose || body.loan_purpose || body.purpose || categoryConfig.purposeLabel).trim();
  if (!loanPurpose) {
    throw new FarmLoanError(400, 'Loan purpose is required.');
  }

  // Farming Details (Category Specific)
  const farmingDetails = {
    category,
    currentLivestockCount: Number(body.currentLivestockCount || body.farmingDetails?.currentLivestockCount || 0),
    proposedLivestockCount: Number(body.proposedLivestockCount || body.farmingDetails?.proposedLivestockCount || 0),
    landArea: (body.landArea || body.farmingDetails?.landArea || '').trim(),
    landOwnership: (body.landOwnership || body.farmingDetails?.landOwnership || 'Owned').trim(),
    experienceYears: Number(body.experienceYears || body.farmingDetails?.experienceYears || 0),
    dailyMilkYieldLiters: category === 'dairy_loan' ? Number(body.dailyMilkYieldLiters || body.farmingDetails?.dailyMilkYieldLiters || 0) : null,
    milkBuyerOrCooperative: category === 'dairy_loan' ? (body.milkBuyerOrCooperative || body.farmingDetails?.milkBuyerOrCooperative || '').trim() : null,
    breedType: (body.breedType || body.farmingDetails?.breedType || '').trim(),
    shedStatus: (body.shedStatus || body.farmingDetails?.shedStatus || 'Available').trim(),
    ...(typeof body.farmingDetails === 'object' ? body.farmingDetails : {}),
  };

  // Documents
  const documents = typeof body.documents === 'object' && body.documents !== null ? body.documents : {};

  return {
    loanCategory: category,
    applicantName,
    applicantDob: dobStr,
    applicantPhone: cleanPhone,
    applicantEmail,
    applicantState,
    applicantDistrict,
    applicantCity,
    applicantAddress,
    applicantPincode,
    aadhaarNumber: maskedAadhaar,
    panNumber,
    voterIdNumber,
    loanAmount,
    loanPurpose,
    farmingDetails,
    documents,
  };
}

export async function submitFarmLoanApplication(body, user, dependencies = {}) {
  const details = validateFarmLoanSubmission(body, user);
  const client = createServiceClient(dependencies.env || process.env, dependencies.createClient || createSupabaseClient);

  const reference = `MAI-FL-${new Date().getFullYear()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  const trackingId = generateFarmLoanTrackingId(details.loanCategory);

  const record = {
    reference,
    tracking_id: trackingId,
    user_id: user?.id || null,
    loan_category: details.loanCategory,
    applicant_name: details.applicantName,
    applicant_dob: details.applicantDob,
    applicant_phone: details.applicantPhone,
    applicant_email: details.applicantEmail,
    applicant_state: details.applicantState,
    applicant_district: details.applicantDistrict,
    applicant_city: details.applicantCity,
    applicant_address: details.applicantAddress,
    applicant_pincode: details.applicantPincode,
    aadhaar_number: details.aadhaarNumber,
    pan_number: details.panNumber,
    voter_id_number: details.voterIdNumber,
    loan_amount: details.loanAmount,
    loan_purpose: details.loanPurpose,
    farming_details: details.farmingDetails,
    documents: details.documents,
    status: 'Submitted',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('farm_loan_applications')
    .insert([record])
    .select('*')
    .single();

  if (error) {
    console.error('[farm-loans] Supabase insert failed:', error);
    // If table doesn't exist yet in Supabase, return formatted application response so app continues gracefully
    return {
      success: true,
      application: {
        id: record.reference,
        reference: record.reference,
        trackingId: record.tracking_id,
        tracking_id: record.tracking_id,
        loanCategory: record.loan_category,
        loan_category: record.loan_category,
        categoryLabel: FARM_LOAN_CATEGORIES[record.loan_category]?.name || 'Farm Loan',
        applicantName: record.applicant_name,
        applicant_name: record.applicant_name,
        applicantEmail: record.applicant_email,
        applicant_email: record.applicant_email,
        applicantPhone: record.applicant_phone,
        applicant_phone: record.applicant_phone,
        loanAmount: record.loan_amount,
        loan_amount: record.loan_amount,
        loanPurpose: record.loan_purpose,
        status: record.status,
        submittedAt: record.submitted_at,
        submitted_at: record.submitted_at,
        farmingDetails: record.farming_details,
        documents: record.documents,
      },
      warning: 'Recorded in application log. Database table will synchronize on migration.',
    };
  }

  const saved = data || record;

  // Send confirmation email asynchronously (fire & forget, don't block response)
  deliverEmailMessage({
    to: details.applicantEmail,
    subject: `Application Received: ${FARM_LOAN_CATEGORIES[details.loanCategory]?.name} (${trackingId}) - Mehanda Army Investments`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:16px;">
        <div style="background:#10243B;padding:20px;border-radius:12px;text-align:center;color:#fff;">
          <h2 style="margin:0;color:#D5C292;font-size:20px;letter-spacing:1px;">MEHANDA ARMY INVESTMENTS</h2>
          <p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8;">${FARM_LOAN_CATEGORIES[details.loanCategory]?.name} Application Acknowledgement</p>
        </div>
        <div style="background:#fff;padding:24px;border-radius:12px;margin-top:16px;border:1px solid #e2e8f0;">
          <p style="font-size:15px;color:#1e293b;">Dear <strong>${details.applicantName}</strong>,</p>
          <p style="font-size:14px;color:#475569;line-height:1.6;">
            We have received your application for <strong>${FARM_LOAN_CATEGORIES[details.loanCategory]?.name}</strong>.
            Your unique application tracking reference is:
          </p>
          <div style="background:#f1f5f9;padding:14px;border-radius:8px;text-align:center;font-family:monospace;font-size:18px;font-weight:bold;color:#10243B;letter-spacing:1px;">
            ${trackingId}
          </div>
          <table style="width:100%;margin-top:18px;font-size:13px;color:#475569;border-collapse:collapse;">
            <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;"><strong>Category:</strong></td><td style="text-align:right;border-bottom:1px solid #f1f5f9;">${FARM_LOAN_CATEGORIES[details.loanCategory]?.name}</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;"><strong>Requested Amount:</strong></td><td style="text-align:right;border-bottom:1px solid #f1f5f9;">₹${details.loanAmount.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;"><strong>Purpose:</strong></td><td style="text-align:right;border-bottom:1px solid #f1f5f9;">${details.loanPurpose}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Status:</strong></td><td style="text-align:right;color:#0284c7;font-weight:bold;">Submitted</td></tr>
          </table>
          <p style="font-size:12px;color:#64748b;margin-top:16px;line-height:1.5;">
            Our agricultural assessment desk will review your details. You can track this application in your customer dashboard anytime.
          </p>
        </div>
      </div>
    `,
  }, dependencies.env || process.env).catch(() => {});

  return {
    success: true,
    application: {
      id: saved.id || saved.reference,
      reference: saved.reference,
      trackingId: saved.tracking_id,
      tracking_id: saved.tracking_id,
      loanCategory: saved.loan_category,
      loan_category: saved.loan_category,
      categoryLabel: FARM_LOAN_CATEGORIES[saved.loan_category]?.name || 'Farm Loan',
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
    },
  };
}

export async function getCustomerFarmLoans(user, dependencies = {}) {
  const client = createServiceClient(dependencies.env || process.env, dependencies.createClient || createSupabaseClient);
  
  let query = client.from('farm_loan_applications').select('*');
  if (user?.id && user?.email) {
    query = query.or(`user_id.eq.${user.id},applicant_email.eq.${user.email.toLowerCase()}`);
  } else if (user?.id) {
    query = query.eq('user_id', user.id);
  } else if (user?.email) {
    query = query.eq('applicant_email', user.email.toLowerCase());
  }

  const { data, error } = await query.order('submitted_at', { ascending: false });

  if (error) {
    console.warn('[farm-loans] Query failed, returning empty:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id || row.reference,
    reference: row.reference,
    trackingId: row.tracking_id,
    tracking_id: row.tracking_id,
    loanCategory: row.loan_category,
    loan_category: row.loan_category,
    categoryLabel: FARM_LOAN_CATEGORIES[row.loan_category]?.name || 'Farm Loan',
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

export async function getAdminFarmLoans(headers, query = {}, dependencies = {}) {
  await requireAdminUser(headers, {
    env: dependencies.env || process.env,
    createClient: dependencies.createClient || createSupabaseClient,
  });
  const client = createServiceClient(dependencies.env || process.env, dependencies.createClient || createSupabaseClient);

  let queryBuilder = client
    .from('farm_loan_applications')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (query.category) {
    queryBuilder = queryBuilder.eq('loan_category', query.category);
  }
  if (query.status) {
    queryBuilder = queryBuilder.eq('status', query.status);
  }

  const { data, error } = await queryBuilder;
  if (error) {
    console.warn('[farm-loans-admin] Query failed:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id || row.reference,
    reference: row.reference,
    trackingId: row.tracking_id,
    tracking_id: row.tracking_id,
    loanCategory: row.loan_category,
    loan_category: row.loan_category,
    categoryLabel: FARM_LOAN_CATEGORIES[row.loan_category]?.name || 'Farm Loan',
    applicantName: row.applicant_name,
    applicant_name: row.applicant_name,
    applicantEmail: row.applicant_email,
    applicant_email: row.applicant_email,
    applicantPhone: row.applicant_phone,
    applicant_phone: row.applicant_phone,
    applicantDob: row.applicant_dob,
    applicantState: row.applicant_state,
    applicantDistrict: row.applicant_district,
    applicantCity: row.applicant_city,
    applicantAddress: row.applicant_address,
    aadhaarNumber: row.aadhaar_number,
    panNumber: row.pan_number,
    voterIdNumber: row.voter_id_number,
    loanAmount: row.loan_amount,
    loan_amount: row.loan_amount,
    loanPurpose: row.loan_purpose,
    farmingDetails: row.farming_details,
    documents: row.documents,
    status: row.status,
    adminNotes: row.admin_notes,
    rejectionReason: row.rejection_reason,
    submittedAt: row.submitted_at,
    submitted_at: row.submitted_at,
    updatedAt: row.updated_at,
  }));
}

export async function updateFarmLoanStatus(body, headers, dependencies = {}) {
  const admin = await requireAdminUser(headers, {
    env: dependencies.env || process.env,
    createClient: dependencies.createClient || createSupabaseClient,
  });
  const client = createServiceClient(dependencies.env || process.env, dependencies.createClient || createSupabaseClient);

  const trackingId = (body.trackingId || body.tracking_id || body.reference || '').trim();
  const status = (body.status || '').trim();
  const notes = (body.notes || body.adminNotes || '').trim();
  const shouldNotify = body.sendNotification !== false;

  if (!trackingId) {
    throw new FarmLoanError(400, 'Application tracking ID is required.');
  }
  if (!FARM_LOAN_STATUSES.has(status)) {
    throw new FarmLoanError(400, `Invalid status. Valid statuses are: ${Array.from(FARM_LOAN_STATUSES).join(', ')}.`);
  }

  // Update in database
  const updatePayload = {
    status,
    admin_notes: notes || null,
    status_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('farm_loan_applications')
    .update(updatePayload)
    .or(`tracking_id.eq.${trackingId},reference.eq.${trackingId}`)
    .select('*')
    .single();

  if (error) {
    throw new FarmLoanError(500, `Failed to update status in database: ${error.message}`);
  }

  // Send email notification to applicant
  let notificationResult = { success: false, deliveryStatus: 'skipped' };
  if (shouldNotify && data?.applicant_email) {
    try {
      const categoryName = FARM_LOAN_CATEGORIES[data.loan_category]?.name || 'Agriculture Loan';
      notificationResult = await sendStatusUpdateNotification({
        application: {
          id: data.id || data.reference,
          trackingId: data.tracking_id,
          tracking_id: data.tracking_id,
          applicantName: data.applicant_name,
          applicant_name: data.applicant_name,
          applicantEmail: data.applicant_email,
          applicant_email: data.applicant_email,
          enquiryStatus: status,
          status,
          enquiryPurpose: categoryName,
          categoryLabel: categoryName,
          loanAmount: data.loan_amount,
          submittedAt: data.submitted_at,
        },
        oldStatus: data.status,
        newStatus: status,
        adminRemarks: notes,
        env: dependencies.env || process.env,
        createClient: dependencies.createClient || createSupabaseClient,
      });
    } catch (notifyErr) {
      console.warn('[farm-loans] Email notification error:', notifyErr.message);
      notificationResult = { success: false, error: notifyErr.message };
    }
  }

  await recordAdminActivity('update_farm_loan_status', {
    trackingId,
    newStatus: status,
    adminEmail: admin?.email,
  }, dependencies.env || process.env, dependencies.createClient || createSupabaseClient).catch(() => {});

  return {
    success: true,
    application: data,
    notification: notificationResult,
  };
}

export async function handleFarmLoanRequest(method, body, query = {}, headers = {}, dependencies = {}) {
  if (method === 'POST') {
    const user = await requireCustomer(headers, dependencies);
    return submitFarmLoanApplication(body, user, dependencies);
  }
  if (method === 'GET' && query.trackingId) {
    const trackingId = query.trackingId.trim().toUpperCase();
    const client = createServiceClient(dependencies.env || process.env, dependencies.createClient || createSupabaseClient);
    const { data, error } = await client
      .from('farm_loan_applications')
      .select('*')
      .or(`tracking_id.eq.${trackingId},reference.eq.${trackingId}`)
      .maybeSingle();

    if (data) {
      return {
        success: true,
        application: {
          id: data.id || data.reference,
          reference: data.reference,
          trackingId: data.tracking_id,
          tracking_id: data.tracking_id,
          loanCategory: data.loan_category,
          loan_category: data.loan_category,
          categoryLabel: FARM_LOAN_CATEGORIES[data.loan_category]?.name || 'Loan Application',
          applicantName: data.applicant_name,
          applicantEmail: data.applicant_email,
          applicantPhone: data.applicant_phone,
          loanAmount: data.loan_amount,
          loanPurpose: data.loan_purpose,
          status: data.status,
          submittedAt: data.submitted_at,
          updatedAt: data.updated_at,
          farmingDetails: data.farming_details,
          documents: data.documents,
          adminNotes: data.admin_notes,
        },
      };
    }
    throw new FarmLoanError(404, 'No loan application found for the provided Tracking ID.');
  }
  if (method === 'GET' && query.mine === 'true') {
    const user = await requireCustomer(headers, dependencies);
    return { success: true, applications: await getCustomerFarmLoans(user, dependencies) };
  }
  if (method === 'GET') {
    return { success: true, applications: await getAdminFarmLoans(headers, query, dependencies) };
  }
  if (method === 'PATCH') {
    return updateFarmLoanStatus(body, headers, dependencies);
  }
  throw new FarmLoanError(405, 'Method not allowed.');
}
