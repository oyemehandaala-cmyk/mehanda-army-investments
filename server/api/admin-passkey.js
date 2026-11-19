import crypto from 'node:crypto';
import {
  ADMIN_USERNAME,
  adminErrorResponse,
  assertSameOrigin,
  createAdminSessionCookie,
  requireAdminUser,
  createAdminPasskeySession,
  getEnrollmentSession,
  consumeEnrollmentSession,
  activeSessionsCache,
  persistLocalSessionsBackup,
} from '../adminAuth.js';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  storeWebAuthnCredential,
  listAdminWebAuthnCredentials,
  deleteWebAuthnCredential,
} from '../webauthnService.js';
import { DEFAULT_EMERGENCY_RECOVERY_CODES } from '../adminSecurity.js';

function getRpId(headers = {}) {
  const origin = headers.origin || headers.Origin;
  if (origin) {
    try {
      const originHost = new URL(origin).hostname.toLowerCase();
      if (originHost === 'www.mehandaarmy.net') return 'mehandaarmy.net';
      if (originHost === '127.0.0.1') return 'localhost';
      return originHost;
    } catch (_) {}
  }
  const host = (headers['x-forwarded-host'] || headers.host || headers.Host || 'mehandaarmy.net')
    .split(',')[0].trim();
  const hostname = host.split(':')[0].toLowerCase();
  if (hostname === 'www.mehandaarmy.net') return 'mehandaarmy.net';
  return hostname === '127.0.0.1' ? 'localhost' : hostname;
}

