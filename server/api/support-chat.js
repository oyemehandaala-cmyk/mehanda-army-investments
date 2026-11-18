import { handleSupportChatRequest, askGemini, getSmartFallbackResponse } from '../supportChat.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ success: false, error: 'The request could not be read.' });
    }
  }
  if (Buffer.byteLength(JSON.stringify(body || {}), 'utf8') > 16000) {
    return res.status(413).json({ success: false, error: 'Request body is too large.' });
  }

  const result = await handleSupportChatRequest({
    method: req.method,
    body,
    clientIp: req.socket?.remoteAddress || 'unknown',
    headers: req.headers
  });
  return res.status(result.status).json(result.body);
}

export { askGemini, getSmartFallbackResponse };


