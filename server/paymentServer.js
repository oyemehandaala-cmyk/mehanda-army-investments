import crypto from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerKey } from './supabaseServerKey.js';
import { validateEmailVerificationToken, sendSubmissionConfirmationEmail } from './emailOtpService.js';
import { sendStatusUpdateNotification } from './statusNotificationService.js';
import {
  createAdminServiceClient,
  recordAdminActivity,
  requireAdminUser,
} from './adminAuth.js';
import { getAdminDashboardData } from './adminDashboard.js';
import { handleStudentLoanEnquiryRequest } from './studentLoanEnquiries.js';

/**
 * Server-Side Payment & Enquiry Controller
 * Handles:
 * - Server-side order creation (Razorpay / Test mode)
 * - HMAC-SHA256 server signature verification
 * - Razorpay webhook signature verification
 * - Secure enquiry handling
 * - Role-protected admin transaction & enquiry retrieval
 * 
 * NOTE: Secret keys are strictly server-side and never exposed to the frontend client.
 */

// Available Advisory Services
export const ADVISORY_SERVICES = {
  'srv_portfolio_review': {
    id: 'srv_portfolio_review',
    name: 'Personal Portfolio Planning & Asset Allocation Review',
    amount: 1499,
    description: 'Detailed assessment of current asset allocation, correlation risk, and custom rebalancing plan.',
    turnaround: '1 - 2 Business Days'
  },
  'srv_retirement_blueprint': {
    id: 'srv_retirement_blueprint',
    name: 'Retirement & Wealth Blueprint Advisory Consultation',
    amount: 2999,
    description: 'Structured long-term financial modeling, pension security structuring, and inflation-hedged wealth design.',
    turnaround: '2 - 3 Business Days'
  },
  'srv_annual_audit': {
    id: 'srv_annual_audit',
    name: 'Annual Comprehensive Portfolio Health Audit & Risk Rebalance',
    amount: 4999,
    description: 'Full-year multi-asset audit, downside stress-testing, and personal 1-on-1 strategy session.',
    turnaround: '3 - 5 Business Days'
  },
  'srv_custom_consultation': {
    id: 'srv_custom_consultation',
    name: 'Custom Advisory / Specialized Consultation',
    amount: 999,
    description: 'Tailored consultation on specific capital preservation or defense veteran transition needs.',
    turnaround: '1 Business Day'
  },
  'srv_student_loan_fee': {
    id: 'srv_student_loan_fee',
    name: 'Student Loan Platform Verification Fee',
    amount: 2,
    description: 'Mandatory applicant verification fee for student education loan enquiry.',
    turnaround: 'Instant Verification'
  }
};

/**
 * Helper to get environment variables safely
 */
function getEnvConfig(source = process.env) {
  const rawKeyId = source.RAZORPAY_KEY_ID || '';
  const keyId = rawKeyId.split('#')[0].trim();
  const rawKeySecret = source.RAZORPAY_KEY_SECRET || '';
  const keySecret = rawKeySecret.split('#')[0].trim();
  const webhookSecret = (source.RAZORPAY_WEBHOOK_SECRET || '').split('#')[0].trim();

  let requestedMode = (source.PAYMENT_GATEWAY_MODE || '').split('#')[0].trim().toLowerCase();
  if (!requestedMode) {
    requestedMode = keyId.startsWith('rzp_live_') ? 'live' : 'test';
  } else if (requestedMode === 'live' && keyId.startsWith('rzp_test_')) {
    // Gracefully align mode to test key when test credentials are provided
    requestedMode = 'test';
  } else if (requestedMode === 'test' && keyId.startsWith('rzp_live_')) {
    // Gracefully align mode to live key when live credentials are provided
    requestedMode = 'live';
  }

  if (!['live', 'test'].includes(requestedMode)) {
    const error = new Error('PAYMENT_GATEWAY_MODE must be set to either "test" or "live".');
    error.status = 503;
    throw error;
  }
  const isLive = requestedMode === 'live';

  // SMS alert config (owner's private mobile — never exposed to frontend)
  const ownerPhone = source.OWNER_ALERT_PHONE || '';
  const smsApiKey = source.SMS_API_KEY || '';
  const smsSenderId = source.SMS_SENDER_ID || 'MEHANDA';

  return {
    isLive,
    mode: isLive ? 'live' : 'test',
    keyId,
    keySecret,
    webhookSecret,
    ownerPhone,
    smsApiKey,
    smsSenderId
  };
}

function getConfiguredGateway(env) {
  const expectedPrefix = env.isLive ? 'rzp_live_' : 'rzp_test_';
  if (!env.keyId.startsWith(expectedPrefix) || !env.keySecret) {
    const error = new Error(
      'Payments are unavailable until valid Razorpay credentials are configured on the server.'
    );
    error.status = 503;
    throw error;
  }
  return env;
}

