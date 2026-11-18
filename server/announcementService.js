import crypto from 'node:crypto';
import { deliverEmailMessage, isValidEmail, normalizeEmail } from './emailOtpService.js';
import { requireAdminUser, createAdminServiceClient } from './adminAuth.js';

// In-memory fallback stores when Supabase tables are not yet migrated
const memoryAnnouncementHistory = [];
const memoryUnsubscribes = new Set();
export const announcementImageStore = new Map();

export function getAnnouncementImage(name) {
  if (!name) return null;
  return announcementImageStore.get(name) || null;
}

/**
 * Formats rich text message into clean email HTML paragraphs, bullet points, and links.
 */
function formatMessageToHtml(rawText = '') {
  if (!rawText) return '';
  const lines = String(rawText).split(/\r?\n/);
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(`<ul style="margin: 12px 0; padding-left: 24px; color: #334155; line-height: 1.6;">${currentList.map((item) => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}</ul>`);
      currentList = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    // Bullet point
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      currentList.push(formatInlineFormatting(trimmed.slice(2)));
    } else {
      flushList();
      elements.push(`<p style="margin: 0 0 14px 0; line-height: 1.65; color: #334155; font-size: 15px;">${formatInlineFormatting(trimmed)}</p>`);
    }
  }
  flushList();
  return elements.join('');
}

function formatInlineFormatting(text) {
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text**
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Links: [text](url)
  safe = safe.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color: #7C3AED; text-decoration: underline;" target="_blank" rel="noopener noreferrer">$1</a>');

  return safe;
}

/**
 * Builds responsive, Gmail mobile and desktop tested HTML email template.
 */
