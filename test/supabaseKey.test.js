import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { isPublicSupabaseKey, isValidSupabaseUrl } from '../src/lib/supabaseKey.js';

function legacyKeyWithRole(role) {
  const payload = Buffer.from(JSON.stringify({ role })).toString('base64url');
  return `header.${payload}.signature`;
}

test('accepts Supabase publishable keys supported by the installed SDK', () => {
  const key = 'sb_publishable_abcdefghijklmnopqrstuvwx0123456789_-ABCD';
  assert.equal(isPublicSupabaseKey(key), true);
  assert.doesNotThrow(() => createClient('https://project-ref.supabase.co', key));
});

test('accepts only legacy anonymous JWT keys and rejects server credentials', () => {
  assert.equal(isPublicSupabaseKey(legacyKeyWithRole('anon')), true);
  assert.equal(isPublicSupabaseKey(legacyKeyWithRole('service_role')), false);
  assert.equal(isPublicSupabaseKey('sb_secret_test-key'), false);
  assert.equal(isPublicSupabaseKey('sb_publishable_your-project-key'), false);
  assert.equal(isPublicSupabaseKey('sb_publishable_placeholder'), false);
  assert.equal(isPublicSupabaseKey('invalid-key'), false);
});

test('requires a valid HTTPS Supabase URL', () => {
  assert.equal(isValidSupabaseUrl('https://project-ref.supabase.co'), true);
  assert.equal(isValidSupabaseUrl('https://your-project.supabase.co'), false);
  assert.equal(isValidSupabaseUrl('http://project-ref.supabase.co'), false);
  assert.equal(isValidSupabaseUrl('https://project-ref.supabase.co/auth/v1'), false);
  assert.equal(isValidSupabaseUrl('not-a-url'), false);
  assert.equal(isValidSupabaseUrl('https://placeholder.supabase.co'), false);
});
