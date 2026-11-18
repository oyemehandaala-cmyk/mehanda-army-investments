import { handleStudentLoanDocumentRequest } from '../../server/studentLoanEnquiries.js';
import { assertSameOrigin } from '../../server/adminAuth.js';

export async function handler(event) {
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  };
  if (!['POST', 'GET', 'DELETE'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed.' }),
    };
  }

  try {
    let bodyOrQuery = {};
    if (event.httpMethod === 'GET') {
      bodyOrQuery = event.queryStringParameters || {};
    } else {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64').toString('utf8')
        : event.body || '';
      if (Buffer.byteLength(rawBody, 'utf8') > 10_000_000) {
        return {
          statusCode: 413,
          headers,
          body: JSON.stringify({ success: false, error: 'The document file is too large.' }),
        };
      }
      bodyOrQuery = rawBody ? JSON.parse(rawBody) : {};
    }

    const requestHeaders = Object.fromEntries(
      Object.entries(event.headers || {}).map(([name, value]) => [name.toLowerCase(), value])
    );
    assertSameOrigin(requestHeaders);
    const result = await handleStudentLoanDocumentRequest(
      event.httpMethod,
      bodyOrQuery,
      requestHeaders
    );
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The request could not be completed.';
    const statusCode = Number.isInteger(error?.status) ? error.status : 400;
    return {
      statusCode,
      headers,
      body: JSON.stringify({ success: false, error: message }),
    };
  }
}
