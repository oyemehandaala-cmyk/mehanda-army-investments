import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCountdown,
  normalizePhoneNumber,
  PHONE_OTP_COOLDOWN_SECONDS,
  PHONE_OTP_EXPIRY_SECONDS,
} from '../src/lib/phoneAuth.js';

test('normalizes phone numbers to E.164 and defaults callers to the India code', () => {
  assert.equal(normalizePhoneNumber('98765 43210', '+91'), '+919876543210');
  assert.equal(normalizePhoneNumber('09876543210', '+91'), '+919876543210');
  assert.equal(normalizePhoneNumber('+1 (415) 555-2671', '+91'), '+14155552671');
});

test('rejects empty and out-of-range phone numbers', () => {
  assert.equal(normalizePhoneNumber('', '+91'), null);
  assert.equal(normalizePhoneNumber('12345', '+91'), null);
  assert.equal(normalizePhoneNumber('1234567890123456', '+91'), null);
  assert.equal(normalizePhoneNumber('9876543210', ''), null);
});

test('uses explicit resend cooldown and OTP expiration durations', () => {
  assert.equal(PHONE_OTP_COOLDOWN_SECONDS, 60);
  assert.equal(PHONE_OTP_EXPIRY_SECONDS, 300);
  assert.equal(formatCountdown(125), '02:05');
  assert.equal(formatCountdown(0), '00:00');
});
