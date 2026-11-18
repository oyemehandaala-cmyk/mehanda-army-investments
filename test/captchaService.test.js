import assert from 'node:assert/strict';
import test from 'node:test';
import {
  verifyCaptchaToken,
  CaptchaVerificationError,
  GOOGLE_RECAPTCHA_TEST_SECRET,
} from '../server/captchaService.js';

test('verifyCaptchaToken rejects empty or invalid token', async () => {
  await assert.rejects(
    verifyCaptchaToken({}, {}),
    { message: /CAPTCHA verification token is missing/ }
  );

  await assert.rejects(
    verifyCaptchaToken({ token: '   ' }, {}),
    { message: /CAPTCHA verification token is missing/ }
  );
});

test('verifyCaptchaToken validates test mock token and prevents duplicate replay', async () => {
  const uniqueToken = `test-mock-valid-token-${Date.now()}-${Math.random()}`;

  const result = await verifyCaptchaToken(
    { token: uniqueToken, targetForm: 'student-loan' },
    { 'x-forwarded-for': '127.0.0.1' },
    { env: { RECAPTCHA_SECRET_KEY: GOOGLE_RECAPTCHA_TEST_SECRET } }
  );

  assert.equal(result.success, true);
  assert.equal(result.targetForm, 'student-loan');

  // Attempt to replay the exact same token must fail
  await assert.rejects(
    verifyCaptchaToken(
      { token: uniqueToken, targetForm: 'student-loan' },
      { 'x-forwarded-for': '127.0.0.1' },
      { env: { RECAPTCHA_SECRET_KEY: GOOGLE_RECAPTCHA_TEST_SECRET } }
    ),
    (err) => err instanceof CaptchaVerificationError && err.status === 400 && err.message.includes('already been verified')
  );
});

test('verifyCaptchaToken calls Google siteverify API and handles success and failure', async () => {
  const mockFetchSuccess = async (url, options) => {
    assert.equal(url, 'https://www.google.com/recaptcha/api/siteverify');
    return {
      ok: true,
      json: async () => ({
        success: true,
        challenge_ts: new Date().toISOString(),
        hostname: 'localhost',
      }),
    };
  };

  const successResult = await verifyCaptchaToken(
    { token: `siteverify-success-token-${Date.now()}`, targetForm: 'investment-info' },
    { 'x-forwarded-for': '192.168.1.1' },
    {
      env: { RECAPTCHA_SECRET_KEY: 'test-secret' },
      fetchImpl: mockFetchSuccess,
    }
  );

  assert.equal(successResult.success, true);
  assert.equal(successResult.targetForm, 'investment-info');

  const mockFetchFailure = async () => ({
    ok: true,
    json: async () => ({
      success: false,
      'error-codes': ['invalid-input-response'],
    }),
  });

  await assert.rejects(
    verifyCaptchaToken(
      { token: `siteverify-fail-token-${Date.now()}`, targetForm: 'investment-info' },
      { 'x-forwarded-for': '192.168.1.2' },
      {
        env: { RECAPTCHA_SECRET_KEY: 'test-secret' },
        fetchImpl: mockFetchFailure,
      }
    ),
    (err) => err instanceof CaptchaVerificationError && err.status === 400
  );
});

test('verifyCaptchaToken enforces rate limits per IP', async () => {
  const testIp = `rate-limit-test-ip-${Date.now()}`;

  for (let i = 0; i < 15; i++) {
    await verifyCaptchaToken(
      { token: `test-mock-valid-token-rl-${i}-${Date.now()}` },
      { 'x-forwarded-for': testIp }
    );
  }

  // 16th request within window must be rate limited
  await assert.rejects(
    verifyCaptchaToken(
      { token: `test-mock-valid-token-rl-16-${Date.now()}` },
      { 'x-forwarded-for': testIp }
    ),
    (err) => err instanceof CaptchaVerificationError && err.status === 429
  );
});

