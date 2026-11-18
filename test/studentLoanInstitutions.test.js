import assert from 'node:assert/strict';
import test from 'node:test';
import { handleStudentLoanDemoRequest } from '../server/paymentServer.js';

const originalFetch = globalThis.fetch;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalSecret = process.env.SUPABASE_SECRET_KEY;
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.beforeEach(() => {
  process.env.SUPABASE_URL = 'https://student-loan-test.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-secret-key';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalSupabaseUrl;
  if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY = originalSecret;
  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
});

test('institution lookup returns matching official catalog suggestions', async () => {
  let requestUrl;
  let requestBody;
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify([{
      institution_id: 'AISHE:U-123',
      official_name: 'Sample University',
      state: 'Delhi',
      district: 'New Delhi',
      city: 'New Delhi',
      pin_code: '110001',
      institution_type: 'university',
      management: 'Government',
    }]), { status: 200 });
  };

  const result = await handleStudentLoanDemoRequest(
    'GET',
    {},
    {
      institutions: 'search',
      q: 'sample university',
      state: 'Delhi',
      district: 'New Delhi',
      management: 'Government',
      afterName: 'Earlier Institute',
      afterId: 'AISHE:U-001',
    }
  );

  assert.match(requestUrl, /\/rest\/v1\/rpc\/search_student_loan_institutions$/);
  assert.equal(requestBody.p_query, 'sample university');
  assert.equal(requestBody.p_state, 'Delhi');
  assert.equal(requestBody.p_district, 'New Delhi');
  assert.equal(requestBody.p_management, 'Government');
  assert.equal(requestBody.p_after_name, 'Earlier Institute');
  assert.equal(requestBody.p_after_id, 'AISHE:U-001');
  assert.deepEqual(result.results[0], {
    id: 'AISHE:U-123',
    name: 'Sample University',
    state: 'Delhi',
    district: 'New Delhi',
    city: 'New Delhi',
    pinCode: '110001',
    type: 'university',
    category: 'Government',
  });
  assert.equal(result.hasMore, false);
});