export function buildAnnouncementEmailHtml({
  subject,
  title,
  message,
  imageUrl,
  imagePosition = 'top',
  ctaText,
  ctaUrl,
  recipientEmail,
  siteUrl = 'https://mehandaarmy.net',
}) {
  const unsubscribeUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(recipientEmail || '')}`;
  const formattedBody = formatMessageToHtml(message);

  const imageBlock = imageUrl ? `
    <div style="margin: 20px 0; text-align: center;">
      <img src="${imageUrl}" alt="${title || 'Announcement'}" style="max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 0 auto; border: 1px solid #E2E8F0;" />
    </div>
  ` : '';

  const ctaBlock = (ctaText && ctaUrl) ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #7C3AED; color: #FFFFFF; font-weight: 700; font-size: 15px; padding: 13px 32px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);">
        ${ctaText} &rarr;
      </a>
    </div>
  ` : '';

  let bodyContent = '';
  if (imagePosition === 'top') {
    bodyContent = `${imageBlock}${formattedBody}${ctaBlock}`;
  } else if (imagePosition === 'middle') {
    // If middle, split formattedBody roughly in half or place image between
    const paragraphs = formattedBody.split('</p>');
    if (paragraphs.length > 2) {
      const mid = Math.floor(paragraphs.length / 2);
      const firstHalf = paragraphs.slice(0, mid).join('</p>') + '</p>';
      const secondHalf = paragraphs.slice(mid).join('</p>');
      bodyContent = `${firstHalf}${imageBlock}${secondHalf}${ctaBlock}`;
    } else {
      bodyContent = `${formattedBody}${imageBlock}${ctaBlock}`;
    }
  } else {
    // Bottom
    bodyContent = `${formattedBody}${ctaBlock}${imageBlock}`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F1F5F9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (max-width 600px for Gmail) -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.07); border: 1px solid #E2E8F0;">
          
          <!-- Top Header: Deep Navy with Crisp Gold Typography (Matching Reference Header) -->
          <tr>
            <td style="background-color: #0B1A2C; padding: 34px 28px 24px 28px; text-align: center; border-bottom: 2px solid #DFB24E;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="color: #FFFFFF; font-size: 21px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.25;">
                      MEHANDA ARMY INVESTMENTS
                      <span style="display: inline-block; vertical-align: middle; margin-left: 6px;" title="Official Verified Organization">
                        <svg width="22" height="22" viewBox="0 0 24 24" style="vertical-align: middle; display: inline-block;">
                          <path fill="#1688F8" d="M12 1.4c1.05 0 1.35 1.65 2.35 1.92s2.2-.86 3.1-.35-.5 2.16.27 2.93 2.41.36 2.93 1.27-0.86 2.1-.6 3.1S22 11.55 22 12.6s-1.65 1.35-1.92 2.35.86 2.2.35 3.1-2.16-.5-2.93.27-.36 2.41-1.27 2.93-2.1-.86-3.1-.6S13.05 22.6 12 22.6s-1.35-1.65-2.35-1.92-2.2.86-3.1.35.5-2.16-.27-2.93-2.41-.36-2.93-1.27.86-2.1.6-3.1S2 13.65 2 12.6s1.65-1.35 1.92-2.35-.86-2.2-.35-3.1 2.16.5 2.93-.27.36-2.41 1.27-2.93 2.1.86 3.1.6S10.95 1.4 12 1.4Z"/>
                          <path d="m7.3 12.15 3.05 3.05 6.45-6.55" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </span>
                    </div>
                    <div style="color: #DFB24E; font-size: 11px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; margin-top: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      OFFICIAL ANNOUNCEMENT • VERIFIED DESK
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title Banner -->
          <tr>
            <td style="padding: 32px 32px 12px 32px;">
              <h1 style="margin: 0; color: #0F172A; font-size: 22px; font-weight: 800; line-height: 1.35; letter-spacing: -0.01em;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Announcement Body Content -->
          <tr>
            <td style="padding: 12px 32px 28px 32px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Contact Information Box -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; color: #7C3AED; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">
                      Official Support &amp; Consultation
                    </div>
                    <div style="font-size: 13px; color: #475569; line-height: 1.6;">
                      <strong>Helpline:</strong> <a href="tel:+919812947813" style="color: #0F172A; text-decoration: none;">+91 9812947813</a><br>
                      <strong>Email:</strong> <a href="mailto:info@mehandaarmy.net" style="color: #0F172A; text-decoration: none; font-weight: 700;">info@mehandaarmy.net</a> <span style="display: inline-block; background-color: #1688F8; color: #FFFFFF; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; vertical-align: middle; margin-left: 6px; letter-spacing: 0.04em;">&#10003; VERIFIED OFFICIAL</span><br>
                      <strong>Official Portal:</strong> <a href="${siteUrl}" style="color: #DFB24E; text-decoration: underline;" target="_blank">${siteUrl.replace(/^https?:\/\//, '')}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0F172A; padding: 24px 32px; text-align: center; color: #94A3B8; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 8px 0; color: #CBD5E1; font-weight: 600;">
                Mehanda Army Investments
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px;">
                Smart Finance. Secure Future. Enterprise Investment Gateway.
              </p>
              <div style="font-size: 10px; color: #64748B; border-top: 1px solid #1E293B; padding-top: 12px; margin-top: 12px;">
                You received this official announcement as a registered customer of Mehanda Army Investments.<br>
                <a href="${unsubscribeUrl}" style="color: #94A3B8; text-decoration: underline; margin-top: 4px; display: inline-block;">
                  Unsubscribe from announcements
                </a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildAnnouncementEmailText({ title, message, ctaText, ctaUrl, siteUrl = 'https://mehandaarmy.net' }) {
  return `MEHANDA ARMY INVESTMENTS
Official Announcement

${title}
${'='.repeat(title.length)}

${message}

${ctaText && ctaUrl ? `Action: ${ctaText} -> ${ctaUrl}\n\n` : ''}
---
Official Support: +91 9812947813
Email: info@mehandaarmy.net
Website: ${siteUrl}

To unsubscribe from announcement emails, visit: ${siteUrl}/unsubscribe
`;
}

/**
 * Retrieves eligible customer emails with statistics from all database tables and auth.
 */
export async function getEligibleCustomerEmailsWithStats(env = process.env, createClient) {
  const serviceClient = createAdminServiceClient(env, createClient);
  const emailsSet = new Set();

  const addEmail = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    const clean = normalizeEmail(raw.trim());
    if (isValidEmail(clean)) {
      emailsSet.add(clean);
    }
  };

  // 1. Fetch from profiles table
  try {
    const { data: profileRows, error } = await serviceClient
      .from('profiles')
      .select('email, full_name')
      .not('email', 'is', null);

    if (!error && Array.isArray(profileRows)) {
      profileRows.forEach((p) => addEmail(p.email));
    }
  } catch (err) {
    console.warn('[announcement-service] profiles query:', err.message);
  }

  // 2. Fetch from auth.users via admin API
  try {
    const { data: authData, error: authError } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
    if (!authError && Array.isArray(authData?.users)) {
      authData.users.forEach((u) => addEmail(u.email));
    }
  } catch (err) {
    console.warn('[announcement-service] auth users query:', err.message);
  }

  // 3. Fetch from investment_enquiries table
  try {
    const { data: invRows, error: invErr } = await serviceClient
      .from('investment_enquiries')
      .select('email, verified_email')
      .not('email', 'is', null);

    if (!invErr && Array.isArray(invRows)) {
      invRows.forEach((r) => {
        addEmail(r.email);
        addEmail(r.verified_email);
      });
    }
  } catch (_) {}

  // 4. Fetch from student_loan_demo_applications table
  try {
    const { data: loanRows, error: loanErr } = await serviceClient
      .from('student_loan_demo_applications')
      .select('email, registered_email, guardian_email')
      .not('email', 'is', null);

    if (!loanErr && Array.isArray(loanRows)) {
      loanRows.forEach((r) => {
        addEmail(r.email);
        addEmail(r.registered_email);
        addEmail(r.guardian_email);
      });
    }
  } catch (_) {}

  // 5. Fetch from contact_enquiries table
  try {
    const { data: contactRows, error: contactErr } = await serviceClient
      .from('contact_enquiries')
      .select('email')
      .not('email', 'is', null);

    if (!contactErr && Array.isArray(contactRows)) {
      contactRows.forEach((r) => addEmail(r.email));
    }
  } catch (_) {}

  // 6. Fetch from service_payments table
  try {
    const { data: payRows, error: payErr } = await serviceClient
      .from('service_payments')
      .select('customer_email, email')
      .not('customer_email', 'is', null);

    if (!payErr && Array.isArray(payRows)) {
      payRows.forEach((r) => {
        addEmail(r.customer_email);
        addEmail(r.email);
      });
    }
  } catch (_) {}

  // Exclude company sender email so we don't send customer marketing blasts to ourselves
  const companyEmail = normalizeEmail(env.SMTP_USER || 'info@mehandaarmy.net');
  emailsSet.delete(companyEmail);
  emailsSet.delete('info@mehandaarmy.net');
  emailsSet.delete('mehandaarmy.info@gmail.com');
  emailsSet.delete('info@mehandaarmy.in');

  // Filter out unsubscribes
  let unsubscribedCount = 0;
  try {
    const { data: unsubRows, error } = await serviceClient
      .from('announcement_unsubscribes')
      .select('email');

    if (!error && Array.isArray(unsubRows)) {
      unsubscribedCount = unsubRows.length;
      for (const u of unsubRows) {
        if (u.email) emailsSet.delete(normalizeEmail(u.email));
      }
    }
  } catch (err) {
    unsubscribedCount = memoryUnsubscribes.size;
    for (const email of memoryUnsubscribes) {
      emailsSet.delete(email);
    }
  }

  const emails = Array.from(emailsSet);
  return { emails, unsubscribedCount };
}

export async function getEligibleCustomerEmails(env = process.env, createClient) {
  const { emails } = await getEligibleCustomerEmailsWithStats(env, createClient);
  return emails;
}

/**
 * Handles sending announcement (individual, multiple, all_customers, test).
 */
export async function handleSendAnnouncement({ body = {}, headers = {}, env = process.env, createClient }) {
  const adminUser = await requireAdminUser(headers, { env, createClient });
  const serviceClient = createAdminServiceClient(env, createClient);

  const {
    subject,
    title,
    message,
    imageUrl = '',
    imagePosition = 'top',
    ctaText = '',
    ctaUrl = '',
    recipientType = 'individual',
    recipients = [],
    testEmail = '',
  } = body;

  // Validation
  if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
    throw new Error('Please provide an email subject of at least 3 characters.');
  }
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    throw new Error('Please provide an announcement title.');
  }
  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    throw new Error('Please enter a message of at least 5 characters.');
  }
  if (!['top', 'middle', 'bottom'].includes(imagePosition)) {
    throw new Error('Invalid image placement.');
  }

  // Resolve target email list
  let targetEmails = [];

  if (recipientType === 'test') {
    const rawTest = testEmail || body.testEmail || body.recipientEmail || adminUser.email || 'oyemehandaala@gmail.com';
    const cleanTestEmail = normalizeEmail(rawTest);
    if (!isValidEmail(cleanTestEmail)) {
      throw new Error('Please enter a valid test recipient email address.');
    }
    targetEmails = [cleanTestEmail];
  } else if (recipientType === 'individual') {
    const singleEmail =
      body.recipientEmail ||
      (Array.isArray(body.recipientEmails) ? body.recipientEmails[0] : '') ||
      (Array.isArray(recipients) ? recipients[0] : (typeof recipients === 'string' ? recipients : '')) ||
      body.email ||
      '';
    const clean = normalizeEmail(singleEmail);
    if (!isValidEmail(clean)) {
      throw new Error(`Please enter a valid recipient email address.`);
    }
    targetEmails = [clean];
  } else if (recipientType === 'multiple') {
    const rawList =
      (Array.isArray(body.recipientEmails) && body.recipientEmails.length > 0)
        ? body.recipientEmails
        : (Array.isArray(recipients) && recipients.length > 0)
        ? recipients
        : (typeof body.recipientEmails === 'string'
        ? body.recipientEmails.split(/[,;\r\n]+/)
        : (typeof recipients === 'string' ? recipients.split(/[,;\r\n]+/) : []));

    const validList = rawList
      .map(normalizeEmail)
      .filter((e) => e && isValidEmail(e));

    targetEmails = Array.from(new Set(validList));
    if (targetEmails.length === 0) {
      throw new Error('Please enter at least one valid recipient email address.');
    }
  } else if (recipientType === 'all_customers') {
    targetEmails = await getEligibleCustomerEmails(env, createClient);
    if (targetEmails.length === 0 && Array.isArray(body.recipients) && body.recipients.length > 0) {
      targetEmails = Array.from(new Set(body.recipients.map(normalizeEmail).filter(isValidEmail)));
    }
    if (targetEmails.length === 0) {
      throw new Error('No registered customer emails found in the database.');
    }
  } else {
    throw new Error('Invalid recipient type selected.');
  }

  // Safety bound: limit bulk announcement to 500 per request
  const MAX_RECIPIENTS = 500;
  if (targetEmails.length > MAX_RECIPIENTS) {
    targetEmails = targetEmails.slice(0, MAX_RECIPIENTS);
  }

  const announcementId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  // Try creating record in Supabase email_announcements
  let dbRecordCreated = false;
  try {
    const adminId = (adminUser?.id && /^[0-9a-f-]{36}$/i.test(adminUser.id)) ? adminUser.id : null;
    const { error: insertErr } = await serviceClient.from('email_announcements').insert({
      id: announcementId,
      admin_user_id: adminId,
      subject: subject.trim(),
      title: title.trim(),
      message: message.trim(),
      image_url: imageUrl || null,
      image_position: imagePosition,
      cta_text: ctaText.trim() || null,
      cta_url: ctaUrl.trim() || null,
      recipient_type: recipientType,
      total_recipients: targetEmails.length,
      sent_count: 0,
      failed_count: 0,
      status: 'Pending',
      created_at: nowIso,
    });
    if (!insertErr) {
      dbRecordCreated = true;
    } else {
      console.warn('[announcement-service] insert notice:', insertErr.message);
      // Retry without foreign key if FK on admin_user_id was the issue
      if (adminId && (insertErr.message?.includes('foreign key') || insertErr.code === '23503')) {
        const { error: retryErr } = await serviceClient.from('email_announcements').insert({
          id: announcementId,
          admin_user_id: null,
          subject: subject.trim(),
          title: title.trim(),
          message: message.trim(),
          image_url: imageUrl || null,
          image_position: imagePosition,
          cta_text: ctaText.trim() || null,
          cta_url: ctaUrl.trim() || null,
          recipient_type: recipientType,
          total_recipients: targetEmails.length,
          sent_count: 0,
          failed_count: 0,
          status: 'Pending',
          created_at: nowIso,
        });
        if (!retryErr) dbRecordCreated = true;
      }
    }
  } catch (err) {
    console.warn('[announcement-service] email_announcements table not available in DB:', err.message);
  }

  let sentCount = 0;
  let failedCount = 0;
  const recipientResults = [];

  // Deliver real emails concurrently in safe batches
  const BATCH_SIZE = 3;
  for (let i = 0; i < targetEmails.length; i += BATCH_SIZE) {
    const chunk = targetEmails.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(chunk.map(async (recipientEmail) => {
      const html = buildAnnouncementEmailHtml({
        subject: subject.trim(),
        title: title.trim(),
        message: message.trim(),
        imageUrl,
        imagePosition,
        ctaText: ctaText.trim(),
        ctaUrl: ctaUrl.trim(),
        recipientEmail,
      });
      const text = buildAnnouncementEmailText({
        title: title.trim(),
        message: message.trim(),
        ctaText: ctaText.trim(),
        ctaUrl: ctaUrl.trim(),
      });

      try {
        const res = await deliverEmailMessage({
          to: recipientEmail,
          subject: subject.trim(),
          html,
          text,
          env,
        });

        sentCount++;
        recipientResults.push({
          email: recipientEmail,
          status: 'sent',
          provider: res?.provider || 'smtp',
        });

        // Log recipient delivery to DB
        if (dbRecordCreated) {
          serviceClient.from('email_announcement_recipients').insert({
            announcement_id: announcementId,
            recipient_email: recipientEmail,
            status: 'sent',
            provider: res?.provider || 'smtp',
          }).catch(() => {});
        }
      } catch (deliveryError) {
        failedCount++;
        const errMsg = deliveryError.message || 'Delivery failed';
        recipientResults.push({
          email: recipientEmail,
          status: 'failed',
          error: errMsg,
        });

        if (dbRecordCreated) {
          serviceClient.from('email_announcement_recipients').insert({
            announcement_id: announcementId,
            recipient_email: recipientEmail,
            status: 'failed',
            error_message: errMsg,
          }).catch(() => {});
        }
      }
    }));
  }

  const finalStatus = failedCount === 0 ? 'Sent' : (sentCount === 0 ? 'Failed' : 'Partial');

  // Update DB record
  if (dbRecordCreated) {
    try {
      await serviceClient.from('email_announcements').update({
        sent_count: sentCount,
        failed_count: failedCount,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', announcementId);
    } catch (_) {}
  }

  const campaignResult = {
    id: announcementId,
    subject: subject.trim(),
    title: title.trim(),
    recipientType,
    totalRecipients: targetEmails.length,
    sentCount,
    failedCount,
    status: finalStatus,
    createdAt: nowIso,
    recipients: recipientResults,
  };

  // Add to in-memory history for instant UI availability
  memoryAnnouncementHistory.unshift(campaignResult);
  if (memoryAnnouncementHistory.length > 100) memoryAnnouncementHistory.pop();

  return {
    success: true,
    campaign: campaignResult,
    data: campaignResult,
    sentCount,
    failedCount,
    message: recipientType === 'test'
      ? `✓ Test announcement sent successfully to ${targetEmails[0]}!`
      : `✓ Announcement broadcast finished: ${sentCount} sent, ${failedCount} failed.`,
  };
}

/**
 * Retrieves past announcement history.
 */
export async function handleGetAnnouncementHistory({ headers = {}, env = process.env, createClient }) {
  await requireAdminUser(headers, { env, createClient });
  const serviceClient = createAdminServiceClient(env, createClient);

  let dbItems = [];
  try {
    const { data, error } = await serviceClient
      .from('email_announcements')
      .select('id, subject, title, recipient_type, total_recipients, sent_count, failed_count, status, created_at, image_url, image_position, message, cta_text, cta_url')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      dbItems = data.map((d) => ({
        id: d.id,
        subject: d.subject,
        title: d.title,
        recipientType: d.recipient_type,
        recipient_type: d.recipient_type,
        totalRecipients: d.total_recipients,
        total_recipients: d.total_recipients,
        sentCount: d.sent_count,
        sent_count: d.sent_count,
        failedCount: d.failed_count,
        failed_count: d.failed_count,
        status: d.status,
        createdAt: d.created_at,
        created_at: d.created_at,
        imageUrl: d.image_url,
        image_url: d.image_url,
        imagePosition: d.image_position,
        image_position: d.image_position,
        message: d.message,
        ctaText: d.cta_text,
        ctaUrl: d.cta_url,
      }));
    }
  } catch (err) {
    console.warn('[announcement-service] history table query fallback:', err.message);
  }

  // Combine with memoryAnnouncementHistory and deduplicate
  const idMap = new Map();
  dbItems.forEach((item) => idMap.set(item.id, item));
  memoryAnnouncementHistory.forEach((item) => {
    if (!idMap.has(item.id)) idMap.set(item.id, item);
  });

  const combined = Array.from(idMap.values()).sort((a, b) => {
    const tA = new Date(a.created_at || a.createdAt || 0).getTime();
    const tB = new Date(b.created_at || b.createdAt || 0).getTime();
    return tB - tA;
  });

  return {
    success: true,
    history: combined,
    data: combined,
  };
}

