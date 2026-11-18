/**
 * Client-side Payment & Enquiry Service
 * Mehanda Army Investments - Secure Gateway Client
 * 
 * Complies with strict security guidelines:
 * - Never stores or touches UPI PINs, card numbers, CVVs, or net banking passwords.
 * - Relies on server-side order generation and cryptographic verification.
 * - Scopes payment history to customer identity.
 */

import { getApiUrl } from './apiConfig.js';

export const ADVISORY_SERVICES = [
  {
    id: 'srv_portfolio_review',
    name: 'Personal Portfolio Planning & Asset Allocation Review',
    amount: 1499,
    category: 'Advisory Consultation',
    turnaround: '1 - 2 Business Days',
    description: 'Detailed assessment of current asset allocation, correlation risk, and disciplined multi-asset rebalancing schedule.',
    features: [
      'Comprehensive risk capacity assessment',
      'Asset correlation & volatility stress-test',
      'Actionable written allocation blueprint'
    ]
  },
  {
    id: 'srv_retirement_blueprint',
    name: 'Retirement & Wealth Blueprint Advisory Consultation',
    amount: 2999,
    category: 'Wealth Architecture',
    turnaround: '2 - 3 Business Days',
    description: 'Structured compounding wealth blueprint engineered for long-term cash-flow needs, pension security, and inflation protection.',
    features: [
      'Long-term cash flow modeling',
      'Defense pension & sovereign asset structuring',
      'Emergency liquidity preservation protocol'
    ]
  },
  {
    id: 'srv_annual_audit',
    name: 'Annual Comprehensive Portfolio Health Audit & Risk Rebalance',
    amount: 4999,
    category: 'Institutional Advisory',
    turnaround: '3 - 5 Business Days',
    description: 'Full-year multi-asset audit, downside stress-testing, and personal 1-on-1 strategy session with senior relationship advisor.',
    features: [
      'Quarterly drawdown & rebalance roadmap',
      'Tax-efficiency advisory assessment',
      '1-on-1 Senior Advisor review session'
    ]
  },
  {
    id: 'srv_custom_consultation',
    name: 'Custom Advisory / Specialized Consultation',
    amount: 999,
    category: 'Direct Consultation',
    turnaround: '1 Business Day',
    description: 'Tailored consultation on specific capital preservation or defense veteran transition needs.',
    features: [
      'Flexible topic consultation',
      'Direct advisor tele-conference',
      'Custom follow-up summary memo'
    ]
  },
  {
    id: 'srv_student_loan_fee',
    name: 'Student Loan Platform Verification Fee',
    amount: 2,
    category: 'Application Verification',
    turnaround: 'Instant Verification',
    description: 'Mandatory applicant verification fee for student education loan enquiry.',
    features: [
      'Applicant identity verification',
      'Anti-bot validation safeguard',
      'Official enquiry registration receipt'
    ]
  }
];

/**
 * Dynamically loads official Razorpay Checkout SDK script
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function getPaymentAuthorizationHeader(accessToken) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('Sign in with a verified email address before making a payment.');
  }
  return `Bearer ${accessToken}`;
}

/**
 * 1. Request Server to Create an Order
 */
export async function createPaymentOrder({ serviceId, customAmount, customerName, customerEmail, customerPhone, accessToken }) {
  const authorization = getPaymentAuthorizationHeader(accessToken);
  const res = await fetch(getApiUrl('/api/create-order'), {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId,
      customAmount,
      customerName,
      customerEmail,
      customerPhone
    }),
    cache: 'no-store'
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'Unable to create server order.');
  }
  if (!data) {
    throw new Error('Payment service returned an unreadable order response.');
  }
  return data;
}

/**
 * 2. Request Server to Cryptographically Verify Payment Signature
 */
export async function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature, customer, service, accessToken }) {
  const authorization = getPaymentAuthorizationHeader(accessToken);
  const res = await fetch(getApiUrl('/api/verify-payment'), {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer,
      service
    }),
    cache: 'no-store'
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'Server signature verification failed.');
  }
  if (!data?.verified || !data.receipt) {
    throw new Error('The server did not verify this payment. No receipt was created.');
  }
  return data;
}

/**
 * 5. Submit Investment Enquiry
 */
