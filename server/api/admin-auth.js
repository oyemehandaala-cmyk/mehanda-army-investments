import crypto from 'node:crypto';
import {
  ADMIN_USERNAME,
  adminErrorResponse,
  assertSameOrigin,
  createAdminSessionCookie,
  createExpiredAdminSessionCookie,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
  updateAdminPassword,
  updateAdminProfile,
  getAdminConfiguration,
  createEnrollmentSession,
} from '../adminAuth.js';
import { isDeviceEnrolled } from '../webauthnService.js';

function getClientIp(headers = {}, request) {
  return headers['x-nf-client-connection-ip'] ||
    headers['x-vercel-forwarded-for'] ||
    request?.socket?.remoteAddress ||
    'unknown';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'GET') {
    try {
      return res.status(200).json({ success: true, ...(await getAdminSession(req.headers)) });
    } catch (error) {
      const result = adminErrorResponse(error);
      return res.status(result.status).json(result.body);
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    assertSameOrigin(req.headers);
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ success: false, error: 'A valid request is required.' });
    }

    if (body.action === 'logout') {
      try {
        await logoutAdmin(req.headers);
      } catch (error) {
        if (error?.sessionRevoked) {
          res.setHeader('Set-Cookie', createExpiredAdminSessionCookie(req.headers));
        }
        throw error;
      }
      res.setHeader('Set-Cookie', createExpiredAdminSessionCookie(req.headers));
      return res.status(200).json({ success: true });
    }

    if (body.action === 'change_password') {
      const result = await updateAdminPassword({
        newPassword: body.newPassword,
        headers: req.headers,
      });
      return res.status(200).json(result);
    }

    if (body.action === 'update_profile') {
      const result = await updateAdminProfile({
        name: body.name,
        avatarUrl: body.avatarUrl,
        headers: req.headers,
      });
      return res.status(200).json(result);
    }

    if (body.action !== 'login' ||
        typeof body.username !== 'string' ||
        body.username.length > 64 ||
        typeof body.password !== 'string' ||
        body.password.length > 256) {
      return res.status(401).json({
        success: false,
        error: 'Unable to sign in with those credentials.',
      });
    }

    const session = await loginAdmin({
      username: body.username,
      password: body.password,
      clientIp: getClientIp(req.headers, req),
      userAgent: req.headers['user-agent'] || '',
      headers: req.headers,
    });

    // Check if current device is already enrolled with a biometric passkey
    let adminUserId = 'e04c1cbf-a746-42c9-bb02-819c992db9fd';
    try {
      const config = getAdminConfiguration(process.env);
      if (config.adminUserId) adminUserId = config.adminUserId;
    } catch (_) {}

    const deviceToken = typeof body.deviceToken === 'string' && body.deviceToken.trim().length > 0
      ? body.deviceToken.trim()
      : '';
    const isEnrolled = deviceToken
      ? await isDeviceEnrolled({ adminUserId, deviceToken })
      : false;

    // If new device and not explicitly bypassed: trigger mandatory passkey enrollment
    if (!isEnrolled && !body.skipEnrollmentCheck) {
      const activeDeviceToken = deviceToken || crypto.randomUUID();
      const enrollmentToken = createEnrollmentSession({
        adminUserId,
        username: ADMIN_USERNAME,
        deviceToken: activeDeviceToken,
        session,
      });

      return res.status(200).json({
        success: true,
        requireEnrollment: true,
        enrollmentToken,
        deviceToken: activeDeviceToken,
        username: ADMIN_USERNAME,
        message: 'First-time login on this device requires mandatory fingerprint / passkey registration.',
      });
    }

    res.setHeader(
      'Set-Cookie',
      createAdminSessionCookie(session.accessToken, session.expiresAt, req.headers)
    );
    return res.status(200).json({
      success: true,
      username: ADMIN_USERNAME,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    const result = adminErrorResponse(error);
    return res.status(result.status).json(result.body);
  }
}

