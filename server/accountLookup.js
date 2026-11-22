import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerKey } from './supabaseServerKey.js';
import { normalizeEmail, isValidEmail } from './emailOtpService.js';

/**
 * Robustly checks if an account exists for a given email address
 * by querying both public.profiles and Supabase Auth admin users list.
 *
 * @param {Object} options
 * @param {string} options.email
 * @param {Object} [options.env]
 * @param {Function} [options.createClient]
 * @returns {Promise<{ exists: boolean, userId?: string, source?: string, error?: string, configured?: boolean }>}
 */
export async function findUserByEmail({
  email,
  env = process.env,
  createClient = null,
}) {
  const cleanEmail = normalizeEmail(email);
  if (!isValidEmail(cleanEmail)) {
    return { exists: false, error: 'Please enter a valid Gmail / email address.' };
  }

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serverKey = getSupabaseServerKey(env) || env.EMAIL_OTP_SECRET || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serverKey) {
    return { exists: false, configured: false };
  }

  try {
    const client = (createClient || createSupabaseClient)(url, serverKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // 1. Check profiles table first (indexed fast lookup)
    try {
      const { data: profile, error: profileErr } = await client
        .from('profiles')
        .select('id, email')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (!profileErr && profile?.id) {
        return { exists: true, userId: profile.id, source: 'profiles' };
      }
    } catch (_) {}

    // 2. Check auth.users via Supabase Auth Admin API
    try {
      if (client?.auth?.admin?.listUsers) {
        const { data: authData, error: authErr } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (!authErr && Array.isArray(authData?.users)) {
          const userMatch = authData.users.find(
            (u) => (u.email || '').trim().toLowerCase() === cleanEmail
          );
          if (userMatch) {
            return { exists: true, userId: userMatch.id, source: 'auth.users' };
          }
        }
      }
    } catch (_) {}

    return { exists: false };
  } catch (err) {
    console.error('[account-lookup] lookup error:', err?.message || err);
    return { exists: false, error: err?.message || 'Lookup failed.' };
  }
}

