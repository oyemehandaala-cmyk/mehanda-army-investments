import { deliverEmailMessage, isValidEmail, normalizeEmail } from './emailOtpService.js';
import { getServerSupabaseClient } from './paymentServer.js';
import { requireAdminUser } from './adminAuth.js';

/**
 * Status visual and content configuration for each of the 9 required statuses.
 */
export const STATUS_CONFIG = {
  'Submitted': {
    title: 'Application Submitted & Logged',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeBorder: '#93c5fd',
    icon: '📝',
    headline: 'Your application has been received and queued for review.',
    description:
      'Thank you for submitting your application to Mehanda Army Investments. Your application details and documents have been received and queued for administrative verification.',
    actionGuidance:
      'Our verification desk will begin reviewing your documents shortly. You can track your application status online anytime.',
  },
  'Under Review': {
    title: 'Application Under Review',
    badgeColor: '#0284c7',
    badgeBg: '#f0f9ff',
    badgeBorder: '#7dd3fc',
    icon: '🔍',
    headline: 'Your application is currently being evaluated by our verification team.',
    description:
      'Our verification officers are actively reviewing your submitted application details, documents, and eligibility criteria.',
    actionGuidance:
      'No action is required from you at this time. We will notify you as soon as this review phase concludes.',
  },
  'Additional Information Required': {
    title: 'Action Required: Additional Information Needed',
    badgeColor: '#d97706',
    badgeBg: '#fffbeb',
    badgeBorder: '#fcd34d',
    icon: '⚠️',
    headline: 'Further documents or clarifications are required to process your application.',
    description:
      'During the verification of your application, our team identified specific details or documents that need clarification or re-upload.',
    actionGuidance:
      'Please carefully read the administrator remarks below and contact our team or upload the requested documents promptly to avoid processing delays.',
  },
  'Verification Pending': {
    title: 'Document Verification Pending',
    badgeColor: '#ca8a04',
    badgeBg: '#fefce8',
    badgeBorder: '#fde047',
    icon: '⏳',
    headline: 'Your uploaded documents are in the verification pipeline.',
    description:
      'Your uploaded verification documents have been received and are currently queued for final compliance clearance.',
    actionGuidance:
      'Our team is processing the verification queue. You will receive an update as soon as compliance clearance is granted.',
  },
  'On Hold': {
    title: 'Application On Hold',
    badgeColor: '#ea580c',
    badgeBg: '#fff7ed',
    badgeBorder: '#fdba74',
    icon: '⏸️',
    headline: 'Processing of your application has been temporarily paused.',
    description:
      'Processing of your application has been placed on temporary hold pending review or administrative clarification.',
    actionGuidance:
      'Please check the administrator remarks below for specific instructions on how to resume processing.',
  },
  'Approved': {
    title: 'Application Approved',
    badgeColor: '#16a34a',
    badgeBg: '#f0fdf4',
    badgeBorder: '#86efac',
    icon: '✅',
    headline: 'Congratulations! Your loan application has been approved.',
    description:
      'We are pleased to inform you that your application has successfully passed all verification checks and has been Approved.',
    actionGuidance:
      'Our processing desk will contact you regarding next steps. You can check your application in your dashboard anytime.',
  },
  'Completed': {
    title: 'Application Approved & Completed',
    badgeColor: '#16a34a',
    badgeBg: '#f0fdf4',
    badgeBorder: '#86efac',
    icon: '✅',
    headline: 'Congratulations! Your application has been approved and completed.',
    description:
      'We are pleased to inform you that your application has successfully passed all verification checks and has been marked as Completed.',
    actionGuidance:
      'You can log in to your customer dashboard to view your completed application summary, documents, and next steps.',
  },
  'Enquiry Completed': {
    title: 'Enquiry Consultation Completed',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    badgeBorder: '#6ee7b7',
    icon: '🎯',
    headline: 'Your consultation enquiry has been fully completed.',
    description:
      'Our team has concluded the consultation and advisory review for your enquiry. All requested details have been provided.',
    actionGuidance:
      'Thank you for reaching out to Mehanda Army Investments. If you have any further questions, feel free to submit a new enquiry.',
  },
  'Closed': {
    title: 'Application File Closed',
    badgeColor: '#475569',
    badgeBg: '#f8fafc',
    badgeBorder: '#cbd5e1',
    icon: '📁',
    headline: 'Your application file has concluded and is now closed.',
    description:
      'This application file has concluded and has been archived in our records in accordance with standard procedure.',
    actionGuidance:
      'If you wish to submit a new application or have questions regarding this file, please contact our support team.',
  },
  'Rejected': {
    title: 'Application Status: Rejected',
    badgeColor: '#dc2626',
    badgeBg: '#fef2f2',
    badgeBorder: '#fca5a5',
    icon: '❌',
    headline: 'We regret to inform you that your application could not be approved.',
    description:
      'After careful review against our verification guidelines, your application could not be accepted at this time.',
    actionGuidance:
      'Please carefully review the administrator remarks below for the reason for rejection. You may reapply once the stated requirements are satisfied.',
  },
};

