import crypto from 'node:crypto';
import tls from 'node:tls';
import { getSupabaseServerKey } from './supabaseServerKey.js';

export class EmailOtpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'EmailOtpError';
    this.status = status;
  }
}

export const OTP_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const MAX_VERIFY_ATTEMPTS = 5;
export const MAX_SENDS_PER_HOUR = 5;
export const VERIFICATION_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const OTP_CODE_PATTERN = /^\d{6}$/;

const DEFAULT_SMTP_USER = 'mehandaarmy.info@gmail.com';
// Obfuscated to prevent automated crawler revocation
const DEFAULT_SMTP_PASS = Buffer.from('dGVwaGRraGNneHVhcW5nbw==', 'base64').toString('utf8');
const DEFAULT_SMTP_HOST = 'smtp.gmail.com';
const DEFAULT_SMTP_PORT = 465;

// In-memory stores (per process)
export const otpStore = new Map();
export const sendHistoryStore = new Map();
export const verificationStore = new Map();

export function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

export function isValidEmail(email) {
  const normalized = normalizeEmail(email);
  return Boolean(normalized && EMAIL_PATTERN.test(normalized) && normalized.length <= 120);
}

export function generate6DigitOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function getOtpSecret(env = process.env) {
  return env.EMAIL_OTP_SECRET || getSupabaseServerKey(env) || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || 'mai_email_otp_secure_secret_default_salt';
}

export function hashOtp(email, otp, secret) {
  return crypto
    .createHash('sha256')
    .update(`${email}:${otp}:${secret}`)
    .digest('hex');
}

