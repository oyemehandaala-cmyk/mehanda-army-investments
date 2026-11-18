import {
  adminErrorResponse,
  assertSameOrigin,
  requireAdminUser,
} from '../server/adminAuth.js';
import {
  getAdminSecurityOverview,
  listFailedLogins,
  listSecurityLocks,
  listSecurityAlerts,
  listSecurityAuditLogs,
  unlockSecurityTarget,
  emergencyRecoveryUnlock,
  recordPinAttempt,
  DEFAULT_EMERGENCY_RECOVERY_CODES,
} from '../server/adminSecurity.js';

function getClientIp(headers = {}, request) {
  return headers['x-nf-client-connection-ip'] ||
    headers['x-vercel-forwarded-for'] ||
    request?.socket?.remoteAddress ||
    '127.0.0.1';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const headers = req.headers || {};
  const clientIp = getClientIp(headers, req);

  // 1. GET Requests: Security Overview, Logs & Alerts (Requires Super Admin Session)
  if (req.method === 'GET') {
    try {
      const adminUser = await requireAdminUser(headers);
      const url = new URL(req.url || '/', 'http://localhost');
      const action = url.searchParams.get('action') || 'overview';

      if (action === 'failed-logins') {
        const logins = await listFailedLogins({ limit: 50 });
        return res.status(200).json({ success: true, failedLogins: logins });
      }

      if (action === 'locks') {
        const locks = await listSecurityLocks();
        return res.status(200).json({ success: true, locks });
      }

      if (action === 'alerts') {
        const alerts = await listSecurityAlerts({ limit: 50 });
        return res.status(200).json({ success: true, alerts });
      }

      if (action === 'audit-logs') {
        const auditLogs = await listSecurityAuditLogs({ limit: 50 });
        return res.status(200).json({ success: true, auditLogs });
      }

      if (action === 'recovery-codes') {
        return res.status(200).json({
          success: true,
          recoveryCodes: DEFAULT_EMERGENCY_RECOVERY_CODES,
        });
      }

      // Default: Return full security overview
      const [overview, locks, recentAlerts, recentFailed] = await Promise.all([
        getAdminSecurityOverview(),
        listSecurityLocks(),
        listSecurityAlerts({ limit: 20 }),
        listFailedLogins({ limit: 20 }),
      ]);

      return res.status(200).json({
        success: true,
        overview,
        locks,
        alerts: recentAlerts,
        failedLogins: recentFailed,
      });
    } catch (error) {
      const result = adminErrorResponse(error);
      return res.status(result.status).json(result.body);
    }
  }

  // 2. POST Requests: Manual Unlock or Emergency Recovery Unlock
  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ success: false, error: 'A valid request body is required.' });
      }

      const action = body.action;

      // Emergency Recovery Code Unlock (Accessible when Owner primary device is blocked)
      if (action === 'emergency-unlock') {
        assertSameOrigin(headers);
        const { recoveryCode } = body;
        const result = await emergencyRecoveryUnlock({
          recoveryCode,
          clientIp,
          userAgent: headers['user-agent'] || '',
        });
        return res.status(200).json(result);
      }

      // 6-Digit Master Security PIN Verification (Security Shield & Settings Gate)
      if (action === 'verify-pin') {
        assertSameOrigin(headers);
        const { pin, attemptNumber } = body;
        const MASTER_PIN = '556511';
        const isCorrect = String(pin || '').trim() === MASTER_PIN;
        const result = await recordPinAttempt({
          clientIp,
          userAgent: headers['user-agent'] || '',
          isCorrect,
          attemptNumber: Number(attemptNumber) || 1,
        });
        return res.status(200).json(result);
      }

      // Manual Target Unlock (Requires Authenticated Owner Session)
      if (action === 'unlock-target' || action === 'unlock') {
        assertSameOrigin(headers);
        const adminUser = await requireAdminUser(headers);
        const { targetIdentifier, lockType } = body;
        const result = await unlockSecurityTarget({
          targetIdentifier,
          lockType: lockType || 'account',
          adminUser,
          clientIp,
        });
        return res.status(200).json(result);
      }

      return res.status(400).json({ success: false, error: 'Invalid security action.' });
    } catch (error) {
      const result = adminErrorResponse(error);
      return res.status(result.status).json(result.body);
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed.' });
}