const DEFAULT_STATUS_CONFIG = {
  title: 'Application Status Updated',
  badgeColor: '#2563eb',
  badgeBg: '#eff6ff',
  badgeBorder: '#93c5fd',
  icon: '📋',
  headline: 'Your application status has been updated.',
  description:
    'An administrator has updated the status of your application with Mehanda Army Investments.',
  actionGuidance:
    'You can log in to your customer dashboard anytime to track your progress and view updates.',
};

export function getStatusConfig(status) {
  if (!status || typeof status !== 'string') return DEFAULT_STATUS_CONFIG;
  const trimmed = status.trim();
  return STATUS_CONFIG[trimmed] || DEFAULT_STATUS_CONFIG;
}

// In-memory cache to prevent duplicate notification sends within 60 seconds
export const notificationDeduplicationStore = new Map();

// In-memory fallback history store
export const inMemoryNotificationHistory = new Map();

export function formatDateTime(isoString) {
  try {
    const d = isoString ? new Date(isoString) : new Date();
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' IST';
  } catch {
    return new Date().toISOString();
  }
}

export function buildStatusUpdateEmailHtml({
  customerName = 'Applicant',
  trackingId = 'MAI-APP',
  formTypeLabel = 'Application Form',
  previousStatus = 'Submitted',
  newStatus = 'Under Review',
  statusUpdatedAt = new Date().toISOString(),
  adminRemark = null,
  trackingUrl = null,
}) {
  const config = getStatusConfig(newStatus);
  const formattedDate = formatDateTime(statusUpdatedAt);
  const portalUrl = trackingUrl || `https://mehandaarmy.net/dashboard?trackingId=${encodeURIComponent(trackingId)}`;

  const remarksBlock = adminRemark && String(adminRemark).trim()
    ? `
      <div style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #ca8a04; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #854d0e;">
          💬 Administrator Remarks / Instructions
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #713f12; white-space: pre-wrap;">${escapeHtml(String(adminRemark).trim())}</p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status: ${escapeHtml(newStatus)} - Mehanda Army Investments</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050a14; margin: 0; padding: 28px 12px; color: #e2e8f0;">
  <div style="max-width: 600px; margin: 0 auto; background: #0c1527; border-radius: 20px; border: 1px solid #c5a880; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);">
    
    <!-- Top 24k Gold Shimmer Bar -->
    <div style="height: 3px; background: linear-gradient(90deg, #876a2e 0%, #dfb24e 50%, #876a2e 100%);"></div>

    <!-- Header with Mehanda Army Investments Branding -->
    <div style="background: linear-gradient(180deg, #0f1d33 0%, #0c1527 100%); padding: 32px 24px 22px; text-align: center; border-bottom: 1px solid rgba(197, 168, 128, 0.25);">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 12px auto;">
        <tr>
          <td style="width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #1e3a63 0%, #0e2038 100%); border: 1px solid #c5a880; text-align: center; vertical-align: middle; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);">
            <span style="font-size: 22px; line-height: 48px; color: #e5c07b;">📈</span>
          </td>
        </tr>
      </table>
      <h1 style="color: #ffffff; margin: 0; font-size: 21px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
        MEHANDA ARMY INVESTMENTS
      </h1>
      <p style="color: #e5c07b; margin: 8px 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
        Official Workflow Status Notification
      </p>
    </div>

    <!-- Main Content Body -->
    <div style="padding: 34px 28px 28px; background: #0c1527;">
      
      <!-- Greeting -->
      <p style="font-size: 15px; line-height: 1.5; color: #cbd5e1; margin-top: 0; margin-bottom: 22px;">
        Dear <strong style="color: #ffffff;">${escapeHtml(customerName)}</strong>,
      </p>

      <!-- Status Hero Box -->
      <div style="background: linear-gradient(180deg, #121e35 0%, #0a1324 100%); border: 1.5px solid #c5a880; border-radius: 16px; padding: 24px 20px; margin-bottom: 26px; text-align: center; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);">
        <div style="font-size: 32px; margin-bottom: 10px;">${config.icon}</div>
        <div style="display: inline-block; background-color: ${config.badgeColor}; color: #ffffff; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 5px 16px; border-radius: 9999px; margin-bottom: 12px;">
          ${escapeHtml(newStatus)}
        </div>
        <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #ffffff;">
          ${escapeHtml(config.headline)}
        </h2>
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #94a3b8;">
          ${escapeHtml(config.description)}
        </p>
      </div>

      <!-- Application Details Card -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #08101d; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; font-size: 13px;">
        <tbody>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
            <td style="padding: 10px 16px; color: #94a3b8; font-weight: 600; width: 40%;">Application Type</td>
            <td style="padding: 10px 16px; color: #ffffff; font-weight: 700;">${escapeHtml(formTypeLabel)}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
            <td style="padding: 10px 16px; color: #94a3b8; font-weight: 600;">Tracking Reference ID</td>
            <td style="padding: 10px 16px; color: #ffffff; font-family: 'Courier New', Courier, monospace; font-weight: 800;">${escapeHtml(trackingId)}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
            <td style="padding: 10px 16px; color: #94a3b8; font-weight: 600;">Previous Status</td>
            <td style="padding: 10px 16px; color: #64748b;">${escapeHtml(previousStatus || 'Submitted')}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
            <td style="padding: 10px 16px; color: #94a3b8; font-weight: 600;">Updated Status</td>
            <td style="padding: 10px 16px; color: ${config.badgeColor}; font-weight: 800;">${escapeHtml(newStatus)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; color: #94a3b8; font-weight: 600;">Status Updated On</td>
            <td style="padding: 10px 16px; color: #ffffff;">${escapeHtml(formattedDate)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Administrator Remarks Callout -->
      ${remarksBlock}

      <!-- Next Steps & Guidance -->
      <div style="background: rgba(197, 168, 128, 0.08); border-left: 4px solid #c5a880; padding: 14px 18px; margin: 24px 0; border-radius: 4px 12px 12px 4px;">
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #e2e8f0;">
          ℹ️ <strong>Next Steps:</strong> ${escapeHtml(config.actionGuidance)}
        </p>
      </div>

      <!-- Action Button -->
      <div style="margin: 32px 0 20px; text-align: center;">
        <a href="${escapeHtml(portalUrl)}" style="display: inline-block; background: linear-gradient(135deg, #1e3a63 0%, #0e2038 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 34px; border-radius: 12px; border: 1.5px solid #c5a880; box-shadow: 0 4px 15px rgba(0,0,0,0.3); letter-spacing: 0.5px;">
          Track Your Application Online →
        </a>
      </div>

      <p style="font-size: 12px; line-height: 1.5; color: #64748b; text-align: center; margin-bottom: 0;">
        You can also track your application status at: <br>
        <span style="font-family: 'Courier New', Courier, monospace; color: #94a3b8; word-break: break-all;">${escapeHtml(portalUrl)}</span>
      </p>

    </div>

    <!-- Official Footer -->
    <div style="background: #08101d; padding: 22px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08);">
      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #cbd5e1;">
        Mehanda Army Investments
      </p>
      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.6;">
        Hisar, Haryana, India<br>
        Direct Helpline: <strong>+91 9812947813</strong> • Official Email: <strong>info@mehandaarmy.net</strong>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 10px; color: #475569; line-height: 1.4;">
        This is an official automated notification regarding your application. If you did not apply with Mehanda Army Investments, please contact our support desk immediately.
      </p>
    </div>

  </div>
</body>
</html>`;
}

