import { findUserByEmail, dispatchPasswordResetEmail } from '../accountLookup.js';
import { normalizeEmail, isValidEmail } from '../emailOtpService.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const { email, action, redirectTo } = req.body || {};
  const cleanEmail = normalizeEmail(email);
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({
      success: false,
      exists: false,
      error: 'Please enter a valid Gmail / email address.',
    });
  }

  // Handle password reset dispatch if requested
  if (action === 'request-reset') {
    try {
      const result = await dispatchPasswordResetEmail({
        email: cleanEmail,
        redirectTo,
      });
      return res.status(result.status || (result.success ? 200 : 400)).json(result);
    } catch (err) {
      console.error('[verify-account-exists] reset dispatch error:', err?.message || err);
      return res.status(500).json({
        success: false,
        error: 'Unable to process password reset at this moment. Please try again.',
      });
    }
  }

  try {
    const lookup = await findUserByEmail({ email: cleanEmail });
    if (lookup.exists) {
      return res.status(200).json({
        success: true,
        exists: true,
        message: 'Account exists.',
        email: cleanEmail,
      });
    }

    return res.status(404).json({
      success: false,
      exists: false,
      error: 'No account found with this email address. Please check your email or create a new account.',
      email: cleanEmail,
    });
  } catch (err) {
    console.error('[verify-account-exists] error:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'Unable to check account status at this moment. Please try again.',
    });
  }
}


