import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerKey } from './supabaseServerKey.js';

const RATE_WINDOW_SECONDS = 15 * 60;
const RECOVERY_KEY_LIMIT = 5;
const KEY_PATTERN = /^MAI-[A-Za-z0-9_-]{43}$/;
const PASSWORD_MIN_LENGTH = 8;

class AccountRecoveryError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function generateRecoveryKey() {
  return `MAI-${randomBytes(32).toString('base64url')}`;
}

export function hashRecoveryKey(key) {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

export function recoveryKeyMatches(key, storedHash) {
  if (typeof key !== 'string' || !KEY_PATTERN.test(key) ||
      typeof storedHash !== 'string' || !/^[a-f0-9]{64}$/.test(storedHash)) {
    return false;
  }
  const candidate = Buffer.from(hashRecoveryKey(key), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return timingSafeEqual(candidate, stored);
}

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = getSupabaseServerKey();
  if (!url || !serviceRoleKey) {
    throw new Error('Account recovery is missing server-side Supabase configuration.');
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readBearerToken(authorization) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization || '');
  if (!match) throw new AccountRecoveryError(401, 'Use the verification link sent to your email.');
  return match[1];
}

async function requireVerifiedUser(client, token) {
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    throw new AccountRecoveryError(401, 'Your verification session is invalid or expired. Request a new email link.');
  }
  if (!data.user.email_confirmed_at) {
    throw new AccountRecoveryError(403, 'Verify your email before continuing.');
  }
  return data.user;
}

async function checkRateLimit(client, subjectHash, action, maxAttempts) {
  try {
    const { data, error } = await client.rpc('consume_account_recovery_rate_limit', {
      p_subject_hash: subjectHash,
      p_action: action,
      p_max_attempts: maxAttempts,
      p_window_seconds: RATE_WINDOW_SECONDS,
    });
    if (error) {
      if (error.code === 'PGRST202' || (error.message || '').includes('schema cache')) {
        return;
      }
      throw error;
    }
    if (data !== true) {
      throw new AccountRecoveryError(429, 'Too many attempts. Please wait 15 minutes and try again.');
    }
  } catch (err) {
    if (err instanceof AccountRecoveryError) throw err;
    if (err?.code === 'PGRST202' || (err?.message || '').includes('schema cache')) {
      return;
    }
    throw err;
  }
}

async function issueRecoveryKey(client, userId) {
  const key = generateRecoveryKey();
  try {
    const { data, error } = await client.rpc('create_account_recovery_key', {
      p_user_id: userId,
      p_key_hash: hashRecoveryKey(key),
    });
    if (error) {
      if (error.code === 'PGRST202' || (error.message || '').includes('schema cache')) {
        await client.auth.admin.updateUserById(userId, {
          user_metadata: { recovery_key_hash: hashRecoveryKey(key) },
        });
        return key;
      }
      throw error;
    }
    if (data !== true) throw new AccountRecoveryError(409, 'A recovery key already exists. Use email recovery to replace a lost key.');
    return key;
  } catch (err) {
    if (err instanceof AccountRecoveryError) throw err;
    if (err?.code === 'PGRST202' || (err?.message || '').includes('schema cache')) {
      await client.auth.admin.updateUserById(userId, {
        user_metadata: { recovery_key_hash: hashRecoveryKey(key) },
      });
      return key;
    }
    throw err;
  }
}

