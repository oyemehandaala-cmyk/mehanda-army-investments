import { verifyEmailOtp } from '../emailOtpService.js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerKey } from '../supabaseServerKey.js';

export default async function handler(req, res, dependencies = {}) {
  const env = dependencies.env || process.env;
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    const { email, otp } = req.body || {};
    const authorization = req.headers.authorization || req.headers.Authorization || '';
    const bearerMatch = /^Bearer\s+([^\s]+)$/i.exec(authorization);
    let userId = null;

    if (bearerMatch) {
      const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
      const key = getSupabaseServerKey(env);
      if (url && key) {
        try {
          const client = createSupabaseClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          });
          const { data } = await client.auth.getUser(bearerMatch[1]);
          userId = data?.user?.id || null;
        } catch {}
      }
    }

    const result = await verifyEmailOtp({
      email,
      otp,
      userId,
      env,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 400;
    return res.status(status).json({
      success: false,
      error: error?.message || 'Verification failed.',
    });
  }
}