export function getServerSupabaseClient(env = process.env, createClient = createSupabaseClient) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const key = getSupabaseServerKey(env);
  if (!url.startsWith('https://') || !key) {
    const error = new Error('The secure database service is not configured on the server.');
    error.status = 503;
    throw error;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

function getCustomerPaymentClient(env = process.env, createClient = createSupabaseClient) {
  try {
    return getServerSupabaseClient(env, createClient);
  } catch (error) {
    if (error.status === 503) {
      error.message = 'Customer payments are unavailable until server-side Supabase credentials are configured.';
    }
    throw error;
  }
}

async function getVerifiedPaymentIdentity(
  requestHeaders = {},
  env = process.env,
  createClient = createSupabaseClient
) {
  const authorization = requestHeaders.authorization || requestHeaders.Authorization || '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match) {
    const error = new Error('Sign in with a verified email address before making a payment.');
    error.status = 401;
    throw error;
  }
  let client;
  let data;
  let error;
  try {
    client = getCustomerPaymentClient(env, createClient);
    ({ data, error } = await client.auth.getUser(match[1]));
  } catch (authError) {
    console.error('[payments] customer session validation failed', {
      code: authError?.code || 'unknown'
    });
    const unavailableError = new Error('Customer payment authentication is temporarily unavailable.');
    unavailableError.status = 503;
    throw unavailableError;
  }
  const user = data?.user;
  if (error || !user) {
    const authError = new Error('Your session is invalid or expired. Please sign in again.');
    authError.status = 401;
    throw authError;
  }
  if (!user.email || !user.email_confirmed_at) {
    const verificationError = new Error('Verify your email address before making a payment.');
    verificationError.status = 403;
    throw verificationError;
  }
  return { client, user };
}

