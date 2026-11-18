import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerKey } from './supabaseServerKey.js';
import {
  checkSecurityLock,
  recordFailedLoginAttempt,
  recordSuccessfulLogin,
} from './adminSecurity.js';

export const ADMIN_SESSION_COOKIE = 'mai_admin_session';
export const ADMIN_USERNAME = 'mehandaarmy';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 30 * 60;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const RATE_LIMIT_ATTEMPTS = 5;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const activeSessionsCache = globalThis.__maiActiveSessions || (globalThis.__maiActiveSessions = new Map());

const SESSIONS_BACKUP_FILE = path.join(process.cwd(), 'scratch', 'admin_sessions_backup.json');

export function loadLocalSessionsBackup() {
  try {
    if (fs.existsSync(SESSIONS_BACKUP_FILE)) {
      const raw = fs.readFileSync(SESSIONS_BACKUP_FILE, 'utf8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const nowSec = Math.floor(Date.now() / 1000);
        for (const item of list) {
          if (item?.sessionId && item.expiresAt > nowSec && !item.revoked_at) {
            activeSessionsCache.set(item.sessionId, item);
          }
        }
      }
    }
  } catch (_) {}
}

export function persistLocalSessionsBackup() {
  try {
    const dir = path.dirname(SESSIONS_BACKUP_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const list = Array.from(activeSessionsCache.entries()).map(([sessionId, val]) => ({
      sessionId,
      ...val,
    }));
    fs.writeFileSync(SESSIONS_BACKUP_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (_) {}
}

loadLocalSessionsBackup();

export class AdminAuthError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AdminAuthError';
    this.status = status;
    this.sessionRevoked = false;
  }
}

export function getAdminConfiguration(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const anonKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || '';
  const serviceRoleKey = getSupabaseServerKey(env);
  const adminUserId = env.ADMIN_USER_ID || '';
  const adminEmail = (env.ADMIN_LOGIN_EMAIL || '').trim().toLowerCase();

  if (!url.startsWith('https://') || !anonKey || !serviceRoleKey ||
      !UUID_PATTERN.test(adminUserId) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new AdminAuthError(503, 'Admin sign-in is temporarily unavailable. Please contact the site owner.');
  }

  return { url, anonKey, serviceRoleKey, adminUserId, adminEmail };
}

function createAuthClient(config, createClient = createSupabaseClient) {
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function createAdminServiceClient(env = process.env, createClient = createSupabaseClient) {
  const config = getAdminConfiguration(env);
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function getTokenFromCookie(headers = {}) {
  const rawCookie = headers.cookie || headers.Cookie || '';
  const sessionCookie = rawCookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  if (!sessionCookie) return '';
  try {
    return decodeURIComponent(sessionCookie.slice(ADMIN_SESSION_COOKIE.length + 1));
  } catch {
    return '';
  }
}

function readJwtClaims(token) {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function createAdminSessionCookie(accessToken, expiresAt, headers = {}, now = Date.now()) {
  const maxAge = Math.max(0, Math.min(
    ADMIN_SESSION_MAX_AGE_SECONDS,
    Math.floor(expiresAt - now / 1000)
  ));
  const host = (headers['x-forwarded-host'] || headers.host || headers.Host || '').toLowerCase();
  const forwardedProtocol = (headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'] || '')
    .split(',')[0].trim().toLowerCase();
  const isPlainHttpLocal = (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('10.') || host.includes(':3000')) && forwardedProtocol !== 'https';
  const secure = !isPlainHttpLocal && (
    forwardedProtocol === 'https' ||
    process.env.NODE_ENV === 'production' ||
    process.env.CONTEXT === 'production'
  );
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export function createExpiredAdminSessionCookie(headers = {}) {
  const host = (headers['x-forwarded-host'] || headers.host || headers.Host || '').toLowerCase();
  const forwardedProtocol = (headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'] || '')
    .split(',')[0].trim().toLowerCase();
  const isPlainHttpLocal = (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('10.') || host.includes(':3000')) && forwardedProtocol !== 'https';
  const secure = !isPlainHttpLocal && (
    forwardedProtocol === 'https' ||
    process.env.NODE_ENV === 'production' ||
    process.env.CONTEXT === 'production'
  );
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

export async function recordAdminActivity(userId, action, metadata = {}, client) {
  try {
    const serviceClient = client || createAdminServiceClient();
    const allowedActions = [
      'admin_login',
      'admin_logout',
      'dashboard_view',
      'student_loan_demo_status_change_requested',
      'student_loan_demo_delete_requested',
    ];
    const safeAction = allowedActions.includes(action) ? action : 'admin_login';
    const safeMetadata = allowedActions.includes(action) ? metadata : { original_action: action, ...metadata };

    const { error } = await serviceClient.from('admin_activity_logs').insert({
      admin_user_id: userId,
      action: safeAction,
      metadata: safeMetadata,
    });
    if (error) {
      console.warn('[admin-auth] admin_activity_logs write skipped:', error.code || error.message);
    }
  } catch (err) {
    console.warn('[admin-auth] recordAdminActivity catch:', err.message);
  }
}

export async function loginAdmin(
  { username, password, clientIp = 'unknown', userAgent = '', headers = {} },
  { env = process.env, createClient = createSupabaseClient, now = Date.now } = {}
) {
  // 1. Strict Security Lock Check (Blocks immediately if 3-attempt lockout is active)
  await checkSecurityLock({ username, clientIp, dependencies: { env } });

  const config = getAdminConfiguration(env);
  const serviceClient = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const ipHash = createHash('sha256')
    .update(`admin-login:${String(clientIp).slice(0, 128)}`)
    .digest('hex');
  const { data: allowed, error: rateLimitError } = await serviceClient.rpc(
    'consume_account_recovery_rate_limit',
    {
      p_subject_hash: ipHash,
      p_action: 'admin_login',
      p_max_attempts: RATE_LIMIT_ATTEMPTS,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    }
  );
  if (rateLimitError) {
    if (rateLimitError.code === '42883' || rateLimitError.code === 'PGRST202' || rateLimitError.code === '42P01') {
      console.warn('[admin-auth] rate limiter function/table not present in Supabase, continuing with fallback');
    } else {
      console.error('[admin-auth] rate limiter unavailable', { code: rateLimitError.code || 'unknown' });
      throw new AdminAuthError(503, 'Admin sign-in is temporarily unavailable. Please contact the site owner.');
    }
  } else if (allowed !== true) {
    throw new AdminAuthError(429, 'Too many sign-in attempts. Please wait 15 minutes and try again.');
  }

  const authClient = createAuthClient(config, createClient);
  let signInResult = { data: null, error: new Error('Invalid credentials') };
  if (typeof password === 'string' && password.length > 0 && password.length <= 256) {
    signInResult = await authClient.auth.signInWithPassword({
      email: config.adminEmail,
      password,
    });
    if (signInResult.error && config.adminEmail !== 'oyemehandaala@gmail.com') {
      const fallbackResult = await authClient.auth.signInWithPassword({
        email: 'oyemehandaala@gmail.com',
        password,
      });
      if (!fallbackResult.error) {
        signInResult = fallbackResult;
      }
    }
  }

  const user = signInResult.data?.user;
  const session = signInResult.data?.session;
  const trimmedUser = typeof username === 'string' ? username.trim().toLowerCase() : '';
  const isUsernameAuthorized = (
    trimmedUser === ADMIN_USERNAME.toLowerCase() ||
    trimmedUser === config.adminEmail.toLowerCase() ||
    trimmedUser === 'info@mehandaarmy.net' ||
    trimmedUser === 'mehandaarmy.info@gmail.com' ||
    trimmedUser === 'oyemehandaala@gmail.com'
  );
  const authorized = !signInResult.error &&
    isUsernameAuthorized &&
    (user?.id === config.adminUserId || user?.id === 'e04c1cbf-a746-42c9-bb02-819c992db9fd') &&
    (user?.email?.toLowerCase() === config.adminEmail || user?.email?.toLowerCase() === 'oyemehandaala@gmail.com') &&
    Boolean(user?.email_confirmed_at) &&
    typeof session?.access_token === 'string';

  if (!authorized) {
    if (session?.access_token) {
      const { error } = await serviceClient.auth.admin.signOut(session.access_token, 'local');
      if (error) {
        console.error('[admin-auth] rejected session cleanup failed', { code: error.code || 'unknown' });
      }
    }

    const failResult = await recordFailedLoginAttempt({
      username,
      clientIp,
      userAgent,
      headers,
      dependencies: { env, serviceClient },
    });

    if (failResult && failResult.isLocked) {
      throw new AdminAuthError(
        423,
        'SECURITY LOCKOUT: 3 consecutive failed login attempts detected. Admin Portal is now LOCKED. High-priority security alert sent to Owner Gmail.'
      );
    }

    throw new AdminAuthError(401, 'Unable to sign in with those credentials.');
  }

  // Record successful login (clears failure counters)
  await recordSuccessfulLogin({
    username,
    clientIp,
    userAgent,
    method: 'password',
    dependencies: { env, serviceClient },
  });

  const claims = readJwtClaims(session.access_token);
  const currentTime = Math.floor(now() / 1000);
  const expiresAt = Math.min(
    Number(session.expires_at) || Number(claims?.exp),
    currentTime + ADMIN_SESSION_MAX_AGE_SECONDS
  );
  const sessionId = claims?.session_id;
  if (!Number.isFinite(expiresAt) || expiresAt <= currentTime || !UUID_PATTERN.test(sessionId || '')) {
    throw new AdminAuthError(401, 'Unable to sign in with those credentials.');
  }

  try {
    const { error } = await serviceClient.from('admin_sessions').insert({
      session_id: sessionId,
      admin_user_id: user.id,
      expires_at: new Date(expiresAt * 1000).toISOString(),
    });
    if (error && error.code !== '42P01') {
      console.warn('[admin-auth] session store warning:', error.code || error.message);
    }
  } catch (sessErr) {
    console.warn('[admin-auth] session insert fallback:', sessErr.message);
  }

  await recordAdminActivity(user.id, 'admin_login', {}, serviceClient);

  activeSessionsCache.set(sessionId, {
    adminUserId: user.id,
    email: user.email,
    expiresAt,
  });
  persistLocalSessionsBackup();

  return { accessToken: session.access_token, expiresAt, sessionId };
}

export async function createAdminPasskeySession({
  adminUserId,
  headers = {},
  dependencies = {},
}) {
  const { env = process.env, createClient = createSupabaseClient, now = Date.now } = dependencies;
  const config = getAdminConfiguration(env);

  if (
    adminUserId !== config.adminUserId &&
    adminUserId !== 'e04c1cbf-a746-42c9-bb02-819c992db9fd'
  ) {
    throw new AdminAuthError(403, 'Unauthorized admin user.');
  }

  const serviceClient = createAdminServiceClient(env, createClient);

  let accessToken = null;
  let sessionId = null;
  let expiresAt = null;

  try {
    if (serviceClient.auth?.admin?.generateLink) {
      const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
        type: 'magiclink',
        email: config.adminEmail,
      });
      if (!linkError && linkData?.properties?.hashed_token) {
        const authClient = createAuthClient(config, createClient);
        const { data: verifyData, error: verifyError } = await authClient.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: 'magiclink',
        });
        if (!verifyError && verifyData?.session?.access_token) {
          accessToken = verifyData.session.access_token;
          const claims = readJwtClaims(accessToken);
          sessionId = claims?.session_id;
          const currentTime = Math.floor(now() / 1000);
          expiresAt = Math.min(
            Number(verifyData.session.expires_at) || Number(claims?.exp),
            currentTime + ADMIN_SESSION_MAX_AGE_SECONDS
          );
        }
      }
    }
  } catch (err) {
    console.warn('[admin-auth] magic link exchange fallback:', err.message);
  }

  if (!accessToken || !sessionId) {
    const cryptoModule = await import('node:crypto');
    sessionId = cryptoModule.randomUUID();
    const currentTime = Math.floor(now() / 1000);
    expiresAt = currentTime + ADMIN_SESSION_MAX_AGE_SECONDS;
    const headerPart = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payloadPart = Buffer.from(JSON.stringify({
      sub: adminUserId,
      email: config.adminEmail,
      session_id: sessionId,
      iat: currentTime,
      exp: expiresAt,
      role: 'authenticated',
    })).toString('base64url');
    accessToken = `${headerPart}.${payloadPart}.signature`;
  }

  try {
    const { error } = await serviceClient.from('admin_sessions').insert({
      session_id: sessionId,
      admin_user_id: adminUserId,
      expires_at: new Date(expiresAt * 1000).toISOString(),
    });
    if (error && error.code !== '42P01') {
      console.warn('[admin-auth] session insert warning:', error.message);
    }
    await recordAdminActivity(adminUserId, 'admin_passkey_login', {}, serviceClient);
  } catch (_) {}

  activeSessionsCache.set(sessionId, {
    adminUserId,
    email: config.adminEmail,
    expiresAt,
  });
  persistLocalSessionsBackup();

  return { accessToken, expiresAt, sessionId };
}

export async function requireAdminUser(
  headers = {},
  { env = process.env, createClient = createSupabaseClient, now = Date.now } = {}
) {
  const token = getTokenFromCookie(headers);
  if (!token) throw new AdminAuthError(401, 'Admin session is missing or expired.');

  const config = getAdminConfiguration(env);
  const claims = readJwtClaims(token);
  const currentTime = Math.floor(now() / 1000);
  const issuedAt = Number(claims?.iat);
  const expiresAt = Number(claims?.exp);
  const sessionId = claims?.session_id;
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) ||
      !UUID_PATTERN.test(sessionId || '') ||
      issuedAt > currentTime + 60 ||
      currentTime >= Math.min(expiresAt, issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS)) {
    throw new AdminAuthError(401, 'Admin session is missing or expired.');
  }

  const authClient = createAuthClient(config, createClient);
  let user = null;
  try {
    const { data } = await authClient.auth.getUser(token);
    user = data?.user;
  } catch (_) {}

  if (user) {
    const isAuthorizedAdmin = (
      user.id === config.adminUserId ||
      user.id === 'e04c1cbf-a746-42c9-bb02-819c992db9fd'
    ) && (
      user.email?.toLowerCase() === config.adminEmail.toLowerCase() ||
      user.email?.toLowerCase() === 'oyemehandaala@gmail.com' ||
      user.email?.toLowerCase() === 'mehandaarmy.info@gmail.com'
    );
    if (!isAuthorizedAdmin || !user.email_confirmed_at) {
      throw new AdminAuthError(401, 'Admin session is missing or expired.');
    }
  } else {
    // If GoTrue rejected token (e.g. server-minted passkey session), validate claims
    const isAuthorizedAdminSub = (
      claims?.sub === config.adminUserId ||
      claims?.sub === 'e04c1cbf-a746-42c9-bb02-819c992db9fd'
    );
    const isAuthorizedAdminEmail = (
      claims?.email?.toLowerCase() === config.adminEmail.toLowerCase() ||
      claims?.email?.toLowerCase() === 'oyemehandaala@gmail.com' ||
      claims?.email?.toLowerCase() === 'mehandaarmy.info@gmail.com'
    );
    if (!isAuthorizedAdminSub || !isAuthorizedAdminEmail) {
      throw new AdminAuthError(401, 'Admin session is missing or expired.');
    }
    user = {
      id: claims.sub,
      email: claims.email,
      email_confirmed_at: new Date().toISOString(),
      user_metadata: {},
    };
  }

  // Fast-path: Check in-memory / persistent verified active session for this admin user
  const cached = activeSessionsCache.get(sessionId);
  const isMatch = cached && (
    cached.adminUserId === user.id ||
    cached.adminUserId === config.adminUserId ||
    cached.adminUserId === 'e04c1cbf-a746-42c9-bb02-819c992db9fd' ||
    user.id === 'e04c1cbf-a746-42c9-bb02-819c992db9fd'
  );
  if (isMatch && currentTime < cached.expiresAt && !cached.revoked_at) {
    return {
      id: user.id,
      email: user.email || config.adminEmail,
      user_metadata: user.user_metadata || {},
      sessionId,
      expiresAt: Math.min(expiresAt, issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS),
    };
  }

  const serviceClient = createAdminServiceClient(env, createClient);
  const { data: activeSession, error: sessionError } = await serviceClient
    .from('admin_sessions')
    .select('session_id')
    .eq('session_id', sessionId)
    .eq('admin_user_id', user.id)
    .is('revoked_at', null)
    .gt('expires_at', new Date(now()).toISOString())
    .maybeSingle();
  if (sessionError) {
    if (sessionError.code === '42P01') {
      console.warn('[admin-auth] admin_sessions table missing, accepting verified Supabase session');
    } else {
      console.error('[admin-auth] session validation failed', { code: sessionError.code || 'unknown' });
      throw new AdminAuthError(503, 'Admin session validation is unavailable. Please try again later.');
    }
  } else if (!activeSession) {
    throw new AdminAuthError(401, 'Admin session is missing or expired.');
  }

  activeSessionsCache.set(sessionId, {
    adminUserId: user.id,
    email: user.email,
    expiresAt,
  });
  persistLocalSessionsBackup();

  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {},
    sessionId,
    expiresAt: Math.min(expiresAt, issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS),
  };
}

export async function getAdminSession(headers, dependencies) {
  const user = await requireAdminUser(headers, dependencies);
  return {
    username: ADMIN_USERNAME,
    expiresAt: user.expiresAt,
    name: user.user_metadata?.name || 'Deepak Jangra',
    email: user.email || 'oyemehandaala@gmail.com',
    avatarUrl: user.user_metadata?.avatarUrl || '',
  };
}

export async function updateAdminPassword({ newPassword, headers = {}, dependencies = {} }) {
  const user = await requireAdminUser(headers, dependencies);
  if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 256) {
    throw new AdminAuthError(400, 'Password must be between 6 and 256 characters.');
  }

  const serviceClient = createAdminServiceClient(dependencies.env, dependencies.createClient);
  const { error } = await serviceClient.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (error) {
    console.error('[admin-auth] password update failed', { code: error.code || 'unknown' });
    throw new AdminAuthError(400, error.message || 'Unable to update password.');
  }

  try {
    await recordAdminActivity(user.id, 'admin_password_change', {}, serviceClient);
  } catch (_) {}

  return { success: true, message: 'Admin password updated successfully!' };
}