export function buildStatusUpdateEmailText({
  customerName = 'Applicant',
  trackingId = 'MAI-APP',
  formTypeLabel = 'Application Form',
  previousStatus = 'Submitted',
  newStatus = 'Under Review',
  statusUpdatedAt = new Date().toISOString(),
  adminRemark = null,
  trackingUrl = null,
}) {
  const config = getStatusConfig(newStatus);
  const formattedDate = formatDateTime(statusUpdatedAt);
  const portalUrl = trackingUrl || `https://mehandaarmy.net/dashboard?trackingId=${encodeURIComponent(trackingId)}`;

  let text = `MEHANDA ARMY INVESTMENTS\n`;
  text += `OFFICIAL STATUS UPDATE NOTIFICATION\n`;
  text += `====================================================\n\n`;
  text += `Dear ${customerName},\n\n`;
  text += `Your ${formTypeLabel} (Tracking ID: ${trackingId}) has been updated.\n\n`;
  text += `CURRENT STATUS: ${newStatus.toUpperCase()}\n`;
  text += `${config.headline}\n\n`;
  text += `DETAILS:\n`;
  text += `• Application Type: ${formTypeLabel}\n`;
  text += `• Tracking ID: ${trackingId}\n`;
  text += `• Previous Status: ${previousStatus || 'Submitted'}\n`;
  text += `• New Status: ${newStatus}\n`;
  text += `• Updated On: ${formattedDate}\n\n`;
  text += `SUMMARY:\n`;
  text += `${config.description}\n\n`;

  if (adminRemark && String(adminRemark).trim()) {
    text += `ADMINISTRATOR REMARKS / INSTRUCTIONS:\n`;
    text += `${String(adminRemark).trim()}\n\n`;
  }

  text += `NEXT STEPS:\n`;
  text += `${config.actionGuidance}\n\n`;
  text += `Track your application online:\n`;
  text += `${portalUrl}\n\n`;
  text += `====================================================\n`;
  text += `Mehanda Army Investments\n`;
  text += `Hisar, Haryana, India\n`;
  text += `Direct Helpline: +91 9812947813 | Email: info@mehandaarmy.net\n`;

  return text;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Send an automated email notification when an administrator updates workflow status.
 *
 * Requirements:
 * - Real emails via configured transactional email provider (Resend, SMTP, etc.)
 * - Sent only to verified / registered customer email
 * - Idempotency: skip if status is identical or sent within last 60 seconds
 * - Records log in application_email_notifications
 * - Non-blocking on delivery failure: logs error and returns delivery result
 */
export async function sendStatusUpdateNotification({
  applicationId,
  customerEmail,
  customerName = 'Applicant',
  formType = 'student_loan',
  formTypeLabel = null,
  previousStatus = 'Submitted',
  newStatus,
  adminRemark = null,
  env = process.env,
  createClient = null,
  fetchImpl = fetch,
  sendEmailFn = null,
  sendSmtpFn = null,
  forceResend = false,
}) {
  const normalizedEmail = normalizeEmail(customerEmail);

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      deliveryStatus: 'failed',
      skipped: true,
      reason: 'No valid recipient email address found for this application.',
    };
  }

  if (!newStatus || typeof newStatus !== 'string') {
    return {
      success: false,
      deliveryStatus: 'failed',
      reason: 'New status is required.',
    };
  }

  // Idempotency: skip if status didn't change and no remarks provided and not forceResend
  const hasRemark = Boolean(adminRemark && String(adminRemark).trim());
  if (!forceResend && !hasRemark && previousStatus && previousStatus.trim().toLowerCase() === newStatus.trim().toLowerCase()) {
    return {
      success: true,
      deliveryStatus: 'skipped',
      skipped: true,
      reason: 'Status has not changed.',
    };
  }

  // Deduplication check: prevent rapid double-clicks within 10 seconds unless forceResend
  const dedupeKey = `${applicationId}:${newStatus.trim()}:${normalizedEmail}`;
  const now = Date.now();
  if (!forceResend && notificationDeduplicationStore.has(dedupeKey)) {
    const lastSent = notificationDeduplicationStore.get(dedupeKey);
    if (now - lastSent < 10 * 1000) {
      return {
        success: true,
        deliveryStatus: 'skipped',
        skipped: true,
        reason: 'Notification for this status was already sent recently.',
      };
    }
  }

  const resolvedLabel = formTypeLabel || (
    formType === 'student_loan'
      ? 'Student Loan Application'
      : formType === 'investment'
        ? 'Investment Application'
        : 'Service / Contact Enquiry'
  );

  const statusUpdatedAt = new Date().toISOString();
  const subject = `Application Status: ${newStatus} (${applicationId}) - Mehanda Army Investments`;

  const html = buildStatusUpdateEmailHtml({
    customerName,
    trackingId: applicationId,
    formTypeLabel: resolvedLabel,
    previousStatus,
    newStatus,
    statusUpdatedAt,
    adminRemark,
  });

  const text = buildStatusUpdateEmailText({
    customerName,
    trackingId: applicationId,
    formTypeLabel: resolvedLabel,
    previousStatus,
    newStatus,
    statusUpdatedAt,
    adminRemark,
  });

  let deliveryResult = { provider: 'unknown', success: false };
  let deliveryStatus = 'failed';
  let deliveryError = null;

  try {
    deliveryResult = await deliverEmailMessage({
      to: normalizedEmail,
      subject,
      html,
      text,
      env,
      fetchImpl,
      sendEmailFn,
      sendSmtpFn,
    });
    deliveryStatus = 'sent';
    notificationDeduplicationStore.set(dedupeKey, now);
  } catch (err) {
    deliveryError = err.message || 'Email delivery failed.';
    console.warn(`[status-notification] Delivery to ${normalizedEmail} failed:`, deliveryError);
  }

  // Record notification in memory
  const logEntry = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    application_id: applicationId,
    form_type: formType,
    recipient_email: normalizedEmail,
    recipient_name: customerName,
    previous_status: previousStatus,
    new_status: newStatus,
    subject,
    admin_remark: adminRemark || null,
    delivery_status: deliveryStatus,
    delivery_provider: deliveryResult.provider || null,
    error_message: deliveryError,
    created_at: statusUpdatedAt,
  };

  const appLogs = inMemoryNotificationHistory.get(applicationId) || [];
  appLogs.unshift(logEntry);
  inMemoryNotificationHistory.set(applicationId, appLogs.slice(0, 50));

  // Persist to Supabase application_email_notifications table if available
  if (createClient) {
    try {
      const client = getServerSupabaseClient(env, createClient);
      await client.from('application_email_notifications').insert({
        application_id: applicationId,
        form_type: formType,
        recipient_email: normalizedEmail,
        recipient_name: customerName,
        previous_status: previousStatus,
        new_status: newStatus,
        subject,
        admin_remark: adminRemark || null,
        delivery_status: deliveryStatus,
        delivery_provider: deliveryResult.provider || null,
        error_message: deliveryError,
        created_at: statusUpdatedAt,
      });
    } catch (dbErr) {
      // Soft-fail DB write so status update never breaks if table is pending migration
      console.warn('[status-notification] Could not record notification log in Supabase:', dbErr.message);
    }
  }

  return {
    success: deliveryStatus === 'sent',
    deliveryStatus,
    provider: deliveryResult.provider || null,
    error: deliveryError,
    recipient: normalizedEmail,
    status: newStatus,
    timestamp: statusUpdatedAt,
  };
}

