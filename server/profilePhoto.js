import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { getSupabaseServerKey } from './supabaseServerKey.js';

const BUCKET = 'profile-photos';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60;

class ProfilePhotoError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = getSupabaseServerKey();
  if (!url || !serviceRoleKey) {
    throw new Error('Profile photo service is missing server-side Supabase configuration.');
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readToken(authorization) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization || '');
  if (!match) throw new ProfilePhotoError(401, 'Sign in to manage your profile photo.');
  return match[1];
}

export async function normalizeProfilePhoto(input) {
  if (input.length === 0 || input.length > MAX_UPLOAD_BYTES) {
    throw new ProfilePhotoError(413, 'Profile photos must be no larger than 5 MB.');
  }

  let image;
  let metadata;
  try {
    image = sharp(input, { failOn: 'error', limitInputPixels: 16_777_216, sequentialRead: true });
    metadata = await image.metadata();
  } catch {
    throw new ProfilePhotoError(400, 'The uploaded file is not a valid image.');
  }

  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || !metadata.width || !metadata.height) {
    throw new ProfilePhotoError(415, 'Only valid JPG, PNG, and WebP images are supported.');
  }

  try {
    return await image
      .rotate()
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ProfilePhotoError(400, 'The uploaded image could not be processed.');
  }
}

async function createPhotoUrl(client, userId) {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(
    `${userId}/avatar.webp`,
    SIGNED_URL_SECONDS
  );
  if (error) {
    if (error.statusCode === '404' || error.status === 404 || /not found/i.test(error.message || '')) {
      return null;
    }
    throw error;
  }
  return data.signedUrl;
}

export async function profilePhotoRequest(authorization, payload) {
  const token = readToken(authorization);
  const client = createAdminClient();
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData?.user) {
    throw new ProfilePhotoError(401, 'Your session is invalid or expired. Please sign in again.');
  }
  if (!authData.user.email_confirmed_at && !authData.user.phone_confirmed_at) {
    throw new ProfilePhotoError(403, 'Verify your email address or phone number before managing profile photos.');
  }

  const userId = authData.user.id;
  if (payload?.action === 'get') {
    return { photoUrl: await createPhotoUrl(client, userId) };
  }

  if (payload?.action === 'remove') {
    const { error } = await client.storage.from(BUCKET).remove([
      `${userId}/avatar.webp`,
      `${userId}/upload`,
    ]);
    if (error) throw error;
    return { photoUrl: null };
  }

  if (payload?.action !== 'process') {
    throw new ProfilePhotoError(400, 'Unsupported profile photo action.');
  }

  const { data: upload, error: downloadError } = await client.storage
    .from(BUCKET)
    .download(`${userId}/upload`);
  if (downloadError) {
    if (downloadError.statusCode === '404' || downloadError.status === 404) {
      throw new ProfilePhotoError(400, 'Upload an image before processing it.');
    }
    throw downloadError;
  }

  const input = Buffer.from(await upload.arrayBuffer());
  let normalizedImage;
  try {
    normalizedImage = await normalizeProfilePhoto(input);
  } catch (error) {
    await client.storage.from(BUCKET).remove([`${userId}/upload`]);
    throw error;
  }

  const { error: uploadError } = await client.storage.from(BUCKET).upload(
    `${userId}/avatar.webp`,
    normalizedImage,
    { contentType: 'image/webp', upsert: true, cacheControl: '3600' }
  );
  if (uploadError) throw uploadError;

  const { error: cleanupError } = await client.storage.from(BUCKET).remove([`${userId}/upload`]);
  if (cleanupError) throw cleanupError;
  return { photoUrl: await createPhotoUrl(client, userId) };
}

export function profilePhotoErrorResponse(error) {
  if (error instanceof ProfilePhotoError) {
    return { status: error.status, body: { error: error.message } };
  }
  console.error('Profile photo request failed:', error);
  return { status: 500, body: { error: 'The profile photo service could not complete the request.' } };
}
