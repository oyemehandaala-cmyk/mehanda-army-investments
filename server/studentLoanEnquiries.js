import crypto from 'node:crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerKey } from './supabaseServerKey.js';
import { validateEmailVerificationToken, sendSubmissionConfirmationEmail, deliverEmailMessage } from './emailOtpService.js';
import { sendStatusUpdateNotification } from './statusNotificationService.js';
import {
  recordAdminActivity,
  requireAdminUser,
} from './adminAuth.js';
import { readFileSync } from 'node:fs';

const INDIA_LOCATION_DATA = JSON.parse(
  readFileSync(new URL('../src/data/indiaLocations.json', import.meta.url), 'utf8')
);

const APPLICATION_STATUSES = new Set([
  'Submitted',
  'Under Review',
  'Additional Information Required',
  'Verification Pending',
  'On Hold',
  'Completed',
  'Enquiry Completed',
  'Closed',
  'Rejected',
]);
const TRACKING_ID_PATTERN = /^MAI-\d{4}-\d{6,}$/;
const REFERENCE_PATTERN = /^MAI-SL-\d{4}-[A-F0-9]{32}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOCUMENT_BUCKET_ID_PROOFS = 'student-loan-id-proofs';
const DOCUMENT_BUCKET_TEST_FILES = 'student-loan-test-files';
const TEST_DOCUMENT_BUCKET = DOCUMENT_BUCKET_TEST_FILES;
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
const MAX_TEST_DOCUMENT_SIZE = MAX_DOCUMENT_SIZE;
const ALLOWED_DOCUMENT_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
  ['text/plain', 'txt'],
  ['application/json', 'json'],
]);
const TEST_DOCUMENT_TYPES = ALLOWED_DOCUMENT_TYPES;

function isValidLocation(state, district) {
  const selectedState = INDIA_LOCATION_DATA.states.find((item) => item.name === state);
  return Boolean(selectedState && selectedState.districts.includes(district));
}

class StudentLoanError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getDatabaseConfig(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const key = getSupabaseServerKey(env);
  if (!url.startsWith('https://') || !key) {
    throw new StudentLoanError(503, 'Student loan test enquiries are temporarily unavailable.');
  }
  return { url: url.replace(/\/+$/, ''), key };
}

function createServiceClient(env, createClient) {
  const { url, key } = getDatabaseConfig(env);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function getBearerToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match) {
    throw new StudentLoanError(401, 'Sign in to access your student loan test enquiries.');
  }
  return match[1];
}

async function requireCustomer(headers, { env, createClient }) {
  const token = getBearerToken(headers);
  let response;
  try {
    const client = createServiceClient(env, createClient);
    response = await client.auth.getUser(token);
  } catch (error) {
    console.error('[student-loan] customer authentication unavailable', {
      code: error?.code || 'unknown',
    });
    throw new StudentLoanError(503, 'Customer authentication is temporarily unavailable.');
  }

  const user = response.data?.user;
  if (response.error || !user) {
    throw new StudentLoanError(401, 'Your session is invalid or expired. Please sign in again.');
  }
  if (!user.email || !user.email_confirmed_at) {
    throw new StudentLoanError(403, 'Verify your registered email before submitting or tracking an enquiry.');
  }
  return user;
}

