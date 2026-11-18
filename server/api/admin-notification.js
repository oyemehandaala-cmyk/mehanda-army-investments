import { handleAdminNotificationRequest } from '../statusNotificationService.js';
import { adminErrorResponse } from '../adminAuth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await handleAdminNotificationRequest({
      method: req.method,
      query: req.query || {},
      body: req.body || {},
      headers: req.headers,
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    const result = adminErrorResponse(err);
    return res.status(result.status).json(result.body);
  }
}


