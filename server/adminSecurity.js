import crypto from 'node:crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getAdminConfiguration, AdminAuthError } from './adminAuth.js';
import { deliverEmailMessage } from './emailOtpService.js';

// Pre-generated emergency recovery codes for Owner emergency access
export const DEFAULT_EMERGENCY_RECOVERY_CODES = [
  'MAI-SEC-8921-4402',
  'MAI-SEC-7104-9831',
  'MAI-SEC-5540-1289',
  'MAI-SEC-3319-7650',
  'MAI-SEC-6682-9014',
  'MAI-SEC-4208-3371',
];

// Helper to hash recovery codes
export function hashRecoveryCode(code) {
  const normalized = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  return crypto.createHash('sha256').update(`mai-recovery:${normalized}`).digest('hex');
}

// In-Memory Fallback State (Ensures instant protection and test reliability)
const failedAttemptsMap = new Map(); // key -> { count: number, lastAttempt: number, history: [] }
const activeLocksMap = new Map(); // key -> { locked: true, reason: string, lockedAt: string, consecutiveFailures: number }
const securityAlertsStore = [];
const securityAuditLogsStore = [];
const usedRecoveryCodes = new Set();

// 1. User Agent Parser
export function parseUserAgent(userAgentString = '') {
  const ua = String(userAgentString || '');
  let deviceType = 'Desktop PC';
  let osInfo = 'Unknown OS';
  let browserInfo = 'Unknown Browser';

  // Device & OS detection
  if (/iPhone/i.test(ua)) {
    deviceType = 'Apple iPhone';
    const match = ua.match(/OS (\d+[._]\d+)/i);
    osInfo = match ? `iOS ${match[1].replace('_', '.')}` : 'iOS';
  } else if (/iPad/i.test(ua)) {
    deviceType = 'Apple iPad';
    const match = ua.match(/OS (\d+[._]\d+)/i);
    osInfo = match ? `iPadOS ${match[1].replace('_', '.')}` : 'iPadOS';
  } else if (/Android/i.test(ua)) {
    deviceType = 'Android Mobile';
    const match = ua.match(/Android\s+([0-9.]+)/i);
    osInfo = match ? `Android ${match[1]}` : 'Android';
  } else if (/Windows/i.test(ua)) {
    deviceType = 'Windows PC';
    if (/Windows NT 10.0/i.test(ua)) osInfo = 'Windows 10 / 11';
    else if (/Windows NT 6.3/i.test(ua)) osInfo = 'Windows 8.1';
    else if (/Windows NT 6.1/i.test(ua)) osInfo = 'Windows 7';
    else osInfo = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'Apple Mac';
    const match = ua.match(/Mac OS X (\d+[._]\d+)/i);
    osInfo = match ? `macOS ${match[1].replace('_', '.')}` : 'macOS';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'Linux Workstation';
    osInfo = 'Linux';
  }

  // Browser detection
  if (/Edg(?:e)?\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Edg(?:e)?\/([0-9.]+)/i);
    browserInfo = `Microsoft Edge ${match ? match[1] : ''}`;
  } else if (/Chrome\/([0-9.]+)/i.test(ua) && !/Edg/i.test(ua)) {
    const match = ua.match(/Chrome\/([0-9.]+)/i);
    browserInfo = `Google Chrome ${match ? match[1] : ''}`;
  } else if (/Safari\/([0-9.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
    const match = ua.match(/Version\/([0-9.]+)/i);
    browserInfo = `Apple Safari ${match ? match[1] : ''}`;
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([0-9.]+)/i);
    browserInfo = `Mozilla Firefox ${match ? match[1] : ''}`;
  }

  return { deviceType, osInfo, browserInfo: browserInfo.trim() };
}

// 2. Indian Standard Time (IST) Formatter
export function getIstTimestamp(date = new Date()) {
  try {
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium',
      hour12: true,
    }) + ' IST';
  } catch {
    return date.toISOString() + ' (UTC)';
  }
}