async function razorpayRequest(path, env, options = {}) {
  let response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.keyId}:${env.keySecret}`).toString('base64')}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      },
      cache: 'no-store'
    });
  } catch (networkError) {
    console.error('[payments] Razorpay API request failed', {
      code: networkError?.code || 'network_error'
    });
    const error = new Error('The payment gateway is temporarily unavailable.');
    error.status = 502;
    throw error;
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      result?.error?.description || 'The payment gateway could not complete the request.'
    );
    error.status = response.status >= 500 ? 502 : 400;
    throw error;
  }
  if (!result || typeof result !== 'object') {
    const error = new Error('The payment gateway returned an unreadable response.');
    error.status = 502;
    throw error;
  }
  return result;
}

/**
 * 1. Create Server-Side Order
 */
export async function handleCreateOrder(
  reqBody,
  requestHeaders = {},
  { env = process.env, createClient = createSupabaseClient } = {}
) {
  const { serviceId, customAmount, customerName, customerEmail, customerPhone } = reqBody;

  if (
    typeof customerName !== 'string' || !customerName.trim() || customerName.trim().length > 120 ||
    typeof customerEmail !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) ||
    typeof customerPhone !== 'string' || !customerPhone.trim() || customerPhone.trim().length > 32
  ) {
    throw new Error('Valid customer name, email, and phone number are required.');
  }

  const service = ADVISORY_SERVICES[serviceId];
  if (!service) throw new Error('Choose a valid advisory service.');
  const finalAmount = service.id === 'srv_custom_consultation'
    ? Number(customAmount)
    : service.amount;
  if (service.id === 'srv_custom_consultation' && (!Number.isFinite(finalAmount) || finalAmount < 500)) {
    throw new Error('The custom consultation amount must be at least ₹500.');
  }
  if (!Number.isFinite(finalAmount) || finalAmount < 1) {
    throw new Error('Payment amount must be at least ₹1.');
  }
  const amountInPaise = Math.round(finalAmount * 100);
  if (!Number.isSafeInteger(amountInPaise)) {
    throw new Error('The custom consultation amount is outside the supported payment range.');
  }
  const chargeAmount = amountInPaise / 100;

  const { user } = await getVerifiedPaymentIdentity(requestHeaders, env, createClient);
  const gateway = getConfiguredGateway(getEnvConfig(env));
  const orderData = await razorpayRequest('/orders', gateway, {
    method: 'POST',
    body: JSON.stringify({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `mai_${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}`,
      notes: {
        serviceId: service.id,
        serviceName: service.name,
        amount: String(chargeAmount),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim(),
        userId: user.id
      }
    })
  });

  if (
    typeof orderData.id !== 'string' ||
    orderData.amount !== amountInPaise ||
    orderData.currency !== 'INR'
  ) {
    const error = new Error('The payment gateway returned an invalid order.');
    error.status = 502;
    throw error;
  }

  return {
    success: true,
    orderId: orderData.id,
    amount: chargeAmount,
    amountInPaise,
    currency: 'INR',
    serviceName: service.name,
    serviceId: service.id,
    keyId: gateway.keyId,
    mode: gateway.mode
  };
}

/**
 * 2. Verify Payment Signature (Server-Side ONLY)
 * Never marks payment verified without cryptographic signature check.
 */
export async function handleVerifyPayment(
  reqBody,
  requestHeaders = {},
  {
    env = process.env,
    createClient = createSupabaseClient,
    verifiedUser = null,
    verifiedClient = null,
  } = {}
) {
  const {
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature, 
    customer,
    service
  } = reqBody;

  if (
    typeof razorpay_order_id !== 'string' || !/^order_[A-Za-z0-9]+$/.test(razorpay_order_id) ||
    typeof razorpay_payment_id !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(razorpay_payment_id) ||
    typeof razorpay_signature !== 'string' || !/^[0-9a-f]{64}$/i.test(razorpay_signature)
  ) {
    throw new Error('Incomplete payment response received. Order ID, Payment ID, and Signature are mandatory.');
  }

  const { client: supabaseClient, user } = verifiedUser && verifiedClient
    ? { client: verifiedClient, user: verifiedUser }
    : await getVerifiedPaymentIdentity(requestHeaders, env, createClient);
  const gateway = getConfiguredGateway(getEnvConfig(env));
  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', gateway.keySecret)
    .update(payload)
    .digest();
  const providedSignature = Buffer.from(razorpay_signature, 'hex');
  if (
    expectedSignature.length !== providedSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, providedSignature)
  ) {
    throw new Error('Payment signature verification failed. The transaction payload could not be cryptographically authenticated.');
  }

  const [order, payment] = await Promise.all([
    razorpayRequest(`/orders/${encodeURIComponent(razorpay_order_id)}`, gateway),
    razorpayRequest(`/payments/${encodeURIComponent(razorpay_payment_id)}`, gateway)
  ]);
  if (
    order.id !== razorpay_order_id ||
    order.status !== 'paid' ||
    order.amount !== payment.amount ||
    order.currency !== 'INR' ||
    payment.id !== razorpay_payment_id ||
    payment.order_id !== razorpay_order_id ||
    payment.status !== 'captured' ||
    payment.captured !== true ||
    payment.currency !== 'INR'
  ) {
    throw new Error('The payment gateway has not confirmed a captured payment for this order.');
  }
  const orderNotes = order.notes || {};
  const orderService = ADVISORY_SERVICES[orderNotes.serviceId];
  const orderAmount = Number(orderNotes.amount);
  if (
    !orderService ||
    orderNotes.serviceName !== orderService.name ||
    !Number.isFinite(orderAmount) ||
    Math.round(orderAmount * 100) !== order.amount ||
    (orderService.id !== 'srv_custom_consultation' && orderAmount !== orderService.amount) ||
    !orderNotes.customerName ||
    !orderNotes.customerEmail ||
    !orderNotes.customerPhone ||
    orderNotes.userId !== user.id ||
    orderNotes.customerEmail.toLowerCase() !== user.email.toLowerCase()
  ) {
    throw new Error('The payment order details could not be validated.');
  }

  const receiptNumber = `MAI-REC-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const verifiedRecord = {
    receiptNumber,
    orderId: order.id,
    paymentId: payment.id,
    signature: razorpay_signature,
    amount: payment.amount / 100,
    currency: 'INR',
    serviceId: orderService.id,
    serviceName: orderService.name,
    customerName: orderNotes.customerName,
    customerEmail: orderNotes.customerEmail,
    customerPhone: orderNotes.customerPhone,
    paymentMethod: payment.method || customer?.paymentMethod || 'Gateway',
    status: 'verified',
    verifiedAt: payment.created_at
      ? new Date(payment.created_at * 1000).toISOString()
      : new Date().toISOString(),
    isLive: gateway.mode === 'live'
  };

  let wasAlreadySaved = false;
  let { data: savedRecord, error: saveError } = await supabaseClient
    .from('service_payments')
    .insert({
      user_id: user.id,
      receipt_number: verifiedRecord.receiptNumber,
      order_id: verifiedRecord.orderId,
      payment_id: verifiedRecord.paymentId,
      signature: verifiedRecord.signature,
      amount: verifiedRecord.amount,
      currency: verifiedRecord.currency,
      service_id: verifiedRecord.serviceId,
      service_name: verifiedRecord.serviceName,
      customer_name: verifiedRecord.customerName,
      customer_email: verifiedRecord.customerEmail,
      customer_phone: verifiedRecord.customerPhone,
      payment_method: verifiedRecord.paymentMethod,
      status: verifiedRecord.status,
      is_live: verifiedRecord.isLive,
      verified_at: verifiedRecord.verifiedAt
    })
    .select('receipt_number,order_id,payment_id,amount,currency,service_id,service_name,customer_name,customer_email,customer_phone,payment_method,status,is_live,verified_at')
    .single();
  if (saveError?.code === '23505') {
    const { data: existingRecord, error: lookupError } = await supabaseClient
      .from('service_payments')
      .select('receipt_number,order_id,payment_id,amount,currency,service_id,service_name,customer_name,customer_email,customer_phone,payment_method,status,is_live,verified_at')
      .eq('user_id', user.id)
      .eq('payment_id', payment.id)
      .maybeSingle();
    if (!lookupError && existingRecord) {
      savedRecord = existingRecord;
      saveError = null;
      wasAlreadySaved = true;
    }
  }
  if (saveError || !savedRecord) {
    console.error('[payments] verified transaction persistence failed', {
      code: saveError?.code || 'unknown'
    });
    const error = new Error(
      saveError?.code === '23505'
        ? 'This payment was already recorded. Check your receipt history before retrying.'
        : 'Payment verification succeeded, but the receipt could not be saved. Contact support before retrying.'
    );
    error.status = 503;
    throw error;
  }
  const savedReceipt = {
    ...verifiedRecord,
    receiptNumber: savedRecord.receipt_number,
    orderId: savedRecord.order_id,
    paymentId: savedRecord.payment_id,
    amount: Number(savedRecord.amount),
    currency: savedRecord.currency,
    serviceId: savedRecord.service_id,
    serviceName: savedRecord.service_name,
    customerName: savedRecord.customer_name,
    customerEmail: savedRecord.customer_email,
    customerPhone: savedRecord.customer_phone,
    paymentMethod: savedRecord.payment_method,
    status: savedRecord.status,
    isLive: savedRecord.is_live,
    verifiedAt: savedRecord.verified_at
  };

  // Fire-and-forget SMS alert to owner (non-blocking — payment is already verified)
  if (!wasAlreadySaved) {
    sendOwnerSmsAlert(savedReceipt, gateway).catch((smsErr) => {
      console.warn('[SMS Alert] Failed to send owner alert (non-critical):', smsErr.message);
    });
  }

  return {
    success: true,
    verified: true,
    message: 'Payment successfully authenticated and verified by server.',
    receipt: savedReceipt
  };
}

