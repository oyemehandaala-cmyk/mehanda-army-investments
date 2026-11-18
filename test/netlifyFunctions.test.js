import assert from 'node:assert/strict';
import test from 'node:test';
import accountRecoveryHandler from '../netlify/functions/account-recovery.mjs';

test('account recovery Netlify function rejects unsupported methods instead of returning not found', async () => {
  const response = await accountRecoveryHandler({
    httpMethod: 'GET',
    headers: {},
    body: '',
  });

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'POST');
  assert.deepEqual(JSON.parse(response.body), { error: 'Method not allowed.' });
});

test('account recovery Netlify function routes POST requests to authenticated handler', async () => {
  const response = await accountRecoveryHandler({
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({ action: 'status' }),
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), {
    error: 'Use the verification link sent to your email.',
  });
});