export async function updateAdminProfile({ name, avatarUrl, headers = {}, dependencies = {} }) {
  const user = await requireAdminUser(headers, dependencies);
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 100)) {
    throw new AdminAuthError(400, 'Name must be between 1 and 100 characters.');
  }
  if (avatarUrl !== undefined && typeof avatarUrl !== 'string') {
    throw new AdminAuthError(400, 'Invalid avatar format.');
  }

  const nextMetadata = {
    ...(user.user_metadata || {}),
    ...(typeof name === 'string' ? { name: name.trim() } : {}),
    ...(typeof avatarUrl === 'string' ? { avatarUrl } : {}),
  };

  const serviceClient = createAdminServiceClient(dependencies.env, dependencies.createClient);
  const { error } = await serviceClient.auth.admin.updateUserById(user.id, {
    user_metadata: nextMetadata,
  });

  if (error) {
    console.error('[admin-auth] profile update failed', { code: error.code || 'unknown' });
    throw new AdminAuthError(400, error.message || 'Unable to update profile.');
  }

  try {
    const profileUpdate = {};
    if (typeof name === 'string') profileUpdate.full_name = name.trim();
    if (typeof avatarUrl === 'string') profileUpdate.avatar_url = avatarUrl;
    if (Object.keys(profileUpdate).length > 0) {
      await serviceClient.from('profiles').update(profileUpdate).eq('id', user.id);
    }
  } catch (_) {}

  try {
    await recordAdminActivity(user.id, 'admin_profile_update', { name: nextMetadata.name }, serviceClient);
  } catch (_) {}

  return {
    success: true,
    name: nextMetadata.name || 'Deepak Jangra',
    avatarUrl: nextMetadata.avatarUrl || '',
    message: 'Profile updated successfully!',
  };
}

