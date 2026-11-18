import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accountRecoveryErrorResponse,
  accountRecoveryRequest,
  generateRecoveryKey,
  hashRecoveryKey,
  recoveryKeyMatches,
} from '../server/accountRecovery.js';

function createRecoveryClient({
  keyHash = null,
  confirmedAt = new Date().toISOString(),
  recoverySentAt = new Date().toISOString(),
  lastSignInAt = new Date().toISOString(),
  authError = null,
  allowed = true,
  claim = true,
} = {}) {
  const calls = [];
  const state = {
    keyHash,
    consumed: false,
    password: null,
    recoverySentAt: null,
    challengeConsumed: false,
  };
  return {
    calls,
    state,
    auth: {
      getUser: async () => ({
        data: { user: authError ? null : { id: 'user-1', email_confirmed_at: confirmedAt } },
        error: authError,
      }),
      admin: {
        getUserById: async () => ({
          data: { user: { recovery_sent_at: recoverySentAt, last_sign_in_at: lastSignInAt } },
          error: null,
        }),
        updateUserById: async (_userId, update) => {
          calls.push('password-update');
          state.password = update.password;
          return { error: null };
        },
      },
    },
    rpc: async (name, args) => {
      calls.push(name);
      if (name === 'consume_account_recovery_rate_limit') return { data: allowed, error: null };
      if (name === 'create_account_recovery_key') {
        if (state.keyHash) return { data: false, error: null };
        state.keyHash = args.p_key_hash;
        return { data: true, error: null };
      }
      if (name === 'claim_account_recovery_key') {
        if (!claim || state.consumed || args.p_key_hash !== state.keyHash) return { data: false, error: null };
        state.consumed = true;
        return { data: true, error: null };
      }
      if (name === 'claim_account_recovery_challenge') {
        if (state.challengeConsumed && state.recoverySentAt === args.p_recovery_sent_at) {
          return { data: false, error: null };
        }
        state.recoverySentAt = args.p_recovery_sent_at;
        state.challengeConsumed = true;
        return { data: true, error: null };
      }
      if (name === 'release_account_recovery_challenge') {
        if (state.recoverySentAt === args.p_recovery_sent_at) state.challengeConsumed = false;
        return { data: true, error: null };
      }
      if (name === 'replace_account_recovery_key') {
        if (!state.consumed || args.p_old_key_hash !== state.keyHash) return { data: false, error: null };
        state.keyHash = args.p_new_key_hash;
        state.consumed = false;
        return { data: true, error: null };
      }
      if (name === 'rotate_account_recovery_key') {
        state.keyHash = args.p_new_key_hash;
        state.consumed = false;
        return { data: true, error: null };
      }
      return { data: false, error: null };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: state.keyHash ? { key_hash: state.keyHash } : null,
            error: null,
          }),
        }),
      }),
    }),
  };
}

async function expectRecoveryError(promise, expectedStatus) {
  await assert.rejects(
    promise,
    (error) => accountRecoveryErrorResponse(error).status === expectedStatus
  );
}