/**
 * 3. Handle Webhooks (Razorpay / Cashfree)
 */
export async function handleWebhook(
  rawBody,
  signatureHeader,
  { env = process.env, createClient = createSupabaseClient } = {}
) {
  const paymentConfig = getEnvConfig(env);

  if (!paymentConfig.webhookSecret) {
    const error = new Error('Payment webhook verification is not configured.');
    error.status = 503;
    throw error;
  }
  if (typeof signatureHeader !== 'string' || !/^[0-9a-f]{64}$/i.test(signatureHeader)) {
    throw new Error('Invalid webhook signature');
  }
  const rawText = Buffer.isBuffer(rawBody)
    ? rawBody.toString('utf8')
    : typeof rawBody === 'string'
      ? rawBody
      : JSON.stringify(rawBody);
  const expectedSignature = crypto
    .createHmac('sha256', paymentConfig.webhookSecret)
    .update(rawText)
    .digest();
  const providedSignature = Buffer.from(signatureHeader, 'hex');
  if (
    expectedSignature.length !== providedSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, providedSignature)
  ) {
    throw new Error('Invalid webhook signature');
  }

  const event = JSON.parse(rawText);
  if (event.event === 'payment.captured') {
    const paymentEntity = event.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;
    if (
      typeof orderId !== 'string' ||
      typeof paymentId !== 'string' ||
      !/^order_[A-Za-z0-9]+$/.test(orderId) ||
      !/^pay_[A-Za-z0-9]+$/.test(paymentId)
    ) {
      throw new Error('The captured payment webhook payload is incomplete.');
    }

    const gateway = getConfiguredGateway(paymentConfig);
    const order = await razorpayRequest(`/orders/${encodeURIComponent(orderId)}`, gateway);
    const userId = order.notes?.userId;
    if (typeof userId !== 'string') {
      throw new Error('The captured payment is not linked to a customer account.');
    }
    const serviceClient = getServerSupabaseClient(env, createClient);
    const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(userId);
    const user = userData?.user;
    if (
      userError ||
      !user?.email ||
      !user.email_confirmed_at ||
      user.email.toLowerCase() !== String(order.notes?.customerEmail || '').toLowerCase()
    ) {
      throw new Error('The captured payment customer could not be verified.');
    }
    const signature = crypto
      .createHmac('sha256', gateway.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    await handleVerifyPayment(
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      },
      {},
      {
        env,
        createClient,
        verifiedUser: user,
        verifiedClient: serviceClient,
      }
    );
  }
  console.log(`[Payment Server Webhook] Event received: ${event.event || 'unknown'}`);

  return { received: true, event: event.event };
}

