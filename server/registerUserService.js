import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerKey } from './supabaseServerKey.js';
import {
  verifyEmailOtp,
  validateEmailVerificationToken,
  isValidEmail,
  normalizeEmail,
} from './emailOtpService.js';
import { findUserByEmail } from './accountLookup.js';

export class RegistrationError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'RegistrationError';
    this.status = status;
  }
}

export function getServerClient(env = process.env, createClient = null) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = getSupabaseServerKey(env);
  if (!url || !key) {
    throw new RegistrationError(503, 'Account registration services are temporarily unavailable.');
  }
  return (createClient || createSupabaseClient)(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Validates registration input fields and verifies OTP, then creates a confirmed account.
 */
export async function handleRegisterUser(payload, dependencies = {}) {
  const env = dependencies.env || process.env;
  const { email, password, fullName, phone, otp, verificationToken } = payload || {};

  const cleanEmail = normalizeEmail(email);
  if (!isValidEmail(cleanEmail)) {
    throw new RegistrationError(400, 'Please provide a valid Gmail / email address.');
  }
  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    throw new RegistrationError(400, 'Please provide your full legal name.');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new RegistrationError(400, 'Password must be at least 8 characters long.');
  }

  // Check if account already exists before verifying or burning OTP
  const existingUser = await findUserByEmail({
    email: cleanEmail,
    env,
    createClient: dependencies.createClient,
  });
  if (existingUser?.exists) {
    throw new RegistrationError(
      409,
      'An account with this email address already exists. Please sign in instead.'
    );
  }

  // Verify OTP or verified token
  if (otp) {
    await verifyEmailOtp({
      email: cleanEmail,
      otp,
      env,
    });
  } else if (verificationToken) {
    const tokenCheck = validateEmailVerificationToken({
      email: cleanEmail,
      token: verificationToken,
      env,
    });
    if (!tokenCheck.valid) {
      throw new RegistrationError(400, tokenCheck.error || 'Invalid or expired email verification.');
    }
  } else {
    throw new RegistrationError(400, 'Email verification code is required to complete account registration.');
  }

  const client = getServerClient(env, dependencies.createClient);

  // Create user in Supabase with pre-confirmed email
  const { data, error } = await client.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName.trim(),
      phone: phone ? String(phone).trim() : null,
    },
  });

  if (error) {
    const code = error.code || '';
    const msg = (error.message || '').toLowerCase();
    if (
      code === 'email_exists' ||
      code === 'user_already_exists' ||
      msg.includes('already registered') ||
      msg.includes('already exists') ||
      error.status === 422
    ) {
      throw new RegistrationError(
        409,
        'An account with this email address already exists. Please sign in or reset your password.'
      );
    }
    if (code === 'weak_password' || msg.includes('weak password')) {
      throw new RegistrationError(400, 'Password is too weak. Please use at least 8 characters.');
    }
    throw new RegistrationError(400, error.message || 'Unable to complete registration. Please try again.');
  }

  const user = data?.user;
  if (!user) {
    throw new RegistrationError(500, 'Registration succeeded but user details could not be retrieved.');
  }

  // Attempt to upsert into public.profiles
  try {
    await client.from('profiles').upsert(
      {
        id: user.id,
        full_name: fullName.trim(),
        email: cleanEmail,
        phone: phone ? String(phone).trim() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (profileErr) {
    console.warn('[register-user] profile upsert warning:', profileErr.message);
  }

  return {
    success: true,
    message: 'Account registered and email verified successfully.',
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