export async function submitInvestmentEnquiry(enquiryData, accessToken = null) {
  const res = await fetch(getApiUrl('/api/investment-enquiry'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(enquiryData)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to submit enquiry.');
  }
  if (!data) {
    throw new Error('Enquiry service returned an unreadable response.');
  }
  return data;
}

async function adminRequest(path, options = {}) {
  const response = await fetch(getApiUrl(path), {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    const error = new Error(result?.error || 'Admin service request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function adminLogin({ username, password, skipEnrollmentCheck = false }) {
  let deviceToken = '';
  try {
    deviceToken = localStorage.getItem('mai_admin_device_token') || '';
  } catch (_) {}

  return adminRequest('/api/admin-auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'login', username, password, deviceToken, skipEnrollmentCheck }),
  });
}

export async function getAdminSession() {
  return adminRequest('/api/admin-auth');
}

export async function adminLogout() {
  return adminRequest('/api/admin-auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'logout' }),
  });
}

export async function updateAdminPassword({ newPassword }) {
  return adminRequest('/api/admin-auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'change_password', newPassword }),
  });
}

export async function updateAdminProfile({ name, avatarUrl }) {
  return adminRequest('/api/admin-auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'update_profile', name, avatarUrl }),
  });
}

export async function fetchAdminData() {
  return adminRequest('/api/admin');
}

// ==========================================
// ADMIN WEBAUTHN / PASSKEY SERVICES
// ==========================================

export function bufferFromBase64Url(base64url) {
  if (typeof base64url !== 'string') return new ArrayBuffer(0);
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function base64UrlFromBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function getPasskeyLoginOptions() {
  return adminRequest('/api/admin-passkey', {
    method: 'POST',
    body: JSON.stringify({ action: 'login-options' }),
  });
}

export async function verifyPasskeyLogin(webauthnResponse) {
  return adminRequest('/api/admin-passkey', {
    method: 'POST',
    body: JSON.stringify({ action: 'login-verify', response: webauthnResponse }),
  });
}

export async function authenticateWithPasskey() {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    throw new Error('Biometric authentication is not supported on this browser or device.');
  }

  const { options } = await getPasskeyLoginOptions();

  const publicKeyCredentialRequestOptions = {
    challenge: bufferFromBase64Url(options.challenge),
    rpId: options.rpId,
    timeout: options.timeout || 60000,
    userVerification: options.userVerification || 'required',
  };

  if (Array.isArray(options.allowCredentials) && options.allowCredentials.length > 0) {
    publicKeyCredentialRequestOptions.allowCredentials = options.allowCredentials.map((c) => ({
      id: bufferFromBase64Url(c.id),
      type: c.type || 'public-key',
      transports: c.transports,
    }));
  }

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });

  if (!assertion) {
    throw new Error('Biometric authentication was cancelled.');
  }

  const responsePayload = {
    id: assertion.id,
    rawId: base64UrlFromBuffer(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: base64UrlFromBuffer(assertion.response.clientDataJSON),
      authenticatorData: base64UrlFromBuffer(assertion.response.authenticatorData),
      signature: base64UrlFromBuffer(assertion.response.signature),
      userHandle: assertion.response.userHandle ? base64UrlFromBuffer(assertion.response.userHandle) : null,
    },
  };

  return verifyPasskeyLogin(responsePayload);
}

export async function getPasskeyRegisterOptions() {
  return adminRequest('/api/admin-passkey', {
    method: 'POST',
    body: JSON.stringify({ action: 'register-options' }),
  });
}

export async function verifyPasskeyRegister({ response, deviceName }) {
  return adminRequest('/api/admin-passkey', {
    method: 'POST',
    body: JSON.stringify({ action: 'register-verify', response, deviceName }),
  });
}

export async function registerPasskeyDevice(deviceName = 'Admin Device') {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    throw new Error('Biometric passkeys are not supported on this device.');
  }

  const { options } = await getPasskeyRegisterOptions();

  const publicKeyCredentialCreationOptions = {
    challenge: bufferFromBase64Url(options.challenge),
    rp: options.rp,
    user: {
      id: bufferFromBase64Url(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      residentKey: 'preferred',
      ...(options.authenticatorSelection || {}),
      userVerification: 'preferred',
    },
    timeout: options.timeout || 60000,
    attestation: options.attestation || 'none',
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  });

  if (!credential) {
    throw new Error('Device passkey registration was cancelled.');
  }

  const responsePayload = {
    id: credential.id,
    rawId: base64UrlFromBuffer(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: base64UrlFromBuffer(credential.response.clientDataJSON),
      attestationObject: base64UrlFromBuffer(credential.response.attestationObject),
      transports: typeof credential.response.getTransports === 'function'
        ? credential.response.getTransports()
        : ['internal'],
    },
  };

  return verifyPasskeyRegister({ response: responsePayload, deviceName });
}