/**
 * 4. Submit Investment Enquiry
 */
export async function handleInvestmentEnquiry(
  reqBody,
  requestHeaders = {},
  { env = process.env, createClient = createSupabaseClient } = {}
) {
  if (!reqBody || typeof reqBody !== 'object' || Array.isArray(reqBody)) {
    throw new Error('Provide valid enquiry details.');
  }
  const {
    fullName,
    email,
    phone,
    city,
    investmentHorizon,
    plannedAmountBracket,
    areasOfInterest,
    message,
    dateOfBirth,
    age,
    address,
    state,
    district,
    pinCode,
    interestCategory,
    investmentObjective,
    customerExpectations,
    riskUnderstanding,
    knowledgeLevel,
    investmentGoals,
    riskAcknowledged,
    privacyConsent,
    documents,
    document,
  } = reqBody;

  if (
    typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 150 ||
    typeof phone !== 'string' || phone.trim().length < 7 || phone.trim().length > 32 ||
    typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw new Error('A valid full name, email address, and phone number are required.');
  }

  // Adult eligibility validation
  let calculatedAge = age;
  if (dateOfBirth) {
    const birth = new Date(String(dateOfBirth).trim());
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date();
      let diff = now.getFullYear() - birth.getFullYear();
      if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
        diff -= 1;
      }
      calculatedAge = diff;
    }
  }
  if (calculatedAge != null && typeof calculatedAge === 'number' && calculatedAge < 18) {
    const error = new Error('Only legally eligible adults (18 years or older) may submit investment enquiries.');
    error.status = 400;
    throw error;
  }

  if (
    (city != null && (typeof city !== 'string' || city.trim().length > 100)) ||
    (investmentHorizon != null && (typeof investmentHorizon !== 'string' || investmentHorizon.length > 80)) ||
    (plannedAmountBracket != null && (typeof plannedAmountBracket !== 'string' || plannedAmountBracket.length > 80)) ||
    (message != null && (typeof message !== 'string' || message.trim().length > 2000)) ||
    !Array.isArray(areasOfInterest || []) ||
    (areasOfInterest || []).some((area) => typeof area !== 'string' || area.length > 100)
  ) {
    throw new Error('One or more enquiry fields are invalid.');
  }

  const enquiryId = `enq_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const trackingId = `MAI-INV-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const authorization = requestHeaders.authorization || requestHeaders.Authorization || '';
  const bearerMatch = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  let userId = null;
  if (authorization && !bearerMatch) {
    const error = new Error('Your customer session is invalid. Please sign in again.');
    error.status = 401;
    throw error;
  }
  if (bearerMatch) {
    const client = getServerSupabaseClient(env, createClient);
    const { data: userData, error: authError } = await client.auth.getUser(bearerMatch[1]);
    const user = userData?.user;
    if (authError || !user) {
      const error = new Error('Your customer session is invalid or expired. Please sign in again.');
      error.status = 401;
      throw error;
    }
    if (!user.email || !user.email_confirmed_at) {
      const error = new Error('Verify your account email before sending an investment enquiry.');
      error.status = 403;
      throw error;
    }
    if (user.email.toLowerCase() !== email.trim().toLowerCase()) {
      const error = new Error('Use the email address registered to your signed-in account.');
      error.status = 403;
      throw error;
    }
    userId = user.id;
  }

  let verifiedEmail = null;
  let emailVerifiedAt = null;
  if (reqBody.emailVerificationToken) {
    const tokenCheck = validateEmailVerificationToken({
      email: email.trim().toLowerCase(),
      token: reqBody.emailVerificationToken,
      userId,
      env,
    });
    if (!tokenCheck.valid) {
      const error = new Error(tokenCheck.error || 'Your Gmail / email address must be verified with OTP before submitting.');
      error.status = 400;
      throw error;
    }
    verifiedEmail = tokenCheck.email;
    emailVerifiedAt = tokenCheck.verifiedAt;
  }

  let formattedMessage = message?.trim() || '';
  if (verifiedEmail) {
    const emailNote = `[Verified Email: ${verifiedEmail} at ${emailVerifiedAt}]`;
    formattedMessage = formattedMessage ? `${formattedMessage}\n\n${emailNote}` : emailNote;
  }
  if (documents && typeof documents === 'object') {
    const docEntries = Object.entries(documents)
      .filter(([_, doc]) => doc && (doc.fileName || doc.name))
      .map(([slot, doc]) => `${slot}: ${doc.fileName || doc.name}`);
    if (docEntries.length > 0) {
      const docNote = `[Verified Documents: ${docEntries.join('; ')}]`;
      formattedMessage = formattedMessage ? `${formattedMessage}\n\n${docNote}` : docNote;
    }
  }

  const record = {
    id: enquiryId,
    tracking_id: trackingId,
    ...(userId ? { user_id: userId } : {}),
    ...(verifiedEmail ? { verified_email: verifiedEmail } : {}),
    ...(emailVerifiedAt ? { email_verified_at: emailVerifiedAt } : {}),
    full_name: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    city: city?.trim() || null,
    investment_horizon: investmentHorizon?.trim() || '',
    planned_amount_bracket: plannedAmountBracket?.trim() || '',
    areas_of_interest: Array.isArray(areasOfInterest) && areasOfInterest.length > 0
      ? areasOfInterest
      : (interestCategory ? [interestCategory] : []),
    message: formattedMessage ? formattedMessage.slice(0, 2000) : null,
    ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
    ...(calculatedAge != null ? { age: calculatedAge } : {}),
    ...(address ? { address: address.trim() } : {}),
    ...(state ? { state: state.trim() } : {}),
    ...(district ? { district: district.trim() } : {}),
    ...(pinCode ? { pin_code: pinCode.trim() } : {}),
    ...(interestCategory ? { interest_category: interestCategory.trim() } : {}),
    ...(investmentObjective ? { investment_objective: investmentObjective.trim() } : {}),
    ...(customerExpectations ? { customer_expectations: customerExpectations.trim() } : {}),
    ...(riskUnderstanding ? { risk_understanding: riskUnderstanding.trim() } : {}),
    ...(knowledgeLevel ? { knowledge_level: knowledgeLevel.trim() } : {}),
    ...(investmentGoals ? { investment_goals: investmentGoals.trim() } : {}),
    ...(riskAcknowledged != null ? { risk_acknowledged: Boolean(riskAcknowledged) } : {}),
    ...(privacyConsent != null ? { privacy_consent: Boolean(privacyConsent) } : {}),
    status: 'Submitted'
  };

  const client = getServerSupabaseClient(env, createClient);
  let { data, error } = await client
    .from('investment_enquiries')
    .insert(record)
    .select('id')
    .single();

  // Fallback if database still has legacy status check constraint
  if (error && (error.code === '23514' || String(error.message || '').includes('status_check'))) {
    record.status = 'new';
    const fallbackRes = await client
      .from('investment_enquiries')
      .insert(record)
      .select('id')
      .single();
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error || !data?.id) {
    console.error('[investment-enquiry] persistence failed', {
      code: error?.code || 'unknown'
    });
    const persistenceError = new Error(
      'The enquiry could not be saved. Please try again or contact support directly.'
    );
    persistenceError.status = 503;
    throw persistenceError;
  }

  const applicantEmail = verifiedEmail || email.trim();
  if (applicantEmail) {
    sendSubmissionConfirmationEmail({
      to: applicantEmail,
      fullName: fullName.trim() || 'Investor Applicant',
      formType: 'Investment Advisory Enquiry',
      trackingId,
      submittedAt: new Date().toISOString(),
      details: {
        'Category': interestCategory || 'General Investment',
        'Objective': investmentObjective || undefined,
        'Planned Amount': plannedAmountBracket || undefined,
        'Horizon': investmentHorizon || undefined,
      },
      env,
    }).catch((err) => console.warn('[investment-enquiry] confirmation email notice:', err.message));
  }

  return {
    success: true,
    message: 'Your enquiry was saved.',
    enquiryId: data.id,
    trackingId,
    enquiry: {
      id: data.id,
      trackingId,
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
    },
  };
}

