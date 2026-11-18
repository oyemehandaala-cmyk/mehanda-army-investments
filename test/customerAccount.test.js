import assert from 'node:assert/strict';
import test from 'node:test';
import {
  customerAccountErrorResponse,
  customerAccountRequest,
} from '../server/customerAccount.js';
import { handler as accountDeletionHandler } from '../netlify/functions/account-deletion.mjs';

function createAccountClient({ user, existingRequest = null, insertError = null } = {}) {
  const inserted = [];
  const createdRequest = {
    id: 'request-12345678',
    status: 'requested',
    created_at: '2026-01-02T03:04:05.000Z',
  };
  const client = {
    auth: {
      async getUser(token) {
        assert.equal(token, 'valid-token');
        return { data: { user }, error: null };
      },
    },
    from(table) {
      assert.equal(table, 'account_deletion_requests');
      return {
        select() {
          return this;
        },
        eq(column, value) {
          assert.equal(column, 'user_id');
          assert.equal(value, user.id);
          return this;
        },
        in(column, values) {
          assert.equal(column, 'status');
          assert.deepEqual(values, ['requested', 'in_review']);
          return this;
        },
        order() {
          return this;
        },
        limit() {
          return this;
        },
        async maybeSingle() {
          return { data: existingRequest, error: null };
        },
        insert(values) {
          inserted.push(values);
          return this;
        },
        selectInserted() {
          return this;
        },
        single() {
          return Promise.resolve({ data: createdRequest, error: insertError });
        },
      };
    },
  };
  return { client, createdRequest, inserted };
}

const verifiedUser = {
  id: 'customer-1',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  phone_confirmed_at: null,
};
const testOptions = (client) => ({
  env: {
    SUPABASE_URL: 'https://auth-test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
  },
  createSupabaseClient: () => client,
});

test('account deletion requires a bearer token before accessing Supabase', async () => {
  await assert.rejects(
    customerAccountRequest('', { action: 'status' }, testOptions({})),
    (error) => customerAccountErrorResponse(error).status === 401
  );
});

test('account deletion requires a verified email or phone', async () => {
  const { client } = createAccountClient({
    user: { id: 'customer-1', email_confirmed_at: null, phone_confirmed_at: null },
  });

  await assert.rejects(
    customerAccountRequest('Bearer valid-token', { action: 'request' }, testOptions(client)),
    (error) => customerAccountErrorResponse(error).status === 403
  );
});

test('account deletion status returns only the authenticated customer request', async () => {
  const openRequest = {
    id: 'request-abcdef12',
    status: 'in_review',
    created_at: '2026-01-02T03:04:05.000Z',
  };
  const { client, inserted } = createAccountClient({
    user: verifiedUser,
    existingRequest: openRequest,
  });

  const result = await customerAccountRequest(
    'Bearer valid-token',
    { action: 'status' },
    testOptions(client)
  );

  assert.deepEqual(result, {
    request: {
      reference: openRequest.id,
      status: openRequest.status,
      createdAt: openRequest.created_at,
    },
  });
  assert.deepEqual(inserted, []);
});

test('account deletion request creates one request for a verified customer', async () => {
  const { client, createdRequest, inserted } = createAccountClient({ user: verifiedUser });

  const result = await customerAccountRequest(
    'Bearer valid-token',
    { action: 'request' },
    testOptions(client)
  );

  assert.deepEqual(inserted, [{ user_id: verifiedUser.id }]);
  assert.equal(result.request.reference, createdRequest.id);
  assert.equal(result.request.status, 'requested');
});

test('account deletion rejects unknown payload fields', async () => {
  await assert.rejects(
    customerAccountRequest('Bearer valid-token', { action: 'request', userId: 'other-user' }),
    (error) => customerAccountErrorResponse(error).status === 400
  );
});

test('account deletion Netlify function handles methods and malformed JSON', async () => {
  const methodResponse = await accountDeletionHandler({
    httpMethod: 'GET',
    headers: {},
    body: '',
  });
  assert.equal(methodResponse.statusCode, 405);
  assert.equal(methodResponse.headers.Allow, 'POST');

  const malformedResponse = await accountDeletionHandler({
    httpMethod: 'POST',
    headers: {},
    body: '{',
  });
  assert.equal(malformedResponse.statusCode, 400);
});
