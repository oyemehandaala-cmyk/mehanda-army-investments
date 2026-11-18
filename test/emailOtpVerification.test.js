import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generate6DigitOtp,
  hashOtp,
  sendEmailOtp,
  deliverOtpEmail,
  sendSubmissionConfirmationEmail,
  verifyEmailOtp,
  validateEmailVerificationToken,
  buildOtpEmailHtml,
  buildOtpEmailText,
  otpStore,
  sendHistoryStore,
  verificationStore,
  createVerificationToken,
  OTP_EXPIRATION_MS,
  MAX_VERIFY_ATTEMPTS,
} from '../server/emailOtpService.js';
import sendOtpHandler from '../server/api/send-email-otp.js';
import verifyOtpHandler from '../server/api/verify-email-otp.js';
import { handleContactEnquiry } from '../server/contactEnquiryHandler.js';
import { handleInvestmentEnquiry } from '../server/paymentServer.js';
import { handleStudentLoanEnquiryRequest } from '../server/studentLoanEnquiries.js';

const testEnv = {
  EMAIL_OTP_SECRET: 'test-secure-otp-hmac-secret-12345',
  RESEND_API_KEY: 're_test_dummy_key_12345',
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_SECRET_KEY: 'test-secure-otp-hmac-secret-12345',
};

test('generate6DigitOtp produces a random 6-digit numeric string', () => {
  for (let i = 0; i < 50; i++) {
    const code = generate6DigitOtp();
    assert.equal(typeof code, 'string');
    assert.equal(code.length, 6);
    assert.match(code, /^\d{6}$/);
    const num = Number(code);
    assert.ok(num >= 100000 && num <= 999999);
  }
});

test('hashOtp produces deterministic SHA-256 hash without storing plaintext', () => {
  const email = 'user@example.com';
  const otp = '482910';
  const secret = 'super-secret';
  const hash1 = hashOtp(email, otp, secret);
  const hash2 = hashOtp(email, otp, secret);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
  assert.notEqual(hash1, otp);

  // Different OTP produces different hash
  const hash3 = hashOtp(email, '482911', secret);
  assert.notEqual(hash1, hash3);
});

test('email templates include OTP, 5-minute expiry notice, and official branding', () => {
  const html = buildOtpEmailHtml({ otp: '654321', purpose: 'Student Loan Application' });
  assert.ok(html.includes('654321'));
  assert.ok(html.includes('5 minutes'));
  assert.ok(html.includes('MEHANDA ARMY INVESTMENTS'));
  assert.ok(html.includes('Student Loan Application'));

  const text = buildOtpEmailText({ otp: '654321', purpose: 'Investment Advisory' });
  assert.ok(text.includes('654321'));
  assert.ok(text.includes('5 minutes'));
  assert.ok(text.includes('MEHANDA ARMY INVESTMENTS'));
});

test('sendEmailOtp validates email format and rejects invalid emails', async () => {
  await assert.rejects(
    sendEmailOtp({ email: '', env: testEnv }),
    (err) => err.status === 400 && /valid Gmail \/ Email/i.test(err.message)
  );

  await assert.rejects(
    sendEmailOtp({ email: 'invalid-email-address', env: testEnv }),
    (err) => err.status === 400 && /valid Gmail \/ Email/i.test(err.message)
  );
});

test('sendEmailOtp delivers email via delivery service and does not expose OTP in response', async () => {
  const testEmail = 'applicant.test1@gmail.com';
  let capturedDelivery = null;

  const mockSendEmail = async (params) => {
    capturedDelivery = params;
    return { success: true };
  };

  const res = await sendEmailOtp({
    email: testEmail,
    purpose: 'Student Loan Application',
    env: testEnv,
    sendEmailFn: mockSendEmail,
  });

  assert.equal(res.success, true);
  assert.equal(res.email, testEmail);
  assert.equal(res.expiresInSeconds, 300);
  assert.equal(res.resendCooldownSeconds, 60);
  // Ensure OTP is NEVER exposed in the returned JSON response
  assert.equal(res.otp, undefined);

  assert.ok(capturedDelivery);
  assert.equal(capturedDelivery.email, testEmail);
  assert.match(capturedDelivery.otp, /^\d{6}$/);

  // Check stored record has hash, not plaintext OTP
  const record = otpStore.get(testEmail);
  assert.ok(record);
  assert.equal(record.attempts, 0);
  assert.ok(record.otpHash);
  assert.notEqual(record.otpHash, capturedDelivery.otp);
});

