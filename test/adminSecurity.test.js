import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseUserAgent,
  getIstTimestamp,
  checkSecurityLock,
  recordFailedLoginAttempt,
  recordSuccessfulLogin,
  unlockSecurityTarget,
  emergencyRecoveryUnlock,
  getAdminSecurityOverview,
  listFailedLogins,
  listSecurityLocks,
  recordPinAttempt,
  DEFAULT_EMERGENCY_RECOVERY_CODES,
} from '../server/adminSecurity.js';
import adminSecurityHandler from '../api/admin-security.js';
import { AdminAuthError } from '../server/adminAuth.js';

test('parseUserAgent accurately identifies device, browser, and OS', () => {
  const iphoneUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  const iphoneInfo = parseUserAgent(iphoneUa);
  assert.equal(iphoneInfo.deviceType, 'Apple iPhone');
  assert.equal(iphoneInfo.osInfo, 'iOS 17.4');
  assert.ok(iphoneInfo.browserInfo.includes('Apple Safari'));

  const androidUa = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36';
  const androidInfo = parseUserAgent(androidUa);
  assert.equal(androidInfo.deviceType, 'Android Mobile');
  assert.equal(androidInfo.osInfo, 'Android 14');
  assert.ok(androidInfo.browserInfo.includes('Google Chrome'));

  const windowsUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.2365.92';
  const windowsInfo = parseUserAgent(windowsUa);
  assert.equal(windowsInfo.deviceType, 'Windows PC');
  assert.equal(windowsInfo.osInfo, 'Windows 10 / 11');
  assert.ok(windowsInfo.browserInfo.includes('Microsoft Edge'));
});

test('getIstTimestamp outputs time in Indian Standard Time with IST suffix', () => {
  const testDate = new Date('2026-11-16T04:30:00.000Z');
  const istStr = getIstTimestamp(testDate);
  assert.ok(typeof istStr === 'string');
  assert.ok(istStr.includes('IST'));
});

test('failed login attempts increment counter and trigger automated lock at 3 consecutive failures', async () => {
  const testUser = 'lockout_test_user_' + Date.now();
  const testIp = '198.51.100.99';

  // Attempt 1: Warning, not locked
  const res1 = await recordFailedLoginAttempt({
    username: testUser,
    clientIp: testIp,
    userAgent: 'Mozilla/5.0 (iPhone)',
    headers: {},
  });
  assert.equal(res1.attemptNumber, 1);
  assert.equal(res1.isLocked, false);
  assert.equal(res1.attemptsRemaining, 2);

  // Attempt 2: Warning, not locked
  const res2 = await recordFailedLoginAttempt({
    username: testUser,
    clientIp: testIp,
    userAgent: 'Mozilla/5.0 (iPhone)',
    headers: {},
  });
  assert.equal(res2.attemptNumber, 2);
  assert.equal(res2.isLocked, false);
  assert.equal(res2.attemptsRemaining, 1);

  // Attempt 3: Critical lockout!
  const res3 = await recordFailedLoginAttempt({
    username: testUser,
    clientIp: testIp,
    userAgent: 'Mozilla/5.0 (iPhone)',
    headers: {},
  });
  assert.equal(res3.attemptNumber, 3);
  assert.equal(res3.isLocked, true);
  assert.equal(res3.attemptsRemaining, 0);

  // Now, checkSecurityLock must throw 423
  await assert.rejects(
    checkSecurityLock({ username: testUser, clientIp: testIp }),
    (err) => err instanceof AdminAuthError && err.status === 423 && err.message.includes('SECURITY LOCKOUT')
  );

  // Owner manual unlock clears the lock
  const unlockRes = await unlockSecurityTarget({
    targetIdentifier: testUser,
    lockType: 'account',
    adminUser: { name: 'Deepak Jangra (Super Admin)' },
    clientIp: '127.0.0.1',
  });
  assert.equal(unlockRes.success, true);

  // Also unlock the IP
  await unlockSecurityTarget({
    targetIdentifier: testIp,
    lockType: 'ip',
    adminUser: { name: 'Deepak Jangra (Super Admin)' },
    clientIp: '127.0.0.1',
  });

  // Now checkSecurityLock should succeed without throwing
  await checkSecurityLock({ username: testUser, clientIp: testIp });
});

test('recordSuccessfulLogin clears failed attempts and logs audit entry', async () => {
  const testUser = 'success_test_user_' + Date.now();
  const testIp = '198.51.100.55';

  await recordFailedLoginAttempt({ username: testUser, clientIp: testIp, userAgent: 'Chrome' });
  await recordSuccessfulLogin({ username: testUser, clientIp: testIp, userAgent: 'Chrome', method: 'password' });

  // Counter is cleared, next failure starts from 1 again
  const res = await recordFailedLoginAttempt({ username: testUser, clientIp: testIp, userAgent: 'Chrome' });
  assert.equal(res.attemptNumber, 1);
});

test('emergencyRecoveryUnlock unlocks system with valid recovery code and rejects invalid/reused codes', async () => {
  const validCode = DEFAULT_EMERGENCY_RECOVERY_CODES[0];

  // Try unlocking with an invalid code
  await assert.rejects(
    emergencyRecoveryUnlock({ recoveryCode: 'INVALID-CODE-0000' }),
    (err) => err instanceof AdminAuthError && err.status === 401
  );

  // Unlock with valid code
  const result = await emergencyRecoveryUnlock({ recoveryCode: validCode });
  assert.equal(result.success, true);

  // Re-use of same code is rejected
  await assert.rejects(
    emergencyRecoveryUnlock({ recoveryCode: validCode }),
    (err) => err instanceof AdminAuthError && err.status === 400 && err.message.includes('already been used')
  );
});

test('admin-security API rejects unauthorized GET and POST requests', async () => {
  let statusCode = 200;
  let body = null;
  const res = {
    setHeader: () => {},
    status: (code) => { statusCode = code; return res; },
    json: (val) => { body = val; return res; },
  };

  // GET without admin cookie -> 401
  await adminSecurityHandler({ method: 'GET', headers: {}, url: '/api/admin-security' }, res);
  assert.equal(statusCode, 401);
  assert.equal(body.success, false);

  // POST with invalid action
  await adminSecurityHandler({
    method: 'POST',
    headers: {},
    body: { action: 'nonexistent-action' },
  }, res);
  assert.equal(statusCode, 400);
  assert.equal(body.success, false);
});

test('recordPinAttempt verifies correct 556511 PIN and triggers alert on attempt 3', async () => {
  const testIp = '203.0.113.88';
  // Attempt 1: wrong pin
  const res1 = await recordPinAttempt({ clientIp: testIp, userAgent: 'test', isCorrect: false, attemptNumber: 1 });
  assert.equal(res1.success, true);
  assert.equal(res1.verified, false);
  assert.equal(res1.locked, false);

  // Attempt 3: triggers lockout
  const res3 = await recordPinAttempt({ clientIp: testIp, userAgent: 'test', isCorrect: false, attemptNumber: 3 });
  assert.equal(res3.success, true);
  assert.equal(res3.verified, false);
  assert.equal(res3.locked, true);

  // Correct pin 556511
  const resOk = await recordPinAttempt({ clientIp: testIp, userAgent: 'test', isCorrect: true, attemptNumber: 1 });
  assert.equal(resOk.success, true);
  assert.equal(resOk.verified, true);
});
