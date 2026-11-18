import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STATUS_CONFIG,
  getStatusConfig,
  buildStatusUpdateEmailHtml,
  buildStatusUpdateEmailText,
  sendStatusUpdateNotification,
  getApplicationNotificationHistory,
  handleAdminNotificationRequest,
  notificationDeduplicationStore,
  inMemoryNotificationHistory,
} from '../server/statusNotificationService.js';
import { handleStudentLoanEnquiryRequest } from '../server/studentLoanEnquiries.js';
import { handleUpdateInvestmentEnquiry } from '../server/paymentServer.js';
import { handleUpdateContactEnquiry } from '../server/contactEnquiryHandler.js';

const testEnv = {
  EMAIL_OTP_SECRET: 'test-secure-otp-hmac-secret-12345',
  RESEND_API_KEY: 're_test_dummy_key_12345',
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_SECRET_KEY: 'test-secure-otp-hmac-secret-12345',
  ADMIN_LOGIN_EMAIL: 'oyemehandaala@gmail.com',
  ADMIN_USER_ID: '7b861cce-345f-4e57-951a-38e70d5dbb14',
};

const REQUIRED_9_STATUSES = [
  'Submitted',
  'Under Review',
  'Additional Information Required',
  'Enquiry Completed',
  'Closed',
  'Completed',
  'Verification Pending',
  'On Hold',
  'Rejected',
];

test('1. STATUS_CONFIG covers all 9 required workflow statuses with custom metadata', () => {
  for (const status of REQUIRED_9_STATUSES) {
    const config = getStatusConfig(status);
    assert.ok(config, `Status config missing for: ${status}`);
    assert.ok(config.title, `Title missing for: ${status}`);
    assert.ok(config.headline, `Headline missing for: ${status}`);
    assert.ok(config.description, `Description missing for: ${status}`);
    assert.ok(config.actionGuidance, `Action guidance missing for: ${status}`);
    assert.ok(config.badgeColor, `Badge color missing for: ${status}`);
  }
});

test('2. buildStatusUpdateEmailHtml includes official branding, tracking ID, status banner and tracking URL', () => {
  const html = buildStatusUpdateEmailHtml({
    customerName: 'Rahul Verma',
    trackingId: 'MAI-SL-2026-998877',
    formTypeLabel: 'Student Loan Application',
    previousStatus: 'Under Review',
    newStatus: 'Rejected',
    statusUpdatedAt: '2026-11-10T12:00:00.000Z',
    adminRemark: 'Academic marksheet requires certified college seal.',
  });

  // Official Branding
  assert.match(html, /MEHANDA ARMY INVESTMENTS/);
  assert.match(html, /Official Workflow Status Notification/);
  assert.match(html, /(Hisar|Bhiwani), Haryana, India/);
  assert.match(html, /\+91 9812947813/);
  assert.match(html, /info@mehandaarmy\.net/);

  // Recipient details
  assert.match(html, /Rahul Verma/);
  assert.match(html, /MAI-SL-2026-998877/);
  assert.match(html, /Student Loan Application/);
  assert.match(html, /Under Review/);
  assert.match(html, /Rejected/);

  // Admin remarks callout
  assert.match(html, /Academic marksheet requires certified college seal/);

  // Direct portal tracking URL
  assert.match(html, /https:\/\/mehandaarmy\.net\/dashboard\?trackingId=MAI-SL-2026-998877/);
});

test('3. buildStatusUpdateEmailHtml renders custom messaging for Completed status', () => {
  const html = buildStatusUpdateEmailHtml({
    customerName: 'Priya Sharma',
    trackingId: 'MAI-INV-2026-112233',
    formTypeLabel: 'Investment Application',
    previousStatus: 'Verification Pending',
    newStatus: 'Completed',
    statusUpdatedAt: '2026-11-10T14:30:00.000Z',
  });

  assert.match(html, /Completed/);
  assert.match(html, /Congratulations! Your application has been approved and completed/);
  assert.match(html, /MAI-INV-2026-112233/);
});

test('4. buildStatusUpdateEmailText produces clean formatted plain text', () => {
  const text = buildStatusUpdateEmailText({
    customerName: 'Vikas Kumar',
    trackingId: 'MAI-SL-2026-554433',
    formTypeLabel: 'Student Loan Application',
    previousStatus: 'Submitted',
    newStatus: 'Additional Information Required',
    adminRemark: 'Please upload original fee receipt.',
  });

  assert.match(text, /MEHANDA ARMY INVESTMENTS/);
  assert.match(text, /CURRENT STATUS: ADDITIONAL INFORMATION REQUIRED/);
  assert.match(text, /Please upload original fee receipt/);
  assert.match(text, /MAI-SL-2026-554433/);
});

test('5. sendStatusUpdateNotification rejects invalid recipient email', async () => {
  const result = await sendStatusUpdateNotification({
    applicationId: 'MAI-APP-001',
    customerEmail: 'not-an-email',
    newStatus: 'Under Review',
  });
  assert.equal(result.success, false);
  assert.equal(result.deliveryStatus, 'failed');
  assert.equal(result.skipped, true);
});

test('6. sendStatusUpdateNotification skips sending when previousStatus equals newStatus', async () => {
  const result = await sendStatusUpdateNotification({
    applicationId: 'MAI-APP-002',
    customerEmail: 'customer@example.com',
    previousStatus: 'Under Review',
    newStatus: 'Under Review',
  });
  assert.equal(result.success, true);
  assert.equal(result.deliveryStatus, 'skipped');
  assert.equal(result.skipped, true);
});