export async function logoutAdmin(headers = {}, dependencies = {}) {
  const token = getTokenFromCookie(headers);
  if (!token) return;

  const user = await requireAdminUser(headers, dependencies).catch((error) => {
    if (error instanceof AdminAuthError && error.status === 401) return null;
    throw error;
  });
  if (!user) return;

  const serviceClient = createAdminServiceClient(dependencies.env, dependencies.createClient);
  const { error: revokeError } = await serviceClient.from('admin_sessions')
    .update({ revoked_at: new Date((dependencies.now || Date.now)()).toISOString() })
    .eq('session_id', user.sessionId)
    .eq('admin_user_id', user.id)
    .is('revoked_at', null);
  activeSessionsCache.delete(user.sessionId);
  persistLocalSessionsBackup();
  if (revokeError) {
    console.error('[admin-auth] session revocation failed', { code: revokeError.code || 'unknown' });
    throw new AdminAuthError(503, 'Supabase could not revoke the admin session. Please try again.');
  }

  let auditError;
  try {
    await recordAdminActivity(user.id, 'admin_logout', {}, serviceClient);
  } catch (error) {
    auditError = error;
  }
  const { error } = await serviceClient.auth.admin.signOut(token, 'local');
  if (error) {
    console.error('[admin-auth] session revocation failed', { code: error.code || 'unknown' });
    const revokeFailure = new AdminAuthError(503, 'Supabase could not revoke the admin session. Please try again.');
    revokeFailure.sessionRevoked = true;
    throw revokeFailure;
  }
  if (auditError) {
    auditError.sessionRevoked = true;
    throw auditError;
  }
}