export async function handleUpdateInvestmentEnquiry(reqBody, requestHeaders = {}, dependencies = {}) {
  const {
    env = process.env,
    createClient = createSupabaseClient,
    requireAdmin = requireAdminUser,
    fetchImpl = fetch,
  } = dependencies;
  await requireAdmin(requestHeaders, dependencies);

  const { id, status, adminNotes } = reqBody || {};
  if (!id || typeof id !== 'string') {
    const error = new Error('Enquiry ID is required.');
    error.status = 400;
    throw error;
  }

  const validStatuses = new Set([
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
  ]);
  if (!status || !validStatuses.has(status)) {
    const error = new Error('Select a valid enquiry status.');
    error.status = 400;
    throw error;
  }

  const client = getServerSupabaseClient(env, createClient);

  // Fetch current record to get recipient details and previous status
  let existing = null;
  try {
    const { data } = await client
      .from('investment_enquiries')
      .select('*')
      .or(`id.eq.${id},tracking_id.eq.${id}`)
      .maybeSingle();
    existing = data;
  } catch (_) {}

  const previousStatus = existing?.status || 'Submitted';

  const updatePayload = {
    status,
    ...(adminNotes != null ? { admin_notes: String(adminNotes).trim() } : {}),
    updated_at: new Date().toISOString(),
  };

  const { error } = await client
    .from('investment_enquiries')
    .update(updatePayload)
    .or(`id.eq.${id},tracking_id.eq.${id}`);

  if (error) {
    console.error('[investment-enquiry] status update failed', error);
    const err = new Error('Could not update enquiry status. Please try again.');
    err.status = 500;
    throw err;
  }

  // Record status history
  try {
    await client.from('submission_status_history').insert({
      form_type: 'investment',
      submission_id: existing?.tracking_id || existing?.id || id,
      previous_status: previousStatus,
      new_status: status,
      admin_notes: adminNotes || null,
      changed_by: 'admin',
    });
  } catch (_) {}

  // Trigger automatic status update email notification
  const recipientEmail = existing?.verified_email || existing?.email;
  const customerName = existing?.full_name || existing?.name || 'Investor';
  const trackingId = existing?.tracking_id || existing?.id || id;

  let emailNotification = null;
  if (recipientEmail) {
    try {
      emailNotification = await sendStatusUpdateNotification({
        applicationId: trackingId,
        customerEmail: recipientEmail,
        customerName,
        formType: 'investment',
        formTypeLabel: 'Investment Application',
        previousStatus,
        newStatus: status,
        adminRemark: adminNotes,
        env,
        createClient,
        fetchImpl,
        forceResend: true,
      });
    } catch (emailErr) {
      console.warn('[investment-enquiry] Failed to send status notification email:', emailErr.message);
      emailNotification = { success: false, deliveryStatus: 'failed', error: emailErr.message };
    }
  }

  return {
    success: true,
    message: 'Enquiry status updated successfully.',
    id,
    status,
    previousStatus,
    emailNotification,
  };
}

