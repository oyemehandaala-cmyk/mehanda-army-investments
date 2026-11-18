export function createApiHandler(apiHandler) {
  return async function handler(event) {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || '';
    let body;

    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        };
      }
    }

    const headers = Object.fromEntries(
      Object.entries(event.headers || {}).map(([name, value]) => [name.toLowerCase(), value])
    );
    let statusCode = 200;
    let responseBody = '';
    const responseHeaders = {};
    const response = {
      setHeader(name, value) {
        responseHeaders[name] = value;
        return this;
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(value) {
        responseBody = JSON.stringify(value);
        return this;
      },
    };

    await apiHandler({
      method: event.httpMethod,
      headers,
      body,
      rawBody: event.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64').toString('utf8')
        : event.body || '',
    }, response);

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...responseHeaders,
      },
      body: responseBody,
    };
  };
}