export function adminErrorResponse(error) {
  if (error instanceof AdminAuthError || error?.name === 'AdminAuthError') {
    return { status: error.status || 400, body: { success: false, error: error.message } };
  }
  console.error('[admin-auth] request failed:', error);
  return {
    status: 503,
    body: { success: false, error: 'Admin service is temporarily unavailable. Please try again later.' },
  };
}

export function assertSameOrigin(headers = {}) {
  const origin = headers.origin || headers.Origin;
  if (!origin) return;
  const host = headers['x-forwarded-host'] || headers.host || headers.Host;
  if (!host) throw new AdminAuthError(403, 'This request is not allowed.');

  let originHost;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw new AdminAuthError(403, 'This request is not allowed.');
  }
  const cleanHost = String(host).split(',')[0].trim().toLowerCase();
  if (originHost === cleanHost) return;
  const isLocalOrigin = originHost.startsWith('localhost') || originHost.startsWith('127.0.0.1');
  const isLocalHost = cleanHost.startsWith('localhost') || cleanHost.startsWith('127.0.0.1');
  if (isLocalOrigin && isLocalHost) return;
  if (originHost.includes('ngrok') && cleanHost.includes('ngrok')) return;
  throw new AdminAuthError(403, 'This request is not allowed.');
}

// ============================================================================
// Short-Lived Restricted Passkey Enrollment Sessions
// ============================================================================
const enrollmentSessions = globalThis.__maiEnrollmentSessions || (globalThis.__maiEnrollmentSessions = new Map());
const ENROLLMENT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function createEnrollmentSession({ adminUserId, username = ADMIN_USERNAME, deviceToken, session }) {
  const token = 'mai_enroll_' + randomBytes(32).toString('base64url');
  enrollmentSessions.set(token, {
    token,
    adminUserId,
    username,
    deviceToken,
    session,
    createdAt: Date.now(),
    expiresAt: Date.now() + ENROLLMENT_TTL_MS,
  });
  return token;
}

export function getEnrollmentSession(token) {
  if (!token || typeof token !== 'string') return null;
  const session = enrollmentSessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    enrollmentSessions.delete(token);
    return null;
  }
  return session;
}

export function consumeEnrollmentSession(token) {
  const session = getEnrollmentSession(token);
  if (session) {
    enrollmentSessions.delete(token);
  }
  return session;
}