export async function accountRecoveryRequest(authorization, payload, providedClient) {
  const token = readBearerToken(authorization);
  const client = providedClient || createAdminClient();
  const user = await requireVerifiedUser(client, token);
  const userId = user.id;

  if (payload?.action === 'status') {
    try {
      const { data, error } = await client
        .from('account_recovery_keys')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        return { hasRecoveryKey: false };
      }
      return { hasRecoveryKey: Boolean(data) };
    } catch {
      return { hasRecoveryKey: false };
    }
  }

  const userSubject = createHash('sha256').update(userId).digest('hex');
  if (payload?.action === 'issue') {
    await checkRateLimit(client, userSubject, 'issue', 3);
    return { recoveryKey: await issueRecoveryKey(client, userId) };
  }

  if (payload?.action === 'rotate') {
    await checkRateLimit(client, userSubject, 'rotate', 3);
    const { data: adminUserData, error: adminUserError } = await client.auth.admin.getUserById(userId);
    if (adminUserError) throw adminUserError;
    const lastSignInAt = Date.parse(adminUserData?.user?.last_sign_in_at || '');
    const now = Date.now();
    if (!Number.isFinite(lastSignInAt) || lastSignInAt > now || now - lastSignInAt > 5 * 60 * 1000) {
      throw new AccountRecoveryError(403, 'Re-enter your current password to replace your recovery key.');
    }
    const recoveryKey = generateRecoveryKey();
    const { data, error } = await client.rpc('rotate_account_recovery_key', {
      p_user_id: userId,
      p_new_key_hash: hashRecoveryKey(recoveryKey),
    });
    if (error) throw error;
    if (data !== true) throw new Error('Recovery key rotation could not be completed.');
    return { recoveryKey };
  }

  if (payload?.action !== 'complete' && payload?.action !== 'complete-email') {
    throw new AccountRecoveryError(400, 'Unsupported account recovery action.');
  }
  await checkRateLimit(client, userSubject, 'complete', RECOVERY_KEY_LIMIT);
  const { data: adminUserData, error: adminUserError } = await client.auth.admin.getUserById(userId);
  if (adminUserError) throw adminUserError;
  const recoverySentAtValue = adminUserData?.user?.recovery_sent_at;
  const recoverySentAt = Date.parse(recoverySentAtValue || '');
  const now = Date.now();
  if (!Number.isFinite(recoverySentAt) || recoverySentAt > now || now - recoverySentAt > 30 * 60 * 1000) {
    throw new AccountRecoveryError(403, 'Your email recovery link has expired. Request a new one and try again.');
  }

  if (payload.action === 'complete' &&
      (typeof payload.recoveryKey !== 'string' || !KEY_PATTERN.test(payload.recoveryKey))) {
    throw new AccountRecoveryError(400, 'The recovery key is invalid. Check it and try again.');
  }
  if (typeof payload.password !== 'string' || payload.password.length < PASSWORD_MIN_LENGTH) {
    throw new AccountRecoveryError(400, 'The new password must be at least 8 characters.');
  }
  if (payload.password.length > 128) {
    throw new AccountRecoveryError(400, 'The new password is too long.');
  }

  let storedKey = null;
  if (payload.action === 'complete') {
    if (typeof payload.recoveryKey !== 'string' || !KEY_PATTERN.test(payload.recoveryKey)) {
      throw new AccountRecoveryError(400, 'The recovery key is invalid. Check it and try again.');
    }
    const { data, error: selectError } = await client
      .from('account_recovery_keys')
      .select('key_hash')
      .eq('user_id', userId)
      .maybeSingle();
    if (selectError) throw selectError;
    storedKey = data;
    if (!storedKey || !recoveryKeyMatches(payload.recoveryKey, storedKey.key_hash)) {
      throw new AccountRecoveryError(400, 'The recovery key is invalid. Check it and try again.');
    }

    const { data: claimed, error: claimError } = await client.rpc('claim_account_recovery_key', {
      p_user_id: userId,
      p_key_hash: storedKey.key_hash,
    });
    if (claimError) throw claimError;
    if (claimed !== true) {
      throw new AccountRecoveryError(400, 'The recovery key has already been used or is being processed.');
    }
  }

  let replacementKey;
  let recoveryChallengeClaimed = false;
  let passwordUpdated = false;
  try {
    const { data: challengeClaimed, error: challengeError } = await client.rpc('claim_account_recovery_challenge', {
      p_user_id: userId,
      p_recovery_sent_at: recoverySentAtValue,
    });
    if (challengeError) throw challengeError;
    if (challengeClaimed !== true) {
      throw new AccountRecoveryError(400, 'This email recovery link has already been used. Request a new one.');
    }
    recoveryChallengeClaimed = true;

    const { error: passwordError } = await client.auth.admin.updateUserById(userId, {
      password: payload.password,
    });
    if (passwordError) throw passwordError;
    passwordUpdated = true;

    replacementKey = generateRecoveryKey();
    const { data: replaced, error: replaceError } = storedKey
      ? await client.rpc('replace_account_recovery_key', {
        p_user_id: userId,
        p_old_key_hash: storedKey.key_hash,
        p_new_key_hash: hashRecoveryKey(replacementKey),
      })
      : await client.rpc('rotate_account_recovery_key', {
        p_user_id: userId,
        p_new_key_hash: hashRecoveryKey(replacementKey),
      });
    if (replaceError) throw replaceError;
    if (replaced !== true) throw new Error('Recovery key rotation could not be completed.');
  } catch (error) {
    if (!passwordUpdated && recoveryChallengeClaimed) {
      const { error: releaseError } = await client.rpc('release_account_recovery_challenge', {
        p_user_id: userId,
        p_recovery_sent_at: recoverySentAtValue,
      });
      if (releaseError) console.error('Could not release account recovery challenge.');
    }
    if (!passwordUpdated && storedKey) {
      const { error: releaseError } = await client.rpc('release_account_recovery_key_claim', {
        p_user_id: userId,
        p_key_hash: storedKey.key_hash,
      });
      if (releaseError) console.error('Could not release account recovery claim.');
    }
    throw error;
  }

  return { passwordChanged: true, replacementRecoveryKey: replacementKey };
}

export function accountRecoveryErrorResponse(error) {
  if (error instanceof AccountRecoveryError) {
    return { status: error.status, body: { error: error.message } };
  }
  console.error('Account recovery request failed.');
  return { status: 500, body: { error: 'Account recovery could not be completed. Please try again later.' } };
}
