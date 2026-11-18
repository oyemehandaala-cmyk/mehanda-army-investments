import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuthErrorMessage } from '../src/lib/authError.js';
import { getSupabaseConfigurationIssue } from '../src/lib/supabaseKey.js';

test('identifies missing or invalid Supabase frontend configuration without values', () => {
  assert.equal(getSupabaseConfigurationIssue('', ''), 'missing_url');
  assert.equal(getSupabaseConfigurationIssue('https://project-ref.supabase.co', ''), 'missing_public_key');
  assert.equal(getSupabaseConfigurationIssue('http://project-ref.supabase.co', 'sb_publishable_abcdefghijklmnop'), 'invalid_url');
  assert.equal(getSupabaseConfigurationIssue('https://project-ref.supabase.co', 'sb_secret_server-key'), 'invalid_public_key');
  assert.equal(
    getSupabaseConfigurationIssue('https://project-ref.supabase.co', 'sb_publishable_abcdefghijklmnopqrstuvwx0123456789_-ABCD'),
    null,
  );
});

test('maps known Supabase registration errors to safe, useful messages', () => {
  assert.match(getAuthErrorMessage({ code: 'weak_password' }, 'signup'), /stronger password/);
  assert.match(getAuthErrorMessage({ code: 'email_address_invalid' }, 'signup'), /valid email/);
  assert.match(getAuthErrorMessage({ code: 'invalid_api_key', status: 401 }, 'signup'), /contact support/);
  assert.match(getAuthErrorMessage({ code: 'over_email_send_rate_limit' }, 'signup'), /few minutes/);
  assert.doesNotMatch(getAuthErrorMessage({ message: 'sensitive raw backend response' }, 'signup'), /sensitive raw/);
});

test('maps login, recovery, and network failures without exposing raw errors', () => {
  assert.match(getAuthErrorMessage({ code: 'invalid_credentials' }, 'login'), /incorrect/);
  assert.match(getAuthErrorMessage({ code: 'email_not_confirmed' }, 'login'), /verify your email/);
  assert.match(getAuthErrorMessage({ status: 429 }, 'recovery'), /Too many attempts/);
  assert.match(getAuthErrorMessage(new TypeError('secret URL details'), 'signup'), /could not reach/);
  assert.doesNotMatch(getAuthErrorMessage(new TypeError('secret URL details'), 'signup'), /secret URL/);
});

test('maps phone OTP expiration, conflicts, and rate limits safely', () => {
  assert.match(getAuthErrorMessage({ code: 'otp_expired' }, 'phone'), /expired/);
  assert.match(getAuthErrorMessage({ code: 'phone_exists' }, 'phone'), /never merged automatically/);
  assert.match(getAuthErrorMessage({ code: 'over_sms_send_rate_limit' }, 'phone'), /Too many SMS requests/);
  assert.doesNotMatch(getAuthErrorMessage({ message: 'raw provider details' }, 'phone'), /raw provider/);
});
