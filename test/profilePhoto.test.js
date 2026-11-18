import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  normalizeProfilePhoto,
  profilePhotoErrorResponse,
  profilePhotoRequest,
} from '../server/profilePhoto.js';

test('profile photo processing accepts and normalizes supported image formats', async () => {
  for (const format of ['jpeg', 'png', 'webp']) {
    const input = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#00c995' },
    })[format]().toBuffer();
    const normalized = await normalizeProfilePhoto(input);
    assert.equal((await sharp(normalized).metadata()).format, 'webp');
  }
});

test('profile photo processing rejects malformed and oversized images', async () => {
  await assert.rejects(
    normalizeProfilePhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
    (error) => profilePhotoErrorResponse(error).status === 400
  );
  await assert.rejects(
    normalizeProfilePhoto(Buffer.alloc(5 * 1024 * 1024 + 1)),
    (error) => profilePhotoErrorResponse(error).status === 413
  );
});

test('profile photo API rejects requests without a bearer token', async () => {
  await assert.rejects(
    profilePhotoRequest('', { action: 'get' }),
    (error) => profilePhotoErrorResponse(error).status === 401
  );
});

test('verified phone-only users can access their private profile photo', async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://auth-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-key';
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify({
        id: 'phone-user',
        email_confirmed_at: null,
        phone_confirmed_at: '2026-01-01T00:00:00.000Z',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/storage/v1/object/sign/profile-photos/')) {
      return new Response(JSON.stringify({ signedURL: '/object/sign/profile-photos/phone-user/avatar.webp?token=test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const result = await profilePhotoRequest('Bearer test-user-token', { action: 'get' });
    assert.match(result.photoUrl, /avatar\.webp/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
  }
});