function getExpectedOrigin(headers = {}) {
  const origin = headers.origin || headers.Origin;
  if (origin) {
    try {
      const parsed = new URL(origin);
      return `${parsed.protocol}//${parsed.host}`;
    } catch (_) {}
  }
  const forwardedProto = (headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'] || '')
    .split(',')[0].trim().toLowerCase();
  const host = (headers['x-forwarded-host'] || headers.host || headers.Host || 'mehandaarmy.net')
    .split(',')[0].trim();
  const protocol = forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const headers = req.headers || {};
  const body = req.body || {};
  const clientRpId = (typeof body.clientRpId === 'string' && body.clientRpId.trim()) ? body.clientRpId.trim().toLowerCase() : null;
  const safeClientRpId = (
    clientRpId === 'mehandaarmy.net' ||
    clientRpId === 'www.mehandaarmy.net' ||
    clientRpId === 'localhost' ||
    clientRpId === '127.0.0.1' ||
    clientRpId?.endsWith('.netlify.app') ||
    clientRpId?.endsWith('.vercel.app') ||
    clientRpId?.endsWith('.github.io')
  ) ? clientRpId : null;
  const rpId = safeClientRpId || getRpId(headers);
  const expectedOrigin = getExpectedOrigin(headers);

  if (req.method === 'GET') {
    try {
      const adminUser = await requireAdminUser(headers);
      const devices = await listAdminWebAuthnCredentials(adminUser.id);
      return res.status(200).json({ success: true, devices });
    } catch (error) {
      return res.status(error.status || 401).json({
        success: false,
        error: error.message || 'Admin session is missing or expired.',
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ success: false, error: 'A valid request body is required.' });
    }

    const action = body.action;

    // 1. Generate Authentication / Login Options
    if (action === 'login-challenge' || action === 'login-options') {
      let registeredList = [];
      try {
        registeredList = await listAdminWebAuthnCredentials('e04c1cbf-a746-42c9-bb02-819c992db9fd');
      } catch (err) {
        console.warn('[admin-passkey] list credentials for login options warning:', err?.message);
      }
      const options = generateAuthenticationOptions({
        rpId,
        allowCredentials: registeredList,
        userVerification: 'required',
      });
      return res.status(200).json({ success: true, options });
    }

    // 2. Verify Authentication / Login Assertion
    if (action === 'login-verify') {
      assertSameOrigin(headers);
      const { response: webauthnResponse } = body;
      if (!webauthnResponse || !webauthnResponse.id) {
        return res.status(400).json({ success: false, error: 'WebAuthn assertion response is required.' });
      }

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          credential: webauthnResponse,
          response: webauthnResponse.response || webauthnResponse,
          rpId,
          expectedRpId: rpId,
          expectedOrigin,
          allowedOrigins: [expectedOrigin, 'http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000'],
        });
      } catch (authErr) {
        return res.status(401).json({
          success: false,
          error: authErr.message || 'Biometric verification failed.',
        });
      }

      if (!verification || !verification.verified) {
        return res.status(401).json({
          success: false,
          error: verification?.error || 'Biometric verification failed.',
        });
      }

      // Check strictly that hardware biometric/user verification was completed
      if (!verification.userVerified) {
        return res.status(401).json({
          success: false,
          error: 'Biometric verification required. Please verify with fingerprint or screen lock.',
        });
      }

      const adminUserId = verification.credential.admin_user_id;
      const session = await createAdminPasskeySession({
        adminUserId,
        headers,
      });

      if (session?.sessionId) {
        activeSessionsCache.set(session.sessionId, {
          adminUserId,
          email: 'mehandaarmy.info@gmail.com',
          expiresAt: session.expiresAt,
        });
        persistLocalSessionsBackup();
      }

      res.setHeader(
        'Set-Cookie',
        createAdminSessionCookie(session.accessToken, session.expiresAt, headers)
      );

      return res.status(200).json({
        success: true,
        username: ADMIN_USERNAME,
        expiresAt: session.expiresAt,
        deviceName: verification.credential.device_name || 'Biometric Device',
      });
    }

    // =========================================================================
    // MANDATORY FIRST-TIME PASSKEY ENROLLMENT ACTIONS (Uses Enrollment Session)
    // =========================================================================

    // A. Generate Enrollment Options with Enrollment Token
    if (action === 'enroll-challenge' || action === 'enroll-options') {
      try {
        assertSameOrigin(headers);
        const { enrollmentToken } = body;
        const enrollment = getEnrollmentSession(enrollmentToken);
        if (!enrollment) {
          return res.status(401).json({
            success: false,
            error: 'Enrollment session has expired or is invalid. Please sign in again with your password.',
          });
        }

        const options = generateRegistrationOptions({
          adminUserId: enrollment.adminUserId,
          adminEmail: 'mehandaarmy.info@gmail.com',
          rpId,
          rpName: 'Mehanda Army Investments',
        });
        return res.status(200).json({ success: true, options });
      } catch (optErr) {
        console.error('[admin-passkey] enroll-options error:', optErr);
        return res.status(400).json({
          success: false,
          error: optErr?.message || 'Failed to prepare biometric registration.',
        });
      }
    }

    // B. Verify Enrollment & Grant Full Admin Session
    if (action === 'enroll-verify') {
      try {
        assertSameOrigin(headers);
        const { enrollmentToken, deviceToken, response: webauthnResponse, deviceName } = body;
        const enrollment = getEnrollmentSession(enrollmentToken);
        if (!enrollment) {
          return res.status(401).json({
            success: false,
            error: 'Enrollment session has expired or is invalid. Please sign in again with your password.',
          });
        }

        if (!webauthnResponse || !webauthnResponse.id) {
          return res.status(400).json({
            success: false,
            error: 'Biometric passkey response is required.',
          });
        }

        let verification;
        try {
          verification = await verifyRegistrationResponse({
            credential: webauthnResponse,
            response: webauthnResponse.response || webauthnResponse,
            rpId,
            expectedRpId: rpId,
            expectedOrigin,
            allowedOrigins: [expectedOrigin, 'http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000'],
          });
        } catch (regErr) {
          return res.status(400).json({
            success: false,
            error: regErr.message || 'Biometric fingerprint verification failed.',
          });
        }

        if (!verification || !verification.verified) {
          return res.status(400).json({
            success: false,
            error: verification?.error || 'Biometric fingerprint verification failed.',
          });
        }

        const targetDeviceToken = deviceToken || enrollment.deviceToken;
        const savedRecord = await storeWebAuthnCredential({
          adminUserId: enrollment.adminUserId,
          credentialId: verification.credentialId,
          publicKey: verification.publicKey,
          signCount: verification.signCount,
          deviceName: typeof deviceName === 'string' && deviceName.trim().length > 0
            ? deviceName.trim().slice(0, 100)
            : 'Enrolled Biometric Device',
          aaguid: verification.aaguid,
          transports: Array.isArray(webauthnResponse.response?.transports)
            ? webauthnResponse.response.transports
            : ['internal'],
          deviceToken: targetDeviceToken,
        });

        // Consume enrollment session
        consumeEnrollmentSession(enrollmentToken);

        // Issue full Admin Session
        let session = enrollment.session;
        if (!session || !session.accessToken) {
          try {
            session = await createAdminPasskeySession({
              adminUserId: enrollment.adminUserId,
              headers,
            });
          } catch (sessionErr) {
            console.warn('[admin-passkey] createAdminPasskeySession fallback:', sessionErr?.message);
            const sid = crypto.randomUUID();
            const exp = Math.floor(Date.now() / 1000) + 1800;
            session = {
              accessToken: `hdr.${Buffer.from(JSON.stringify({ sub: enrollment.adminUserId, session_id: sid, exp })).toString('base64url')}.sig`,
              expiresAt: exp,
              sessionId: sid,
            };
          }
        }

        if (session?.sessionId) {
          activeSessionsCache.set(session.sessionId, {
            adminUserId: enrollment.adminUserId,
            email: 'mehandaarmy.info@gmail.com',
            expiresAt: session.expiresAt,
          });
          persistLocalSessionsBackup();
        }

        res.setHeader(
          'Set-Cookie',
          createAdminSessionCookie(session.accessToken, session.expiresAt, headers)
        );

        return res.status(200).json({
          success: true,
          message: 'Fingerprint Registration Successful',
          expiresAt: session.expiresAt,
          deviceToken: targetDeviceToken,
          device: {
            id: savedRecord.id,
            credential_id: savedRecord.credential_id,
            device_name: savedRecord.device_name,
          },
        });
      } catch (verifyErr) {
        console.error('[admin-passkey] enroll-verify error:', verifyErr);
        return res.status(400).json({
          success: false,
          error: verifyErr?.message || 'Biometric registration could not be completed.',
        });
      }
    }

    // C. Emergency Owner Recovery during Enrollment (when biometrics unavailable/broken)
    if (action === 'enroll-emergency-recovery') {
      try {
        assertSameOrigin(headers);
        const { enrollmentToken, recoveryCode, masterPin } = body;
        const enrollment = getEnrollmentSession(enrollmentToken);
        if (!enrollment) {
          return res.status(401).json({
            success: false,
            error: 'Enrollment session has expired. Please sign in again.',
          });
        }

        const normalizedCode = String(recoveryCode || '').trim().toUpperCase();
        const normalizedPin = String(masterPin || '').trim();
        const isValidCode = DEFAULT_EMERGENCY_RECOVERY_CODES.includes(normalizedCode);
        const isValidPin = normalizedPin === '556511';

        if (!isValidCode && !isValidPin) {
          return res.status(401).json({
            success: false,
            error: 'Invalid recovery code or Master PIN.',
          });
        }

        consumeEnrollmentSession(enrollmentToken);

        let session = enrollment.session;
        if (!session || !session.accessToken) {
          try {
            session = await createAdminPasskeySession({
              adminUserId: enrollment.adminUserId,
              headers,
            });
          } catch (sessionErr) {
            console.warn('[admin-passkey] emergency recovery session fallback:', sessionErr?.message);
            const sid = crypto.randomUUID();
            const exp = Math.floor(Date.now() / 1000) + 1800;
            session = {
              accessToken: `hdr.${Buffer.from(JSON.stringify({ sub: enrollment.adminUserId, session_id: sid, exp })).toString('base64url')}.sig`,
              expiresAt: exp,
              sessionId: sid,
            };
          }
        }

        if (session?.sessionId) {
          activeSessionsCache.set(session.sessionId, {
            adminUserId: enrollment.adminUserId,
            email: 'mehandaarmy.info@gmail.com',
            expiresAt: session.expiresAt,
          });
          persistLocalSessionsBackup();
        }

        res.setHeader(
          'Set-Cookie',
          createAdminSessionCookie(session.accessToken, session.expiresAt, headers)
        );

        return res.status(200).json({
          success: true,
          message: 'Authorized by Owner Emergency Recovery',
          expiresAt: session.expiresAt,
        });
      } catch (recErr) {
        console.error('[admin-passkey] enroll-recovery error:', recErr);
        return res.status(400).json({
          success: false,
          error: recErr?.message || 'Emergency recovery could not be processed.',
        });
      }
    }

    // 3. Generate Registration / Passkey Enrollment Options (Requires Admin Session)
    if (action === 'register-challenge' || action === 'register-options') {
      try {
        assertSameOrigin(headers);
        const adminUser = await requireAdminUser(headers);
        const options = generateRegistrationOptions({
          adminUserId: adminUser.id,
          adminEmail: adminUser.email || 'mehandaarmy.info@gmail.com',
          rpId,
          rpName: 'Mehanda Army Investments',
        });
        return res.status(200).json({ success: true, options });
      } catch (optErr) {
        return res.status(optErr.status || 401).json({
          success: false,
          error: optErr.message || 'Admin session is missing or expired.',
        });
      }
    }

    // 4. Verify Registration / Passkey Attestation (Requires Admin Session)
    if (action === 'register-verify') {
      try {
        assertSameOrigin(headers);
        const adminUser = await requireAdminUser(headers);
        const { response: webauthnResponse, deviceName } = body;

        if (!webauthnResponse || !webauthnResponse.id) {
          return res.status(400).json({ success: false, error: 'WebAuthn registration response is required.' });
        }

        let verification;
        try {
          verification = await verifyRegistrationResponse({
            credential: webauthnResponse,
            response: webauthnResponse.response || webauthnResponse,
            expectedRpId: rpId,
            expectedOrigin,
            allowedOrigins: [expectedOrigin, 'http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000'],
          });
        } catch (verErr) {
          return res.status(400).json({
            success: false,
            error: verErr.message || 'Passkey registration verification failed.',
          });
        }

        if (!verification || !verification.verified) {
          return res.status(400).json({
            success: false,
            error: verification?.error || 'Passkey registration verification failed.',
          });
        }

        const savedRecord = await storeWebAuthnCredential({
          adminUserId: adminUser.id,
          credentialId: verification.credentialId,
          publicKey: verification.publicKey,
          signCount: verification.signCount,
          deviceName: typeof deviceName === 'string' && deviceName.trim().length > 0
            ? deviceName.trim().slice(0, 100)
            : 'Admin Device',
          aaguid: verification.aaguid,
          transports: Array.isArray(webauthnResponse.response?.transports)
            ? webauthnResponse.response.transports
            : ['internal'],
        });

        return res.status(200).json({
          success: true,
          message: 'Device passkey registered successfully!',
          device: {
            id: savedRecord.id,
            credential_id: savedRecord.credential_id,
            device_name: savedRecord.device_name,
            created_at: savedRecord.created_at,
          },
        });
      } catch (regErr) {
        return res.status(regErr.status || 400).json({
          success: false,
          error: regErr.message || 'Passkey registration could not be completed.',
        });
      }
    }

    // 5. List Devices (Requires Admin Session)
    if (action === 'list-devices') {
      try {
        const adminUser = await requireAdminUser(headers);
        const devices = await listAdminWebAuthnCredentials(adminUser.id);
        return res.status(200).json({ success: true, devices });
      } catch (listErr) {
        return res.status(listErr.status || 401).json({
          success: false,
          error: listErr?.message || 'Admin session is missing or expired.',
        });
      }
    }

    // 6. Delete Device (Requires Admin Session)
    if (action === 'delete-device') {
      try {
        assertSameOrigin(headers);
        const adminUser = await requireAdminUser(headers);
        const credentialId = body.credentialId || body.credential_id || body.id;
        if (!credentialId) {
          return res.status(400).json({ success: false, error: 'Credential ID is required.' });
        }

        await deleteWebAuthnCredential(adminUser.id, credentialId);
        return res.status(200).json({ success: true, message: 'Device passkey removed successfully.' });
      } catch (delErr) {
        console.error('[admin-passkey] delete-device error:', delErr);
        return res.status(400).json({
          success: false,
          error: delErr?.message || 'Failed to remove device passkey.',
        });
      }
    }

    return res.status(400).json({ success: false, error: 'Unknown action.' });
  } catch (error) {
    const result = adminErrorResponse(error);
    return res.status(result.status).json(result.body);
  }
}

