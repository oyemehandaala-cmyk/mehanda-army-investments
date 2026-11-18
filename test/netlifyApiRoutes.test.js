import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { handler as adminHandler } from '../netlify/functions/admin.mjs';
import { handler as adminAuthHandler } from '../netlify/functions/admin-auth.mjs';
import { handler as adminPasskeyHandler } from '../netlify/functions/admin-passkey.mjs';
import { handler as adminSecurityHandler } from '../netlify/functions/admin-security.mjs';
import { handler as createOrderHandler } from '../netlify/functions/create-order.mjs';
import { handler as investmentEnquiryHandler } from '../netlify/functions/investment-enquiry.mjs';
import { handler as supportChatHandler } from '../netlify/functions/support-chat.mjs';
import { handler as verifyPaymentHandler } from '../netlify/functions/verify-payment.mjs';
import { handler as webhookHandler } from '../netlify/functions/webhook.mjs';
import { createApiHandler } from '../netlify/api-handler-adapter.mjs';

const postOnlyFunctions = [
  ['create-order', createOrderHandler],
  ['verify-payment', verifyPaymentHandler],
  ['webhook', webhookHandler],
  ['investment-enquiry', investmentEnquiryHandler],
];

test('Netlify production API redirects precede the SPA fallback', async () => {
  const configPath = fileURLToPath(new URL('../netlify.toml', import.meta.url));
  const config = await readFile(configPath, 'utf8');
  const fallbackIndex = config.indexOf('from = "/*"');

  for (const route of [
    'create-order',
    'verify-payment',
    'webhook',
    'investment-enquiry',
    'support-chat',
    'account-deletion',
    'admin-auth',
    'admin-passkey',
    'admin-security',
    'admin',
    'farm-loans',
  ]) {
    const redirectIndex = config.indexOf(`from = "/api/${route}"`);

    assert.notEqual(redirectIndex, -1, `missing redirect for ${route}`);
    assert.ok(redirectIndex < fallbackIndex, `${route} redirect must precede SPA fallback`);
    assert.ok(config.includes(`to = "/.netlify/functions/${route}"`));
  }
});

test('support-chat Netlify function serves real provider status instead of a demo response', async (t) => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousConsoleError = console.error;
  const errorLogs = [];
  delete process.env.GEMINI_API_KEY;
  console.error = (...args) => errorLogs.push(args);
  t.after(() => {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    console.error = previousConsoleError;
  });

  const response = await supportChatHandler({ httpMethod: 'GET', headers: {}, body: '' });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.provider, 'google-gemini');
  assert.equal(body.configured, false);
  assert.equal(body.mode, 'unavailable');
  assert.notEqual(body.mode, 'demo');
  assert.deepEqual(errorLogs, []);
});

for (const [name, handler] of postOnlyFunctions) {
  test(`${name} Netlify function preserves the handler's method rejection`, async () => {
    const response = await handler({ httpMethod: 'GET', headers: {}, body: '' });

    assert.equal(response.statusCode, 405);
    assert.deepEqual(JSON.parse(response.body), {
      success: false,
      error: 'Method not allowed',
    });
  });
}

test('admin Netlify function preserves the handler method rejection', async () => {
  const response = await adminHandler({ httpMethod: 'POST', headers: {}, body: '{}' });

  assert.equal(response.statusCode, 405);
  assert.deepEqual(JSON.parse(response.body), {
    success: false,
    error: 'Method not allowed',
  });
});

test('admin auth Netlify function rejects unsupported methods', async () => {
  const response = await adminAuthHandler({ httpMethod: 'PUT', headers: {}, body: '' });
  assert.equal(response.statusCode, 405);
  assert.deepEqual(JSON.parse(response.body), {
    success: false,
    error: 'Method not allowed.',
  });
});

test('admin passkey Netlify function rejects unsupported methods', async () => {
  const response = await adminPasskeyHandler({ httpMethod: 'PUT', headers: {}, body: '' });
  assert.equal(response.statusCode, 405);
  assert.deepEqual(JSON.parse(response.body), {
    success: false,
    error: 'Method not allowed.',
  });
});

test('admin security Netlify function rejects unsupported methods', async () => {
  const response = await adminSecurityHandler({ httpMethod: 'PUT', headers: {}, body: '' });
  assert.equal(response.statusCode, 405);
  assert.deepEqual(JSON.parse(response.body), {
    success: false,
    error: 'Method not allowed.',
  });
});

test('Netlify adapter passes decoded JSON bodies and normalized headers through existing handlers', async () => {
  const handler = createApiHandler(async (request, response) => {
    assert.equal(request.method, 'POST');
    assert.deepEqual(request.body, { orderId: 'order-123' });
    assert.equal(request.headers['x-razorpay-signature'], 'signature');
    response.status(202).json({ accepted: true });
  });

  const response = await handler({
    httpMethod: 'POST',
    headers: { 'X-Razorpay-Signature': 'signature' },
    body: Buffer.from('{"orderId":"order-123"}').toString('base64'),
    isBase64Encoded: true,
  });

  assert.equal(response.statusCode, 202);
  assert.deepEqual(JSON.parse(response.body), { accepted: true });
});

test('Netlify adapter preserves secure response cookies from API handlers', async () => {
  const handler = createApiHandler(async (_request, response) => {
    response.setHeader('Set-Cookie', 'mai_admin_session=token; HttpOnly; SameSite=Strict');
    response.status(200).json({ success: true });
  });

  const response = await handler({ httpMethod: 'POST', headers: {}, body: '{}' });
  assert.equal(response.headers['Set-Cookie'], 'mai_admin_session=token; HttpOnly; SameSite=Strict');
  assert.equal(response.headers['Cache-Control'], 'no-store');
});
