import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerKey } from './supabaseServerKey.js';

class CustomerAccountError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createServiceClient(env = process.env, createSupabaseClient = createClient) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const key = getSupabaseServerKey(env);
  if (!url.startsWith('https://') || !key) {
    throw new CustomerAccountError(503, 'Account services are temporarily unavailable.');
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function getBearerToken(authorization) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization || '');
  if (!match) {
    throw new CustomerAccountError(401, 'Sign in to manage your account-deletion request.');
  }
  return match[1];
}

async function findOpenDeletionRequest(client, userId) {
  const { data, error } = await client
    .from('account_deletion_requests')
    .select('id,status,created_at')
    .eq('user_id', userId)
    .in('status', ['requested', 'in_review'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[customer-account] deletion request lookup failed', {
      code: error.code || 'unknown',
    });
    throw new CustomerAccountError(503, 'The account-deletion request could not be retrieved.');
  }
  return data;
}

function toDeletionRequest(record) {
  if (!record) return null;
  return {
    reference: record.id,
    status: record.status,
    createdAt: record.created_at,
  };
}

export async function customerAccountRequest(
  authorization,
  payload,
  { env = process.env, createSupabaseClient = createClient } = {}
) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    Object.keys(payload).some((key) => key !== 'action') ||
    !['status', 'request'].includes(payload.action)
  ) {
    throw new CustomerAccountError(400, 'Choose a valid account-deletion request action.');
  }

  const accessToken = getBearerToken(authorization);
  const client = createServiceClient(env, createSupabaseClient);
  const { data, error } = await client.auth.getUser(accessToken);
  const user = data?.user;
  if (error || !user) {
    throw new CustomerAccountError(401, 'Your session is invalid or expired. Please sign in again.');
  }
  if (!user.email_confirmed_at && !user.phone_confirmed_at) {
    throw new CustomerAccountError(403, 'Verify your email address or phone number before requesting account deletion.');
  }

  const existing = await findOpenDeletionRequest(client, user.id);
  if (payload.action === 'status' || existing) {
    return { request: toDeletionRequest(existing) };
  }

  const { data: created, error: insertError } = await client
    .from('account_deletion_requests')
    .insert({ user_id: user.id })
    .select('id,status,created_at')
    .single();
  if (insertError?.code === '23505') {
    const concurrentRequest = await findOpenDeletionRequest(client, user.id);
    if (concurrentRequest) return { request: toDeletionRequest(concurrentRequest) };
  }
  if (insertError || !created) {
    console.error('[customer-account] deletion request creation failed', {
      code: insertError?.code || 'unknown',
    });
    throw new CustomerAccountError(503, 'The account-deletion request could not be submitted. Please try again.');
  }

  return { request: toDeletionRequest(created) };
}

export function customerAccountErrorResponse(error) {
  if (error instanceof CustomerAccountError) {
    return { status: error.status, body: { error: error.message } };
  }
  console.error('[customer-account] request failed', {
    code: error?.code || 'unknown',
  });
  return {
    status: 500,
    body: { error: 'Account services could not complete the request.' },
  };
}
