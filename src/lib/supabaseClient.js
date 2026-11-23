import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfigurationIssue } from './supabaseKey.js';
import { getApiUrl } from './apiConfig.js';

const DEFAULT_SUPABASE_URL = 'https://epjjsuousttlvlpjtnvs.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwampzdW91c3R0bHZscGp0bnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4OTE5NDAsImV4cCI6MjEwOTQ2Nzk0MH0.AnzmwC6uI2SNNxME07i7FOpMwurS470iK2fHdV5z61Q';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || (typeof process !== 'undefined' && process.env) || {};
const rawSupabaseUrl = env.VITE_SUPABASE_URL;
const rawPublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const rawLegacyAnonKey = env.VITE_SUPABASE_ANON_KEY;
const candidateKey = rawPublishableKey || rawLegacyAnonKey;

const supabaseUrl = (rawSupabaseUrl && getSupabaseConfigurationIssue(rawSupabaseUrl, DEFAULT_SUPABASE_KEY) === null)
  ? rawSupabaseUrl
  : DEFAULT_SUPABASE_URL;

const supabaseKey = (candidateKey && getSupabaseConfigurationIssue(DEFAULT_SUPABASE_URL, candidateKey) === null)
  ? candidateKey
  : DEFAULT_SUPABASE_KEY;

const supabaseKeyVariable = rawPublishableKey
  ? 'VITE_SUPABASE_PUBLISHABLE_KEY'
  : rawLegacyAnonKey
    ? 'VITE_SUPABASE_ANON_KEY'
    : 'DEFAULT_SUPABASE_KEY';
const configurationIssue = getSupabaseConfigurationIssue(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = () => {
  return configurationIssue === null;
};

export const getSupabaseConfigurationDiagnostic = () => ({
  configured: configurationIssue === null,
  issue: configurationIssue,
  publicKeyVariable: supabaseKeyVariable,
});

const browserSessionStorage = typeof window !== 'undefined' && window.sessionStorage
  ? window.sessionStorage
  : undefined;

// Clean up any legacy localStorage tokens from previous sessions to ensure
// new browser sessions always require explicit re-authentication per session rules
if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.removeItem === 'function') {
  try {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: browserSessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function toAuthenticatedUser(user) {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  const authProviders = [...new Set(identities.map((identity) => identity.provider).filter(Boolean))];
  const emailVerifiedAt = user?.email_confirmed_at || null;
  const phoneVerifiedAt = user?.phone_confirmed_at || null;

  return {
    id: user.id,
    fullName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Client Investor',
    email: user.email || null,
    phone: phoneVerifiedAt ? user.phone || '' : '',
    emailVerifiedAt,
    phoneVerifiedAt,
    googleVerified: Boolean(emailVerifiedAt && identities.some((identity) => identity.provider === 'google')),
    facebookVerified: Boolean(identities.some((identity) => identity.provider === 'facebook') || user?.app_metadata?.provider === 'facebook'),
    authProviders,
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    isRealAccount: true,
  };
}

export function getEmailActionRedirectUrl(authParam = 'reset-password') {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.startsWith('android-app://')) {
      return `${origin}/?auth=${authParam}`;
    }
  }
  return `https://mehandaarmy.net/?auth=${authParam}`;
}

/**
 * Real Authentication API Layer with clear error reporting
 */
