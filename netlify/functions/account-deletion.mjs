import {
  customerAccountErrorResponse,
  customerAccountRequest,
} from '../../server/customerAccount.js';

export async function handler(event) {
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed.' }),
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'The request could not be read.' }),
      };
    }
    const authorization = event.headers?.authorization || event.headers?.Authorization;
    const result = await customerAccountRequest(authorization, body);
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    const result = customerAccountErrorResponse(error);
    return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
  }
}