async function requestDatabase(path, { env, fetchImpl }, options = {}) {
  const { url, key } = getDatabaseConfig(env);
  let response;
  try {
    response = await fetchImpl(`${url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[student-loan] database request failed', {
      code: error?.code || 'network_error',
    });
    throw new StudentLoanError(503, 'Student loan test storage is temporarily unavailable.');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const databaseCode = typeof errorBody?.code === 'string' ? errorBody.code : null;
    console.error('[student-loan] database request rejected', {
      status: response.status,
      code: databaseCode || 'unknown',
    });
    if ([
      'PGRST202',
      'PGRST204',
      'PGRST205',
      '42P01',
      '42703',
      '42883',
    ].includes(databaseCode)) {
      console.error('[student-loan] database schema not ready — run supabase_student_loan_complete_setup.sql in Supabase SQL Editor', { code: databaseCode });
      throw new StudentLoanError(
        503,
        'The student loan enquiry service is temporarily unavailable. Please try again in a few minutes or contact support.'
      );
    }
    throw new StudentLoanError(
      response.status >= 500 ? 503 : 400,
      'The student loan enquiry service could not process your request. Please try again shortly.'
    );
  }
  if (response.status === 204) return null;
  const text = await response.text().catch(() => '');
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new StudentLoanError(503, 'Student loan test storage returned an unreadable response.');
  }
}

function validateText(value, label, { min = 1, max = 120 } = {}) {
  if (typeof value !== 'string') {
    throw new StudentLoanError(400, `${label} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new StudentLoanError(400, `${label} must be between ${min} and ${max} characters.`);
  }
  return normalized;
}

function applicationRecord(record) {
  return {
    refNumber: record.reference,
    userId: record.user_id || null,
    applicantUserId: record.user_id || null,
    trackingId: record.tracking_id,
    loanAmount: record.loan_amount,
    studentStatus: record.student_status,
    repaymentDate: record.repayment_date,
    status: record.enquiry_status || record.status,
    submittedAt: record.submitted_at,
    updatedAt: record.status_updated_at || record.updated_at,
    enquiryPurpose: record.enquiry_purpose,
    latestCustomerRemark: record.latest_customer_remark || null,
    remarks: record.latest_customer_remark || null,
    isTest: record.is_test,
    applicantName: record.applicant_name,
    applicantEmail: record.applicant_email,
    verifiedEmail: record.verified_email || (() => {
      if (typeof record.enquiry_purpose === 'string' && record.enquiry_purpose.startsWith('{')) {
        try { return JSON.parse(record.enquiry_purpose).verifiedEmail || null; } catch { return null; }
      }
      return null;
    })(),
    emailVerifiedAt: record.email_verified_at || (() => {
      if (typeof record.enquiry_purpose === 'string' && record.enquiry_purpose.startsWith('{')) {
        try { return JSON.parse(record.enquiry_purpose).emailVerifiedAt || null; } catch { return null; }
      }
      return null;
    })(),
    upiUtr: (() => {
      if (typeof record.enquiry_purpose === 'string' && record.enquiry_purpose.startsWith('{')) {
        try { return JSON.parse(record.enquiry_purpose).upiUtr || null; } catch { return null; }
      }
      return null;
    })(),
    platformFee: (() => {
      if (typeof record.enquiry_purpose === 'string' && record.enquiry_purpose.startsWith('{')) {
        try { return JSON.parse(record.enquiry_purpose).platformFee || null; } catch { return null; }
      }
      return null;
    })(),
    paymentMethod: (() => {
      if (typeof record.enquiry_purpose === 'string' && record.enquiry_purpose.startsWith('{')) {
        try { return JSON.parse(record.enquiry_purpose).paymentMethod || null; } catch { return null; }
      }
      return null;
    })(),
    isEmailVerified: Boolean(
      record.email_verified_at ||
      record.verified_email ||
      (typeof record.enquiry_purpose === 'string' && record.enquiry_purpose.includes('"verifiedEmail"'))
    ),
    applicantPhone: record.applicant_phone,
    applicantAge: record.applicant_age,
    applicantDob: record.applicant_dob,
    applicantState: record.applicant_state,
    applicantDistrict: record.applicant_district,
    applicantCity: record.applicant_city,
    applicantAddress: record.applicant_address,
    verificationName: record.verification_name || null,
    courseName: record.course_name,
    institutionName: record.school_name || record.institution_name || null,
    guardianName: record.guardian_name || null,
    guardianPhone: record.guardian_phone || null,
    guardianRelationship: record.guardian_relationship || null,
    guardianConsent: record.guardian_consent === true,
    isMinor: record.is_minor === true,
    documentMetadata: record.test_document_path ? {
      path: record.test_document_path,
      fileName: record.test_document_name,
      contentType: record.test_document_type,
      size: record.test_document_size,
    } : null,
    documents: record.documents && typeof record.documents === 'object'
      ? record.documents
      : (() => {
        if (typeof record.enquiry_purpose === 'string' && record.enquiry_purpose.startsWith('{')) {
          try {
            const parsed = JSON.parse(record.enquiry_purpose);
            return parsed.documents || null;
          } catch {
            return null;
          }
        }
        return null;
      })(),
    institutionState: record.institution_state,
    institutionDistrict: record.institution_district,
    institutionCity: record.institution_city,
    institutionPinCode: record.institution_pin_code,
    institutionType: record.institution_type,
    institutionCategory: record.institution_category,
    institution: {
      id: record.institution_id,
      name: record.institution_name,
      state: record.institution_state,
      district: record.institution_district,
      city: record.institution_city,
      pinCode: record.institution_pin_code,
      type: record.institution_type,
      category: record.institution_category,
      source: record.institution_source,
    },
  };
}

async function validateInstitution(body, dependencies) {
  if (body.institutionId) {
    const id = validateText(body.institutionId, 'Institution ID', { max: 160 });
    const rows = await requestDatabase(
      `student_loan_institutions?select=institution_id,official_name,state,district,city,pin_code,institution_type,management,source&institution_id=eq.${encodeURIComponent(id)}&limit=1`,
      dependencies
    );
    const institution = rows[0];
    if (!institution) {
      throw new StudentLoanError(400, 'The selected institution is no longer available. Search again or enter it manually.');
    }
    return {
      institutionId: institution.institution_id,
      institutionName: institution.official_name,
      institutionState: institution.state,
      institutionDistrict: institution.district,
      institutionCity: institution.city,
      institutionPinCode: institution.pin_code,
      institutionType: institution.institution_type,
      institutionCategory: institution.management,
      institutionSource: institution.source,
    };
  }

  const institutionName = validateText(body.institutionName, 'Institution name', { min: 3, max: 200 });
  const institutionState = validateText(body.institutionState, 'State', { max: 100 });
  const institutionDistrict = validateText(body.institutionDistrict, 'District', { max: 100 });
  const institutionCity = body.institutionCity
    ? validateText(body.institutionCity, 'City', { max: 100 })
    : null;
  const institutionPinCode = body.institutionPinCode
    ? validateText(body.institutionPinCode, 'PIN code', { max: 6 })
    : null;
  if (institutionPinCode && !/^\d{6}$/.test(institutionPinCode)) {
    throw new StudentLoanError(400, 'Enter a valid 6-digit PIN code.');
  }
  if (!INSTITUTION_TYPES.has(body.institutionType)) {
    throw new StudentLoanError(400, 'Select a valid institution type.');
  }
  if (!INSTITUTION_CATEGORIES.has(body.institutionCategory)) {
    throw new StudentLoanError(400, 'Select Government or Private for the institution category.');
  }
  return {
    institutionId: null,
    institutionName,
    institutionState,
    institutionDistrict,
    institutionCity,
    institutionPinCode,
    institutionType: body.institutionType,
    institutionCategory: body.institutionCategory,
    institutionSource: 'manual',
  };
}

function validateSubmission(body, user, dependencies = {}) {
  const allowedFields = new Set([
    'fullName', 'verificationName', 'email', 'mobileNumber', 'dateOfBirth',
    'applicantState', 'applicantDistrict', 'applicantCity', 'applicantAddress',
    'institutionName', 'courseName', 'privacyConsent', 'idempotencyKey',
    'guardianName', 'guardianPhone', 'guardianRelationship', 'guardianConsent',
    'document',
    'qualification', 'passingYear', 'pinCode', 'educationNotes', 'documents', 'photoUrl', 'photoFileName',
    'loanAmount', 'requestedAmount', 'customAmount', 'isCustomAmount',
    'accuracyConsent', 'enquiryAcknowledgement',
    'verifiedEmail', 'emailVerifiedAt', 'emailVerificationToken',
    'platformFee', 'platformFeePaid', 'upiUtr', 'paymentMethod', 'paymentStatus',
    'razorpayPaymentId', 'razorpayOrderId', 'razorpaySignature',
  ]);
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
    Object.keys(body).some((field) => !allowedFields.has(field))) {
    throw new StudentLoanError(400, 'The test enquiry contains unsupported information.');
  }

  const applicantName = validateText(body.fullName, 'Applicant name', { min: 3, max: 150 });
  const verificationName = body.verificationName
    ? validateText(body.verificationName, 'Supporting-document name', { min: 2, max: 150 })
    : null;
  const normalizeName = (value) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-IN');
  if (verificationName && normalizeName(applicantName) !== normalizeName(verificationName)) {
    throw new StudentLoanError(
      400,
      'Applicant and supporting-document names must match after spacing and case normalization. For spelling variations, request a manual review before submitting.'
    );
  }
  const applicantEmail = validateText(body.email, 'Registered email', { max: 254 }).toLowerCase();
  if (applicantEmail !== user.email.toLowerCase()) {
    throw new StudentLoanError(403, 'Use the email address registered to your signed-in account.');
  }
  let verifiedEmail = null;
  let emailVerifiedAt = null;
  if (body.emailVerificationToken) {
    const tokenCheck = validateEmailVerificationToken({
      email: applicantEmail,
      token: body.emailVerificationToken,
      userId: user.id,
      env: dependencies?.env,
    });
    if (!tokenCheck.valid) {
      throw new StudentLoanError(400, tokenCheck.error || 'Please verify your Gmail / email address with OTP before submitting.');
    }
    verifiedEmail = tokenCheck.email;
    emailVerifiedAt = tokenCheck.verifiedAt;
  }
  const applicantPhone = validateText(body.mobileNumber, 'Contact number', { max: 16 });
  if (!/^(?:\+91[- ]?)?[6-9]\d{9}$/.test(applicantPhone)) {
    throw new StudentLoanError(400, 'Enter a valid Indian contact number.');
  }
  const applicantDob = validateText(body.dateOfBirth, 'Date of birth', { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(applicantDob)) {
    throw new StudentLoanError(400, 'Enter a valid date of birth.');
  }
  const birthDate = new Date(`${applicantDob}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== applicantDob) {
    throw new StudentLoanError(400, 'Enter a valid date of birth.');
  }
  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  if (
    now.getUTCMonth() < birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  if (age < 1 || age > 120 || birthDate > new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ))) {
    throw new StudentLoanError(400, 'Enter a valid date of birth.');
  }
  const applicantState = validateText(body.applicantState, 'State', { max: 100 });
  const applicantDistrict = validateText(body.applicantDistrict, 'District', { max: 100 });
  const applicantCity = validateText(body.applicantCity, 'City', { max: 120 });
  const applicantAddress = validateText(body.applicantAddress, 'Full address', { min: 5, max: 500 });
  if (!isValidLocation(applicantState, applicantDistrict)) {
    throw new StudentLoanError(400, 'Select a district belonging to the selected State or Union Territory.');
  }
  const schoolName = validateText(body.institutionName, 'School, college, or institution name', { min: 2, max: 200 });
  const courseName = validateText(body.courseName, 'Course name', { min: 2, max: 160 });
  const idempotencyKey = validateText(body.idempotencyKey, 'Submission token', { max: 36 });
  if (!UUID_PATTERN.test(idempotencyKey)) {
    throw new StudentLoanError(400, 'The enquiry could not be submitted. Refresh the form and try again.');
  }
  let document = null;
  if (body.document != null) {
    if (!body.document || typeof body.document !== 'object' || Array.isArray(body.document)) {
      throw new StudentLoanError(400, 'The sample-file metadata is invalid.');
    }
    const documentPath = validateText(body.document.path, 'Sample-file path', { max: 120 });
    const fileName = validateText(body.document.fileName, 'Sample-file name', { max: 120 });
    const contentType = body.document.contentType;
    const size = Number(body.document.size);
    if (
      !documentPath.startsWith(`${user.id}/`) ||
      ![...ALLOWED_DOCUMENT_TYPES.keys()].includes(contentType) ||
      !Number.isInteger(size) ||
      size < 1 ||
      size > MAX_DOCUMENT_SIZE
    ) {
      throw new StudentLoanError(400, 'Only supported document formats up to 5 MB are accepted.');
    }
    document = { path: documentPath, fileName, contentType, size };
  }

  let validatedDocuments = null;
  if (body.documents != null) {
    if (typeof body.documents !== 'object' || Array.isArray(body.documents)) {
      throw new StudentLoanError(400, 'The documents metadata is invalid.');
    }
    validatedDocuments = {};
    for (const [key, doc] of Object.entries(body.documents)) {
      if (!doc) continue;
      if (typeof doc !== 'object' || Array.isArray(doc)) {
        throw new StudentLoanError(400, `The ${key} document details are invalid.`);
      }
      const docPath = validateText(doc.path, 'Document path', { max: 150 });
      const docFileName = validateText(doc.fileName || doc.name, 'Document file name', { max: 150 });
      const docContentType = doc.contentType;
      const docSize = Number(doc.size);
      if (
        !docPath.startsWith(`${user.id}/`) ||
        ![...ALLOWED_DOCUMENT_TYPES.keys()].includes(docContentType) ||
        !Number.isInteger(docSize) ||
        docSize < 1 ||
        docSize > MAX_DOCUMENT_SIZE
      ) {
        throw new StudentLoanError(400, `The ${docFileName} document format or size is invalid.`);
      }
      validatedDocuments[key] = {
        path: docPath,
        fileName: docFileName,
        contentType: docContentType,
        size: docSize,
        confirmed: true,
      };
      if (!document) {
        document = validatedDocuments[key];
      }
    }
  }

  const isMinor = age < 18;
  const guardianName = isMinor
    ? validateText(body.guardianName, 'Parent or legal guardian name', { min: 2, max: 150 })
    : null;
  const guardianPhone = isMinor
    ? validateText(body.guardianPhone, 'Parent or legal guardian contact number', { max: 16 })
    : null;
  if (guardianPhone && !/^(?:\+91[- ]?)?[6-9]\d{9}$/.test(guardianPhone)) {
    throw new StudentLoanError(400, 'Enter a valid Indian parent or legal guardian contact number.');
  }
  const guardianRelationship = isMinor
    ? validateText(body.guardianRelationship, 'Relationship to the student', { min: 2, max: 80 })
    : null;
  if (isMinor && body.guardianConsent !== true) {
    throw new StudentLoanError(400, 'A parent or legal guardian must consent to assist with this enquiry.');
  }
  if (body.privacyConsent !== true) {
    throw new StudentLoanError(400, 'Consent is required before submitting this test enquiry.');
  }

  let loanAmount = null;
  if (body.loanAmount != null && body.loanAmount !== '') {
    const parsedAmount = Number(body.loanAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 100 || parsedAmount > 1000) {
      throw new StudentLoanError(400, 'Loan enquiry amount must be between ₹100 and ₹1,000.');
    }
    loanAmount = Math.round(parsedAmount);
  }

  return {
    applicantName,
    applicantEmail,
    applicantPhone,
    applicantAge: age,
    applicantDob,
    verificationName,
    applicantState,
    applicantDistrict,
    applicantCity,
    applicantAddress,
    schoolName,
    courseName,
    idempotencyKey,
    document,
    documents: validatedDocuments,
    guardianName,
    guardianPhone,
    guardianRelationship,
    guardianConsent: isMinor && body.guardianConsent === true,
    loanAmount,
    verifiedEmail,
    emailVerifiedAt,
    upiUtr: body.upiUtr ? String(body.upiUtr).trim() : (body.razorpayPaymentId ? String(body.razorpayPaymentId).trim() : null),
    platformFee: body.platformFee != null ? Number(body.platformFee) : (body.upiUtr || body.razorpayPaymentId ? 2 : null),
    paymentMethod: body.paymentMethod || (body.razorpayPaymentId ? 'Razorpay Gateway' : (body.upiUtr ? 'PhonePe UPI QR' : null)),
    razorpayPaymentId: body.razorpayPaymentId ? String(body.razorpayPaymentId).trim() : null,
    razorpayOrderId: body.razorpayOrderId ? String(body.razorpayOrderId).trim() : null,
    razorpaySignature: body.razorpaySignature ? String(body.razorpaySignature).trim() : null,
  };
}

async function sendAdminStudentLoanPaymentAlert({
  applicantName,
  applicantEmail,
  applicantPhone,
  loanAmount,
  schoolName,
  courseName,
  trackingId,
  reference,
  upiUtr,
  paymentMethod,
  env = process.env,
  sendEmailFn = null,
}) {
  const isRazorpay = String(paymentMethod || '').toLowerCase().includes('razorpay') || String(upiUtr || '').startsWith('pay_');
  const adminEmail = (env.ADMIN_LOGIN_EMAIL || 'info@mehandaarmy.net').trim().toLowerCase();
  const subject = `🔔 [${isRazorpay ? 'Verified Payment' : 'Action Required'}] ₹2 Platform Fee Paid - Student Loan: ${applicantName} (${isRazorpay ? 'Razorpay' : 'UTR'}: ${upiUtr})`;
  const siteUrl = 'https://mehandaarmy.net';
  const gatewayLabel = isRazorpay ? 'Razorpay Official Checkout (Instant Verified)' : 'PhonePe UPI QR';
  const beneficiaryLabel = isRazorpay ? 'Mehanda Army Investments (Razorpay)' : 'DEEPAK DEEPAK (PhonePe QR)';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 15px rgba(0,0,0,0.06);">
    <tr>
      <td style="background-color:#0B1A2C;padding:26px 20px;text-align:center;border-bottom:2px solid #DFB24E;">
        <div style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;">
          MEHANDA ARMY INVESTMENTS
        </div>
        <div style="color:#DFB24E;font-size:11px;font-weight:700;margin-top:4px;letter-spacing:0.15em;">
          STUDENT LOAN • ₹2 PLATFORM FEE RECEIVED
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 24px;">
        <p style="margin:0 0 16px 0;font-size:15px;color:#334155;line-height:1.6;">
          Hello Admin,<br/>
          A student has just submitted a loan enquiry and transferred the <strong>₹2.00 Platform Verification Fee</strong> via <strong>${gatewayLabel}</strong>.
        </p>

        <!-- UTR / Payment ID Highlight Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ECFDF5;border:1px solid #10B981;border-radius:10px;margin:18px 0;padding:16px;">
          <tr>
            <td align="center">
              <div style="font-size:12px;font-weight:bold;color:#047857;text-transform:uppercase;letter-spacing:0.05em;">
                ${isRazorpay ? 'Verified Razorpay Payment ID' : 'Student Submitted UPI Transaction ID / UTR'}
              </div>
              <div style="font-size:24px;font-weight:800;color:#065F46;letter-spacing:2px;font-family:monospace;margin:8px 0;">
                ${upiUtr}
              </div>
              <div style="font-size:12px;color:#047857;">
                Gateway: <strong>${gatewayLabel}</strong> · Beneficiary: <strong>${beneficiaryLabel}</strong> · Amount: <strong>₹2.00</strong>
              </div>
            </td>
          </tr>
        </table>

        <!-- Application Summary -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:22px;font-size:13px;color:#475569;line-height:1.7;">
          <tr><td><strong>Tracking ID:</strong></td><td style="font-family:monospace;font-weight:bold;color:#7C3AED;">${trackingId}</td></tr>
          <tr><td><strong>Applicant Name:</strong></td><td><strong>${applicantName}</strong></td></tr>
          <tr><td><strong>Mobile Number:</strong></td><td><a href="tel:${applicantPhone}" style="color:#0F172A;text-decoration:none;">${applicantPhone}</a></td></tr>
          <tr><td><strong>Email:</strong></td><td>${applicantEmail}</td></tr>
          <tr><td><strong>Requested Loan:</strong></td><td>₹${Number(loanAmount || 1000).toLocaleString('en-IN')}</td></tr>
          <tr><td><strong>Institution:</strong></td><td>${schoolName || 'N/A'}</td></tr>
          <tr><td><strong>Course / Stream:</strong></td><td>${courseName || 'N/A'}</td></tr>
        </table>

        <p style="font-size:12px;color:#64748B;line-height:1.5;margin-bottom:24px;">
          <strong>Status:</strong> ${isRazorpay ? 'Payment cryptographically verified through Razorpay Gateway.' : 'Please verify ₹2 credit via phone SMS.'}
        </p>

        <!-- Direct Action Button -->
        <div style="text-align:center;margin:24px 0 10px 0;">
          <a href="${siteUrl}/admin/dashboard" target="_blank" style="display:inline-block;background-color:#7C3AED;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;box-shadow:0 4px 14px rgba(124,58,237,0.35);">
            ✓ Open Admin Portal &amp; Verify Loan Application &rarr;
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#0F172A;padding:18px 20px;text-align:center;color:#94A3B8;font-size:11px;">
        Mehanda Army Investments · Automated Admin Notification
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `MEHANDA ARMY INVESTMENTS - ₹2 PLATFORM FEE RECEIVED
--------------------------------------------------------
Student: ${applicantName}
Payment ID / Ref: ${upiUtr}
Gateway: ${gatewayLabel}
Beneficiary: ${beneficiaryLabel}
Amount: ₹2.00
Tracking ID: ${trackingId}
Phone: ${applicantPhone}
Email: ${applicantEmail}
Requested Loan: ₹${loanAmount || 1000}
Institution: ${schoolName}

Review in admin portal:
${siteUrl}/admin/dashboard
`;

  try {
    await deliverEmailMessage({
      to: adminEmail,
      subject,
      html,
      text,
      env,
      sendEmailFn,
    });
  } catch (err) {
    console.warn('[student-loan] admin payment alert failed:', err.message);
  }
}

async function submitEnquiry(body, user, dependencies) {
  const details = validateSubmission(body, user, dependencies);
  const reference = `MAI-SL-${new Date().getFullYear()}-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
  const result = await requestDatabase(
    'rpc/create_student_loan_enquiry_test_v2',
    dependencies,
    {
      method: 'POST',
      body: JSON.stringify({
        p_reference: reference,
        p_user_id: user.id,
        p_applicant_name: details.applicantName,
        p_applicant_email: details.applicantEmail,
        p_applicant_phone: details.applicantPhone,
        p_applicant_age: details.applicantAge,
        p_applicant_dob: details.applicantDob,
        p_verification_name: details.verificationName,
        p_applicant_state: details.applicantState,
        p_applicant_district: details.applicantDistrict,
        p_applicant_city: details.applicantCity,
        p_applicant_address: details.applicantAddress,
        p_school_name: details.schoolName,
        p_course_name: details.courseName,
        p_idempotency_key: details.idempotencyKey,
        p_document_path: details.document?.path || null,
        p_document_name: details.document?.fileName || null,
        p_document_type: details.document?.contentType || null,
        p_document_size: details.document?.size || null,
        p_privacy_consent: body.privacyConsent,
        p_demo_consent: body.privacyConsent,
        p_guardian_name: details.guardianName,
        p_guardian_phone: details.guardianPhone,
        p_guardian_relationship: details.guardianRelationship,
        p_guardian_consent: details.guardianConsent,
      }),
    }
  );
  if (!result?.tracking_id || !TRACKING_ID_PATTERN.test(result.tracking_id)) {
    throw new StudentLoanError(503, 'The test enquiry was not assigned a valid tracking ID.');
  }
  const needsPatch = Boolean(
    details.loanAmount ||
    details.upiUtr ||
    (details.documents && Object.keys(details.documents).length > 0) ||
    body.qualification ||
    body.pinCode ||
    details.verifiedEmail
  );
  if (needsPatch) {
    const patchBody = {};
    if (details.loanAmount) patchBody.loan_amount = details.loanAmount;
    if (details.documents) patchBody.documents = details.documents;
    if (details.verifiedEmail) patchBody.verified_email = details.verifiedEmail;
    if (details.emailVerifiedAt) patchBody.email_verified_at = details.emailVerifiedAt;
    const enquiryPurpose = {
      purpose: 'Student Education Loan Enquiry',
      loanAmount: details.loanAmount || null,
      qualification: body.qualification || null,
      passingYear: body.passingYear || null,
      pinCode: body.pinCode || null,
      documents: details.documents || null,
      verifiedEmail: details.verifiedEmail || null,
      emailVerifiedAt: details.emailVerifiedAt || null,
      platformFee: details.platformFee || 2,
      platformFeePaid: Boolean(details.upiUtr || details.razorpayPaymentId),
      upiUtr: details.upiUtr || details.razorpayPaymentId || null,
      paymentMethod: details.paymentMethod || (details.razorpayPaymentId ? 'Razorpay Gateway' : 'PhonePe UPI QR'),
      razorpayPaymentId: details.razorpayPaymentId || null,
      razorpayOrderId: details.razorpayOrderId || null,
      payerName: details.applicantName || 'Student Applicant',
    };
    patchBody.enquiry_purpose = JSON.stringify(enquiryPurpose);

    try {
      await requestDatabase(
        `student_loan_demo_applications?reference=eq.${encodeURIComponent(reference)}`,
        dependencies,
        {
          method: 'PATCH',
          body: JSON.stringify(patchBody),
        }
      );
      if (details.loanAmount) result.loan_amount = details.loanAmount;
      if (details.documents) result.documents = details.documents;
      result.enquiry_purpose = patchBody.enquiry_purpose;
    } catch (err) {
      console.warn('Could not update metadata on student_loan_demo_applications with full patch:', err?.message || err);
      // Fallback retry with guaranteed core columns (enquiry_purpose and loan_amount)
      try {
        await requestDatabase(
          `student_loan_demo_applications?reference=eq.${encodeURIComponent(reference)}`,
          dependencies,
          {
            method: 'PATCH',
            body: JSON.stringify({
              loan_amount: details.loanAmount || undefined,
              enquiry_purpose: patchBody.enquiry_purpose,
            }),
          }
        );
        if (details.loanAmount) result.loan_amount = details.loanAmount;
        if (details.documents) result.documents = details.documents;
        result.enquiry_purpose = patchBody.enquiry_purpose;
      } catch (retryErr) {
        console.warn('Fallback metadata patch also failed:', retryErr?.message || retryErr);
      }
    }
  }

  // If student provided ₹2 UPI payment UTR or Razorpay Payment ID, send notification to Admin
  if (details.upiUtr || details.razorpayPaymentId) {
    sendAdminStudentLoanPaymentAlert({
      applicantName: details.applicantName,
      applicantEmail: details.applicantEmail,
      applicantPhone: details.applicantPhone,
      loanAmount: details.loanAmount,
      schoolName: details.schoolName,
      courseName: details.courseName,
      trackingId: result.tracking_id,
      reference,
      upiUtr: details.upiUtr || details.razorpayPaymentId,
      paymentMethod: details.paymentMethod,
      env: dependencies?.env || process.env,
      sendEmailFn: dependencies?.sendEmailFn,
    }).catch((err) => console.warn('[student-loan] admin payment alert error:', err.message));
  }

  const applicantEmail = details.verifiedEmail || body.email || user.email;
  if (applicantEmail) {
    sendSubmissionConfirmationEmail({
      to: applicantEmail,
      fullName: body.fullName || user.fullName || 'Student Applicant',
      formType: 'Student Loan Enquiry Application',
      trackingId: result.tracking_id,
      submittedAt: result.created_at || new Date().toISOString(),
      details: {
        'Requested Amount': details.loanAmount ? `₹${Number(details.loanAmount).toLocaleString('en-IN')}` : undefined,
        'Institution': body.schoolName,
        'Course / Stream': body.courseName,
      },
      env: dependencies?.env || process.env,
      sendEmailFn: dependencies?.sendEmailFn,
    }).catch((err) => console.warn('[student-loan] confirmation email error:', err.message));
  }

  return { success: true, application: applicationRecord(result) };
}

async function getHistory(reference, dependencies) {
  const rows = await requestDatabase(
    `student_loan_status_history?select=previous_status,new_status,customer_remark,created_at&reference=eq.${encodeURIComponent(reference)}&order=created_at.asc`,
    dependencies
  );
  return rows.map((row) => ({
    previousStatus: row.previous_status,
    status: row.new_status,
    customerRemark: row.customer_remark,
    createdAt: row.created_at,
  }));
}

async function getLocationCities(query, dependencies) {
  const state = validateText(query.state, 'State', { max: 100 });
  const district = validateText(query.district, 'District', { max: 100 });
  if (!isValidLocation(state, district)) {
    throw new StudentLoanError(400, 'Select a district belonging to the selected State or Union Territory.');
  }
  const rows = await requestDatabase(
    `student_loan_institutions?select=city&state=eq.${encodeURIComponent(state)}&district=eq.${encodeURIComponent(district)}&city=not.is.null&order=city.asc&limit=1000`,
    dependencies
  );
  const cities = [...new Set(rows.map((row) => row.city?.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  return { success: true, cities };
}

async function getAdminHistory(reference, dependencies) {
  const rows = await requestDatabase(
    `student_loan_status_history?select=previous_status,new_status,customer_remark,internal_note,created_at&reference=eq.${encodeURIComponent(reference)}&order=created_at.asc`,
    dependencies
  );
  return rows.map((row) => ({
    previousStatus: row.previous_status,
    status: row.new_status,
    customerRemark: row.customer_remark,
    internalNote: row.internal_note,
    createdAt: row.created_at,
  }));
}

async function getCustomerEnquiry(query, user, dependencies) {
  const trackingId = typeof query?.trackingId === 'string' ? query.trackingId.trim().toUpperCase() : '';
  if (!TRACKING_ID_PATTERN.test(trackingId)) {
    throw new StudentLoanError(400, 'Enter a valid application tracking ID.');
  }
  const rows = await requestDatabase(
    `student_loan_demo_applications?select=*&tracking_id=eq.${encodeURIComponent(trackingId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    dependencies
  );
  if (!rows[0]) {
    throw new StudentLoanError(404, 'No test enquiry was found for this tracking ID.');
  }
  const application = applicationRecord(rows[0]);
  application.statusHistory = await getHistory(rows[0].reference, dependencies);
  return { success: true, application };
}

async function getCustomerEnquiries(user, dependencies) {
  const rows = await requestDatabase(
    `student_loan_demo_applications?select=*&user_id=eq.${encodeURIComponent(user.id)}&order=submitted_at.desc&limit=500`,
    dependencies,
    {
      headers: { Prefer: 'count=none' },
    }
  );
  const history = rows.length
    ? await requestDatabase(
      `student_loan_status_history?select=reference,previous_status,new_status,customer_remark,created_at&reference=in.(${rows.map((row) => row.reference).join(',')})&order=created_at.asc`,
      dependencies
    )
    : [];
  const historyByReference = new Map();
  for (const entry of history) {
    const entries = historyByReference.get(entry.reference) || [];
    entries.push({
      previousStatus: entry.previous_status,
      status: entry.new_status,
      customerRemark: entry.customer_remark,
      createdAt: entry.created_at,
    });
    historyByReference.set(entry.reference, entries);
  }
  return {
    success: true,
    applications: rows.map((row) => ({
      ...applicationRecord(row),
      statusHistory: historyByReference.get(row.reference) || [],
    })),
  };
}

async function getAdminEnquiries(requestHeaders, query, dependencies) {
  await requireAdminUser(requestHeaders);
  const filters = [];
  if (query?.status) {
    if (!APPLICATION_STATUSES.has(query.status)) {
      throw new StudentLoanError(400, 'Select a valid enquiry status.');
    }
    filters.push(`enquiry_status=eq.${encodeURIComponent(query.status)}`);
  }
  if (query?.from && /^\d{4}-\d{2}-\d{2}$/.test(query.from)) {
    filters.push(`submitted_at=gte.${encodeURIComponent(`${query.from}T00:00:00.000Z`)}`);
  }
  if (query?.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
    const end = new Date(`${query.to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    filters.push(`submitted_at=lt.${encodeURIComponent(end.toISOString())}`);
  }
  if (query?.trackingId) {
    const trackingId = validateText(query.trackingId, 'Tracking ID', { max: 32 }).toUpperCase();
    if (!TRACKING_ID_PATTERN.test(trackingId)) {
      throw new StudentLoanError(400, 'Enter a valid Tracking ID.');
    }
    filters.push(`tracking_id=eq.${encodeURIComponent(trackingId)}`);
  }
  const queryString = filters.length ? `&${filters.join('&')}` : '';
  const rows = await requestDatabase(
    `student_loan_demo_applications?select=*&order=submitted_at.desc&limit=500${queryString}`,
    dependencies
  );
  const history = rows.length
    ? await requestDatabase(
      `student_loan_status_history?select=reference,previous_status,new_status,customer_remark,internal_note,created_at&reference=in.(${rows.map((row) => row.reference).join(',')})&order=created_at.asc`,
      dependencies
    )
    : [];
  const historyByReference = new Map();
  for (const entry of history) {
    const entries = historyByReference.get(entry.reference) || [];
    entries.push({
      previousStatus: entry.previous_status,
      status: entry.new_status,
      customerRemark: entry.customer_remark,
      internalNote: entry.internal_note,
      createdAt: entry.created_at,
    });
    historyByReference.set(entry.reference, entries);
  }
  return {
    success: true,
    applications: rows.map((row) => ({
      ...applicationRecord(row),
      statusHistory: historyByReference.get(row.reference) || [],
    })),
  };
}

async function updateEnquiry(body, requestHeaders, dependencies) {
  const requireAdmin = dependencies?.requireAdmin || requireAdminUser;
  const admin = await requireAdmin(requestHeaders, { env: dependencies?.env });
  const allowedFields = new Set(['reference', 'status', 'customerRemark', 'internalNote']);
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
    Object.keys(body).some((field) => !allowedFields.has(field)) ||
    typeof body.reference !== 'string' || !REFERENCE_PATTERN.test(body.reference) ||
    !APPLICATION_STATUSES.has(body.status)) {
    throw new StudentLoanError(400, 'A valid application reference and status are required.');
  }
  const customerRemark = body.customerRemark == null || body.customerRemark === ''
    ? null
    : validateText(body.customerRemark, 'Customer-facing remark', { max: 1000 });
  const internalNote = body.internalNote == null || body.internalNote === ''
    ? null
    : validateText(body.internalNote, 'Internal note', { max: 2000 });

  await recordAdminActivity(admin.id, 'student_loan_demo_status_change_requested', {
    reference: body.reference,
    status: body.status,
  });

  // Query prior status before applying changes
  let priorStatus = 'Submitted';
  try {
    const priorRows = await requestDatabase(
      `student_loan_demo_applications?select=enquiry_status,status&reference=eq.${encodeURIComponent(body.reference)}&limit=1`,
      dependencies
    );
    if (priorRows?.[0]) {
      priorStatus = priorRows[0].enquiry_status || priorRows[0].status || 'Submitted';
    }
  } catch (_) {}

  let updatedRecord;
  try {
    updatedRecord = await requestDatabase(
      'rpc/update_student_loan_enquiry_status',
      dependencies,
      {
        method: 'POST',
        body: JSON.stringify({
          p_reference: body.reference,
          p_admin_user_id: admin.id,
          p_status: body.status,
          p_customer_remark: customerRemark,
          p_internal_note: internalNote,
        }),
      }
    );
  } catch (rpcError) {
    console.warn('[student-loan] RPC update_student_loan_enquiry_status error, falling back to direct database table update:', rpcError.message);

    // 1. Fetch previous record
    const existingRows = await requestDatabase(
      `student_loan_demo_applications?select=*&reference=eq.${encodeURIComponent(body.reference)}&limit=1`,
      dependencies
    );
    const existing = existingRows?.[0];
    if (!existing) {
      throw new StudentLoanError(404, 'Student enquiry not found.');
    }

    const previousStatus = existing.enquiry_status || existing.status || 'Submitted';

    // 2. Direct table update
    const updateResult = await requestDatabase(
      `student_loan_demo_applications?reference=eq.${encodeURIComponent(body.reference)}`,
      dependencies,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          enquiry_status: body.status,
          status: body.status,
          latest_customer_remark: customerRemark,
          status_updated_at: new Date().toISOString(),
        }),
      }
    );

    updatedRecord = Array.isArray(updateResult) && updateResult.length > 0
      ? updateResult[0]
      : {
        ...existing,
        status: body.status,
        enquiry_status: body.status,
        latest_customer_remark: customerRemark,
        status_updated_at: new Date().toISOString(),
      };

    // 3. Record status history in student_loan_status_history
    try {
      await requestDatabase(
        'student_loan_status_history',
        dependencies,
        {
          method: 'POST',
          body: JSON.stringify({
            reference: body.reference,
            previous_status: previousStatus,
            new_status: body.status,
            changed_by_admin_id: admin.id,
            customer_remark: customerRemark,
            internal_note: internalNote,
          }),
        }
      );
    } catch (histErr) {
      console.warn('[student-loan] Could not write to student_loan_status_history:', histErr.message);
    }

    // 4. Record customer notification without requiring metadata column
    if (existing.user_id) {
      try {
        await requestDatabase(
          'customer_notifications',
          dependencies,
          {
            method: 'POST',
            body: JSON.stringify({
              user_id: existing.user_id,
              title: `Application Status: ${body.status}`,
              message: customerRemark || `Your student loan application is now marked as ${body.status}.`,
              notification_type: 'loan_status_update',
              action_url: `/dashboard?trackingId=${encodeURIComponent(existing.tracking_id || body.reference)}`,
            }),
          }
        );
      } catch (_) {}
    }
  }
  const application = applicationRecord(updatedRecord);
  application.statusHistory = await getAdminHistory(updatedRecord.reference, dependencies);

  // Trigger automatic status update email notification
  const recipientEmail = application.verifiedEmail || application.applicantEmail;
  const customerName = application.applicantName || 'Student Loan Applicant';
  const trackingId = application.trackingId || application.refNumber;
  let emailNotification = null;
  if (recipientEmail) {
    try {
      emailNotification = await sendStatusUpdateNotification({
        applicationId: trackingId,
        customerEmail: recipientEmail,
        customerName,
        formType: 'student_loan',
        formTypeLabel: 'Student Loan Application',
        previousStatus: priorStatus,
        newStatus: body.status,
        adminRemark: customerRemark,
        env: dependencies.env || process.env,
        createClient: dependencies.createClient,
        fetchImpl: dependencies.fetchImpl,
        forceResend: true,
      });
    } catch (emailErr) {
      console.warn('[student-loan-status] Failed to send status notification email:', emailErr.message);
      emailNotification = { success: false, deliveryStatus: 'failed', error: emailErr.message };
    }
  }

  return { success: true, application, emailNotification };
}

export async function handleStudentLoanEnquiryRequest(
  method,
  body,
  query,
  requestHeaders = {},
  dependencies = {}
) {
  const resolvedDependencies = {
    env: dependencies.env || process.env,
    createClient: dependencies.createClient || createSupabaseClient,
    fetchImpl: dependencies.fetchImpl || fetch,
    ...dependencies,
  };

  if (method === 'POST') {
    const user = await requireCustomer(requestHeaders, resolvedDependencies);
    return submitEnquiry(body, user, resolvedDependencies);
  }
  if (method === 'GET' && query?.cities === 'true') {
    return getLocationCities(query, resolvedDependencies);
  }
  if (method === 'GET' && query?.trackingId) {
    const user = await requireCustomer(requestHeaders, resolvedDependencies);
    return getCustomerEnquiry(query, user, resolvedDependencies);
  }
  if (method === 'GET' && query?.mine === 'true') {
    const user = await requireCustomer(requestHeaders, resolvedDependencies);
    return getCustomerEnquiries(user, resolvedDependencies);
  }
  if (method === 'GET') return getAdminEnquiries(requestHeaders, query, resolvedDependencies);
  if (method === 'PATCH') return updateEnquiry(body, requestHeaders, resolvedDependencies);
  throw new StudentLoanError(405, 'Method not allowed.');
}

function decodeDocument(body) {
  const fileName = validateText(body?.fileName, 'Document name', { max: 120 });
  const contentType = body?.contentType;
  const extension = ALLOWED_DOCUMENT_TYPES.get(contentType);
  const contentBase64 = body?.contentBase64;
  if (
    !extension ||
    /[\\/]/.test(fileName) ||
    (!fileName.toLowerCase().endsWith(`.${extension}`) &&
      !(extension === 'jpg' && fileName.toLowerCase().endsWith('.jpeg'))) ||
    typeof contentBase64 !== 'string' ||
    contentBase64.length > Math.ceil(MAX_DOCUMENT_SIZE / 3) * 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)
  ) {
    throw new StudentLoanError(400, 'Supported document formats are JPG, JPEG, PNG, and PDF (up to 5 MB per file).');
  }
  const bytes = Buffer.from(contentBase64, 'base64');
  if (
    bytes.length < 1 ||
    bytes.length > MAX_DOCUMENT_SIZE ||
    Number(body.size) !== bytes.length ||
    bytes.toString('base64') !== contentBase64
  ) {
    throw new StudentLoanError(400, 'The document file must be no larger than 5 MB.');
  }

  // If text or json, require sample marker and check for identity numbers
  if (contentType === 'text/plain' || contentType === 'application/json') {
    if (!/\b(sample|test)\b/i.test(fileName)) {
      throw new StudentLoanError(400, 'Text and JSON files must be non-sensitive sample files containing "sample" or "test" in the filename.');
    }
    let contents;
    try {
      contents = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new StudentLoanError(400, 'Sample files must contain valid UTF-8 text.');
    }
    if (
      contents.includes('\u0000') ||
      /\b(?:aadhaar|aadhar|pan\s*card|voter\s*id)\b/i.test(contents) ||
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(contents) ||
      /\b[A-Z]{5}\d{4}[A-Z]\b/i.test(contents) ||
      /\b[A-Z]{3}\d{7}\b/i.test(contents)
    ) {
      throw new StudentLoanError(400, 'Do not upload real identity numbers or identity-document information.');
    }
    if (contentType === 'application/json') {
      try {
        JSON.parse(contents);
      } catch {
        throw new StudentLoanError(400, 'The selected JSON sample is not valid JSON.');
      }
    }
  } else {
    // Binary header check for JPG, PNG, WebP, PDF
    if (contentType === 'image/jpeg') {
      if (bytes.length < 3 || bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) {
        throw new StudentLoanError(400, 'The uploaded file is not a valid JPEG image.');
      }
    } else if (contentType === 'image/png') {
      if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
        throw new StudentLoanError(400, 'The uploaded file is not a valid PNG image.');
      }
    } else if (contentType === 'application/pdf') {
      if (bytes.length < 4 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
        throw new StudentLoanError(400, 'The uploaded file is not a valid PDF document.');
      }
    }
  }
  return { fileName, contentType, extension, bytes };
}