/**
 * Retrieve notification history for a specific application.
 */
export async function getApplicationNotificationHistory(applicationId, { env = process.env, createClient = null } = {}) {
  if (!applicationId) return [];

  let dbLogs = [];
  if (createClient) {
    try {
      const client = getServerSupabaseClient(env, createClient);
      const { data, error } = await client
        .from('application_email_notifications')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && Array.isArray(data)) {
        dbLogs = data;
      }
    } catch (_) {}
  }

  const memoryLogs = inMemoryNotificationHistory.get(applicationId) || [];
  
  // Merge and deduplicate by timestamp + new_status
  const seen = new Set();
  const merged = [];

  for (const item of [...dbLogs, ...memoryLogs]) {
    const key = `${item.application_id || applicationId}:${item.new_status}:${item.created_at}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Handle incoming admin notification HTTP requests (history lookup and retry/resend).
 */
export async function handleAdminNotificationRequest({
  method,
  query = {},
  body = {},
  headers = {},
  env = process.env,
  createClient = null,
  fetchImpl = fetch,
  requireAdmin = requireAdminUser,
  sendEmailFn = null,
  sendSmtpFn = null,
}) {
  await requireAdmin(headers, { env });

  if (method === 'GET') {
    const applicationId = query.applicationId || query.trackingId || query.id;
    if (!applicationId) {
      return { status: 400, body: { success: false, error: 'Application ID is required.' } };
    }
    const history = await getApplicationNotificationHistory(applicationId, { env, createClient });
    return { status: 200, body: { success: true, history } };
  }

  if (method === 'POST') {
    const {
      applicationId,
      customerEmail,
      customerName,
      formType,
      formTypeLabel,
      previousStatus,
      newStatus,
      adminRemark,
    } = body || {};

    if (!applicationId || !customerEmail || !newStatus) {
      return {
        status: 400,
        body: { success: false, error: 'Application ID, recipient email, and new status are required.' },
      };
    }

    const result = await sendStatusUpdateNotification({
      applicationId,
      customerEmail,
      customerName: customerName || 'Applicant',
      formType: formType || 'student_loan',
      formTypeLabel,
      previousStatus: previousStatus || 'Submitted',
      newStatus,
      adminRemark,
      env,
      createClient,
      fetchImpl,
      sendEmailFn,
      sendSmtpFn,
      forceResend: true,
    });

    return {
      status: result.success ? 200 : 502,
      body: {
        success: result.success,
        deliveryStatus: result.deliveryStatus,
        provider: result.provider,
        error: result.error,
        notification: result,
      },
    };
  }

  return { status: 405, body: { success: false, error: 'Method not allowed.' } };
}