export async function enrollFirstTimePasskey({ enrollmentToken, deviceToken, deviceName = 'Admin Biometric Device' }) {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    throw new Error('Biometric passkeys are not supported on this browser or device.');
  }

  const { options } = await adminRequest('/api/admin-passkey', {
    method: 'POST',
    body: JSON.stringify({ action: 'enroll-options', enrollmentToken }),
  });

  const publicKeyCredentialCreationOptions = {
    challenge: bufferFromBase64Url(options.challenge),
    rp: options.rp,
    user: {
      id: bufferFromBase64Url(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      residentKey: 'preferred',
      ...(options.authenticatorSelection || {}),
      userVerification: 'preferred',
    },
    timeout: options.timeout || 60000,
    attestation: options.attestation || 'none',
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  });

  if (!credential) {
    throw new Error('Biometric registration was cancelled.');
  }

  const responsePayload = {
    id: credential.id,
    rawId: base64UrlFromBuffer(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: base64UrlFromBuffer(credential.response.clientDataJSON),
      attestationObject: base64UrlFromBuffer(credential.response.attestationObject),
      transports: typeof credential.response.getTransports === 'function'
        ? credential.response.getTransports()
        : ['internal'],
    },
  };

  const verifyResult = await adminRequest('/api/admin-passkey', {
    method: 'POST',
    body: JSON.stringify({
      action: 'enroll-verify',
      enrollmentToken,
      deviceToken,
      deviceName,
      response: responsePayload,
    }),
  });

  if (verifyResult?.deviceToken) {
    try {
      localStorage.setItem('mai_admin_device_token', verifyResult.deviceToken);
    } catch (_) {}
  }

  return verifyResult;
}

export async function emergencyRecoveryEnrollment({ enrollmentToken, recoveryCode, masterPin }) {
  return adminRequest('/api/admin-passkey', {
    method: 'POST',
    body: JSON.stringify({
      action: 'enroll-emergency-recovery',
      enrollmentToken,
      recoveryCode,
      masterPin,
    }),
  });
}

export async function listPasskeyDevices() {
  return adminRequest('/api/admin-passkey');
}

export async function deletePasskeyDevice(credentialId) {
  return adminRequest('/api/admin-passkey', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete-device', credentialId }),
  });
}

// ==========================================
// OWNER SECURITY MANAGEMENT & LOCKOUT SERVICES
// ==========================================

export async function fetchAdminSecurityData() {
  return adminRequest('/api/admin-security');
}

export async function fetchAdminFailedLogins() {
  return adminRequest('/api/admin-security?action=failed-logins');
}

export async function fetchAdminSecurityLocks() {
  return adminRequest('/api/admin-security?action=locks');
}

export async function fetchAdminSecurityAlerts() {
  return adminRequest('/api/admin-security?action=alerts');
}

export async function fetchAdminSecurityAuditLogs() {
  return adminRequest('/api/admin-security?action=audit-logs');
}

export async function fetchAdminRecoveryCodes() {
  return adminRequest('/api/admin-security?action=recovery-codes');
}

export async function unlockSecurityTarget({ targetIdentifier, lockType = 'account' }) {
  return adminRequest('/api/admin-security', {
    method: 'POST',
    body: JSON.stringify({ action: 'unlock-target', targetIdentifier, lockType }),
  });
}

export async function submitEmergencyRecoveryUnlock({ recoveryCode }) {
  return adminRequest('/api/admin-security', {
    method: 'POST',
    body: JSON.stringify({ action: 'emergency-unlock', recoveryCode }),
  });
}

export async function verifyMasterPin({ pin, attemptNumber = 1 }) {
  return adminRequest('/api/admin-security', {
    method: 'POST',
    body: JSON.stringify({ action: 'verify-pin', pin, attemptNumber }),
  });
}