export function buildPasswordResetEmailHtml({ email, actionLink }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Mehanda Army Investments</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: #10243B; padding: 28px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">MEHANDA ARMY INVESTMENTS</h1>
      <p style="color: #d4af37; margin: 6px 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Official Secure Account Recovery</p>
    </div>
    <div style="padding: 32px 24px;">
      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px;">Reset Your Password</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-top: 0;">
        We received a request to reset the password for your Mehanda Army Investments account (<strong>${email}</strong>).
      </p>
      
      <div style="margin: 28px 0; text-align: center;">
        <a href="${actionLink}" style="display: inline-block; background: #10243B; color: #d4af37; border: 2px solid #876A2E; border-radius: 12px; padding: 14px 28px; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(16, 36, 59, 0.15);">
          Reset My Password →
        </a>
      </div>
      
      <div style="background: #f8fafc; border-left: 4px solid #876A2E; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155;">
          ⏱ <strong>Valid for 1 hour:</strong> This secure reset link is valid for 1 hour and can only be used once.
        </p>
      </div>

      <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin-top: 20px;">
        If you did not request a password reset, you can safely ignore this email. Your account credentials remain secure.
      </p>
    </div>
    
    <div style="background: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        Mehanda Army Investments • Hisar, Haryana, India<br>
        Direct Helpline: +91 9812947813 • Email: info@mehandaarmy.net
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function buildPasswordResetEmailText({ email, actionLink }) {
  return `MEHANDA ARMY INVESTMENTS
Official Secure Account Recovery

Reset Your Password for ${email}:
Open this secure link to choose a new password:
${actionLink}

This link is valid for 1 hour. If you did not request a password reset, please ignore this email.

Helpline: +91 9812947813 | Email: info@mehandaarmy.net`;
}

/**
 * Dispatches a real password recovery email via SMTP/Resend
 * after verifying that the account actually exists.
 */
export async function dispatchPasswordResetEmail({
  email,
  redirectTo,
  env = process.env,
  createClient = null,
  deliverEmailFn = null,
}) {
  const cleanEmail = normalizeEmail(email);
  if (!isValidEmail(cleanEmail)) {
    return {
      success: false,
      exists: false,
      status: 400,
      error: 'Please enter a valid Gmail / email address.',
    };
  }

  // 1. Verify account actually exists
  const lookup = await findUserByEmail({ email: cleanEmail, env, createClient });
  if (!lookup.exists) {
    return {
      success: false,
      exists: false,
      status: 404,
      error: 'No account found with this email address. Please check your email or create a new account.',
    };
  }

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serverKey = getSupabaseServerKey(env) || env.EMAIL_OTP_SECRET || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serverKey) {
    return {
      success: false,
      status: 503,
      error: 'Account recovery services are temporarily unavailable.',
    };
  }

  const client = (createClient || createSupabaseClient)(url, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Determine production redirect URL - NEVER allow localhost/127.0.0.1 in delivered email links
  const canonicalRedirect = 'https://mehandaarmy.net/?auth=reset-password';
  let targetRedirect = canonicalRedirect;
  if (redirectTo && typeof redirectTo === 'string' && !redirectTo.includes('localhost') && !redirectTo.includes('127.0.0.1')) {
    targetRedirect = redirectTo;
  } else if (env.SITE_URL && !env.SITE_URL.includes('localhost') && !env.SITE_URL.includes('127.0.0.1')) {
    targetRedirect = `${env.SITE_URL.replace(/\/$/, '')}/?auth=reset-password`;
  } else if (env.VITE_SITE_URL && !env.VITE_SITE_URL.includes('localhost') && !env.VITE_SITE_URL.includes('127.0.0.1')) {
    targetRedirect = `${env.VITE_SITE_URL.replace(/\/$/, '')}/?auth=reset-password`;
  }

  // 2. Generate secure Supabase action link using Admin API
  let actionLink = null;
  try {
    const { data: linkData, error: linkErr } = await client.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: {
        redirectTo: targetRedirect,
      },
    });

    if (linkErr) {
      console.error('[accountLookup] generateLink error:', linkErr.message);
      return { success: false, status: 500, error: linkErr.message || 'Could not generate recovery link.' };
    }
    actionLink = linkData?.properties?.action_link;
  } catch (err) {
    console.error('[accountLookup] generateLink exception:', err.message);
    return { success: false, status: 500, error: err.message };
  }

  if (!actionLink) {
    return { success: false, status: 500, error: 'Could not generate password recovery link. Please try again.' };
  }

  // Ensure actionLink redirect_to points to live production domain and never localhost
  if (typeof actionLink === 'string') {
    try {
      const parsedUrl = new URL(actionLink);
      const currentRedirect = parsedUrl.searchParams.get('redirect_to');
      if (!currentRedirect || currentRedirect.includes('localhost') || currentRedirect.includes('127.0.0.1')) {
        parsedUrl.searchParams.set('redirect_to', targetRedirect);
        actionLink = parsedUrl.toString();
      }
    } catch {
      actionLink = actionLink
        .replace(/redirect_to=https?%3A%2F%2Flocalhost(?::\d+)?(?:%2F[^&]*)?/gi, `redirect_to=${encodeURIComponent(targetRedirect)}`)
        .replace(/redirect_to=https?%3A%2F%2F127\.0\.0\.1(?::\d+)?(?:%2F[^&]*)?/gi, `redirect_to=${encodeURIComponent(targetRedirect)}`);
    }
  }

  // 3. Deliver email via our configured SMTP / Resend delivery engine
  try {
    const { deliverEmailMessage } = await import('./emailOtpService.js');
    const html = buildPasswordResetEmailHtml({ email: cleanEmail, actionLink });
    const text = buildPasswordResetEmailText({ email: cleanEmail, actionLink });
    const subject = 'Reset Your Password - Mehanda Army Investments';

    if (typeof deliverEmailFn === 'function') {
      await deliverEmailFn({ to: cleanEmail, subject, html, text });
    } else {
      await deliverEmailMessage({
        to: cleanEmail,
        subject,
        html,
        text,
        env,
      });
    }

    return {
      success: true,
      exists: true,
      status: 200,
      message: 'Password recovery link has been sent to your email address. Please check your inbox and spam folder.',
    };
  } catch (deliveryErr) {
    console.error('[accountLookup] reset email delivery error:', deliveryErr.message);
    return {
      success: false,
      status: 502,
      error: deliveryErr.message || 'Failed to deliver password reset email. Please try again.',
    };
  }
}
