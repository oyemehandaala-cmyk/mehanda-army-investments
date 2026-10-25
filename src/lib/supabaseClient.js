import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder')
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

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
          message: 'Supabase backend is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to activate live account registration.',
          isConfigError: true
        }
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
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
          message: 'Supabase backend is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables to enable real client authentication.',
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

  // Verify OTP
  async verifyOtp({ email, token, type = 'email' }) {
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
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
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

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // Sign out
  async signOut() {
    if (!isSupabaseConfigured()) return { error: null };
    return await supabase.auth.signOut();
  },

  // Get active session
  async getSession() {
    if (!isSupabaseConfigured()) return { session: null };
    const { data } = await supabase.auth.getSession();
    return data;
  },

  // Get customer profile from DB
  async getProfile(userId) {
    if (!isSupabaseConfigured()) return { profile: null };
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { profile: data, error };
  },

  // Get customer portfolio
  async getPortfolio(userId) {
    if (!isSupabaseConfigured()) return { portfolio: null };
    const { data, error } = await supabase
      .from('portfolios')
      .select('*, transactions(*)')
      .eq('user_id', userId)
      .single();
    return { portfolio: data, error };
  }
};