test('recovery keys are unpredictable, correctly formatted, and hash-verifiable', () => {
  const first = generateRecoveryKey();
  const second = generateRecoveryKey();
  assert.match(first, /^MAI-[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
  assert.equal(recoveryKeyMatches(first, hashRecoveryKey(first)), true);
  assert.equal(recoveryKeyMatches(second, hashRecoveryKey(first)), false);
  assert.equal(recoveryKeyMatches('not-a-recovery-key', hashRecoveryKey(first)), false);
});

test('recovery API rejects missing email-authenticated session', async () => {
  await expectRecoveryError(accountRecoveryRequest('', { action: 'complete' }), 401);
  const client = createRecoveryClient({ confirmedAt: null });
  await expectRecoveryError(
    accountRecoveryRequest('Bearer session-token', { action: 'status' }, client),
    403
  );
  await expectRecoveryError(
    accountRecoveryRequest('Bearer expired-token', { action: 'status' }, createRecoveryClient({
      authError: new Error('Expired access token'),
    })),
    401
  );
});

test('verified account receives a unique key once and stores only its hash', async () => {
  const client = createRecoveryClient();
  const issued = await accountRecoveryRequest(
    'Bearer session-token',
    { action: 'issue' },
    client
  );
  assert.match(issued.recoveryKey, /^MAI-[A-Za-z0-9_-]{43}$/);
  assert.equal(client.state.keyHash, hashRecoveryKey(issued.recoveryKey));
  assert.notEqual(client.state.keyHash, issued.recoveryKey);
  await expectRecoveryError(
    accountRecoveryRequest('Bearer session-token', { action: 'issue' }, client),
    409
  );
});

test('invalid recovery key is rejected without changing the password', async () => {
  const key = generateRecoveryKey();
  const client = createRecoveryClient({ keyHash: hashRecoveryKey(key) });
  await expectRecoveryError(
    accountRecoveryRequest('Bearer session-token', {
      action: 'complete',
      recoveryKey: generateRecoveryKey(),
      password: 'new-secret-password',
    }, client),
    400
  );
  assert.equal(client.state.password, null);
  assert.equal(client.calls.includes('claim_account_recovery_key'), false);
});

test('expired email recovery challenge cannot reset a password', async () => {
  const key = generateRecoveryKey();
  const client = createRecoveryClient({
    keyHash: hashRecoveryKey(key),
    recoverySentAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
  });
  await expectRecoveryError(
    accountRecoveryRequest('Bearer session-token', {
      action: 'complete',
      recoveryKey: key,
      password: 'new-secret-password',
    }, client),
    403
  );
  assert.equal(client.state.password, null);
});

test('valid recovery changes the password and atomically replaces the one-time key', async () => {
  const oldKey = generateRecoveryKey();
  const client = createRecoveryClient({ keyHash: hashRecoveryKey(oldKey) });
  const result = await accountRecoveryRequest('Bearer session-token', {
    action: 'complete',
    recoveryKey: oldKey,
    password: 'new-secret-password',
  }, client);

  assert.equal(result.passwordChanged, true);
  assert.equal(client.state.password, 'new-secret-password');
  assert.notEqual(result.replacementRecoveryKey, oldKey);
  assert.equal(recoveryKeyMatches(oldKey, client.state.keyHash), false);
  assert.equal(recoveryKeyMatches(result.replacementRecoveryKey, client.state.keyHash), true);
  const previousPassword = client.state.password;
  await expectRecoveryError(
    accountRecoveryRequest('Bearer session-token', {
      action: 'complete-email',
      password: 'replayed-password-change',
    }, client),
    400
  );
  assert.equal(client.state.password, previousPassword);
  await expectRecoveryError(
    accountRecoveryRequest('Bearer session-token', {
      action: 'complete',
      recoveryKey: oldKey,
      password: 'another-new-password',
    }, client),
    400
  );
});

test('verified email recovery can replace a lost key and sets a new password', async () => {
  const oldKey = generateRecoveryKey();
  const client = createRecoveryClient({ keyHash: hashRecoveryKey(oldKey) });
  const result = await accountRecoveryRequest('Bearer session-token', {
    action: 'complete-email',
    password: 'new-secret-password',
  }, client);
  assert.equal(result.passwordChanged, true);
  assert.equal(client.state.password, 'new-secret-password');
  assert.notEqual(result.replacementRecoveryKey, oldKey);
  assert.equal(recoveryKeyMatches(result.replacementRecoveryKey, client.state.keyHash), true);
});

test('recovery key replacement requires recent password re-authentication', async () => {
  const oldKey = generateRecoveryKey();
  const client = createRecoveryClient({
    keyHash: hashRecoveryKey(oldKey),
    lastSignInAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  });

  test('recent password re-authentication replaces the old key once', async () => {
    const oldKey = generateRecoveryKey();
    const client = createRecoveryClient({ keyHash: hashRecoveryKey(oldKey) });
    const result = await accountRecoveryRequest('Bearer session-token', { action: 'rotate' }, client);
    assert.match(result.recoveryKey, /^MAI-[A-Za-z0-9_-]{43}$/);
    assert.notEqual(result.recoveryKey, oldKey);
    assert.equal(recoveryKeyMatches(result.recoveryKey, client.state.keyHash), true);
    assert.equal(recoveryKeyMatches(oldKey, client.state.keyHash), false);
  });
  await expectRecoveryError(
    accountRecoveryRequest('Bearer session-token', { action: 'rotate' }, client),
    403
  );
  assert.equal(client.state.keyHash, hashRecoveryKey(oldKey));
});

test('used recovery keys and rate-limited recovery attempts are rejected', async () => {
  const key = generateRecoveryKey();
  const usedKeyClient = createRecoveryClient({ keyHash: hashRecoveryKey(key), claim: false });
  await expectRecoveryError(
    accountRecoveryRequest('Bearer session-token', {
      action: 'complete',
      recoveryKey: key,
      password: 'new-secret-password',
    }, usedKeyClient),
    400
  );

  const limitedClient = createRecoveryClient({
    keyHash: hashRecoveryKey(key),
    allowed: false,
  });
  await expectRecoveryError(
    accountRecoveryRequest('Bearer session-token', {
      action: 'complete',
      recoveryKey: key,
      password: 'new-secret-password',
    }, limitedClient),
    429
  );
});