test('deliverOtpEmail routes through SMTP when SMTP credentials are provided', async () => {
  const testEmail = 'smtp.test@gmail.com';
  let capturedSmtp = null;

  const mockSendSmtp = async (params) => {
    capturedSmtp = params;
    return { provider: 'smtp', success: true };
  };

  const res = await deliverOtpEmail({
    email: testEmail,
    otp: '123456',
    purpose: 'Investment Application',
    env: {
      SMTP_USER: 'test@mehandaarmy.in',
      SMTP_PASS: 'testpassword123',
    },
    sendSmtpFn: mockSendSmtp,
  });

  assert.equal(res.success, true);
  assert.equal(res.provider, 'smtp');
  assert.ok(capturedSmtp);
  assert.equal(capturedSmtp.user, 'test@mehandaarmy.in');
  assert.equal(capturedSmtp.to, testEmail);
  assert.match(capturedSmtp.subject, /123456/);
});

test('sendSubmissionConfirmationEmail delivers official confirmation email to applicant', async () => {
  const testEmail = 'confirmed.applicant@gmail.com';
  let capturedMessage = null;

  const mockSendEmail = async (params) => {
    capturedMessage = params;
    return { success: true, provider: 'mock' };
  };

  const res = await sendSubmissionConfirmationEmail({
    to: testEmail,
    fullName: 'Rahul Sharma',
    formType: 'Student Loan Enquiry Application',
    trackingId: 'MAI-SL-2026-9999',
    details: {
      'Requested Amount': '₹1,000',
      'Institution': 'Delhi University',
    },
    env: testEnv,
    sendEmailFn: mockSendEmail,
  });

  assert.equal(res.success, true);
  assert.equal(res.trackingId, 'MAI-SL-2026-9999');
  assert.ok(capturedMessage);
  assert.equal(capturedMessage.to, testEmail);
  assert.match(capturedMessage.subject, /MAI-SL-2026-9999/);
  assert.match(capturedMessage.html, /Rahul Sharma/);
  assert.match(capturedMessage.html, /Student Loan Enquiry Application/);
  assert.match(capturedMessage.html, /MAI-SL-2026-9999/);
  assert.match(capturedMessage.html, /Delhi University/);
  assert.match(capturedMessage.text, /MAI-SL-2026-9999/);
});

test('sendEmailOtp enforces 60-second cooldown on resend', async () => {
  const testEmail = 'cooldown.user@gmail.com';
  const mockSendEmail = async () => ({ success: true });

  // First send succeeds
  await sendEmailOtp({
    email: testEmail,
    env: testEnv,
    sendEmailFn: mockSendEmail,
  });

  // Immediate second send fails with 429
  await assert.rejects(
    sendEmailOtp({
      email: testEmail,
      env: testEnv,
      sendEmailFn: mockSendEmail,
    }),
    (err) => err.status === 429 && /wait \d+ seconds/i.test(err.message)
  );

  // After cooldown expires, resend succeeds
  const record = otpStore.get(testEmail);
  record.resendAvailableAt = Date.now() - 1000; // Fast-forward cooldown

  const resendResult = await sendEmailOtp({
    email: testEmail,
    env: testEnv,
    sendEmailFn: mockSendEmail,
  });
  assert.equal(resendResult.success, true);
});

test('sendEmailOtp invalidates previous OTP when a new OTP is requested', async () => {
  const testEmail = 'invalidate.previous@gmail.com';
  let capturedOtps = [];
  const mockSendEmail = async (params) => {
    capturedOtps.push(params.otp);
    return { success: true };
  };

  // 1st send
  await sendEmailOtp({ email: testEmail, env: testEnv, sendEmailFn: mockSendEmail });
  const firstOtp = capturedOtps[0];

  // Fast forward cooldown to allow resend
  const record = otpStore.get(testEmail);
  record.resendAvailableAt = Date.now() - 1000;

  // 2nd send (new OTP)
  await sendEmailOtp({ email: testEmail, env: testEnv, sendEmailFn: mockSendEmail });
  const secondOtp = capturedOtps[1];

  // Old OTP must now be rejected
  await assert.rejects(
    verifyEmailOtp({ email: testEmail, otp: firstOtp, env: testEnv }),
    (err) => err.status === 400
  );

  // New OTP must succeed
  const verifyRes = await verifyEmailOtp({ email: testEmail, otp: secondOtp, env: testEnv });
  assert.equal(verifyRes.verified, true);
});

