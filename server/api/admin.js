import { handleAdminData } from '../paymentServer.js';
import { adminErrorResponse } from '../adminAuth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await handleAdminData(req.headers);
    return res.status(200).json(result);
  } catch (err) {
    const result = adminErrorResponse(err);
    return res.status(result.status).json(result.body);
  }
}

