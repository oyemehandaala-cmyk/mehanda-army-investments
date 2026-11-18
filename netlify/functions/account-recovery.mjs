import {
  accountRecoveryErrorResponse,
  accountRecoveryRequest,
} from '../../server/accountRecovery.js';

export default async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: 'Method not allowed.' }),
    };
  }

  try {
    const result = await accountRecoveryRequest(
      event.headers.authorization || event.headers.Authorization,
      JSON.parse(event.body || '{}')
    );
    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    const result = accountRecoveryErrorResponse(error);
    return {
      statusCode: result.status,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
      body: JSON.stringify(result.body),
    };
  }
}
