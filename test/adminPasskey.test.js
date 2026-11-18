import assert from 'node:assert/strict';
import test from 'node:test';
import {
  toBase64Url,
  fromBase64Url,
  createChallenge,
  consumeChallenge,
  generateRegistrationOptions,
  generateAuthenticationOptions,
  saveWebAuthnCredential,
  listAdminWebAuthnCredentials,
  deleteWebAuthnCredential,
  getWebAuthnCredentialById,
  isDeviceEnrolled,
} from '../server/webauthnService.js';
import adminPasskeyHandler from '../server/api/admin-passkey.js';
import {
  ADMIN_USERNAME,
  createEnrollmentSession,
  getEnrollmentSession,
  consumeEnrollmentSession,
} from '../server/adminAuth.js';

test('WebAuthn Base64URL conversions round-trip correctly', () => {
  const original = Buffer.from('Mehanda Army Investments WebAuthn Test');
  const encoded = toBase64Url(original);
  assert.equal(typeof encoded, 'string');
  assert.ok(!encoded.includes('+') && !encoded.includes('/'));
  const decoded = fromBase64Url(encoded);
  assert.equal(decoded.toString('utf8'), original.toString('utf8'));
});

test('WebAuthn challenge store creates and consumes one-time challenges', () => {
  const challenge = createChallenge('login', { test: true });
  assert.equal(typeof challenge, 'string');
  assert.ok(challenge.length >= 32);

  // Challenge can be consumed once with matching type
  const consumed = consumeChallenge(challenge, 'login');
  assert.ok(consumed);
  assert.equal(consumed.type, 'login');

  // Second consume returns null (one-time replay prevention)
  const replay = consumeChallenge(challenge, 'login');
  assert.equal(replay, null);
});

test('generateRegistrationOptions produces valid W3C registration options', () => {
  const options = generateRegistrationOptions({
    adminUserId: '123e4567-e89b-42d3-a456-426614174000',
    adminEmail: 'oyemehandaala@gmail.com',
    rpId: 'mehandaarmy.net',
    rpName: 'Mehanda Army Investments',
  });

  assert.equal(options.rp.id, 'mehandaarmy.net');
  assert.equal(options.rp.name, 'Mehanda Army Investments');
  assert.equal(options.user.name, 'mehandaarmy');
  assert.equal(options.authenticatorSelection.authenticatorAttachment, 'platform');
  assert.equal(options.authenticatorSelection.userVerification, 'required');
  assert.ok(Array.isArray(options.pubKeyCredParams));
  assert.ok(options.challenge);
});

test('generateAuthenticationOptions produces valid W3C assertion options with userVerification required', () => {
  const options = generateAuthenticationOptions({
    rpId: 'mehandaarmy.net',
  });

  assert.equal(options.rpId, 'mehandaarmy.net');
  assert.equal(options.userVerification, 'required');
  assert.ok(options.challenge);
});

test('saveWebAuthnCredential, listAdminWebAuthnCredentials and deleteWebAuthnCredential manage device lifecycle', async () => {
  const adminId = '123e4567-e89b-42d3-a456-426614174099';
  const credId = 'test-cred-id-' + Date.now();
  const dummyKeyPem = '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE\n-----END PUBLIC KEY-----';

  const saved = await saveWebAuthnCredential({
    adminUserId: adminId,
    credentialId: credId,
    publicKeyPem: dummyKeyPem,
    deviceName: "Deepak's iPhone 15 Pro",
    transports: ['internal'],
  });

  assert.ok(saved);
  assert.equal(saved.credential_id, credId);
  assert.equal(saved.device_name, "Deepak's iPhone 15 Pro");

  const fetched = await getWebAuthnCredentialById(credId);
  assert.ok(fetched);
  assert.equal(fetched.credential_id, credId);

  const list = await listAdminWebAuthnCredentials(adminId);
  assert.ok(Array.isArray(list));
  assert.ok(list.some((d) => d.credential_id === credId));

  await deleteWebAuthnCredential(adminId, credId);
  const listAfterDelete = await listAdminWebAuthnCredentials(adminId);
  assert.ok(!listAfterDelete.some((d) => d.credential_id === credId));
});

test('admin-passkey API rejects unsupported methods', async () => {
  let statusCode = 200;
  let body = null;
  const res = {
    setHeader: () => {},
    status: (code) => { statusCode = code; return res; },
    json: (val) => { body = val; return res; },
  };

  await adminPasskeyHandler({ method: 'DELETE', headers: {} }, res);
  assert.equal(statusCode, 405);
  assert.equal(body.success, false);
});

test('admin-passkey API generates login options with rpId matching hostname', async () => {
  let statusCode = 200;
  let body = null;
  const res = {
    setHeader: () => {},
    status: (code) => { statusCode = code; return res; },
    json: (val) => { body = val; return res; },
  };

  await adminPasskeyHandler({
    method: 'POST',
    headers: { host: 'mehandaarmy.net' },
    body: { action: 'login-options' },
  }, res);

  assert.equal(statusCode, 200);
  assert.equal(body.success, true);
  assert.equal(body.options.rpId, 'mehandaarmy.net');
  assert.equal(body.options.userVerification, 'required');
});

