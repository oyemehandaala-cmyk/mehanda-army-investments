import { handleRegisterUser } from '../server/registerUserService.js';

export default async function handler(req, res, dependencies = {}) {
  const env = dependencies.env || process.env;
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    const result = await handleRegisterUser(req.body, {
      env,
      createClient: dependencies.createClient,
      sendEmailFn: dependencies.sendEmailFn,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 400;
    return res.status(status).json({
      success: false,
      error: error?.message || 'Registration failed. Please try again.',
    });
  }
}

