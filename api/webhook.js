import { handleWebhook } from '../server/paymentServer.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-razorpay-signature'];
    const result = await handleWebhook(req.rawBody || req.body, signature);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, error: err.message });
  }
}
