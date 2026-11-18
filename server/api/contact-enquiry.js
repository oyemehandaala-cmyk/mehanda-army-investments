import { handleContactEnquiry, handleUpdateContactEnquiry } from '../contactEnquiryHandler.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'POST') {
    try {
      const result = await handleContactEnquiry(req.body, req.headers);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const result = await handleUpdateContactEnquiry(req.body, req.headers);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}


