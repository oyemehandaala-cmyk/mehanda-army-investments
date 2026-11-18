import assert from 'node:assert/strict';
import test from 'node:test';
import { handleRegisterUser, RegistrationError } from '../server/registerUserService.js';
import registerUserHandler from '../api/register-user.js';
import { sendEmailOtp, otpStore } from '../server/emailOtpService.js';

const dummyEnv = {
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_SECRET_KEY: 'test-secret-service-role-key-for-admin',
  EMAIL_OTP_SECRET: 'test-secure-otp-secret-key-12345',
  RESEND_API_KEY: 're_test_dummy_key_12345',
};

const emptyProfileMockClient = {
  from: () => ({
    select: () => ({
      ilike: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
      }),
    }),
  }),
};

test('1. handleRegisterUser rejects missing name, invalid email, or short password', async () => {
  await assert.rejects(
    handleRegisterUser({ email: 'bad-email', password: 'password123', fullName: 'Ramesh', otp: '123456' }, { env: dummyEnv }),
    /valid Gmail \/ email address/
  );

  await assert.rejects(
    handleRegisterUser({ email: 'user@example.com', password: 'password123', fullName: '   ', otp: '123456' }, { env: dummyEnv }),
    /full legal name/
  );

  await assert.rejects(
    handleRegisterUser({ email: 'user@example.com', password: 'short', fullName: 'Ramesh', otp: '123456' }, { env: dummyEnv }),
    /at least 8 characters/
  );
});

test('2. handleRegisterUser rejects registration when OTP or token is missing', async () => {
  await assert.rejects(
    handleRegisterUser(
      { email: 'user@example.com', password: 'password123', fullName: 'Ramesh Kumar' },
      { env: dummyEnv }
    ),
    /verification code is required/
  );
});

test('3. handleRegisterUser rejects incorrect or expired OTP', async () => {
  const email = 'newuser@example.com';
  let capturedOtp = null;

  await sendEmailOtp({
    email,
    purpose: 'Account Registration',
    env: dummyEnv,
    createClient: () => emptyProfileMockClient,
    sendEmailFn: ({ otp }) => { capturedOtp = otp; },
  });

  assert.ok(capturedOtp, 'OTP was sent');

  // Try wrong OTP
  await assert.rejects(
    handleRegisterUser(
      { email, password: 'password123', fullName: 'Ramesh Kumar', otp: '000000' },
      { env: dummyEnv }
    ),
    /Incorrect verification code/
  );
});

test('4. handleRegisterUser successfully registers confirmed user and upserts profile when OTP is valid', async () => {
  const email = 'confirmed.user@example.com';
  let sentOtp = null;

  await sendEmailOtp({
    email,
    purpose: 'Account Registration',
    env: dummyEnv,
    createClient: () => emptyProfileMockClient,
    sendEmailFn: ({ otp }) => { sentOtp = otp; },
  });

  let createdUserData = null;
  let profileUpsertData = null;

  const mockClient = {
    auth: {
      admin: {
        createUser: async (payload) => {
          createdUserData = payload;
          return {
            data: {
              user: {
                id: 'mock-user-uuid-12345',
                email: payload.email,
                user_metadata: payload.user_metadata,
                email_confirmed_at: new Date().toISOString(),
              },
            },
            error: null,
          };
        },
      },
    },
    from: (table) => ({
      upsert: async (record) => {
        if (table === 'profiles') profileUpsertData = record;
        return { data: record, error: null };
      },
    }),
  };

  const result = await handleRegisterUser(
    {
      email,
      password: 'SecurePassword123!',
      fullName: 'Vikram Singh',
      phone: '+919812947813',
      otp: sentOtp,
    },
    {
      env: dummyEnv,
      createClient: () => mockClient,
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.user.email, email);
  assert.equal(createdUserData.email, email);
  assert.equal(createdUserData.email_confirm, true);
  assert.equal(createdUserData.user_metadata.full_name, 'Vikram Singh');
  assert.equal(profileUpsertData.full_name, 'Vikram Singh');
  assert.equal(profileUpsertData.email, email);
});

test('5. handleRegisterUser maps existing user error to 409 conflict message', async () => {
  const email = 'existing@example.com';
  let sentOtp = null;

  await sendEmailOtp({
    email,
    purpose: 'Account Registration',
    env: dummyEnv,
    createClient: () => emptyProfileMockClient,
    sendEmailFn: ({ otp }) => { sentOtp = otp; },
  });

  const mockClient = {
    auth: {
      admin: {
        createUser: async () => ({
          data: null,
          error: { code: 'email_exists', message: 'User already registered', status: 422 },
        }),
      },
    },
  };

  await assert.rejects(
    handleRegisterUser(
      {
        email,
        password: 'SecurePassword123!',
        fullName: 'Vikram Singh',
        otp: sentOtp,
      },
      {
        env: dummyEnv,
        createClient: () => mockClient,
      }
    ),
    /already exists\. Please sign in/
  );
});

test('6. sendEmailOtp detects already existing profile and rejects registration send with 409', async () => {
  const email = 'already.registered@example.com';

  const mockClient = {
    from: () => ({
      select: () => ({
        ilike: () => ({
          maybeSingle: async () => ({
            data: { id: 'existing-id-123' },
            error: null,
          }),
        }),
      }),
    }),
  };

  await assert.rejects(
    sendEmailOtp({
      email,
      purpose: 'Account Registration',
      env: dummyEnv,
      createClient: () => mockClient,
      sendEmailFn: () => {},
    }),
    /already exists\. Please sign in/
  );
});

test('7. api/register-user.js HTTP handler rejects GET requests and processes valid POST', async () => {
  // Method not allowed
  let statusCode = 0;
  let responseData = null;
  const mockRes = {
    setHeader: () => {},
    status: (code) => { statusCode = code; return mockRes; },
    json: (data) => { responseData = data; return mockRes; },
  };

  await registerUserHandler({ method: 'GET', body: {} }, mockRes, { env: dummyEnv });
  assert.equal(statusCode, 405);
  assert.equal(responseData.success, false);

  // Valid POST with mock
  const email = 'http.test@example.com';
  let sentOtp = null;

  await sendEmailOtp({
    email,
    purpose: 'Account Registration',
    env: dummyEnv,
    sendEmailFn: ({ otp }) => { sentOtp = otp; },
  });

  const mockClient = {
    auth: {
      admin: {
        createUser: async () => ({
          data: { user: { id: 'u1', email } },
          error: null,
        }),
      },
    },
    from: () => ({ upsert: async () => ({ error: null }) }),
  };

  await registerUserHandler(
    {
      method: 'POST',
      body: {
        email,
        password: 'Password999',
        fullName: 'Anita Sharma',
        otp: sentOtp,
      },
    },
    mockRes,
    {
      env: dummyEnv,
      createClient: () => mockClient,
    }
  );

  assert.equal(statusCode, 200);
  assert.equal(responseData.success, true);
  assert.equal(responseData.user.email, email);
});