export const authService = {
  isConfigured: isSupabaseConfigured,

  // Register real customer
  async signUp({ email, password, fullName, phone }) {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          message: 'Supabase backend is not configured yet. Configure the frontend Supabase URL and public key to activate live account registration.',
          isConfigError: true
        }
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getEmailActionRedirectUrl('verify-email'),
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // Real client login with password
  async signInWithPassword({ email, password }) {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          message: 'Supabase backend is not configured yet. Configure the frontend Supabase URL and public key to enable real client authentication.',
          isConfigError: true
        }
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // Redirect to Google through Supabase Auth; provider setup remains in Supabase.
  async signInWithGoogle() {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          message: 'Supabase is not configured. Configure the Supabase URL and public key before using Google sign-in.',
          isConfigError: true
        }
      };
    }

    try {
      return await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        }
      });
    } catch (error) {
      return { data: null, error };
    }
  },

  // Sign in using Google ID Token directly (Google Identity Services / One Tap).
  // This authenticates directly with "Mehanda Army Investments" branding, avoiding the Supabase subdomain on Google's prompt.
  async signInWithGoogleIdToken(idToken, nonce) {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          message: 'Supabase is not configured. Configure the Supabase URL and public key before using Google sign-in.',
          isConfigError: true
        }
      };
    }

    try {
      return await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
        nonce,
      });
    } catch (error) {
      return { data: null, error };
    }
  },

  // Redirect to Facebook through Supabase Auth; credentials remain securely in Supabase.
  async signInWithFacebook() {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          message: 'Supabase is not configured. Configure the Supabase URL and public key before using Facebook sign-in.',
          isConfigError: true
        }
      };
    }

    try {
      return await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: window.location.origin,
          scopes: 'email,public_profile',
        }
      });
    } catch (error) {
      return { data: null, error };
    }
  },

  async linkFacebookIdentity() {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase authentication is not configured.') };
    }
    try {
      return await supabase.auth.linkIdentity({
        provider: 'facebook',
        options: {
          redirectTo: window.location.origin,
          scopes: 'email,public_profile',
        },
      });
    } catch (error) {
      return { data: null, error };
    }
  },

  async linkGoogleIdentity() {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase authentication is not configured.') };
    }
    try {
      return await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      });
    } catch (error) {
      return { data: null, error };
    }
  },

  async signInWithPhoneOtp(phone) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase authentication is not configured.') };
    }
    try {
      return await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: true, channel: 'sms' },
      });
    } catch (error) {
      return { data: null, error };
    }
  },

  async verifyPhoneOtp(phone, token) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase authentication is not configured.') };
    }
    try {
      return await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    } catch (error) {
      return { data: null, error };
    }
  },

  async requestPhoneChange(phone) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase authentication is not configured.') };
    }
    try {
      return await supabase.auth.updateUser({ phone });
    } catch (error) {
      return { data: null, error };
    }
  },

  async verifyPhoneChangeOtp(phone, token) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase authentication is not configured.') };
    }
    try {
      return await supabase.auth.verifyOtp({ phone, token, type: 'phone_change' });
    } catch (error) {
      return { data: null, error };
    }
  },

  // Real client login with Email OTP
  async signInWithOtp({ email }) {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          message: 'Supabase backend is not configured yet. Please configure your Supabase project keys to send live email OTPs.',
          isConfigError: true
        }
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // Verify OTP (email/sms/recovery) or token_hash (from password recovery email link)
  async verifyOtp({ token_hash, email, token, phone, type = 'email' }) {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          message: 'Supabase backend is not configured yet.',
          isConfigError: true
        }
      };
    }

    try {
      if (token_hash) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type || 'recovery',
        });
        return { data, error };
      }
      if (phone) {
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token,
          type: type || 'sms',
        });
        return { data, error };
      }
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: type || 'email',
      });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // Request password reset
  async resetPassword(email) {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          message: 'Supabase backend is not configured yet. Configure your keys to enable secure password reset emails.',
          isConfigError: true
        }
      };
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const targetRedirect = getEmailActionRedirectUrl('reset-password');

    // Verify account existence and dispatch recovery email via reliable server-side delivery
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const resetRes = await fetch(getApiUrl('/api/verify-account-exists'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            action: 'request-reset',
            redirectTo: targetRedirect,
          }),
        });
        const resetData = await resetRes.json().catch(() => ({}));

        if (resetRes.status === 404 || resetData.exists === false) {
          return {
            data: null,
            error: {
              message: resetData.error || 'No account found with this email address. Please check your email or create a new account.',
              isAccountNotFound: true,
              code: 'account_not_found',
            },
          };
        }

        if (resetRes.ok && resetData.success) {
          return { data: resetData, error: null };
        }

        if (!resetRes.ok && resetData.error) {
          return { data: null, error: new Error(resetData.error) };
        }
      }
    } catch (checkErr) {
      console.warn('[authService] server reset request warning, falling back to direct auth:', checkErr?.message || checkErr);
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: targetRedirect,
      });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },



  // Sign out
  async signOut() {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase authentication is not configured.') };
    }
    return await supabase.auth.signOut();
  },

  onAuthStateChange(callback) {
    if (!isSupabaseConfigured()) return { unsubscribe() {} };
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data.subscription;
  },

  // Ask Supabase to validate the access token rather than trusting cached session data.
  async getCurrentUser() {
    if (!isSupabaseConfigured()) {
      return { user: null, error: new Error('Supabase authentication is not configured.') };
    }
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user || null, error };
  },

  async getAccessToken() {
    if (!isSupabaseConfigured()) return { accessToken: null, error: new Error('Supabase authentication is not configured.') };
    const { data, error } = await supabase.auth.getSession();
    return { accessToken: data?.session?.access_token || null, error };
  },

  async getCustomerPayments() {
    if (!isSupabaseConfigured()) return { receipts: [], error: new Error('Supabase is not configured.') };
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userError || !user) return { receipts: [], error: userError || new Error('Sign in to view your receipts.') };
      if (!user.email || !user.email_confirmed_at) {
        return { receipts: [], error: new Error('Verify your email address to view payment receipts.') };
      }

      const { data, error } = await supabase
        .from('service_payments')
        .select('receipt_number,order_id,payment_id,amount,currency,service_id,service_name,customer_name,customer_email,customer_phone,payment_method,status,is_live,verified_at')
        .eq('customer_email', user.email)
        .eq('status', 'verified')
        .order('verified_at', { ascending: false });
      if (error) return { receipts: [], error };
      return {
        receipts: (data || []).map((record) => ({
          receiptNumber: record.receipt_number,
          orderId: record.order_id,
          paymentId: record.payment_id,
          amount: Number(record.amount),
          currency: record.currency,
          serviceId: record.service_id,
          serviceName: record.service_name,
          customerName: record.customer_name,
          customerEmail: record.customer_email,
          customerPhone: record.customer_phone,
          paymentMethod: record.payment_method,
          status: record.status,
          isLive: record.is_live,
          verifiedAt: record.verified_at,
        })),
        error: null,
      };
    } catch (error) {
      return { receipts: [], error };
    }
  },

  async getCustomerNotifications() {
    if (!isSupabaseConfigured()) return { notifications: [], error: new Error('Supabase is not configured.') };
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userError || !user) return { notifications: [], error: userError || new Error('Sign in to view your notifications.') };

      const { data, error } = await supabase
        .from('customer_notifications')
        .select('id,title,message,notification_type,is_read,action_url,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return { notifications: [], error };

      return {
        notifications: (data || []).map((notification) => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.notification_type,
          isRead: notification.is_read,
          actionUrl: notification.action_url,
          createdAt: notification.created_at,
        })),
        error: null,
      };
    } catch (error) {
      return { notifications: [], error };
    }
  },

  async markCustomerNotificationsRead() {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase is not configured.') };
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userError || !user) return { error: userError || new Error('Sign in to update notifications.') };

      const { error } = await supabase
        .from('customer_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      return { error };
    } catch (error) {
      return { error };
    }
  },

  async getCustomerPortfolio(userId) {
    if (!isSupabaseConfigured()) return { portfolio: null, error: new Error('Supabase is not configured.') };
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id,account_number,risk_profile,total_invested,current_valuation,monthly_sip,last_rebalanced,created_at,updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      return { portfolio: data, error };
    } catch (error) {
      return { portfolio: null, error };
    }
  },

  async getCustomerTransactions(userId) {
    if (!isSupabaseConfigured()) return { transactions: [], error: new Error('Supabase is not configured.') };
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id,transaction_date,description,amount,transaction_type,status')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .limit(10);
      return { transactions: data || [], error };
    } catch (error) {
      return { transactions: [], error };
    }
  },

  // Get customer profile from DB
  async getProfile(userId) {
    if (!isSupabaseConfigured()) return { profile: null, error: new Error('Supabase is not configured.') };
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, contact_phone, email, avatar_url, auth_providers, date_of_birth, account_status, created_at, updated_at, phone_verified')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        return { profile: null, error };
      }

      if (data) {
        return { profile: data, error: null };
      }

      // If no profile record found in table, bootstrap from authenticated user session
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        return { profile: null, error: userError };
      }
      const currentUser = userData?.user;
      if (currentUser && currentUser.id === userId) {
        const identities = Array.isArray(currentUser.identities) ? currentUser.identities : [];
        const authProviders = [...new Set(identities.map((identity) => identity.provider).filter(Boolean))];
        const defaultName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Client Investor';
        const defaultAvatar = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null;
        const confirmedPhone = currentUser.phone_confirmed_at ? currentUser.phone : null;
        const unconfirmedPhone = currentUser.user_metadata?.phone || null;

        const bootstrappedProfile = {
          id: currentUser.id,
          full_name: defaultName,
          email: currentUser.email || null,
          phone: confirmedPhone,
          contact_phone: unconfirmedPhone,
          phone_verified: Boolean(confirmedPhone),
          avatar_url: defaultAvatar,
          auth_providers: authProviders,
          account_status: 'active',
        };

        // Attempt upsert so database record exists for future queries
        const { data: upsertedData, error: upsertError } = await supabase
          .from('profiles')
          .upsert(bootstrappedProfile, { onConflict: 'id' })
          .select('id, full_name, phone, contact_phone, email, avatar_url, auth_providers, date_of_birth, account_status, created_at, updated_at, phone_verified')
          .maybeSingle();

        if (!upsertError && upsertedData) {
          return { profile: upsertedData, error: null };
        }

        return {
          profile: {
            ...bootstrappedProfile,
            date_of_birth: null,
            created_at: currentUser.created_at || new Date().toISOString(),
            updated_at: currentUser.created_at || new Date().toISOString(),
          },
          error: upsertError || new Error('The saved customer profile could not be confirmed.'),
        };
      }

      return { profile: null, error: new Error('Customer profile not found.') };
    } catch (error) {
      return { profile: null, error };
    }
  },

  async updateProfile(userId, { fullName, contactPhone, dateOfBirth }) {
    if (!isSupabaseConfigured()) return { profile: null, error: new Error('Supabase is not configured.') };
    try {
      const updateData = {
        id: userId,
        full_name: fullName.trim(),
        contact_phone: contactPhone?.trim() || null,
        date_of_birth: dateOfBirth || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(updateData, { onConflict: 'id' })
        .select('id, full_name, phone, contact_phone, email, avatar_url, auth_providers, date_of_birth, account_status, created_at, updated_at, phone_verified')
        .maybeSingle();

      if (error) {
        // Fallback update if upsert RLS policy restricts insert
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            contact_phone: contactPhone?.trim() || null,
            date_of_birth: dateOfBirth || null,
          })
          .eq('id', userId)
          .select('id, full_name, phone, contact_phone, email, avatar_url, auth_providers, date_of_birth, account_status, created_at, updated_at, phone_verified')
          .maybeSingle();

        if (fallbackError) return { profile: null, error: fallbackError };
        return { profile: fallbackData, error: null };
      }

      return { profile: data, error: null };
    } catch (err) {
      return { profile: null, error: err };
    }
  },

  async requestAccountDeletion(action = 'status') {
    if (!isSupabaseConfigured()) return { data: null, error: new Error('Supabase is not configured.') };
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (sessionError || !accessToken) {
      return { data: null, error: sessionError || new Error('Sign in again to manage an account-deletion request.') };
    }

    try {
      const response = await fetch(getApiUrl('/api/account-deletion'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The account-deletion request could not be completed.');
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updatePassword(password) {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase is not configured.') };
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  },

  async requestAccountRecovery(action, payload = {}) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase is not configured.') };
    }
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data?.session?.access_token) {
      return { data: null, error: sessionError || new Error('Please use the verification link sent to your email.') };
    }
    try {
      const response = await fetch(getApiUrl('/api/account-recovery'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (action === 'status') {
          return { data: { hasRecoveryKey: false }, error: null };
        }
        throw new Error(result.error || 'Account recovery could not be completed.');
      }
      return { data: result, error: null };
    } catch (error) {
      if (action === 'status') {
        return { data: { hasRecoveryKey: false }, error: null };
      }
      return { data: null, error };
    }
  },

  async requestProfilePhoto(action) {
    if (!isSupabaseConfigured()) return { photoUrl: null, error: null };
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data?.session?.access_token) {
      return { photoUrl: null, error: null };
    }

    try {
      const response = await fetch(getApiUrl('/api/profile-photo'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        return { photoUrl: null, error: null };
      }
      const text = await response.text();
      try {
        const result = JSON.parse(text);
        return { photoUrl: result.photoUrl || null, error: null };
      } catch {
        return { photoUrl: null, error: null };
      }
    } catch {
      return { photoUrl: null, error: null };
    }
  },

  async uploadProfilePhoto(file) {
    if (!isSupabaseConfigured()) return { photoUrl: null, error: new Error('Supabase is not configured.') };
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data?.session?.user?.id) {
      return { photoUrl: null, error: sessionError || new Error('Please sign in again to manage your profile photo.') };
    }

    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(`${data.session.user.id}/upload`, file, {
        cacheControl: '0',
        contentType: file.type,
        upsert: true,
      });
    if (error) return { photoUrl: null, error };
    return this.requestProfilePhoto('process');
  },

  async removeProfilePhoto() {
    return this.requestProfilePhoto('remove');
  },

  // Get customer portfolio
  async getPortfolio(userId) {
    if (!isSupabaseConfigured()) return { portfolio: null, error: new Error('Supabase is not configured.') };
    const { data, error } = await supabase
      .from('portfolios')
      .select('*, transactions(*)')
      .eq('user_id', userId)
      .single();
    return { portfolio: data, error };
  }
};
