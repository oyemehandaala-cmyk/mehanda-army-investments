import { handleStudentLoanDemoRequest } from '../server/paymentServer.js';
import { assertSameOrigin } from '../server/adminAuth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    if (req.method === 'PATCH' || req.method === 'DELETE') {
      assertSameOrigin(req.headers);
    }
    const result = await handleStudentLoanDemoRequest(
      req.method,
      req.body,
      req.query,
      req.headers
    );
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The request could not be completed.';
    const status = Number.isInteger(error?.status)
      ? error.status
      : /not found/i.test(message)
        ? 404
        : /method not allowed/i.test(message)
          ? 405
          : 400;
    return res.status(status).json({ success: false, error: message });
  }
}