export async function handleStudentLoanDocumentRequest(
  method,
  bodyOrQuery,
  requestHeaders = {},
  dependencies = {}
) {
  if (!['POST', 'GET', 'DELETE'].includes(method)) {
    throw new StudentLoanError(405, 'Method not allowed.');
  }
  const resolvedDependencies = {
    env: dependencies.env || process.env,
    createClient: dependencies.createClient || createSupabaseClient,
  };
  const client = createServiceClient(resolvedDependencies.env, resolvedDependencies.createClient);

  if (method === 'GET') {
    if (bodyOrQuery?.userId) {
      await requireAdminUser(requestHeaders);
      const targetUserId = String(bodyOrQuery.userId).trim();
      if (!UUID_PATTERN.test(targetUserId)) {
        throw new StudentLoanError(400, 'Invalid User ID.');
      }
      const files = [];
      if (client.storage?.from) {
        try {
          const { data: primaryFiles } = await client.storage.from(DOCUMENT_BUCKET_ID_PROOFS).list(targetUserId);
          if (Array.isArray(primaryFiles)) {
            for (const f of primaryFiles) {
              if (f.name && !f.name.startsWith('.')) {
                files.push({
                  path: `${targetUserId}/${f.name}`,
                  name: f.name,
                  fileName: f.name,
                  size: f.metadata?.size || 0,
                  contentType: f.metadata?.mimetype || 'image/jpeg',
                });
              }
            }
          }
        } catch (_) {}
      }
      return { success: true, files };
    }

    const path = typeof bodyOrQuery?.path === 'string' ? bodyOrQuery.path.trim() : '';
    if (!path) {
      throw new StudentLoanError(400, 'Document path is required.');
    }
    let authorized = false;
    try {
      await requireAdminUser(requestHeaders);
      authorized = true;
    } catch {
      try {
        const user = await requireCustomer(requestHeaders, resolvedDependencies);
        if (path.startsWith(`${user.id}/`)) {
          authorized = true;
        }
      } catch { }
    }
    if (!authorized) {
      throw new StudentLoanError(403, 'You are not authorized to view this document.');
    }

    let signed = null;
    if (client.storage?.from) {
      try {
        const primary = await client.storage.from(DOCUMENT_BUCKET_ID_PROOFS).createSignedUrl(path, 3600);
        if (primary && !primary.error && primary.data?.signedUrl) {
          signed = primary;
        }
      } catch { }
      if (!signed) {
        try {
          const secondary = await client.storage.from(DOCUMENT_BUCKET_TEST_FILES).createSignedUrl(path, 3600);
          if (secondary && !secondary.error && secondary.data?.signedUrl) {
            signed = secondary;
          }
        } catch { }
      }
    }
    if (!signed?.data?.signedUrl) {
      throw new StudentLoanError(404, 'Document preview is currently unavailable or the document does not exist.');
    }
    return { success: true, signedUrl: signed.data.signedUrl };
  }

  const user = await requireCustomer(requestHeaders, resolvedDependencies);

  if (method === 'POST') {
    const { fileName, contentType, extension, bytes } = decodeDocument(bodyOrQuery);
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const isImageOrPdf = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(contentType);
    const primaryBucket = isImageOrPdf ? DOCUMENT_BUCKET_ID_PROOFS : DOCUMENT_BUCKET_TEST_FILES;

    let uploadRes = await client.storage
      .from(primaryBucket)
      .upload(path, bytes, {
        contentType,
        upsert: false,
      });

    if (uploadRes?.error && primaryBucket === DOCUMENT_BUCKET_ID_PROOFS) {
      uploadRes = await client.storage
        .from(DOCUMENT_BUCKET_TEST_FILES)
        .upload(path, bytes, {
          contentType,
          upsert: false,
        });
    }

    if (uploadRes?.error) {
      console.error('[student-loan] private document upload failed', { code: uploadRes.error.code || 'unknown' });
      throw new StudentLoanError(503, 'The private document upload could not be completed.');
    }
    return {
      success: true,
      document: {
        path: uploadRes.data?.path || path,
        fileName,
        contentType,
        size: bytes.length,
      },
    };
  }

  // DELETE
  const path = validateText(bodyOrQuery?.path, 'Document path', { max: 150 });
  if (!path.startsWith(`${user.id}/`)) {
    throw new StudentLoanError(403, 'The document does not belong to this signed-in account.');
  }
  let err1 = null;
  let err2 = null;
  try {
    const res = await client.storage.from(DOCUMENT_BUCKET_ID_PROOFS).remove([path]);
    err1 = res.error;
  } catch (e) { err1 = e; }
  try {
    const res = await client.storage.from(DOCUMENT_BUCKET_TEST_FILES).remove([path]);
    err2 = res.error;
  } catch (e) { err2 = e; }

  if (err1 && err2) {
    console.error('[student-loan] private document removal failed', { code: err2?.code || 'unknown' });
    throw new StudentLoanError(503, 'The private document could not be removed.');
  }
  return { success: true, document: { path } };
}