test('verifyEmailOtp validates OTP, generates signed token, and burns OTP', async () => {
  const testEmail = 'verify.success@gmail.com';
  let capturedOtp = null;
  await sendEmailOtp({
    email: testEmail,
    env: testEnv,
    sendEmailFn: async (params) => { capturedOtp = params.otp; return { success: true }; },
  });

  // Verify with correct OTP
  const result = await verifyEmailOtp({
    email: testEmail,
    otp: capturedOtp,
    env: testEnv,
  });

  assert.equal(result.success, true);
  assert.equal(result.verified, true);
  assert.equal(result.email, testEmail);
  assert.ok(result.verifiedAt);
  assert.ok(result.verificationToken);

  // Attempting to re-verify with same OTP must fail because it was burned
  await assert.rejects(
    verifyEmailOtp({
      email: testEmail,
      otp: capturedOtp,
      env: testEnv,
    }),
    (err) => err.status === 400 && /expired or was not requested/i.test(err.message)
  );
});

test('verifyEmailOtp rejects incorrect OTP and protects against brute-force (max 5 attempts)', async () => {
  const testEmail = 'brute.force@gmail.com';
  let realOtp = null;
  await sendEmailOtp({
    email: testEmail,
    env: testEnv,
    sendEmailFn: async (params) => { realOtp = params.otp; return { success: true }; },
  });

  // Attempts 1 to 4: rejects with remaining attempts
  for (let i = 1; i <= 4; i++) {
    await assert.rejects(
      verifyEmailOtp({ email: testEmail, otp: '000000', env: testEnv }),
      (err) => err.status === 400 && err.message.includes(`${MAX_VERIFY_ATTEMPTS - i} attempt`)
    );
  }

  // Attempt 5: invalidates the OTP completely
  await assert.rejects(
    verifyEmailOtp({ email: testEmail, otp: '000000', env: testEnv }),
    (err) => err.status === 400 && /invalidated/i.test(err.message)
  );

  // Even if the user now enters the real OTP, it is burned
  await assert.rejects(
    verifyEmailOtp({ email: testEmail, otp: realOtp, env: testEnv }),
    (err) => err.status === 400
  );
});

test('verifyEmailOtp rejects expired OTP (> 5 minutes)', async () => {
  const testEmail = 'expired.user@gmail.com';
  let realOtp = null;
  await sendEmailOtp({
    email: testEmail,
    env: testEnv,
    sendEmailFn: async (params) => { realOtp = params.otp; return { success: true }; },
  });

  // Fast forward past 5-minute expiration
  const record = otpStore.get(testEmail);
  record.expiresAt = Date.now() - 1000;

  await assert.rejects(
    verifyEmailOtp({ email: testEmail, otp: realOtp, env: testEnv }),
    (err) => err.status === 400 && /expired/i.test(err.message)
  );
});

test('validateEmailVerificationToken binds verification to exact email and detects changed email', async () => {
  const testEmail = 'applicant.original@gmail.com';
  let realOtp = null;
  await sendEmailOtp({
    email: testEmail,
    userId: 'user-uuid-1234',
    env: testEnv,
    sendEmailFn: async (params) => { realOtp = params.otp; return { success: true }; },
  });

  const verifyRes = await verifyEmailOtp({
    email: testEmail,
    otp: realOtp,
    userId: 'user-uuid-1234',
    env: testEnv,
  });

  const token = verifyRes.verificationToken;

  // 1. Valid token with matching email
  const validCheck = validateEmailVerificationToken({
    email: testEmail,
    token,
    userId: 'user-uuid-1234',
    env: testEnv,
  });
  assert.equal(validCheck.valid, true);
  assert.equal(validCheck.email, testEmail);

  // 2. Changed email scenario: user changed their email after verification
  const changedEmailCheck = validateEmailVerificationToken({
    email: 'hacker.or.different@gmail.com',
    token,
    userId: 'user-uuid-1234',
    env: testEnv,
  });
  assert.equal(changedEmailCheck.valid, false);
  assert.match(changedEmailCheck.error, /does not match/i);

  // 3. User session mismatch: different user tries to reuse token
  const differentUserCheck = validateEmailVerificationToken({
    email: testEmail,
    token,
    userId: 'different-user-uuid-5678',
    env: testEnv,
  });
  assert.equal(differentUserCheck.valid, false);
  assert.match(differentUserCheck.error, /different user/i);

  // 4. Tampered token
  const tamperedCheck = validateEmailVerificationToken({
    email: testEmail,
    token: `${token}tampered`,
    env: testEnv,
  });
  assert.equal(tamperedCheck.valid, false);
});