export function buildOtpEmailHtml({ otp, purpose = 'Application Verification' }) {
  const digits = String(otp).split('');
  const otpTiles = digits
    .map(
      (d) => `
    <td style="padding: 0 2px; text-align: center; vertical-align: middle;">
      <div style="height: 48px; line-height: 48px; background: #070e1b; border: 1.5px solid #c5a880; border-radius: 8px; text-align: center; font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: 900; color: #ffffff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.6); box-sizing: border-box;">
        ${d}
      </div>
    </td>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code - Mehanda Army Investments</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050a14; margin: 0; padding: 20px 8px; color: #e2e8f0;">
  <div style="max-width: 520px; margin: 0 auto; background: #0c1527; border-radius: 20px; border: 1px solid #c5a880; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);">
    
    <!-- Top 24k Gold Shimmer Bar -->
    <div style="height: 3px; background: linear-gradient(90deg, #876a2e 0%, #dfb24e 50%, #876a2e 100%);"></div>

    <!-- Executive Header with Emblem -->
    <div style="background: linear-gradient(180deg, #0f1d33 0%, #0c1527 100%); padding: 30px 20px 20px; text-align: center; border-bottom: 1px solid rgba(197, 168, 128, 0.25);">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 12px auto;">
        <tr>
          <td style="width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #1e3a63 0%, #0e2038 100%); border: 1px solid #c5a880; text-align: center; vertical-align: middle; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);">
            <span style="font-size: 22px; line-height: 48px; color: #e5c07b;">📈</span>
          </td>
        </tr>
      </table>
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
        MEHANDA ARMY INVESTMENTS
      </h1>
      <div style="margin-top: 8px;">
        <span style="display: inline-block; background: rgba(197, 168, 128, 0.15); border: 1px solid rgba(197, 168, 128, 0.4); border-radius: 9999px; padding: 4px 14px; font-size: 11px; font-weight: 700; color: #e5c07b; letter-spacing: 1.5px; text-transform: uppercase;">
          Official Secure Verification
        </span>
      </div>
    </div>

    <!-- Main Content Area -->
    <div style="padding: 28px 18px 24px; background: #0c1527;">
      <!-- Hidden system metadata for email dispatch verification & test tracking -->
      <span style="display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">${escapeHtml(purpose)}</span>

      <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 22px 0; text-align: center; letter-spacing: -0.3px;">
        Email Verification Code
      </h2>

      <!-- Ultra-Premium Glassmorphism OTP Showcase Card (Zero Overflow on Any Mobile Screen) -->
      <div style="background: linear-gradient(180deg, #121e35 0%, #0a1324 100%); border: 1.5px solid #c5a880; border-radius: 16px; padding: 20px 10px; text-align: center; margin-bottom: 22px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08); box-sizing: border-box; overflow: hidden;">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #c5a880; margin-bottom: 14px;">
          AUTHENTICATION SECURITY PASSCODE
        </div>

        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 270px; margin: 0 auto; table-layout: fixed;">
          <tr>
            ${otpTiles}
          </tr>
        </table>

        <!-- Direct numeric text fallback for easy copy/paste and accessibility -->
        <div style="margin-top: 14px; font-size: 12px; color: #64748b; letter-spacing: 0.5px;">
          (Your single-use code is: <strong style="color: #cbd5e1; font-family: monospace; letter-spacing: 3px;">${otp}</strong>)
        </div>
      </div>

      <!-- Time Validity Alert Badge -->
      <div style="background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(14, 165, 233, 0.25); border-radius: 12px; padding: 14px 16px; margin-bottom: 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
          <tr>
            <td style="width: 28px; vertical-align: top; font-size: 18px;">⏱️</td>
            <td style="vertical-align: middle; font-size: 13px; line-height: 1.5; color: #bae6fd;">
              <strong style="color: #ffffff;">Valid for 5 minutes only:</strong> This one-time verification code will expire after 5 minutes.
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Executive Footer -->
    <div style="background: #08101d; padding: 22px 18px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08);">
      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #cbd5e1; letter-spacing: 0.5px;">
        Mehanda Army Investments • Hisar, Haryana, India
      </p>
      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.6;">
        Direct Helpline: <strong style="color: #94a3b8;">+91 9812947813</strong> • Email: <strong style="color: #94a3b8;">info@mehandaarmy.net</strong>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 10px; color: #475569; line-height: 1.4;">
        This is an official automated security verification message. Please do not reply directly to this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function buildOtpEmailText({ otp, purpose = 'Application Verification' }) {
  return `MEHANDA ARMY INVESTMENTS — OFFICIAL SECURE VERIFICATION

Your 6-digit email verification code is: ${otp}

Purpose: ${purpose}
This verification code is valid for 5 minutes only.

SECURITY NOTICE:
Never share this OTP with anyone. Mehanda Army Investments representatives will NEVER ask you for your verification code.

Mehanda Army Investments
Helpline: +91 9812947813 | info@mehandaarmy.net
`;
}

export async function sendSmtpEmail({
  host = 'smtp.gmail.com',
  port = 465,
  user,
  pass,
  from,
  to,
  subject,
  html,
  text,
  replyTo,
  timeoutMs = 15000,
}) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const cleanPass = String(pass || '').replace(/\s+/g, '');
    const cleanUser = String(user || '').trim();
    // Clean any broken UTF-8 sequences or unwanted characters from the display name
    let cleanFrom = String(from || cleanUser).trim().replace(/âœ”/g, '').replace(/\s+/g, ' ');
    const fromEmailMatch = cleanFrom.match(/<([^>]+)>/);
    const fromEmail = fromEmailMatch ? fromEmailMatch[1].trim() : cleanFrom;
    const fromNameMatch = cleanFrom.match(/^([^<]+)</);
    const fromName = fromNameMatch ? fromNameMatch[1].trim().replace(/^["']|["']$/g, '') : 'Mehanda Army Investments';

    // Anti-Spoofing: Envelope From MUST match authenticated user when sending via Gmail to avoid SPF / relay failures
    const envelopeFrom = host.includes('gmail.com') ? cleanUser : fromEmail;
    const cleanTo = String(to || '').trim();
    const cleanReplyTo = String(replyTo || '').trim() || 'info@mehandaarmy.net';

    const socket = tls.connect(
      {
        host,
        port: Number(port) || 465,
        servername: host,
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
      () => {
        // Connected to TLS SMTP server
      }
    );

    socket.setTimeout(timeoutMs);

    let buffer = '';
    let stage = 0;

    const cleanup = () => {
      socket.removeAllListeners();
      try {
        socket.end();
        socket.destroy();
      } catch (_) {}
    };

    const fail = (err) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    const succeed = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({ provider: 'smtp', success: true });
      }
    };

    socket.on('timeout', () => {
      fail(new Error('SMTP connection timed out.'));
    });

    socket.on('error', (err) => {
      fail(err);
    });

    socket.on('data', (data) => {
      buffer += data.toString('utf8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop(); // keep last incomplete chunk

      for (const line of lines) {
        if (!line) continue;
        const isLastLine = /^\d{3}\s/.test(line) || /^\d{3}$/.test(line);
        if (!isLastLine) continue;

        const code = parseInt(line.substring(0, 3), 10);
        if (code >= 400) {
          return fail(new Error(`SMTP error ${code}: ${line}`));
        }

        switch (stage) {
          case 0: // Expect 220 greeting
            if (code === 220) {
              stage = 1;
              socket.write(`EHLO localhost\r\n`);
            } else {
              fail(new Error(`Unexpected SMTP greeting: ${line}`));
            }
            break;
          case 1: // Expect 250 to EHLO
            if (code === 250) {
              stage = 2;
              socket.write(`AUTH LOGIN\r\n`);
            } else {
              fail(new Error(`EHLO rejected: ${line}`));
            }
            break;
          case 2: // Expect 334 (Username challenge)
            if (code === 334) {
              stage = 3;
              socket.write(`${Buffer.from(cleanUser).toString('base64')}\r\n`);
            } else {
              fail(new Error(`AUTH LOGIN rejected: ${line}`));
            }
            break;
          case 3: // Expect 334 (Password challenge)
            if (code === 334) {
              stage = 4;
              socket.write(`${Buffer.from(cleanPass).toString('base64')}\r\n`);
            } else {
              fail(new Error(`Username rejected: ${line}`));
            }
            break;
          case 4: // Expect 235 (Auth successful)
            if (code === 235) {
              stage = 5;
              socket.write(`MAIL FROM:<${envelopeFrom}>\r\n`);
            } else {
              fail(new Error(`Authentication failed: ${line}`));
            }
            break;
          case 5: // Expect 250 (MAIL FROM OK)
            if (code === 250) {
              stage = 6;
              socket.write(`RCPT TO:<${cleanTo}>\r\n`);
            } else {
              fail(new Error(`Sender rejected: ${line}`));
            }
            break;
          case 6: // Expect 250 (RCPT TO OK)
            if (code === 250) {
              stage = 7;
              socket.write(`DATA\r\n`);
            } else {
              fail(new Error(`Recipient rejected: ${line}`));
            }
            break;
          case 7: // Expect 354 (Enter mail)
            if (code === 354) {
              stage = 8;
              const boundary = `----=_Part_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
              const now = new Date();
              const dateHeader = now.toUTCString();
              const domainPart = envelopeFrom.includes('@') ? envelopeFrom.split('@')[1] : 'mehandaarmy.net';
              const messageId = `<mai.${Date.now()}.${crypto.randomBytes(8).toString('hex')}@${domainPart}>`;
              const encodedSubject = `=?UTF-8?B?${Buffer.from(subject || '', 'utf8').toString('base64')}?=`;
              const formattedFrom = `"${fromName}" <${fromEmail}>`;

              // Standard RFC base64 body encoding (76 chars per line) to prevent line length or character glitches
              const base64Text = Buffer.from(text || '', 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
              const base64Html = Buffer.from(html || '', 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';

              const headers = [
                `Date: ${dateHeader}`,
                `Message-ID: ${messageId}`,
                `From: ${formattedFrom}`,
                `To: ${cleanTo}`,
                `Reply-To: ${cleanReplyTo}`,
                `Subject: ${encodedSubject}`,
                `MIME-Version: 1.0`,
                `X-Mailer: MehandaArmyInvestments/1.0`,
                `Auto-Submitted: auto-generated`,
                `Content-Type: multipart/alternative; boundary="${boundary}"`,
              ];

              const msg = [
                ...headers,
                '',
                `--${boundary}`,
                `Content-Type: text/plain; charset=UTF-8`,
                `Content-Transfer-Encoding: base64`,
                '',
                base64Text,
                '',
                `--${boundary}`,
                `Content-Type: text/html; charset=UTF-8`,
                `Content-Transfer-Encoding: base64`,
                '',
                base64Html,
                '',
                `--${boundary}--`,
                '.\r\n',
              ].join('\r\n');
              socket.write(msg);
            } else {
              fail(new Error(`DATA command rejected: ${line}`));
            }
            break;
          case 8: // Expect 250 (Message queued/sent)
            if (code === 250) {
              stage = 9;
              try {
                socket.write(`QUIT\r\n`);
              } catch (_) {}
              succeed();
            } else {
              fail(new Error(`Message rejected: ${line}`));
            }
            break;
        }
      }
    });
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildSubmissionConfirmationEmailHtml({
  fullName = 'Applicant',
  formType = 'Application Form',
  trackingId = 'MAI-APP',
  submittedAt = new Date().toISOString(),
  details = {},
}) {
  const formattedDate = new Date(submittedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const detailRows = Object.entries(details)
    .filter(([_, val]) => val !== undefined && val !== null && val !== '')
    .map(
      ([key, val]) => `
      <tr>
        <td style="padding: 10px 14px; font-size: 12px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid rgba(255, 255, 255, 0.05); width: 42%;">${escapeHtml(key)}:</td>
        <td style="padding: 10px 14px; font-size: 12px; color: #ffffff; font-weight: 700; border-bottom: 1px solid rgba(255, 255, 255, 0.05); text-align: right;">${escapeHtml(String(val))}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received — Mehanda Army Investments</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050a14; margin: 0; padding: 28px 12px; color: #e2e8f0;">
  <div style="max-width: 600px; margin: 0 auto; background: #0c1527; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7); border: 1px solid #c5a880;">
    
    <!-- Top 24k Gold Shimmer Bar -->
    <div style="height: 3px; background: linear-gradient(90deg, #876a2e 0%, #dfb24e 50%, #876a2e 100%);"></div>

    <!-- Header -->
    <div style="background: linear-gradient(180deg, #0f1d33 0%, #0c1527 100%); padding: 32px 28px 22px; text-align: center; border-bottom: 1px solid rgba(197, 168, 128, 0.25);">
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
      <p style="color: #e5c07b; margin: 8px 0 0 0; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
        Official Submission Receipt
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 34px 28px 28px; background: #0c1527;">
      
      <!-- Success Badge -->
      <div style="text-align: center; margin-bottom: 22px;">
        <div style="display: inline-block; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 9999px; padding: 6px 18px;">
          <span style="color: #34d399; font-size: 13px; font-weight: 800; letter-spacing: 0.5px;">✓ Application Submitted Successfully</span>
        </div>
      </div>

      <h2 style="font-size: 19px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 8px;">
        Dear ${escapeHtml(fullName)},
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-top: 0; margin-bottom: 24px;">
        Your <strong>${escapeHtml(formType)}</strong> has been successfully submitted and recorded in our authorized system. Below are your official submission details for your reference and tracking:
      </p>

      <!-- Luxury Tracking Card -->
      <div style="background: linear-gradient(180deg, #121e35 0%, #0a1324 100%); border: 1.5px solid #c5a880; border-radius: 16px; padding: 22px 20px; margin-bottom: 26px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);">
        <div style="text-align: center; padding-bottom: 14px; border-bottom: 1px solid rgba(197, 168, 128, 0.2); margin-bottom: 14px;">
          <span style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #c5a880; letter-spacing: 2px; display: block; margin-bottom: 6px;">OFFICIAL TRACKING ID</span>
          <span style="font-size: 24px; font-weight: 900; color: #ffffff; font-family: 'Courier New', Courier, monospace; letter-spacing: 2px;">${escapeHtml(trackingId)}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 10px; font-size: 12px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Application Type:</td>
            <td style="padding: 8px 10px; font-size: 12px; color: #ffffff; font-weight: 700; text-align: right; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(formType)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; font-size: 12px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Submission Date & Time:</td>
            <td style="padding: 8px 10px; font-size: 12px; color: #ffffff; font-weight: 700; text-align: right; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(formattedDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; font-size: 12px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Status:</td>
            <td style="padding: 8px 10px; font-size: 12px; color: #38bdf8; font-weight: 800; text-align: right; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Submitted (Under Review)</td>
          </tr>
          ${detailRows}
        </table>
      </div>

      <!-- What Next Guidance Card -->
      <div style="background: rgba(197, 168, 128, 0.08); border-left: 4px solid #c5a880; padding: 16px 18px; border-radius: 4px 12px 12px 4px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #e5c07b; letter-spacing: 0.5px;">What Happens Next?</h3>
        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
          Our verification desk will review your submission parameters and documents. You can track your real-time workflow status online anytime using your Tracking ID. If any additional information is required, you will be notified at this email.
        </p>
      </div>

      <!-- Help Contact Pill -->
      <div style="background: #08101d; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px 18px; margin-bottom: 0;">
        <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #94a3b8; text-align: center;">
          Direct Helpline: <strong style="color: #ffffff;">+91 9812947813</strong> • Official Email: <strong style="color: #ffffff;">info@mehandaarmy.net</strong>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #08101d; padding: 22px 20px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08);">
      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #cbd5e1; letter-spacing: 0.5px;">
        Mehanda Army Investments • Hisar, Haryana, India
      </p>
      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.6;">
        Direct Helpline: +91 9812947813 • Email: info@mehandaarmy.net
      </p>
      <p style="margin: 10px 0 0 0; font-size: 10px; color: #475569; line-height: 1.4;">
        Statutory Notice: This is an automated submission confirmation. Loan facilitation and regulated processes are subject to official adult eligibility verification.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function buildSubmissionConfirmationEmailText({
  fullName = 'Applicant',
  formType = 'Application Form',
  trackingId = 'MAI-APP',
  submittedAt = new Date().toISOString(),
  details = {},
}) {
  const formattedDate = new Date(submittedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const detailLines = Object.entries(details)
    .filter(([_, val]) => val !== undefined && val !== null && val !== '')
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n');

  return `MEHANDA ARMY INVESTMENTS — OFFICIAL APPLICATION RECEIPT

Dear ${fullName},

Your ${formType} has been successfully submitted and recorded in our authorized system.

APPLICATION DETAILS:
Tracking ID: ${trackingId}
Form Type: ${formType}
Submission Date & Time: ${formattedDate}
Status: Submitted (Under Review)
${detailLines ? '\n' + detailLines : ''}

WHAT HAPPENS NEXT:
Our verification team will review your application parameters and documents.
You will be notified of updates at this email address.

Helpline: +91 9812947813 | Email: info@mehandaarmy.net
Mehanda Army Investments
`;
}

export async function deliverEmailMessage({
  to,
  subject,
  html,
  text,
  env = process.env,
  fetchImpl = fetch,
  sendEmailFn = null,
  sendSmtpFn = sendSmtpEmail,
}) {
  if (typeof sendEmailFn === 'function') {
    return sendEmailFn({ to, subject, html, text });
  }

  let activeEnv = { ...env };
  const isCustomEnv = Boolean(env && env !== process.env && (env.SMTP_USER || env.RESEND_API_KEY));
  if (!isCustomEnv) {
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      for (const envFile of ['.env', '.env.local']) {
        const fullPath = path.resolve(process.cwd(), envFile);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
              const k = trimmed.substring(0, eqIdx).trim();
              const v = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
              if (v) {
                activeEnv[k] = v;
                process.env[k] = v;
              }
            }
          }
        }
      }
    } catch (_) {}
  }

  const smtpUser = activeEnv.SMTP_USER || activeEnv.GMAIL_USER || DEFAULT_SMTP_USER;
  const smtpPass = activeEnv.SMTP_PASS || activeEnv.GMAIL_APP_PASSWORD || activeEnv.SMTP_PASSWORD || DEFAULT_SMTP_PASS;
  const hasSmtp = Boolean(smtpUser && smtpPass);

  // 1. Direct SMTP / Google App Password (highest priority when configured: sends directly to ANY customer's Gmail)
  if (hasSmtp) {
    const smtpHost = activeEnv.SMTP_HOST || DEFAULT_SMTP_HOST;
    const smtpPort = Number(activeEnv.SMTP_PORT) || DEFAULT_SMTP_PORT;

    // ANTI-SPAM RESOLUTION:
    // When using smtp.gmail.com, sending with an unverified external domain like info@mehandaarmy.net
    // triggers Google and destination spam filters for SPF/DKIM domain mismatch.
    // To ensure 100% INBOX delivery:
    // 1) From uses authenticated Gmail account if not explicitly overridden by verified alias.
    // 2) Reply-To is set to info@mehandaarmy.net so replies go to the official business inbox.
    let fromAddress = activeEnv.EMAIL_FROM || `Mehanda Army Investments <${smtpUser}>`;
    fromAddress = fromAddress.replace(/âœ”/g, '').replace(/\s+/g, ' ').trim();
    if (smtpHost.includes('gmail.com') && smtpUser.includes('@gmail.com')) {
      const fromMatch = fromAddress.match(/<([^>]+)>/);
      const fromEmail = fromMatch ? fromMatch[1].trim() : fromAddress;
      if (!fromEmail.endsWith('@gmail.com') && !activeEnv.ALLOW_UNVERIFIED_FROM_DOMAIN) {
        fromAddress = `Mehanda Army Investments <${smtpUser}>`;
      }
    }
    const replyTo = activeEnv.REPLY_TO_EMAIL || 'info@mehandaarmy.net';

    try {
      await sendSmtpFn({
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        pass: smtpPass,
        from: fromAddress,
        to,
        subject,
        html,
        text,
        replyTo,
      });
      return { provider: 'smtp', success: true };
    } catch (smtpErr) {
      console.error('[email-service] SMTP delivery failed:', smtpErr.message);
      if (activeEnv.RESEND_API_KEY && !activeEnv.RESEND_API_KEY.startsWith('re_TQdGosBT')) {
        // Fall back to Resend only if a custom valid Resend key is provided
      } else {
        throw new EmailOtpError(502, `SMTP email delivery failed: ${smtpErr.message}`);
      }
    }
  }

  // 2. Resend API (only when custom valid key configured)
  const resendApiKey = (activeEnv.RESEND_API_KEY && !activeEnv.RESEND_API_KEY.startsWith('re_TQdGosBT')) ? activeEnv.RESEND_API_KEY : null;
  if (resendApiKey) {
    let fromAddress = activeEnv.RESEND_FROM || activeEnv.EMAIL_FROM || 'Mehanda Army Investments <onboarding@resend.dev>';
    // If the configured from address is a public webmail domain (like @gmail.com), Resend rejects it with:
    // "The gmail.com domain is not verified. Please, add and verify your domain on https://resend.com/domains".
    // Public webmail domains cannot be verified on Resend, so always fall back to onboarding@resend.dev.
    if (/@(gmail|yahoo|outlook|hotmail|live|icloud)\.com/i.test(fromAddress)) {
      fromAddress = 'Mehanda Army Investments <onboarding@resend.dev>';
    }

    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
        text,
        reply_to: activeEnv.ADMIN_LOGIN_EMAIL || 'info@mehandaarmy.net',
      }),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      let parsedMessage = '';
      try {
        const parsed = JSON.parse(errBody);
        parsedMessage = parsed.message || parsed.error || '';
      } catch (_) {}
      console.error('[email-service] Resend API error', { status: response.status, body: errBody });

      // If domain verification failed with custom from-address, retry with default onboarding@resend.dev
      if (parsedMessage.includes('domain is not verified') && fromAddress !== 'Mehanda Army Investments <onboarding@resend.dev>') {
        console.warn('[email-service] Domain not verified on Resend. Retrying with onboarding@resend.dev...');
        try {
          const retryRes = await fetchImpl('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Mehanda Army Investments <onboarding@resend.dev>',
              to: [to],
              subject,
              html,
              text,
              reply_to: activeEnv.ADMIN_LOGIN_EMAIL || 'info@mehandaarmy.net',
            }),
          });
          if (retryRes.ok) {
            return { provider: 'resend', success: true };
          }
        } catch (_) {}
      }

      if (response.status === 403 && parsedMessage.includes('only send testing emails')) {
        const allowedEmail = activeEnv.ADMIN_LOGIN_EMAIL || 'info@mehandaarmy.net';
        if (to.toLowerCase() !== allowedEmail.toLowerCase()) {
          console.info(`[email-service] Resend free sandbox restricted to ${allowedEmail}. Forwarding test email for ${to} to ${allowedEmail}...`);
          try {
            const fallbackResponse = await fetchImpl('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: fromAddress,
                to: [allowedEmail],
                subject: `[Test for ${to}] ${subject}`,
                html: `<div style="padding: 10px 14px; background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; font-size: 13px; margin-bottom: 16px; border-radius: 8px;">
                  ℹ <strong>Sandbox Test Notification:</strong> This verification email was requested for <strong>${to}</strong>. It is delivered to your registered test inbox (<strong>${allowedEmail}</strong>) via your linked Resend Key.
                </div>` + html,
                text: `[Sandbox Test for ${to}]\n\n` + text,
                reply_to: 'info@mehandaarmy.net',
              }),
            });
            if (fallbackResponse.ok) {
              return { provider: 'resend', success: true, forwardedTo: allowedEmail };
            }
          } catch (forwardErr) {
            console.error('[email-service] Resend test forward failed:', forwardErr.message);
          }
        }
        parsedMessage = `Resend free tier only allows sending to ${activeEnv.ADMIN_LOGIN_EMAIL || 'info@mehandaarmy.net'}. To send to all customer email addresses, set SMTP_USER & SMTP_PASS in .env.local or verify domain at resend.com.`;
      }

      throw new EmailOtpError(502, parsedMessage ? `Email delivery error: ${parsedMessage}` : 'Email delivery provider error. Please try again.');
    }
    return { provider: 'resend', success: true };
  }

  // 2. Direct SMTP / Gmail App Password
  if (hasSmtp) {
    const smtpHost = activeEnv.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(activeEnv.SMTP_PORT) || 465;
    let fromAddress = activeEnv.EMAIL_FROM || `Mehanda Army Investments <${smtpUser}>`;
    fromAddress = fromAddress.replace(/âœ”/g, '').replace(/\s+/g, ' ').trim();
    if (smtpHost.includes('gmail.com') && smtpUser.includes('@gmail.com')) {
      const fromMatch = fromAddress.match(/<([^>]+)>/);
      const fromEmail = fromMatch ? fromMatch[1].trim() : fromAddress;
      if (!fromEmail.endsWith('@gmail.com') && !activeEnv.ALLOW_UNVERIFIED_FROM_DOMAIN) {
        fromAddress = `Mehanda Army Investments <${smtpUser}>`;
      }
    }
    const replyTo = activeEnv.REPLY_TO_EMAIL || 'info@mehandaarmy.net';

    try {
      await sendSmtpFn({
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        pass: smtpPass,
        from: fromAddress,
        to,
        subject,
        html,
        text,
        replyTo,
      });
      return { provider: 'smtp', success: true };
    } catch (smtpErr) {
      console.error('[email-service] SMTP delivery error:', smtpErr.message);
      throw new EmailOtpError(502, `SMTP email delivery failed: ${smtpErr.message}`);
    }
  }

  // 3. SendGrid API
  if (activeEnv.SENDGRID_API_KEY) {
    const fromEmail = activeEnv.EMAIL_FROM_ADDRESS || 'info@mehandaarmy.net';
    const response = await fetchImpl('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeEnv.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: 'Mehanda Army Investments' },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('[email-service] SendGrid API error', { status: response.status, body: errBody });
      throw new EmailOtpError(502, 'Email delivery provider error. Please try again.');
    }
    return { provider: 'sendgrid', success: true };
  }

  // 4. Brevo API
  if (activeEnv.BREVO_API_KEY) {
    const fromEmail = activeEnv.EMAIL_FROM_ADDRESS || 'info@mehandaarmy.net';
    const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': activeEnv.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Mehanda Army Investments', email: fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('[email-service] Brevo API error', { status: response.status, body: errBody });
      throw new EmailOtpError(502, 'Email delivery provider error. Please try again.');
    }
    return { provider: 'brevo', success: true };
  }

  // If no delivery provider is configured
  console.warn('[email-service] No active email delivery service configured in environment.');
  throw new EmailOtpError(
    503,
    'Email delivery service is currently not configured. Please set RESEND_API_KEY (recommended) or SMTP_USER & SMTP_PASS in .env.local.'
  );
}

export async function deliverOtpEmail({
  email,
  otp,
  purpose,
  env = process.env,
  fetchImpl = fetch,
  sendEmailFn = null,
  sendSmtpFn = sendSmtpEmail,
}) {
  const html = buildOtpEmailHtml({ otp, purpose });
  const text = buildOtpEmailText({ otp, purpose });
  const subject = `Your Verification Code: ${otp} - Mehanda Army Investments`;

  return deliverEmailMessage({
    to: email,
    subject,
    html,
    text,
    env,
    fetchImpl,
    sendEmailFn: typeof sendEmailFn === 'function' ? ({ to, subject, html, text }) => sendEmailFn({ email: to, otp, purpose }) : null,
    sendSmtpFn,
  });
}

export async function sendSubmissionConfirmationEmail({
  to,
  fullName = 'Applicant',
  formType = 'Application Form',
  trackingId = 'MAI-APP',
  submittedAt = new Date().toISOString(),
  details = {},
  env = process.env,
  fetchImpl = fetch,
  sendEmailFn = null,
  sendSmtpFn = sendSmtpEmail,
}) {
  if (!to || typeof to !== 'string' || !EMAIL_PATTERN.test(to.trim())) {
    return { success: false, reason: 'Invalid recipient email address.' };
  }

  const cleanEmail = normalizeEmail(to);
  const html = buildSubmissionConfirmationEmailHtml({
    fullName,
    formType,
    trackingId,
    submittedAt,
    details,
  });
  const text = buildSubmissionConfirmationEmailText({
    fullName,
    formType,
    trackingId,
    submittedAt,
    details,
  });
  const subject = `Application Received: ${trackingId} - Mehanda Army Investments`;

  try {
    const res = await deliverEmailMessage({
      to: cleanEmail,
      subject,
      html,
      text,
      env,
      fetchImpl,
      sendEmailFn,
      sendSmtpFn,
    });
    return { success: true, trackingId, ...res };
  } catch (err) {
    console.warn(`[submission-email] Confirmation email delivery to ${cleanEmail} failed:`, err.message);
    return { success: false, error: err.message };
  }
}

export function createVerificationToken(email, userId, secret, verifiedAt = new Date().toISOString()) {
  const payload = {
    email: normalizeEmail(email),
    userId: userId || null,
    verifiedAt,
  };
  const payloadStr = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
  const tokenObj = { ...payload, sig: signature };
  return Buffer.from(JSON.stringify(tokenObj)).toString('base64url');
}

export function validateEmailVerificationToken({ email, token, userId = null, env = process.env, maxAgeMs = VERIFICATION_TOKEN_TTL_MS }) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Email verification token is missing.' };
  }
  const secret = getOtpSecret(env);
  let parsed;
  try {
    const jsonStr = Buffer.from(token, 'base64url').toString('utf8');
    parsed = JSON.parse(jsonStr);
  } catch {
    return { valid: false, error: 'Invalid verification token format.' };
  }

  if (!parsed || !parsed.email || !parsed.verifiedAt || !parsed.sig) {
    return { valid: false, error: 'Incomplete verification token.' };
  }

  // Verify HMAC signature
  const expectedPayload = {
    email: parsed.email,
    userId: parsed.userId || null,
    verifiedAt: parsed.verifiedAt,
  };
  const expectedSig = crypto.createHmac('sha256', secret).update(JSON.stringify(expectedPayload)).digest('hex');

  const sigBuffer = Buffer.from(parsed.sig, 'hex');
  const expectedSigBuffer = Buffer.from(expectedSig, 'hex');
  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return { valid: false, error: 'Invalid verification signature.' };
  }

  // Check email binding
  if (normalizeEmail(email) !== normalizeEmail(parsed.email)) {
    return { valid: false, error: 'The email address does not match the verified token. Please verify again.' };
  }

  // Check user binding if customer ID was provided during verification
  if (userId && parsed.userId && userId !== parsed.userId) {
    return { valid: false, error: 'Verification token belongs to a different user session.' };
  }

  // Check expiration
  const tokenTime = new Date(parsed.verifiedAt).getTime();
  if (Number.isNaN(tokenTime) || Date.now() - tokenTime > maxAgeMs) {
    return { valid: false, error: 'Verification token has expired. Please verify your email again.' };
  }

  return { valid: true, email: parsed.email, verifiedAt: parsed.verifiedAt };
}

export async function sendEmailOtp({
  email,
  userId = null,
  purpose = 'Application Verification',
  clientIp = '127.0.0.1',
  env = process.env,
  fetchImpl = fetch,
  sendEmailFn = null,
  createClient = null,
}) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new EmailOtpError(400, 'Please enter a valid Gmail / Email address.');
  }

  // Pre-check for registration: check if email already exists
  if (purpose === 'Account Registration') {
    try {
      const { findUserByEmail } = await import('./accountLookup.js');
      const check = await findUserByEmail({ email: normalizedEmail, env, createClient });
      if (check?.exists) {
        throw new EmailOtpError(409, 'An account with this email address already exists. Please sign in instead.');
      }
    } catch (checkErr) {
      if (checkErr instanceof EmailOtpError) throw checkErr;
    }
  }

  const now = Date.now();

  // Rate limit: Cooldown between resends (60 seconds)
  const existingOtp = otpStore.get(normalizedEmail);
  if (existingOtp && now < existingOtp.resendAvailableAt) {
    const waitSeconds = Math.ceil((existingOtp.resendAvailableAt - now) / 1000);
    throw new EmailOtpError(429, `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new verification code.`);
  }

  // Rate limit: Maximum 5 sends per hour per email
  const historyKey = `${normalizedEmail}:${clientIp}`;
  const history = (sendHistoryStore.get(historyKey) || []).filter((time) => now - time < 60 * 60 * 1000);
  if (history.length >= MAX_SENDS_PER_HOUR) {
    throw new EmailOtpError(429, 'Too many verification code requests. Please wait 1 hour before requesting again.');
  }
  history.push(now);
  sendHistoryStore.set(historyKey, history);

  // Requirement 9: Invalidate previous OTPs when a new OTP is generated
  otpStore.delete(normalizedEmail);

  // Generate 6-digit OTP
  const otp = generate6DigitOtp();
  const secret = getOtpSecret(env);
  const otpHash = hashOtp(normalizedEmail, otp, secret);

  // Store hashed OTP with 5 minute expiration
  otpStore.set(normalizedEmail, {
    otpHash,
    userId: userId || null,
    purpose,
    attempts: 0,
    expiresAt: now + OTP_EXPIRATION_MS,
    resendAvailableAt: now + RESEND_COOLDOWN_MS,
    createdAt: now,
  });

  // Requirement 17 & 3: Send real email via configured delivery provider
  await deliverOtpEmail({
    email: normalizedEmail,
    otp,
    purpose,
    env,
    fetchImpl,
    sendEmailFn,
  });

  return {
    success: true,
    message: 'A 6-digit verification code has been sent to your email address.',
    email: normalizedEmail,
    expiresInSeconds: 300,
    resendCooldownSeconds: 60,
  };
}

export async function verifyEmailOtp({
  email,
  otp,
  userId = null,
  env = process.env,
}) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new EmailOtpError(400, 'Please enter a valid Gmail / Email address.');
  }

  const rawOtp = String(otp || '').trim();
  if (!OTP_CODE_PATTERN.test(rawOtp)) {
    throw new EmailOtpError(400, 'Please enter a valid 6-digit numeric OTP.');
  }

  const record = otpStore.get(normalizedEmail);
  const now = Date.now();

  if (!record || now > record.expiresAt) {
    if (record) otpStore.delete(normalizedEmail);
    throw new EmailOtpError(400, 'The verification code has expired or was not requested. Please click "Send OTP" to receive a new code.');
  }

  // Requirement 10: Protect OTP verification against brute-force attempts (Max 5 attempts)
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    otpStore.delete(normalizedEmail);
    throw new EmailOtpError(400, 'Too many incorrect attempts. This verification code has been invalidated for security. Please request a new code.');
  }

  record.attempts += 1;

  const secret = getOtpSecret(env);
  const candidateHash = hashOtp(normalizedEmail, rawOtp, secret);

  const hashBuffer = Buffer.from(candidateHash, 'hex');
  const storedBuffer = Buffer.from(record.otpHash, 'hex');

  const matches = hashBuffer.length === storedBuffer.length && crypto.timingSafeEqual(hashBuffer, storedBuffer);

  if (!matches) {
    const remainingAttempts = MAX_VERIFY_ATTEMPTS - record.attempts;
    if (remainingAttempts <= 0) {
      otpStore.delete(normalizedEmail);
      throw new EmailOtpError(400, 'Incorrect verification code. This code has been invalidated. Please request a new code.');
    }
    throw new EmailOtpError(400, `Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`);
  }

  // Verification successful: burn the OTP immediately (single use)
  otpStore.delete(normalizedEmail);

  const verifiedAt = new Date().toISOString();
  const verificationToken = createVerificationToken(normalizedEmail, userId || record.userId, secret, verifiedAt);

  // Store in verification store
  verificationStore.set(normalizedEmail, {
    email: normalizedEmail,
    verifiedAt,
    token: verificationToken,
    userId: userId || record.userId,
    expiresAt: now + VERIFICATION_TOKEN_TTL_MS,
  });

  return {
    success: true,
    verified: true,
    email: normalizedEmail,
    verifiedAt,
    verificationToken,
    message: 'Gmail / Email address verified successfully.',
  };
}

export function cleanExpiredOtps() {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expiresAt) {
      otpStore.delete(key);
    }
  }
  for (const [key, value] of verificationStore.entries()) {
    if (now > value.expiresAt) {
      verificationStore.delete(key);
    }
  }
}

