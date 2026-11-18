import handler from '../../server/api/register-user.js';

export default async (req, context) => {
  let body = {};
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
  }

  let statusCode = 200;
  const headers = new Headers();
  let responseBody = '';

  const res = {
    status(code) {
      this.statusCode = code;
      statusCode = code;
      return this;
    },
    setHeader(k, v) {
      headers.set(k, v);
      return this;
    },
    json(data) {
      headers.set('Content-Type', 'application/json');
      responseBody = JSON.stringify(data);
      return this;
    },
  };

  await handler({ method: req.method, headers: Object.fromEntries(req.headers), body }, res);

  return new Response(responseBody, {
    status: statusCode,
    headers,
  });
};