/**
 * 5. Admin Data Retrieval (Secured)
 */
export async function handleAdminData(requestHeaders = {}) {
  const admin = await requireAdminUser(requestHeaders);
  const serviceClient = createAdminServiceClient();
  await recordAdminActivity(admin.id, 'dashboard_view', {}, serviceClient);
  return {
    success: true,
    ...(await getAdminDashboardData(process.env, undefined, serviceClient)),
    gateway: { mode: getEnvConfig().mode },
  };
}

const STUDENT_INSTITUTION_CATEGORIES = new Set(['Government', 'Private']);

function getStudentLoanDatabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = getSupabaseServerKey();
  if (!supabaseUrl.startsWith('https://') || !serviceRoleKey) {
    throw new Error('Student loan demo storage is not configured. Set the server-side Supabase URL and service-role key, then apply the schema.');
  }
  return {
    restUrl: `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/student_loan_demo_applications`,
    serviceRoleKey
  };
}

async function requestStudentLoanDatabase(query, options = {}) {
  const { restUrl, serviceRoleKey } = getStudentLoanDatabaseConfig();
  const response = await fetch(`${restUrl}${query}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Student loan demo storage request failed (${response.status}). Check the database setup.`);
  }

  if (response.status === 204) return [];
  const result = await response.json();
  if (!Array.isArray(result)) {
    throw new Error('Student loan demo storage returned an invalid response.');
  }
  return result;
}

function validateInstitutionText(value, label, { required = false, maxLength = 120 } = {}) {
  if (value == null && !required) return null;
  if (typeof value !== 'string') {
    throw new Error(`${label} must be text.`);
  }
  const normalized = value.trim();
  if ((required && normalized.length < 2) || normalized.length > maxLength) {
    throw new Error(`${label} must be between 2 and ${maxLength} characters.`);
  }
  return normalized || null;
}

async function requestStudentLoanInstitutionDatabase(query) {
  const { restUrl, serviceRoleKey } = getStudentLoanDatabaseConfig();
  const restUrlPrefix = restUrl.replace(/\/student_loan_demo_applications$/, '');
  const response = await fetch(`${restUrlPrefix}/student_loan_institutions${query}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Student institution lookup failed (${response.status}). Check the institution catalog setup.`);
  }
  const result = await response.json();
  if (!Array.isArray(result)) {
    throw new Error('Student institution lookup returned an invalid response.');
  }
  return result;
}