test('admin-passkey API rejects registration without authenticated admin session', async () => {
  let statusCode = 200;
  let body = null;
  const res = {
    setHeader: () => {},
    status: (code) => { statusCode = code; return res; },
    json: (val) => { body = val; return res; },
  };

  await adminPasskeyHandler({
    method: 'POST',
    headers: { host: 'mehandaarmy.net' },
    body: { action: 'register-options' },
  }, res);

  assert.equal(statusCode, 401);
  assert.equal(body.success, false);
});

test('enrollment sessions create, validate, and expire securely', () => {
  const adminId = '123e4567-e89b-42d3-a456-426614174099';
  const deviceToken = 'dev-token-test-123';
  const token = createEnrollmentSession({
    adminUserId: adminId,
    username: 'mehandaarmy',
    deviceToken,
  });

  assert.ok(token);
  assert.ok(token.startsWith('mai_enroll_'));

  const session = getEnrollmentSession(token);
  assert.ok(session);
  assert.equal(session.adminUserId, adminId);
  assert.equal(session.deviceToken, deviceToken);

  const consumed = consumeEnrollmentSession(token);
  assert.ok(consumed);
  assert.equal(consumed.token, token);

  // Once consumed, cannot be reused
  assert.equal(getEnrollmentSession(token), null);
  assert.equal(consumeEnrollmentSession(token), null);
});

test('admin-passkey enroll-options requires valid enrollment token', async () => {
  let statusCode = 200;
  let body = null;
  const res = {
    setHeader: () => {},
    status: (code) => { statusCode = code; return res; },
    json: (val) => { body = val; return res; },
  };

  // 1. Invalid enrollment token returns 401
  await adminPasskeyHandler({
    method: 'POST',
    headers: { host: 'mehandaarmy.net' },
    body: { action: 'enroll-options', enrollmentToken: 'invalid_token_123' },
  }, res);

  assert.equal(statusCode, 401);
  assert.equal(body.success, false);

  // 2. Valid enrollment token returns valid WebAuthn registration options
  const adminId = '123e4567-e89b-42d3-a456-426614174099';
  const validToken = createEnrollmentSession({
    adminUserId: adminId,
    username: 'mehandaarmy',
    deviceToken: 'dev-token-xyz',
  });

  await adminPasskeyHandler({
    method: 'POST',
    headers: { host: 'mehandaarmy.net' },
    body: { action: 'enroll-options', enrollmentToken: validToken },
  }, res);

  assert.equal(statusCode, 200);
  assert.equal(body.success, true);
  assert.ok(body.options.challenge);
  assert.equal(body.options.rp.id, 'mehandaarmy.net');
  assert.equal(body.options.rp.name, 'Mehanda Army Investments');
});

test('admin-passkey enroll-emergency-recovery verifies 556511 Master PIN', async () => {
  const adminId = '123e4567-e89b-42d3-a456-426614174099';
  const validToken = createEnrollmentSession({
    adminUserId: adminId,
    username: 'mehandaarmy',
    deviceToken: 'dev-token-emergency',
  });

  let statusCode = 200;
  let body = null;
  let cookieHeader = null;
  const res = {
    setHeader: (name, val) => {
      if (name.toLowerCase() === 'set-cookie') cookieHeader = val;
    },
    status: (code) => { statusCode = code; return res; },
    json: (val) => { body = val; return res; },
  };

  // Wrong PIN returns 401
  await adminPasskeyHandler({
    method: 'POST',
    headers: { host: 'mehandaarmy.net' },
    body: { action: 'enroll-emergency-recovery', enrollmentToken: validToken, masterPin: '111111' },
  }, res);

  assert.equal(statusCode, 401);
  assert.equal(body.success, false);

  // Correct 556511 Master PIN authorizes access
  await adminPasskeyHandler({
    method: 'POST',
    headers: { host: 'mehandaarmy.net' },
    body: { action: 'enroll-emergency-recovery', enrollmentToken: validToken, masterPin: '556511' },
  }, res);

  assert.equal(statusCode, 200);
  assert.equal(body.success, true);
  assert.ok(cookieHeader);
  assert.ok(cookieHeader.includes('mai_admin_session='));
});

test('isDeviceEnrolled detects enrolled vs unenrolled devices', async () => {
  const adminId = '123e4567-e89b-42d3-a456-426614174099';
  const uniqueDevTok = 'dev-token-' + Date.now();

  assert.equal(await isDeviceEnrolled({ adminUserId: adminId, deviceToken: uniqueDevTok }), false);

  await saveWebAuthnCredential({
    adminUserId: adminId,
    credentialId: 'cred-enrolled-' + Date.now(),
    publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE\n-----END PUBLIC KEY-----',
    deviceToken: uniqueDevTok,
    deviceName: 'Enrolled Mobile Phone',
  });

  assert.equal(await isDeviceEnrolled({ adminUserId: adminId, deviceToken: uniqueDevTok }), true);
});