/**
 * Handles image upload for announcements to Supabase Storage.
 */
export async function handleUploadAnnouncementImage({ base64Data, fileName = 'image.png', contentType = 'image/png', headers = {}, env = process.env, createClient }) {
  await requireAdminUser(headers, { env, createClient });
  const serviceClient = createAdminServiceClient(env, createClient);

  if (!base64Data || typeof base64Data !== 'string') {
    throw new Error('Image data is required.');
  }

  // Remove data URI prefix if present
  const base64Pure = base64Data.replace(/^data:[^;]+;base64,/, '');
  const bytes = Buffer.from(base64Pure, 'base64');

  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error('Image size exceeds 5MB limit.');
  }

  const ext = (fileName.split('.').pop() || 'png').toLowerCase();
  const safeName = `announcement-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const filePath = `announcements/${safeName}`;

  // Store image in memory cache so it can always be served publicly via /api/admin-announcements?action=image
  announcementImageStore.set(safeName, {
    bytes,
    contentType,
    base64: base64Data,
    uploadedAt: Date.now(),
  });
  if (announcementImageStore.size > 50) {
    const oldestKey = announcementImageStore.keys().next().value;
    if (oldestKey) announcementImageStore.delete(oldestKey);
  }

  // Attempt to upload to dedicated public 'announcement-images' bucket
  let publicUrl = '';
  try {
    await serviceClient.storage.createBucket('announcement-images', { public: true });
  } catch (_) {}

  try {
    const { error: upErr } = await serviceClient.storage
      .from('announcement-images')
      .upload(filePath, bytes, {
        contentType,
        upsert: true,
      });

    if (!upErr) {
      const pub = serviceClient.storage.from('announcement-images').getPublicUrl(filePath);
      if (pub?.data?.publicUrl) {
        publicUrl = pub.data.publicUrl;
      }
    }
  } catch (_) {}

  // Fallback endpoint if Supabase bucket is unavailable
  const localEndpointUrl = `/api/admin-announcements?action=image&name=${encodeURIComponent(safeName)}`;
  const finalImageUrl = publicUrl || localEndpointUrl;

  return {
    success: true,
    imageUrl: finalImageUrl,
    publicUrl: finalImageUrl,
    dataUrl: base64Data,
    fileName: safeName,
    data: {
      publicUrl: finalImageUrl,
      imageUrl: finalImageUrl,
      dataUrl: base64Data,
      fileName: safeName,
    },
  };
}

/**
 * Handles customer unsubscribe requests.
 */
export async function handleUnsubscribeCustomer({ email, reason = 'Customer request', env = process.env, createClient }) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    throw new Error('Please provide a valid email address.');
  }

  const serviceClient = createAdminServiceClient(env, createClient);
  memoryUnsubscribes.add(cleanEmail);

  try {
    await serviceClient.from('announcement_unsubscribes').upsert({
      email: cleanEmail,
      reason,
      unsubscribed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[announcement-service] unsubscribe table not present, stored in-memory:', err.message);
  }

  return {
    success: true,
    message: 'You have been successfully unsubscribed from Mehanda Army Investments announcements.',
  };
}

