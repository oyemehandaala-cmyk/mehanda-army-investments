import { handleStudentLoanDocumentRequest } from '../studentLoanEnquiries.js';
import { assertSameOrigin } from '../adminAuth.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['POST', 'GET', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    assertSameOrigin(req.headers);
    const bodyOrQuery = req.method === 'GET' ? req.query : req.body;
    const result = await handleStudentLoanDocumentRequest(
      req.method,
      bodyOrQuery,
      req.headers
    );
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The request could not be completed.';
    const status = Number.isInteger(error?.status) ? error.status : 400;
    return res.status(status).json({ success: false, error: message });
  }
}