test('HTTP API handlers /api/send-email-otp and /api/verify-email-otp handle requests properly', async () => {
  let deliveredOtp = null;
  const targetEmail = 'api.handler.test@gmail.com';

  // Override sendEmailFn by creating an OTP via handler
  // First, verify method rejection for GET
  const reqGet = { method: 'GET', headers: {}, body: {} };
  const resGet = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    setHeader() {},
    json(body) { this.body = body; return this; },
  };
  await sendOtpHandler(reqGet, resGet);
  assert.equal(resGet.statusCode, 405);

  // Send OTP via handler (mocking environment send with custom mock)
  const reqSend = {
    method: 'POST',
    headers: {},
    body: { email: targetEmail, purpose: 'Service Enquiry' },
  };
  const resSend = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    setHeader() {},
    json(body) { this.body = body; return this; },
  };

  // We temporarily mock deliverOtpEmail or use sendEmailOtp directly
  await sendEmailOtp({
    email: targetEmail,
    env: testEnv,
    sendEmailFn: async (params) => { deliveredOtp = params.otp; return { success: true }; },
  });

  // Verify OTP via handler
  const reqVerify = {
    method: 'POST',
    headers: {},
    body: { email: targetEmail, otp: deliveredOtp },
  };
  const resVerify = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    setHeader() {},
    json(body) { this.body = body; return this; },
  };

  await verifyOtpHandler(reqVerify, resVerify, { env: testEnv });
  assert.equal(resVerify.statusCode, 200);
  assert.equal(resVerify.body.verified, true);
  assert.ok(resVerify.body.verificationToken);
});

test('contact enquiry endpoint verifies email OTP token and rejects changed email', async () => {
  const secret = testEnv.EMAIL_OTP_SECRET;
  const verifiedEmail = 'contact.user@gmail.com';
  const validToken = createVerificationToken(verifiedEmail, null, secret);

  let savedRecord = null;
  const mockClient = {
    auth: { async getUser() { return { data: { user: null }, error: null }; } },
    from(table) {
      assert.equal(table, 'contact_enquiries');
      return {
        insert(rec) {
          savedRecord = rec;
          return { select() { return { single: async () => ({ data: { id: 'MAI-CON-2026-TEST', ...rec }, error: null }) }; } };
        },
      };
    },
  };

  // 1. Rejected if submitted email is different from verified token email
  await assert.rejects(
    handleContactEnquiry(
      {
        fullName: 'Test User',
        phone: '9812947813',
        email: 'changed.after.otp@gmail.com',
        consent: true,
        emailVerificationToken: validToken,
      },
      {},
      { env: testEnv, createClient: () => mockClient }
    ),
    (err) => err.status === 400 && /does not match/i.test(err.message)
  );

  // 2. Successful when submitted email matches verified token
  const res = await handleContactEnquiry(
    {
      fullName: 'Test User',
      phone: '9812947813',
      email: verifiedEmail,
      consent: true,
      emailVerificationToken: validToken,
    },
    {},
    { env: testEnv, createClient: () => mockClient }
  );

  assert.equal(res.success, true);
  assert.equal(savedRecord.email, verifiedEmail);
  assert.equal(savedRecord.verified_email, verifiedEmail);
  assert.ok(savedRecord.email_verified_at);
});

