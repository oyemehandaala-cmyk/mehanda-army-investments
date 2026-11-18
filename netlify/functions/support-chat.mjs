import { handleSupportChatRequest, askGemini, getSmartFallbackResponse } from '../../server/supportChat.js';

export async function handler(event) {
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json'
  };

  let body = {};
  if (event.httpMethod === 'POST') {
    try {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64').toString('utf8')
        : event.body || '';
      if (rawBody.length > 16000) {
        return { statusCode: 413, headers, body: JSON.stringify({ success: false, error: 'Request body is too large.' }) };
      }
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'The request could not be read.' }) };
    }
  }

  const result = await handleSupportChatRequest({
    method: event.httpMethod,
    body,
    clientIp: event.requestContext?.identity?.sourceIp || event.clientContext?.ip || 'unknown',
    headers: event.headers || {}
  });
  return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
}

export { askGemini, getSmartFallbackResponse };