async function searchStudentLoanInstitutions(query) {
  const searchTerm = typeof query?.q === 'string' ? query.q.trim() : '';
  if (searchTerm.length < 3 || searchTerm.length > 100) {
    throw new Error('Enter at least 3 characters to search institutions.');
  }
  if (!/[\p{L}\p{N}]{3}/u.test(searchTerm)) {
    throw new Error('Use at least 3 letters or numbers to search institutions.');
  }

  const state = validateInstitutionText(query.state, 'State', { maxLength: 100 });
  const district = validateInstitutionText(query.district, 'District', { maxLength: 100 });
  const management = query.management || null;
  if (management && !STUDENT_INSTITUTION_CATEGORIES.has(management)) {
    throw new Error('Select Government or Private for the institution filter.');
  }

  const afterName = query.afterName || null;
  const afterId = query.afterId || null;
  if ((afterName && !afterId) || (!afterName && afterId)) {
    throw new Error('The institution search page cursor is invalid.');
  }
  const limit = query.limit == null ? 20 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error('The institution search page size is invalid.');
  }

  const { restUrl, serviceRoleKey } = getStudentLoanDatabaseConfig();
  const rpcUrl = restUrl.replace(
    /\/student_loan_demo_applications$/,
    '/rpc/search_student_loan_institutions'
  );
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_query: searchTerm,
      p_state: state,
      p_district: district,
      p_management: management,
      p_after_name: afterName,
      p_after_id: afterId,
      p_limit: limit
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Institution search failed (${response.status}). Check the institution catalog setup.`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error('Institution search returned an invalid response.');
  }

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    success: true,
    results: page.map((row) => ({
      id: row.institution_id,
      name: row.official_name,
      state: row.state,
      district: row.district,
      city: row.city,
      pinCode: row.pin_code,
      type: row.institution_type,
      category: row.management
    })),
    hasMore,
    cursor: hasMore && last
      ? { name: last.official_name, id: last.institution_id }
      : null
  };
}

export async function handleStudentLoanDemoRequest(
  method,
  body,
  query,
  requestHeaders = {},
  dependencies = {}
) {
  if (method === 'GET' && query?.institutions === 'search') {
    return searchStudentLoanInstitutions(query);
  }
  return handleStudentLoanEnquiryRequest(method, body, query, requestHeaders, dependencies);
}

/**
 * 6. Send SMS Alert to Business Owner (server-side only)
 *
 * Uses Fast2SMS (popular Indian SMS gateway) if configured.
 * If credentials are missing, logs a warning — payment is already verified.
 *
 * Required env vars:
 *   OWNER_ALERT_PHONE  — owner's configured mobile number (digits only)
 *   SMS_API_KEY        — Fast2SMS / Twilio API key
 *   SMS_SENDER_ID      — Optional sender name (default: MEHANDA)
 *
 * NEVER include the private receiving UPI ID in SMS alerts.
 */
async function sendOwnerSmsAlert(record, env) {
  if (!env.ownerPhone) {
    console.warn(
      '[SMS Alert] OWNER_ALERT_PHONE is not set in environment variables. ' +
      'Set this to your private mobile number to receive SMS payment alerts.'
    );
    return;
  }

  if (!env.smsApiKey) {
    console.warn(
      '[SMS Alert] SMS_API_KEY is not configured. ' +
      'Register at https://www.fast2sms.com or https://www.twilio.com and set SMS_API_KEY.'
    );
    return;
  }

  const alertMessage =
    `MEHANDA ARMY: Payment Verified! ` +
    `Amount: Rs.${record.amount} | ` +
    `Customer: ${record.customerName} | ` +
    `Service: ${record.serviceName} | ` +
    `Ref: ${record.paymentId} | ` +
    `Time: ${new Date(record.verifiedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`;

  // Fast2SMS DLT-compliant API (supports Indian numbers without country code prefix)
  try {
    const cleanPhone = env.ownerPhone.replace(/[^0-9]/g, '').replace(/^91/, '');
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': env.smsApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q', // Quick SMS route (transactional)
        message: alertMessage,
        language: 'english',
        flash: 0,
        numbers: cleanPhone,
      })
    });

    const result = await response.json();
    if (result?.return === true) {
      console.log(`[SMS Alert] Owner alert delivered successfully to ${env.ownerPhone} for payment ${record.paymentId}.`);
    } else {
      console.warn('[SMS Alert] Provider returned non-success status:', JSON.stringify(result));
    }
  } catch (fetchErr) {
    throw new Error(`SMS dispatch failed: ${fetchErr.message}`);
  }
}