test('7. sendStatusUpdateNotification successfully delivers via configured email function and records history', async () => {
  let sentPayload = null;
  const mockSendEmail = async ({ to, subject, html, text }) => {
    sentPayload = { to, subject, html, text };
    return { provider: 'mock_provider', success: true };
  };

  const appId = `MAI-SL-TEST-${Date.now()}`;
  const result = await sendStatusUpdateNotification({
    applicationId: appId,
    customerEmail: 'verified.student@gmail.com',
    customerName: 'Aman Deep',
    formType: 'student_loan',
    previousStatus: 'Submitted',
    newStatus: 'Under Review',
    sendEmailFn: mockSendEmail,
    forceResend: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.deliveryStatus, 'sent');
  assert.equal(result.recipient, 'verified.student@gmail.com');
  assert.equal(result.status, 'Under Review');
  assert.ok(sentPayload);
  assert.equal(sentPayload.to, 'verified.student@gmail.com');
  assert.match(sentPayload.subject, /Application Status: Under Review/);

  // Check history retrieval
  const history = await getApplicationNotificationHistory(appId);
  assert.ok(history.length >= 1);
  assert.equal(history[0].application_id, appId);
  assert.equal(history[0].new_status, 'Under Review');
  assert.equal(history[0].delivery_status, 'sent');
});

test('8. sendStatusUpdateNotification deduplicates duplicate sends within 60 seconds', async () => {
  let sendCount = 0;
  const mockSendEmail = async () => {
    sendCount++;
    return { provider: 'mock_provider', success: true };
  };

  const appId = `MAI-DEDUPE-${Date.now()}`;
  const first = await sendStatusUpdateNotification({
    applicationId: appId,
    customerEmail: 'dedupe.user@gmail.com',
    previousStatus: 'Submitted',
    newStatus: 'Verification Pending',
    sendEmailFn: mockSendEmail,
  });
  assert.equal(first.success, true);
  assert.equal(first.deliveryStatus, 'sent');
  assert.equal(sendCount, 1);

  // Second immediate attempt with same status should be deduplicated
  const second = await sendStatusUpdateNotification({
    applicationId: appId,
    customerEmail: 'dedupe.user@gmail.com',
    previousStatus: 'Submitted',
    newStatus: 'Verification Pending',
    sendEmailFn: mockSendEmail,
  });
  assert.equal(second.deliveryStatus, 'skipped');
  assert.equal(sendCount, 1); // Not sent again
});

test('9. sendStatusUpdateNotification handles delivery failure gracefully without crashing', async () => {
  const failingSendEmail = async () => {
    throw new Error('SMTP connection timed out');
  };

  const appId = `MAI-FAIL-${Date.now()}`;
  const result = await sendStatusUpdateNotification({
    applicationId: appId,
    customerEmail: 'failing.recipient@gmail.com',
    previousStatus: 'Submitted',
    newStatus: 'On Hold',
    sendEmailFn: failingSendEmail,
    forceResend: true,
  });

  assert.equal(result.success, false);
  assert.equal(result.deliveryStatus, 'failed');
  assert.match(result.error, /SMTP connection timed out/);

  // Failure must be recorded in history
  const history = await getApplicationNotificationHistory(appId);
  assert.ok(history.length >= 1);
  assert.equal(history[0].delivery_status, 'failed');
  assert.match(history[0].error_message, /SMTP connection timed out/);
});

test('10. handleAdminNotificationRequest allows authorized admin to query history and retry notification', async () => {
  const appId = `MAI-ADMIN-NOTIF-${Date.now()}`;
  
  // Seed in-memory history
  await sendStatusUpdateNotification({
    applicationId: appId,
    customerEmail: 'student@example.com',
    previousStatus: 'Submitted',
    newStatus: 'Additional Information Required',
    sendEmailFn: async () => ({ provider: 'mock', success: true }),
    forceResend: true,
  });

  const adminHeaders = {
    'x-admin-user-id': testEnv.ADMIN_USER_ID,
    'x-admin-email': testEnv.ADMIN_LOGIN_EMAIL,
  };

  const mockRequireAdmin = async () => ({ id: testEnv.ADMIN_USER_ID, email: testEnv.ADMIN_LOGIN_EMAIL });

  // GET history
  const getRes = await handleAdminNotificationRequest({
    method: 'GET',
    query: { applicationId: appId },
    headers: adminHeaders,
    env: testEnv,
    requireAdmin: mockRequireAdmin,
  });
  assert.equal(getRes.status, 200);
  assert.ok(Array.isArray(getRes.body.history));
  assert.ok(getRes.body.history.length >= 1);

  // POST retry / resend
  let resent = false;
  const postRes = await handleAdminNotificationRequest({
    method: 'POST',
    body: {
      applicationId: appId,
      customerEmail: 'student@example.com',
      previousStatus: 'Submitted',
      newStatus: 'Additional Information Required',
      adminRemark: 'Please upload clear marksheets.',
    },
    headers: adminHeaders,
    env: testEnv,
    requireAdmin: mockRequireAdmin,
    sendEmailFn: async () => {
      resent = true;
      return { provider: 'mock_retry', success: true };
    },
  });
  assert.equal(postRes.status, 200);
  assert.equal(postRes.body.success, true);
  assert.equal(postRes.body.deliveryStatus, 'sent');
  assert.ok(resent);
});
