import assert from 'node:assert/strict';
import test from 'node:test';
import { getSupabaseServerKey } from '../server/supabaseServerKey.js';

test('server-side Supabase secret key takes precedence', () => {
  assert.equal(getSupabaseServerKey({
    SUPABASE_SECRET_KEY: 'secret-key',
    SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role-key',
  }), 'secret-key');
});

test('server-side Supabase key falls back to the legacy service-role key', () => {
  assert.equal(getSupabaseServerKey({
    SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role-key',
  }), 'legacy-service-role-key');
});

test('server-side Supabase key is empty when neither supported key is set', () => {
  assert.equal(getSupabaseServerKey({}), '');
});
