import { handleFarmLoanRequest } from '../../server/farmLoanServer.js';
import { assertSameOrigin } from '../../server/adminAuth.js';

export async function handler(event) {
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  };
  const method = event.httpMethod;

  if (!['GET', 'POST', 'PATCH'].includes(method)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed.' }),
    };
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || '';
    if (rawBody.length > 2_097_152) {
      throw new Error('Request body is too large.');
    }
    const body = rawBody ? JSON.parse(rawBody) : {};
    const requestHeaders = Object.fromEntries(
      Object.entries(event.headers || {}).map(([name, value]) => [name.toLowerCase(), value])
    );
    if (method === 'PATCH') {
      assertSameOrigin(requestHeaders);
    }
    const result = await handleFarmLoanRequest(
      method,
      body,
      event.queryStringParameters || {},
      requestHeaders
    );
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The request could not be completed.';
    const statusCode = Number.isInteger(error?.status)
      ? error.status
      : /not found/i.test(message)
        ? 404
        : /method not allowed/i.test(message)
          ? 405
          : /request body is too large/i.test(message)
            ? 413
            : 400;
    return {
      statusCode,
      headers,
      body: JSON.stringify({ success: false, error: message }),
    };
  }
}