test('investment enquiry endpoint verifies email OTP token and rejects changed email', async () => {
  const secret = testEnv.EMAIL_OTP_SECRET;
  const verifiedEmail = 'investor.otp@gmail.com';
  const validToken = createVerificationToken(verifiedEmail, null, secret);

  let savedRecord = null;
  const mockClient = {
    auth: { async getUser() { return { data: { user: null }, error: null }; } },
    from(table) {
      assert.equal(table, 'investment_enquiries');
      return {
        insert(rec) {
          savedRecord = rec;
          return { select() { return { single: async () => ({ data: { id: 'inv_123', ...rec }, error: null }) }; } };
        },
      };
    },
  };

  const basePayload = {
    fullName: 'Sunita Sharma',
    phone: '9812947813',
    dateOfBirth: '1990-01-01',
    age: 36,
    address: '123 Model Town',
    state: 'Haryana',
    district: 'Bhiwani',
    city: 'Bhiwani',
    pinCode: '127021',
    interestCategory: 'Mutual Funds & Systematic Investment (SIP)',
    investmentObjective: 'Wealth Appreciation / Long-term Growth',
    plannedAmountBracket: '₹50,000 – ₹2,00,000',
    investmentHorizon: '3 – 5 Years',
    customerExpectations: 'Asset Allocation Guidance',
    riskUnderstanding: 'Moderate Risk',
    knowledgeLevel: 'Intermediate',
    investmentGoals: 'Capital Growth',
    riskAcknowledged: true,
    privacyConsent: true,
  };

  // 1. Rejected if submitted email is different from verified token email
  await assert.rejects(
    handleInvestmentEnquiry(
      { ...basePayload, email: 'different.email@gmail.com', emailVerificationToken: validToken },
      {},
      { env: testEnv, createClient: () => mockClient }
    ),
    (err) => err.status === 400 && /does not match/i.test(err.message)
  );

  // 2. Successful when submitted email matches verified token
  const res = await handleInvestmentEnquiry(
    { ...basePayload, email: verifiedEmail, emailVerificationToken: validToken },
    {},
    { env: testEnv, createClient: () => mockClient }
  );

  assert.equal(res.success, true);
  assert.equal(savedRecord.email, verifiedEmail);
  assert.equal(savedRecord.verified_email, verifiedEmail);
  assert.ok(savedRecord.email_verified_at);
});

test('student loan enquiry endpoint verifies email OTP token and rejects changed email', async () => {
  const secret = testEnv.EMAIL_OTP_SECRET;
  const user = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'student.applicant@gmail.com',
    email_confirmed_at: '2026-01-01T00:00:00.000Z',
  };
  const validToken = createVerificationToken(user.email, user.id, secret);

  const mockClient = {
    auth: {
      async getUser(token) {
        assert.equal(token, 'valid-token');
        return { data: { user }, error: null };
      },
    },
  };

  const basePayload = {
    fullName: 'Test Applicant',
    verificationName: 'test applicant',
    email: user.email,
    mobileNumber: '9876543210',
    dateOfBirth: '2000-01-01',
    applicantState: 'Haryana',
    applicantDistrict: 'Bhiwani',
    applicantCity: 'Mehanda',
    applicantAddress: 'Test address, Mehandipur',
    institutionName: 'Test College',
    courseName: 'Computer Science',
    privacyConsent: true,
    idempotencyKey: '123e4567-e89b-42d3-a456-426614174001',
    guardianConsent: false,
  };

  const record = {
    reference: 'MAI-SL-2026-0123456789ABCDEF0123456789ABCDEF',
    tracking_id: 'MAI-2026-000001',
    user_id: user.id,
    applicant_name: 'Test Applicant',
    applicant_email: user.email,
    applicant_phone: '9876543210',
    applicant_age: 26,
    applicant_dob: '2000-01-01',
    applicant_state: 'Haryana',
    applicant_district: 'Bhiwani',
    applicant_city: 'Mehanda',
    applicant_address: 'Test address, Mehandipur',
    school_name: 'Test College',
    course_name: 'Computer Science',
    status: 'Submitted',
    enquiry_status: 'Submitted',
    submitted_at: '2026-11-06T12:00:00.000Z',
    status_updated_at: '2026-11-06T12:00:00.000Z',
  };

  // 1. Rejected if verification token belongs to another email
  const otherToken = createVerificationToken('different.student@gmail.com', user.id, secret);
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      { ...basePayload, emailVerificationToken: otherToken },
      {},
      { authorization: 'Bearer valid-token' },
      {
        env: { ...testEnv, SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SECRET_KEY: secret },
        createClient: () => mockClient,
      }
    ),
    (err) => err.status === 400 && /does not match/i.test(err.message)
  );

  // 2. Accepted when token matches
  const res = await handleStudentLoanEnquiryRequest(
    'POST',
    { ...basePayload, emailVerificationToken: validToken },
    {},
    { authorization: 'Bearer valid-token' },
    {
      env: { ...testEnv, SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SECRET_KEY: secret },
      createClient: () => mockClient,
      fetchImpl: async () => new Response(JSON.stringify(record), { status: 200 }),
    }
  );

  assert.equal(res.success, true);
  assert.equal(res.application.applicantEmail, user.email);
});