// Helper to get Supabase service client
function getServiceClient(env = process.env) {
  try {
    const config = getAdminConfiguration(env);
    return createSupabaseClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch {
    return null;
  }
}

// 3. Security Lock Check (Rejects if Account, IP, or Target is Locked)
export async function checkSecurityLock({ username = '', clientIp = '', dependencies = {} }) {
  const normalizedUser = String(username || '').trim().toLowerCase();
  const normalizedIp = String(clientIp || '').trim();

  // Check in-memory locks first
  const memoryLock = activeLocksMap.get(normalizedUser) || activeLocksMap.get(normalizedIp);
  if (memoryLock && memoryLock.locked) {
    throw new AdminAuthError(
      423,
      `SECURITY LOCKOUT: Admin login is locked due to ${memoryLock.reason || '3 consecutive failed attempts'}. High-priority alert sent to Owner Gmail. Use Owner Security Panel or Emergency Recovery Code to unlock.`
    );
  }

  // Check Supabase database
  const db = dependencies.serviceClient || getServiceClient(dependencies.env);
  if (db) {
    try {
      const { data, error } = await db
        .from('admin_security_locks')
        .select('*')
        .or(`target_identifier.eq.${normalizedUser},target_identifier.eq.${normalizedIp}`)
        .eq('is_locked', true)
        .maybeSingle();

      if (!error && data && data.is_locked) {
        // Cache in memory
        activeLocksMap.set(data.target_identifier, {
          locked: true,
          reason: data.reason,
          lockedAt: data.locked_at,
          consecutiveFailures: data.consecutive_failures,
        });

        throw new AdminAuthError(
          423,
          `SECURITY LOCKOUT: Admin login is locked due to ${data.reason || '3 consecutive failed attempts'}. An alert has been sent to Owner Gmail. Use Owner Security Panel or Emergency Recovery Code to unlock.`
        );
      }
    } catch (err) {
      if (err instanceof AdminAuthError) throw err;
      // DB table missing or query issue - continue with in-memory lock check
    }
  }
}

// 4. Record Failed Login Attempt & Dispatch Gmail Security Alerts
export async function recordFailedLoginAttempt({
  username = '',
  clientIp = 'unknown',
  userAgent = '',
  headers = {},
  dependencies = {},
}) {
  const normalizedUser = String(username || '').trim().toLowerCase() || 'unknown_user';
  const normalizedIp = String(clientIp || '').trim() || '127.0.0.1';
  const targetKey = normalizedUser;
  const ipKey = normalizedIp;

  // Increment failure count in memory
  const existing = failedAttemptsMap.get(targetKey) || { count: 0, lastAttempt: Date.now(), attempts: [] };
  const currentCount = existing.count + 1;
  const istTime = getIstTimestamp(new Date());
  const { deviceType, osInfo, browserInfo } = parseUserAgent(userAgent);
  const locationInfo = headers['x-nf-geo-city']
    ? `${headers['x-nf-geo-city']}, ${headers['x-nf-geo-country-code'] || 'IN'}`
    : headers['x-vercel-ip-city']
    ? `${headers['x-vercel-ip-city']}, ${headers['x-vercel-ip-country'] || 'IN'}`
    : 'India / Network Gateway';

  const attemptRecord = {
    id: crypto.randomUUID(),
    attempted_username: username || 'unknown',
    client_ip: normalizedIp,
    user_agent: userAgent,
    device_type: deviceType,
    browser_info: browserInfo,
    os_info: osInfo,
    location_info: locationInfo,
    status: currentCount >= 3 ? 'blocked' : 'failed',
    attempt_number: currentCount,
    created_at: new Date().toISOString(),
  };

  existing.count = currentCount;
  existing.lastAttempt = Date.now();
  existing.attempts.push(attemptRecord);
  failedAttemptsMap.set(targetKey, existing);
  failedAttemptsMap.set(ipKey, existing);

  // Sync with Supabase table `admin_failed_logins`
  const db = dependencies.serviceClient || getServiceClient(dependencies.env);
  if (db) {
    try {
      await db.from('admin_failed_logins').insert({
        attempted_username: attemptRecord.attempted_username,
        client_ip: attemptRecord.client_ip,
        user_agent: attemptRecord.user_agent,
        device_type: attemptRecord.device_type,
        browser_info: attemptRecord.browser_info,
        os_info: attemptRecord.os_info,
        location_info: attemptRecord.location_info,
        status: attemptRecord.status,
        attempt_number: attemptRecord.attempt_number,
      });
    } catch (_) {}
  }

  // Determine if this attempt triggers the 3-attempt lock
  const isLockedNow = currentCount >= 3;
  if (isLockedNow) {
    const lockEntry = {
      locked: true,
      reason: `3 consecutive failed login attempts on ${istTime}`,
      lockedAt: new Date().toISOString(),
      consecutiveFailures: currentCount,
    };
    activeLocksMap.set(targetKey, lockEntry);
    activeLocksMap.set(ipKey, lockEntry);

    if (db) {
      try {
        await db.from('admin_security_locks').insert([
          {
            lock_type: 'account',
            target_identifier: targetKey,
            reason: lockEntry.reason,
            consecutive_failures: currentCount,
            is_locked: true,
          },
          {
            lock_type: 'ip',
            target_identifier: ipKey,
            reason: lockEntry.reason,
            consecutive_failures: currentCount,
            is_locked: true,
          },
        ]);
      } catch (_) {}
    }
  }

  // Create Security Alert
  const alertEntry = {
    id: crypto.randomUUID(),
    event_type: isLockedNow ? 'account_locked' : 'failed_login',
    severity: isLockedNow ? 'critical' : 'warning',
    details: {
      username,
      attemptNumber: currentCount,
      clientIp: normalizedIp,
      deviceType,
      osInfo,
      browserInfo,
      locationInfo,
      istTime,
      isLocked: isLockedNow,
    },
    client_ip: normalizedIp,
    device_info: `${deviceType} • ${browserInfo} • ${osInfo}`,
    email_sent: false,
    created_at: new Date().toISOString(),
  };
  securityAlertsStore.unshift(alertEntry);

  if (db) {
    try {
      await db.from('admin_security_alerts').insert({
        event_type: alertEntry.event_type,
        severity: alertEntry.severity,
        details: alertEntry.details,
        client_ip: alertEntry.client_ip,
        device_info: alertEntry.device_info,
      });
    } catch (_) {}
  }

  // 5. Send Instant Gmail Security Alert to Verified Owner Email
  const ownerEmail = (
    process.env.ADMIN_SECURITY_ALERT_EMAIL ||
    'mehandaarmy.info@gmail.com'
  ).trim();

  try {
    let subject = '';
    let htmlContent = '';
    let textContent = '';

    if (isLockedNow) {
      subject = `🔴 [SECURITY LOCKOUT] Admin Portal Locked After 3 Failed Attempts — Mehanda Army Investments`;
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #0A0D14; border: 1px solid #dc2626; border-radius: 16px; overflow: hidden; color: #ffffff;">
          <div style="background: linear-gradient(135deg, #7f1d1d, #991b1b, #450a0a); padding: 28px 24px; text-align: center; border-bottom: 2px solid #ef4444;">
            <div style="display: inline-block; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: #fca5a5; margin-bottom: 12px; text-transform: uppercase;">
              🚨 HIGH PRIORITY SECURITY LOCK
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">Admin Portal Locked</h1>
            <p style="margin: 8px 0 0; font-size: 13px; color: #fecaca;">3 Consecutive Failed Sign-in Attempts Detected</p>
          </div>
          <div style="padding: 24px; font-size: 13px; line-height: 1.6; color: #e2e8f0;">
            <p style="margin-top: 0;">Dear <strong>Deepak Jangra (Owner / Super Admin)</strong>,</p>
            <p>An automatic security lockout was triggered on your <strong>Mehanda Army Investments</strong> Admin Portal because <strong>3 consecutive incorrect login attempts</strong> were made.</p>
            
            <div style="background: #111827; border: 1px solid #374151; border-radius: 12px; padding: 16px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr><td style="padding: 6px 0; color: #94a3b8; width: 140px;">Website:</td><td style="padding: 6px 0; color: #ffffff; font-weight: 700;">Mehanda Army Investments</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8;">Attempted Username:</td><td style="padding: 6px 0; color: #f87171; font-weight: 700;">${username}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8;">Status:</td><td style="padding: 6px 0; color: #ef4444; font-weight: 800;">ACCOUNT & IP LOCKED (Blocked)</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8;">Date & Time (IST):</td><td style="padding: 6px 0; color: #ffffff;">${istTime}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8;">IP Address:</td><td style="padding: 6px 0; color: #38bdf8; font-family: monospace;">${normalizedIp}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8;">Device Type:</td><td style="padding: 6px 0; color: #ffffff;">${deviceType}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8;">Operating System:</td><td style="padding: 6px 0; color: #ffffff;">${osInfo}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8;">Browser:</td><td style="padding: 6px 0; color: #ffffff;">${browserInfo}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8;">Location:</td><td style="padding: 6px 0; color: #ffffff;">${locationInfo}</td></tr>
              </table>
            </div>

            <div style="background: #1e1b4b; border: 1px solid #4338ca; border-radius: 12px; padding: 16px; margin: 20px 0; color: #c7d2fe;">
              <h4 style="margin: 0 0 8px; font-size: 13px; font-weight: 800; color: #e0e7ff;">🔐 How to Unlock Your Admin Portal:</h4>
              <ol style="margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.6;">
                <li>Log in to your <strong>Admin Dashboard</strong> using your registered <strong>Biometric Passkey (Fingerprint)</strong> on your trusted device.</li>
                <li>Go to <strong>Security Management &rarr; Blocked Devices &amp; Locks</strong> and click <strong>"Unlock Account"</strong>.</li>
                <li>If your primary device is blocked, enter one of your offline <strong>Emergency Recovery Codes</strong> at the Admin Portal login recovery prompt.</li>
              </ol>
            </div>

            <p style="font-size: 11px; color: #64748b; margin-bottom: 0;">Automated Security Dispatch • Mehanda Army Investments • Hisar, Haryana</p>
          </div>
        </div>
      `;
      textContent = `[SECURITY LOCKOUT] Admin Portal Locked After 3 Failed Attempts\n\nWebsite: Mehanda Army Investments\nAttempted Username: ${username}\nStatus: ACCOUNT & IP LOCKED\nDate & Time (IST): ${istTime}\nIP: ${normalizedIp}\nDevice: ${deviceType} (${osInfo})\nBrowser: ${browserInfo}\nLocation: ${locationInfo}\n\nTo unlock, use your registered biometric device or emergency recovery code.`;
    } else {
      subject = `⚠️ [SECURITY ALERT] Failed Admin Login Attempt #${currentCount} of 3 — Mehanda Army Investments`;
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #0A0D14; border: 1px solid #f59e0b; border-radius: 16px; overflow: hidden; color: #ffffff;">
          <div style="background: linear-gradient(135deg, #78350f, #92400e, #451a03); padding: 24px; text-align: center; border-bottom: 2px solid #f59e0b;">
            <div style="display: inline-block; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: #fde68a; margin-bottom: 10px; text-transform: uppercase;">
              ⚠️ SECURITY ALERT • FAILED LOGIN
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">Incorrect Admin Login Attempt</h1>
            <p style="margin: 6px 0 0; font-size: 12px; color: #fef3c7;">Attempt #${currentCount} of 3 before automated security lock</p>
          </div>
          <div style="padding: 24px; font-size: 13px; line-height: 1.6; color: #e2e8f0;">
            <p style="margin-top: 0;">An invalid login attempt was just detected on your <strong>Mehanda Army Investments</strong> Admin Portal.</p>
            
            <div style="background: #111827; border: 1px solid #374151; border-radius: 12px; padding: 16px; margin: 18px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr><td style="padding: 5px 0; color: #94a3b8; width: 140px;">Website:</td><td style="padding: 5px 0; color: #ffffff; font-weight: 700;">Mehanda Army Investments</td></tr>
                <tr><td style="padding: 5px 0; color: #94a3b8;">Attempted Username:</td><td style="padding: 5px 0; color: #f59e0b; font-weight: 700;">${username}</td></tr>
                <tr><td style="padding: 5px 0; color: #94a3b8;">Attempt Number:</td><td style="padding: 5px 0; color: #f59e0b; font-weight: 800;">${currentCount} of 3 (Lockout at 3)</td></tr>
                <tr><td style="padding: 5px 0; color: #94a3b8;">Date & Time (IST):</td><td style="padding: 5px 0; color: #ffffff;">${istTime}</td></tr>
                <tr><td style="padding: 5px 0; color: #94a3b8;">IP Address:</td><td style="padding: 5px 0; color: #38bdf8; font-family: monospace;">${normalizedIp}</td></tr>
                <tr><td style="padding: 5px 0; color: #94a3b8;">Device Type:</td><td style="padding: 5px 0; color: #ffffff;">${deviceType}</td></tr>
                <tr><td style="padding: 5px 0; color: #94a3b8;">Operating System:</td><td style="padding: 5px 0; color: #ffffff;">${osInfo}</td></tr>
                <tr><td style="padding: 5px 0; color: #94a3b8;">Browser:</td><td style="padding: 5px 0; color: #ffffff;">${browserInfo}</td></tr>
                <tr><td style="padding: 5px 0; color: #94a3b8;">Location:</td><td style="padding: 5px 0; color: #ffffff;">${locationInfo}</td></tr>
              </table>
            </div>

            <p style="font-size: 12px; color: #94a3b8;">If this was you, please check your credentials. If you do not recognize this activity, the system will automatically block the attacker if they fail 3 times.</p>
            <p style="font-size: 11px; color: #64748b; margin-bottom: 0;">Automated Security Dispatch • Mehanda Army Investments</p>
          </div>
        </div>
      `;
      textContent = `[SECURITY ALERT] Failed Admin Login Attempt #${currentCount} of 3\n\nWebsite: Mehanda Army Investments\nAttempted Username: ${username}\nDate & Time (IST): ${istTime}\nIP: ${normalizedIp}\nDevice: ${deviceType} (${osInfo})\nBrowser: ${browserInfo}\nLocation: ${locationInfo}\n\nNotice: 3 failed attempts will trigger an immediate account and IP lockout.`;
    }

    const emailResult = await deliverEmailMessage({
      to: ownerEmail,
      subject,
      html: htmlContent,
      text: textContent,
      env: dependencies.env || process.env,
    });

    alertEntry.email_sent = true;
    alertEntry.email_delivery_status = emailResult?.provider || 'delivered';
  } catch (emailErr) {
    console.error('[admin-security] security alert email dispatch failed:', emailErr.message);
    alertEntry.email_delivery_status = `failed: ${emailErr.message}`;
  }

  return {
    isLocked: isLockedNow,
    attemptNumber: currentCount,
    attemptsRemaining: Math.max(0, 3 - currentCount),
    clientIp: normalizedIp,
    istTime,
  };
}

// 6. Record Successful Login (Resets Consecutive Failed Attempt Counters)
export async function recordSuccessfulLogin({
  username = '',
  clientIp = 'unknown',
  userAgent = '',
  method = 'password',
  dependencies = {},
}) {
  const normalizedUser = String(username || '').trim().toLowerCase();
  const normalizedIp = String(clientIp || '').trim();

  // Reset counters
  failedAttemptsMap.delete(normalizedUser);
  failedAttemptsMap.delete(normalizedIp);

  const istTime = getIstTimestamp(new Date());
  const { deviceType, osInfo, browserInfo } = parseUserAgent(userAgent);

  const auditEntry = {
    id: crypto.randomUUID(),
    actor: 'Deepak Jangra (Super Admin)',
    action: `admin_login_success (${method})`,
    details: {
      username,
      method,
      clientIp: normalizedIp,
      deviceType,
      osInfo,
      browserInfo,
      istTime,
    },
    client_ip: normalizedIp,
    created_at: new Date().toISOString(),
  };
  securityAuditLogsStore.unshift(auditEntry);

  const db = dependencies.serviceClient || getServiceClient(dependencies.env);
  if (db) {
    try {
      await db.from('admin_security_audit_logs').insert({
        actor: auditEntry.actor,
        action: auditEntry.action,
        details: auditEntry.details,
        client_ip: auditEntry.client_ip,
      });
    } catch (_) {}
  }
}

// 7. Owner Manual Unlock System (Owner/Super Admin Only)
export async function unlockSecurityTarget({
  targetIdentifier = '',
  lockType = 'account',
  adminUser = null,
  clientIp = 'unknown',
  dependencies = {},
}) {
  const normalizedTarget = String(targetIdentifier || '').trim().toLowerCase();
  if (!normalizedTarget) {
    throw new AdminAuthError(400, 'Target identifier is required to unlock.');
  }

  // Clear in-memory locks and failed attempts
  activeLocksMap.delete(normalizedTarget);
  failedAttemptsMap.delete(normalizedTarget);

  // Update Supabase
  const db = dependencies.serviceClient || getServiceClient(dependencies.env);
  if (db) {
    try {
      await db
        .from('admin_security_locks')
        .update({
          is_locked: false,
          unlocked_at: new Date().toISOString(),
          unlocked_by: adminUser?.name || 'Deepak Jangra (Super Admin)',
          unlock_method: 'owner_dashboard',
        })
        .eq('target_identifier', normalizedTarget);
    } catch (_) {}
  }

  const istTime = getIstTimestamp(new Date());
  const auditEntry = {
    id: crypto.randomUUID(),
    actor: adminUser?.name || 'Deepak Jangra (Super Admin)',
    action: `unlock_${lockType}`,
    details: {
      target: normalizedTarget,
      lockType,
      unlockedAt: istTime,
    },
    client_ip: clientIp,
    created_at: new Date().toISOString(),
  };
  securityAuditLogsStore.unshift(auditEntry);

  // Add alert
  securityAlertsStore.unshift({
    id: crypto.randomUUID(),
    event_type: 'account_unlocked',
    severity: 'info',
    details: { target: normalizedTarget, unlockedBy: auditEntry.actor, istTime },
    client_ip: clientIp,
    created_at: new Date().toISOString(),
  });

  return { success: true, message: `Target "${normalizedTarget}" has been successfully unlocked.` };
}

// 8. Emergency Recovery Code Unlock (If Owner Primary Device is Blocked)
export async function emergencyRecoveryUnlock({
  recoveryCode = '',
  clientIp = 'unknown',
  userAgent = '',
  dependencies = {},
}) {
  const code = String(recoveryCode || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!code) {
    throw new AdminAuthError(400, 'Emergency recovery code is required.');
  }

  const hashed = hashRecoveryCode(code);
  const isValidDefault = DEFAULT_EMERGENCY_RECOVERY_CODES.some(
    (c) => c.replace(/\s+/g, '').toUpperCase() === code
  );

  if (usedRecoveryCodes.has(hashed)) {
    throw new AdminAuthError(400, 'This emergency recovery code has already been used.');
  }

  let authorized = isValidDefault;

  const db = dependencies.serviceClient || getServiceClient(dependencies.env);
  if (db && !authorized) {
    try {
      const { data, error } = await db
        .from('admin_recovery_codes')
        .select('*')
        .eq('code_hash', hashed)
        .eq('is_used', false)
        .maybeSingle();

      if (!error && data) {
        authorized = true;
      }
    } catch (_) {}
  }

  if (!authorized) {
    throw new AdminAuthError(401, 'Invalid emergency recovery code.');
  }

  // Mark code as used
  usedRecoveryCodes.add(hashed);
  if (db) {
    try {
      await db
        .from('admin_recovery_codes')
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          used_by_ip: clientIp,
        })
        .eq('code_hash', hashed);
    } catch (_) {}
  }

  // Clear all locks and failures
  activeLocksMap.clear();
  failedAttemptsMap.clear();

  if (db) {
    try {
      await db
        .from('admin_security_locks')
        .update({
          is_locked: false,
          unlocked_at: new Date().toISOString(),
          unlocked_by: 'Owner Emergency Recovery Code',
          unlock_method: 'emergency_recovery_code',
        })
        .eq('is_locked', true);
    } catch (_) {}
  }

  const istTime = getIstTimestamp(new Date());
  const auditEntry = {
    id: crypto.randomUUID(),
    actor: 'Owner Emergency Recovery Code',
    action: 'emergency_recovery_unlock',
    details: { clientIp, istTime },
    client_ip: clientIp,
    created_at: new Date().toISOString(),
  };
  securityAuditLogsStore.unshift(auditEntry);

  // Send high-priority notification to Owner
  try {
    const ownerEmail = (
      process.env.ADMIN_SECURITY_ALERT_EMAIL ||
      'mehandaarmy.info@gmail.com'
    ).trim();

    await deliverEmailMessage({
      to: ownerEmail,
      subject: `⚠️ [EMERGENCY ACTION] Admin Portal Unlocked via Emergency Code — Mehanda Army Investments`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0A0D14; border: 1px solid #eab308; border-radius: 14px; padding: 24px; color: #fff;">
          <h2 style="color: #facc15; margin-top: 0;">Emergency Recovery Code Used</h2>
          <p>An emergency backup recovery code was just used to clear all security locks on the Mehanda Army Investments Admin Portal.</p>
          <p><strong>Time (IST):</strong> ${istTime}<br/><strong>IP:</strong> ${clientIp}</p>
          <p style="color: #94a3b8; font-size: 12px;">If you performed this action, no further action is needed. If you did not, immediately access the portal and update your credentials.</p>
        </div>
      `,
      text: `Emergency Recovery Code Used on Mehanda Army Investments Admin Portal on ${istTime} from IP ${clientIp}.`,
      env: dependencies.env || process.env,
    });
  } catch (_) {}

  return {
    success: true,
    message: 'Emergency recovery code accepted. All security locks have been successfully cleared.',
  };
}

// 9. Owner Security Dashboard Queries (Owner Only)
export async function getAdminSecurityOverview(dependencies = {}) {
  const db = dependencies.serviceClient || getServiceClient(dependencies.env);

  let activeLocksCount = activeLocksMap.size;
  let failedAttemptsCount = 0;
  for (const val of failedAttemptsMap.values()) {
    failedAttemptsCount += val.count || 0;
  }
  let totalAlertsCount = securityAlertsStore.length;
  let totalAuditLogsCount = securityAuditLogsStore.length;

  if (db) {
    try {
      const [locksRes, failsRes, alertsRes, auditsRes] = await Promise.all([
        db.from('admin_security_locks').select('*', { count: 'exact', head: true }).eq('is_locked', true),
        db.from('admin_failed_logins').select('*', { count: 'exact', head: true }),
        db.from('admin_security_alerts').select('*', { count: 'exact', head: true }),
        db.from('admin_security_audit_logs').select('*', { count: 'exact', head: true }),
      ]);

      if (typeof locksRes.count === 'number') activeLocksCount = locksRes.count;
      if (typeof failsRes.count === 'number') failedAttemptsCount = failsRes.count;
      if (typeof alertsRes.count === 'number') totalAlertsCount = alertsRes.count;
      if (typeof auditsRes.count === 'number') totalAuditLogsCount = auditsRes.count;
    } catch (_) {}
  }

  return {
    activeLocksCount,
    failedAttemptsCount,
    totalAlertsCount,
    totalAuditLogsCount,
    ownerEmail: process.env.ADMIN_SECURITY_ALERT_EMAIL || 'mehandaarmy.info@gmail.com',
    securityMode: 'Strict 3-Strike Hardware WebAuthn + Gmail Dispatch',
    systemStatus: activeLocksCount > 0 ? 'LOCKED_TARGETS_ACTIVE' : 'SECURE',
  };
}

export async function listFailedLogins({ limit = 50, dependencies = {} } = {}) {
  const db = dependencies.serviceClient || getServiceClient(dependencies.env);
  if (db) {
    try {
      const { data, error } = await db
        .from('admin_failed_logins')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (_) {}
  }

  const inMemory = [];
  for (const entry of failedAttemptsMap.values()) {
    if (Array.isArray(entry.attempts)) {
      inMemory.push(...entry.attempts);
    }
  }
  return inMemory
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

export async function listSecurityLocks({ dependencies = {} } = {}) {
  const db = dependencies.serviceClient || getServiceClient(dependencies.env);
  if (db) {
    try {
      const { data, error } = await db
        .from('admin_security_locks')
        .select('*')
        .eq('is_locked', true)
        .order('locked_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (_) {}
  }

  const list = [];
  for (const [target, lock] of activeLocksMap.entries()) {
    if (lock.locked) {
      list.push({
        id: crypto.randomUUID(),
        target_identifier: target,
        lock_type: target.includes('.') || target.includes(':') ? 'ip' : 'account',
        reason: lock.reason,
        consecutive_failures: lock.consecutiveFailures,
        is_locked: true,
        locked_at: lock.lockedAt,
      });
    }
  }
  return list;
}

export async function listSecurityAlerts({ limit = 50, dependencies = {} } = {}) {
  const db = dependencies.serviceClient || getServiceClient(dependencies.env);
  if (db) {
    try {
      const { data, error } = await db
        .from('admin_security_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (_) {}
  }

  return securityAlertsStore.slice(0, limit);
}

export async function listSecurityAuditLogs({ limit = 50, dependencies = {} } = {}) {
  const db = dependencies.serviceClient || getServiceClient(dependencies.env);
  if (db) {
    try {
      const { data, error } = await db
        .from('admin_security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (_) {}
  }

  return securityAuditLogsStore.slice(0, limit);
}

// 10. Master 6-Digit PIN Verification & Failure Alert (Owner Terminal Protection)
export async function recordPinAttempt({ clientIp, userAgent, isCorrect, attemptNumber = 1, dependencies = {} } = {}) {
  const istTime = getIstTimestamp();
  const ua = parseUserAgent(userAgent);
  const ownerEmail = (process.env.ADMIN_SECURITY_ALERT_EMAIL || 'mehandaarmy.info@gmail.com').trim();

  if (isCorrect) {
    securityAuditLogsStore.unshift({
      action: 'MASTER_PIN_VERIFIED',
      admin_email: ownerEmail,
      ip: clientIp,
      device: `${ua.device} (${ua.os})`,
      timestamp: istTime,
    });
    return { success: true, verified: true };
  }

  // If wrong PIN
  const auditEntry = {
    action: `MASTER_PIN_FAILED_ATTEMPT_${attemptNumber}`,
    admin_email: ownerEmail,
    ip: clientIp,
    device: `${ua.device} (${ua.os})`,
    timestamp: istTime,
  };
  securityAuditLogsStore.unshift(auditEntry);

  if (attemptNumber >= 3) {
    const subject = `🚨 [PIN ALERT] Unauthorized Security & Settings Access Attempt (3 Failed PINs) — Mehanda Army Investments`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0D14; border: 1px solid #dc2626; border-radius: 16px; overflow: hidden; color: #ffffff;">
        <div style="background: linear-gradient(135deg, #7f1d1d, #991b1b, #450a0a); padding: 24px; text-align: center; border-bottom: 2px solid #ef4444;">
          <h2 style="margin: 0; color: #fff;">⚠️ Unauthorized PIN Access Attempt</h2>
          <p style="color: #fca5a5; font-size: 13px; margin: 6px 0 0 0;">3 incorrect master PIN attempts were entered to access Security Shield & Settings.</p>
        </div>
        <div style="padding: 24px; font-size: 13px; line-height: 1.6; color: #e2e8f0;">
          <p>An unauthorized user attempted to access the <strong>Security Shield & Locks</strong> or <strong>Settings</strong> panel with invalid PINs.</p>
          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Attempted Target:</strong> Security Terminal / System Settings</p>
            <p style="margin: 4px 0;"><strong>Consecutive Failures:</strong> 3 of 3</p>
            <p style="margin: 4px 0;"><strong>Date & Time (IST):</strong> ${istTime}</p>
            <p style="margin: 4px 0;"><strong>IP Address:</strong> ${clientIp}</p>
            <p style="margin: 4px 0;"><strong>Device Type:</strong> ${ua.device}</p>
            <p style="margin: 4px 0;"><strong>Operating System:</strong> ${ua.os}</p>
            <p style="margin: 4px 0;"><strong>Browser:</strong> ${ua.browser}</p>
            <p style="margin: 4px 0; color: #f87171;"><strong>Terminal Status:</strong> LOCKED (Access Blocked)</p>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">This is an automated real-time security alert dispatched from your Mehanda Army Investments server.</p>
        </div>
      </div>
    `;
    const text = `SECURITY ALERT: 3 Failed PIN attempts on Security Shield & Settings at ${istTime} from IP ${clientIp} (${ua.device}, ${ua.os}). Terminal locked.`;

    try {
      await deliverEmailMessage({
        to: ownerEmail,
        subject,
        html,
        text,
        env: dependencies.env || process.env,
      });
      securityAlertsStore.unshift({
        recipient: ownerEmail,
        subject,
        status: 'delivered',
        timestamp: istTime,
      });
    } catch (err) {
      console.warn('[pin-security] alert email dispatch failed:', err.message);
    }

    return {
      success: true,
      verified: false,
      locked: true,
      attemptNumber: 3,
      error: '3 incorrect PIN attempts. Security terminal locked and security alert dispatched to mehandaarmy.info@gmail.com.',
    };
  }

  return {
    success: true,
    verified: false,
    locked: false,
    attemptNumber,
    error: `Incorrect PIN. Attempt ${attemptNumber} of 3.`,
  };
}
