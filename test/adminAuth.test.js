import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_SESSION_COOKIE,
  AdminAuthError,
  adminErrorResponse,
  createAdminSessionCookie,
  createExpiredAdminSessionCookie,
  loginAdmin,
  logoutAdmin,
  requireAdminUser,
} from '../server/adminAuth.js';

const ADMIN_ID = '123e4567-e89b-42d3-a456-426614174000';
const CUSTOMER_ID = '123e4567-e89b-42d3-a456-426614174001';
const NOW = 1_800_000_000_000;
const ENV = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'public-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  ADMIN_LOGIN_EMAIL: 'owner@example.com',
  ADMIN_USER_ID: ADMIN_ID,
};
const SESSION_ID = '123e4567-e89b-42d3-a456-426614174002';

function createJwt({
  issuedAt = Math.floor(NOW / 1000),
  expiresAt = Math.floor(NOW / 1000) + 3600,
  sessionId = SESSION_ID,
} = {}) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({
    iat: issuedAt,
    exp: expiresAt,
    session_id: sessionId,
  })}.signature`;
}

function createSupabaseMock({
  userId = ADMIN_ID,
  password = 'correct-password',
  allowed = true,
  token = createJwt(),
  authError = null,
} = {}) {
  const calls = [];
  const state = { sessionActive: true };
  const user = {
    id: userId,
    email: userId === ADMIN_ID ? 'owner@example.com' : 'customer@example.com',
    email_confirmed_at: '2026-01-01T00:00:00.000Z',
  };
  function queryBuilder() {
    const builder = {
      eq: () => builder,
      is: () => builder,
      gt: () => builder,
      maybeSingle: async () => ({
        data: state.sessionActive ? { session_id: SESSION_ID } : null,
        error: null,
      }),
      then: (resolve, reject) => Promise.resolve({ error: null }).then(resolve, reject),
    };
    return builder;
  }
  const serviceClient = {
    rpc: async (name, args) => {
      calls.push({ type: 'rpc', name, args });
      return { data: allowed, error: null };
    },
    from: (table) => ({
      insert: async (row) => {
        calls.push({ type: 'insert', table, row });
        return { error: null };
      },
      select: () => queryBuilder(),
      update: (row) => {
        calls.push({ type: 'update', table, row });
        if (table === 'admin_sessions') state.sessionActive = false;
        return queryBuilder();
      },
    }),
    auth: {
      admin: {
        signOut: async (jwt, scope) => {
          calls.push({ type: 'signOut', jwt, scope });
          return { error: null };
        },
      },
    },
  };
  const authClient = {
    auth: {
      signInWithPassword: async (credentials) => {
        calls.push({ type: 'signIn', credentials });
        if (credentials.password !== password || authError) {
          return { data: { user: null, session: null }, error: authError || new Error('Invalid credentials') };
        }
        return {
          data: {
            user,
            session: {
              access_token: token,
              refresh_token: 'refresh-token-must-not-be-returned',
              expires_at: Math.floor(NOW / 1000) + 3600,
            },
          },
          error: null,
        };
      },
      getUser: async (providedToken) => {
        calls.push({ type: 'getUser', token: providedToken });
        return { data: { user }, error: null };
      },
    },
  };
  const createClient = (_url, key) => key === 'service-key' ? serviceClient : authClient;
  return { calls, createClient, token, user, state };
}

test('admin login grants a short server session only to the configured Supabase user', async () => {
  const mock = createSupabaseMock();
  const session = await loginAdmin(
    { username: 'mehandaarmy', password: 'correct-password', clientIp: '192.0.2.10' },
    { env: ENV, createClient: mock.createClient, now: () => NOW }
  );

  assert.equal(session.accessToken, mock.token);
  assert.equal(session.expiresAt, Math.floor(NOW / 1000) + 1800);
  assert.equal(Object.hasOwn(session, 'refresh_token'), false);
  assert.equal(mock.calls.find((call) => call.type === 'rpc').args.p_action, 'admin_login');
  assert.equal(mock.calls.find((call) =>
    call.type === 'insert' && call.table === 'admin_activity_logs'
  ).row.action, 'admin_login');
  assert.equal(mock.calls.find((call) =>
    call.type === 'insert' && call.table === 'admin_sessions'
  ).row.session_id, SESSION_ID);
});

test('admin login accepts the server-only Supabase secret key', async () => {
  const mock = createSupabaseMock();
  const session = await loginAdmin(
    { username: 'mehandaarmy', password: 'correct-password', clientIp: '192.0.2.9' },
    {
      env: {
        ...ENV,
        SUPABASE_SERVICE_ROLE_KEY: '',
        SUPABASE_SECRET_KEY: 'service-key',
      },
      createClient: mock.createClient,
      now: () => NOW,
    }
  );

  assert.equal(session.accessToken, mock.token);
});

test('admin login is unavailable when its configured Supabase identity is missing', async () => {
  const mock = createSupabaseMock();
  await assert.rejects(
    loginAdmin(
      { username: 'mehandaarmy', password: 'correct-password' },
      {
        env: { ...ENV, ADMIN_USER_ID: '' },
        createClient: mock.createClient,
        now: () => NOW,
      }
    ),
    (error) => error instanceof AdminAuthError && error.status === 503
  );
  assert.equal(mock.calls.length, 0);
});

test('admin login rejects a wrong password with a generic response', async () => {
  const mock = createSupabaseMock();
  await assert.rejects(
    loginAdmin(
      { username: 'mehandaarmy', password: 'dummy-wrong-password-for-unit-test', clientIp: '192.0.2.11' },
      { env: ENV, createClient: mock.createClient, now: () => NOW }
    ),
    (error) => error instanceof AdminAuthError &&
      error.status === 401 &&
      error.message === 'Unable to sign in with those credentials.'
  );
});

test('customer Supabase accounts and alternate usernames cannot receive an admin session', async () => {
  const customerMock = createSupabaseMock({ userId: CUSTOMER_ID });
  await assert.rejects(
    loginAdmin(
      { username: 'mehandaarmy', password: 'correct-password', clientIp: '192.0.2.12' },
      { env: ENV, createClient: customerMock.createClient, now: () => NOW }
    ),
    (error) => error instanceof AdminAuthError && error.status === 401
  );
  assert.equal(customerMock.calls.some((call) => call.type === 'signOut' && call.scope === 'local'), true);

  const wrongNameMock = createSupabaseMock();
  await assert.rejects(
    loginAdmin(
      { username: 'other-user', password: 'correct-password', clientIp: '192.0.2.13' },
      { env: ENV, createClient: wrongNameMock.createClient, now: () => NOW }
    ),
    (error) => error instanceof AdminAuthError && error.status === 401
  );
  assert.equal(wrongNameMock.calls.some((call) => call.type === 'signOut' && call.scope === 'local'), true);
});

test('admin authorization revalidates the Supabase user and rejects customer sessions', async () => {
  const customerMock = createSupabaseMock({ userId: CUSTOMER_ID });
  const headers = { cookie: `${ADMIN_SESSION_COOKIE}=${customerMock.token}` };
  await assert.rejects(
    requireAdminUser(headers, { env: ENV, createClient: customerMock.createClient, now: () => NOW }),
    (error) => error instanceof AdminAuthError && error.status === 401
  );
});

test('admin APIs do not accept a bearer token in place of the HttpOnly session cookie', async () => {
  const mock = createSupabaseMock();
  await assert.rejects(
    requireAdminUser(
      { authorization: `Bearer ${mock.token}` },
      { env: ENV, createClient: mock.createClient, now: () => NOW }
    ),
    (error) => error instanceof AdminAuthError && error.status === 401
  );
  assert.equal(mock.calls.some((call) => call.type === 'getUser'), false);
});

test('admin authorization rejects a Supabase token after the 30-minute session cap', async () => {
  const staleToken = createJwt({ issuedAt: Math.floor(NOW / 1000) - 1801 });
  const mock = createSupabaseMock({ token: staleToken });
  await assert.rejects(
    requireAdminUser(
      { cookie: `${ADMIN_SESSION_COOKIE}=${staleToken}` },
      { env: ENV, createClient: mock.createClient, now: () => NOW }
    ),
    (error) => error instanceof AdminAuthError && error.status === 401
  );
});

test('admin logout writes an audit entry and revokes only the current Supabase session', async () => {
  const mock = createSupabaseMock();
  await logoutAdmin(
    { cookie: `${ADMIN_SESSION_COOKIE}=${mock.token}` },
    { env: ENV, createClient: mock.createClient, now: () => NOW }
  );

  assert.equal(mock.calls.find((call) =>
    call.type === 'insert' && call.table === 'admin_activity_logs'
  ).row.action, 'admin_logout');
  assert.equal(mock.calls.find((call) => call.type === 'update' && call.table === 'admin_sessions').row.revoked_at !== undefined, true);
  assert.equal(mock.state.sessionActive, false);
  await assert.rejects(
    requireAdminUser(
      { cookie: `${ADMIN_SESSION_COOKIE}=${mock.token}` },
      { env: ENV, createClient: mock.createClient, now: () => NOW }
    ),
    (error) => error instanceof AdminAuthError && error.status === 401
  );
  assert.equal(mock.calls.find((call) => call.type === 'signOut').scope, 'local');
});

test('admin session cookies are HttpOnly, SameSite strict, and cleared on logout', () => {
  const token = createJwt();
  const cookie = createAdminSessionCookie(
    token,
    Math.floor(NOW / 1000) + 3600,
    { 'x-forwarded-proto': 'https' },
    NOW
  );
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Max-Age=1800/);

  const expired = createExpiredAdminSessionCookie({ 'x-forwarded-proto': 'https' });
  assert.match(expired, /Max-Age=0/);
  assert.match(expired, /HttpOnly/);
});

test('admin auth errors do not reveal backend or credential details', () => {
  assert.deepEqual(adminErrorResponse(new Error('database connection credential details')), {
    status: 503,
    body: {
      success: false,
      error: 'Admin service is temporarily unavailable. Please try again later.',
    },
  });
});
