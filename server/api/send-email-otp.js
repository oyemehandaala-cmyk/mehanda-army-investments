import { sendEmailOtp } from '../emailOtpService.js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerKey } from '../supabaseServerKey.js';

export default async function handler(req, res, dependencies = {}) {
  const env = dependencies.env || process.env;
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    const { email, purpose } = req.body || {};
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

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    const result = await sendEmailOtp({
      email,
      userId,
      purpose: purpose || 'Application Verification',
      clientIp,
      env,
      fetchImpl: dependencies.fetchImpl,
      sendEmailFn: dependencies.sendEmailFn,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 400;
    return res.status(status).json({
      success: false,
      error: error?.message || 'Failed to send verification code.',
    });
  }
}

