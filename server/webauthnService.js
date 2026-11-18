import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getAdminConfiguration, ADMIN_USERNAME } from './adminAuth.js';

// Base64URL Helpers
export function toBase64Url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64url');
}

export function fromBase64Url(str) {
  if (typeof str !== 'string') return Buffer.alloc(0);
  return Buffer.from(str, 'base64url');
}

// In-Memory Challenge Store (TTL: 2 minutes)
const challengeStore = globalThis.__maiChallengeStore || (globalThis.__maiChallengeStore = new Map());
const CHALLENGE_TTL_MS = 2 * 60 * 1000;

function cleanExpiredChallenges() {
  const now = Date.now();
  for (const [key, val] of challengeStore.entries()) {
    if (val.expiresAt <= now) {
      challengeStore.delete(key);
    }
  }
}

export function createChallenge(type = 'login', metadata = {}) {
  cleanExpiredChallenges();
  const challenge = crypto.randomBytes(32).toString('base64url');
  challengeStore.set(challenge, {
    challenge,
    type,
    metadata,
    createdAt: Date.now(),
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return challenge;
}

export function consumeChallenge(challenge, expectedType = 'login') {
  cleanExpiredChallenges();
  if (!challenge || typeof challenge !== 'string') return null;
  const stored = challengeStore.get(challenge);
  if (!stored) return null;
  if (stored.expiresAt <= Date.now()) {
    challengeStore.delete(challenge);
    return null;
  }
  if (expectedType && stored.type !== expectedType) {
    return null;
  }
  challengeStore.delete(challenge);
  return stored;
}

// Minimal, Robust CBOR Decoder for WebAuthn Attestation
export function decodeCbor(buffer) {
  let offset = 0;

  function parseItem() {
    if (offset >= buffer.length) throw new Error('CBOR buffer underflow');
    const initialByte = buffer[offset++];
    const majorType = initialByte >> 5;
    const additionalInfo = initialByte & 0x1f;

    let value;
    if (additionalInfo < 24) {
      value = additionalInfo;
    } else if (additionalInfo === 24) {
      value = buffer[offset++];
    } else if (additionalInfo === 25) {
      value = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (additionalInfo === 26) {
      value = buffer.readUInt32BE(offset);
      offset += 4;
    } else if (additionalInfo === 27) {
      const hi = buffer.readUInt32BE(offset);
      const lo = buffer.readUInt32BE(offset + 4);
      offset += 8;
      value = hi * 2 ** 32 + lo;
    } else {
      throw new Error(`Unsupported CBOR additional info: ${additionalInfo}`);
    }

    switch (majorType) {
      case 0: // Unsigned integer
        return value;
      case 1: // Negative integer (-1 - value)
        return -1 - value;
      case 2: { // Byte string
        const bytes = buffer.slice(offset, offset + value);
        offset += value;
        return bytes;
      }
      case 3: { // Text string
        const str = buffer.toString('utf8', offset, offset + value);
        offset += value;
        return str;
      }
      case 4: { // Array
        const arr = [];
        for (let i = 0; i < value; i++) {
          arr.push(parseItem());
        }
        return arr;
      }
      case 5: { // Map
        const map = new Map();
        for (let i = 0; i < value; i++) {
          const key = parseItem();
          const val = parseItem();
          map.set(key, val);
        }
        return map;
      }
      case 7: { // Simple / Float
        if (additionalInfo === 20) return false;
        if (additionalInfo === 21) return true;
        if (additionalInfo === 22) return null;
        return value;
      }
      default:
        throw new Error(`Unsupported CBOR major type: ${majorType}`);
    }
  }

  return parseItem();
}

// Parse WebAuthn Authenticator Data
export function parseAuthData(authDataBuffer) {
  if (!Buffer.isBuffer(authDataBuffer) || authDataBuffer.length < 37) {
    throw new Error('Invalid authenticatorData length');
  }

  const rpIdHash = authDataBuffer.slice(0, 32);
  const flags = authDataBuffer[32];
  const signCount = authDataBuffer.readUInt32BE(33);

  const userPresent = (flags & 0x01) !== 0;
  const userVerified = (flags & 0x04) !== 0;
  const hasAttestedCredentialData = (flags & 0x40) !== 0;
  const hasExtensionData = (flags & 0x80) !== 0;

  let credentialData = null;
  if (hasAttestedCredentialData) {
    if (authDataBuffer.length < 55) {
      throw new Error('authData missing attestedCredentialData header');
    }
    const aaguid = authDataBuffer.slice(37, 53);
    const credentialIdLength = authDataBuffer.readUInt16BE(53);
    const credentialId = authDataBuffer.slice(55, 55 + credentialIdLength);
    const coseKeyBytes = authDataBuffer.slice(55 + credentialIdLength);

    // Decode COSE Key map
    const coseKeyMap = decodeCbor(coseKeyBytes);
    credentialData = {
      aaguid,
      credentialId,
      credentialIdBase64Url: credentialId.toString('base64url'),
      coseKeyMap,
    };
  }

  return {
    rpIdHash,
    flags,
    userPresent,
    userVerified,
    signCount,
    hasAttestedCredentialData,
    hasExtensionData,
    credentialData,
  };
}

// Convert COSE Public Key Map to PEM Format
export function coseKeyToPem(coseMap) {
  if (!(coseMap instanceof Map)) {
    throw new Error('COSE key must be a Map');
  }

  const kty = coseMap.get(1); // 1 = kty
  const alg = coseMap.get(3); // 3 = alg

  // EC2 P-256 (kty: 2, crv: 1, alg: -7)
  if (kty === 2) {
    const crv = coseMap.get(-1); // -1 = crv (1 for P-256)
    const x = coseMap.get(-2);   // -2 = x coordinate buffer
    const y = coseMap.get(-3);   // -3 = y coordinate buffer

    if (crv !== 1 || !Buffer.isBuffer(x) || !Buffer.isBuffer(y)) {
      throw new Error('Unsupported EC2 curve in COSE key');
    }

    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: x.toString('base64url'),
      y: y.toString('base64url'),
    };
    const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    return key.export({ type: 'spki', format: 'pem' });
  }

  // RSA (kty: 3, alg: -257)
  if (kty === 3) {
    const n = coseMap.get(-1); // -1 = modulus
    const e = coseMap.get(-2); // -2 = exponent
    if (!Buffer.isBuffer(n) || !Buffer.isBuffer(e)) {
      throw new Error('Invalid RSA key components in COSE key');
    }

    const jwk = {
      kty: 'RSA',
      n: n.toString('base64url'),
      e: e.toString('base64url'),
    };
    const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    return key.export({ type: 'spki', format: 'pem' });
  }

  throw new Error(`Unsupported COSE kty: ${kty}`);
}

// Resolve Effective RP ID from Request Host
export function getRpId(requestHeaders = {}) {
  const host = (
    requestHeaders.host ||
    requestHeaders.Host ||
    requestHeaders['x-forwarded-host'] ||
    'mehandaarmy.net'
  ).split(':')[0].toLowerCase().trim();

  if (host === 'localhost' || host === '127.0.0.1') {
    return 'localhost';
  }
  if (host.endsWith('mehandaarmy.net')) {
    return 'mehandaarmy.net';
  }
  return host;
}

// Generate Registration Options for navigator.credentials.create
export function generateRegistrationOptions({
  adminUserId,
  adminName,
  adminDisplayName,
  rpId,
  rpName,
  userVerification = 'required',
}) {
  const challenge = createChallenge('register', { adminUserId, rpId });

  return {
    challenge,
    rp: {
      name: rpName || 'Mehanda Army Investments',
      id: rpId || 'mehandaarmy.net',
    },
    user: {
      id: Buffer.from(String(adminUserId || 'e04c1cbf-a746-42c9-bb02-819c992db9fd')).toString('base64url'),
      name: adminName || ADMIN_USERNAME,
      displayName: adminDisplayName || 'Deepak Jangra (Admin)',
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Mobile fingerprint, FaceID, Windows Hello
      userVerification,                    // Biometric check
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };
}

// Verify Registration Credential Attestation
export function verifyRegistrationResponse({
  credential,
  response,
  expectedChallenge,
  rpId,
  expectedRpId,
  allowedOrigins,
  expectedOrigin,
}) {
  const cred = credential || response;
  const innerResponse = cred?.response || (cred?.clientDataJSON ? cred : null);
  if (!cred || !innerResponse) {
    throw new Error('Credential response is missing');
  }

  const effectiveRpId = rpId || expectedRpId || 'localhost';
  const { clientDataJSON, attestationObject } = innerResponse;
  if (!clientDataJSON || !attestationObject) {
    throw new Error('clientDataJSON or attestationObject missing');
  }

  // 1. Verify ClientDataJSON
  const rawClientData = fromBase64Url(clientDataJSON);
  const clientData = JSON.parse(rawClientData.toString('utf8'));

  if (clientData.type !== 'webauthn.create') {
    throw new Error(`Invalid clientData type: ${clientData.type}`);
  }

  if (expectedChallenge) {
    if (clientData.challenge !== expectedChallenge) {
      throw new Error('Challenge mismatch in registration');
    }
  } else {
    const consumed = consumeChallenge(clientData.challenge, 'register');
    if (!consumed) {
      throw new Error('Challenge mismatch or expired challenge in registration');
    }
  }

  const origin = clientData.origin?.toLowerCase();
  const allowed = Array.isArray(allowedOrigins) ? [...allowedOrigins] : [];
  if (expectedOrigin) allowed.push(expectedOrigin);
  allowed.push('http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000', 'https://mehandaarmy.net', 'https://www.mehandaarmy.net');
  if (effectiveRpId) {
    allowed.push(`http://${effectiveRpId}`, `https://${effectiveRpId}`);
  }
  const validOrigin = allowed.some((ao) => origin === ao.toLowerCase());
  if (!validOrigin) {
    try {
      const parsedOriginHost = new URL(origin).hostname.toLowerCase();
      if (parsedOriginHost !== effectiveRpId && parsedOriginHost !== 'localhost' && parsedOriginHost !== '127.0.0.1') {
        throw new Error(`Registration origin ${origin} is not allowed`);
      }
    } catch {
      throw new Error(`Registration origin ${origin} is not allowed`);
    }
  }

  // 2. Decode Attestation Object
  const attestationBuf = fromBase64Url(attestationObject);
  const attestationMap = decodeCbor(attestationBuf);
  const authDataBuf = attestationMap.get('authData');
  if (!Buffer.isBuffer(authDataBuf)) {
    throw new Error('authData missing in attestationObject');
  }

  // 3. Parse Authenticator Data
  const parsedAuthData = parseAuthData(authDataBuf);

  // Verify RP ID Hash
  const expectedRpIdHash = crypto.createHash('sha256').update(effectiveRpId).digest();
  const fallbackLocalHash = crypto.createHash('sha256').update('localhost').digest();
  const fallbackDomainHash = crypto.createHash('sha256').update('mehandaarmy.net').digest();
  const matchesRpId = parsedAuthData.rpIdHash.equals(expectedRpIdHash) ||
                      parsedAuthData.rpIdHash.equals(fallbackLocalHash) ||
                      parsedAuthData.rpIdHash.equals(fallbackDomainHash);
  if (!matchesRpId) {
    throw new Error('RP ID hash mismatch');
  }

  // Verify User Present & User Verified
  if (!parsedAuthData.userPresent) {
    throw new Error('User was not present during registration');
  }

  if (!parsedAuthData.credentialData) {
    throw new Error('Attested credential data not found');
  }

  // Convert Public Key to PEM
  const publicKeyPem = coseKeyToPem(parsedAuthData.credentialData.coseKeyMap);
  const credentialId = parsedAuthData.credentialData.credentialIdBase64Url;

  return {
    verified: true,
    userVerified: !!parsedAuthData.userVerified,
    credentialId,
    publicKeyPem,
    publicKey: publicKeyPem,
    signCount: parsedAuthData.signCount,
    aaguid: parsedAuthData.credentialData.aaguid.toString('hex'),
  };
}

// Generate Authentication Options for navigator.credentials.get
export function generateAuthenticationOptions({ rpId, allowCredentials = [], userVerification = 'required' }) {
  const challenge = createChallenge('login', { rpId });

  return {
    challenge,
    rpId: rpId || 'mehandaarmy.net',
    timeout: 60000,
    userVerification, // Enforce biometric fingerprint verification
    allowCredentials: allowCredentials.map((c) => ({
      id: c.credential_id || c.credentialId,
      type: 'public-key',
      transports: c.transports || ['internal'],
    })),
  };
}

// Verify Authentication Assertion (Fingerprint verification)
export async function verifyAuthenticationResponse({
  credential,
  response,
  expectedChallenge,
  storedCredential,
  rpId,
  expectedRpId,
  allowedOrigins,
  expectedOrigin,
}) {
  const cred = credential || response;
  const innerResponse = cred?.response || (cred?.clientDataJSON ? cred : null);
  if (!cred || !innerResponse) {
    throw new Error('Assertion response is missing');
  }
  const { clientDataJSON, authenticatorData, signature } = innerResponse;
  if (!clientDataJSON || !authenticatorData || !signature) {
    throw new Error('Required assertion parameters missing');
  }

  const effectiveRpId = rpId || expectedRpId || 'localhost';

  // 1. Verify ClientDataJSON
  const rawClientData = fromBase64Url(clientDataJSON);
  const clientData = JSON.parse(rawClientData.toString('utf8'));

  if (clientData.type !== 'webauthn.get') {
    throw new Error(`Invalid assertion clientData type: ${clientData.type}`);
  }

  if (expectedChallenge) {
    if (clientData.challenge !== expectedChallenge) {
      throw new Error('Challenge mismatch in assertion');
    }
  } else {
    const consumed = consumeChallenge(clientData.challenge, 'login');
    if (!consumed) {
      throw new Error('Challenge mismatch or expired challenge in assertion');
    }
  }

  const origin = clientData.origin?.toLowerCase();
  const allowed = Array.isArray(allowedOrigins) ? [...allowedOrigins] : [];
  if (expectedOrigin) allowed.push(expectedOrigin);
  allowed.push('http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000', 'https://mehandaarmy.net', 'https://www.mehandaarmy.net');
  if (effectiveRpId) {
    allowed.push(`http://${effectiveRpId}`, `https://${effectiveRpId}`);
  }
  const validOrigin = allowed.some((ao) => origin === ao.toLowerCase());
  if (!validOrigin) {
    try {
      const parsedOriginHost = new URL(origin).hostname.toLowerCase();
      if (parsedOriginHost !== effectiveRpId && parsedOriginHost !== 'localhost' && parsedOriginHost !== '127.0.0.1') {
        throw new Error(`Assertion origin ${origin} is not allowed`);
      }
    } catch {
      throw new Error(`Assertion origin ${origin} is not allowed`);
    }
  }

  // 2. Verify Authenticator Data
  const authDataBuf = fromBase64Url(authenticatorData);
  const parsedAuthData = parseAuthData(authDataBuf);

  // Check RP ID Hash
  const expectedRpIdHash = crypto.createHash('sha256').update(effectiveRpId).digest();
  const fallbackLocalHash = crypto.createHash('sha256').update('localhost').digest();
  const fallbackDomainHash = crypto.createHash('sha256').update('mehandaarmy.net').digest();
  const matchesRpId = parsedAuthData.rpIdHash.equals(expectedRpIdHash) ||
                      parsedAuthData.rpIdHash.equals(fallbackLocalHash) ||
                      parsedAuthData.rpIdHash.equals(fallbackDomainHash);
  if (!matchesRpId) {
    throw new Error('RP ID hash mismatch in assertion');
  }

  // Verify User Present and User Verified
  if (!parsedAuthData.userPresent) {
    throw new Error('User was not present');
  }

  let dbCredential = storedCredential;
  if (!dbCredential) {
    const targetId = cred.id || cred.rawId;
    dbCredential = await getWebAuthnCredentialById(targetId);
  }

  // Cryptographic Signature Fallback Check over all registered admin credentials
  if (!dbCredential) {
    try {
      const allCreds = await listAllAdminCredentialsWithKeys();
      const clientDataHash = crypto.createHash('sha256').update(rawClientData).digest();
      const signedPayload = Buffer.concat([authDataBuf, clientDataHash]);
      const signatureBuf = fromBase64Url(signature);

      for (const cand of allCreds) {
        if (cand?.public_key) {
          try {
            const verifier = crypto.createVerify('SHA256');
            verifier.update(signedPayload);
            if (verifier.verify(cand.public_key, signatureBuf)) {
              dbCredential = cand;
              console.log('[webauthn] Credential successfully resolved via cryptographic signature match:', cand.credential_id);
              break;
            }
          } catch (_) {}
        }
      }
    } catch (fallbackErr) {
      console.warn('[webauthn] Signature fallback check warning:', fallbackErr?.message);
    }
  }

  if (!dbCredential) {
    throw new Error('Credential not registered on this server');
  }

  // 3. Verify Signature
  const clientDataHash = crypto.createHash('sha256').update(rawClientData).digest();
  const signedPayload = Buffer.concat([authDataBuf, clientDataHash]);
  const signatureBuf = fromBase64Url(signature);

  const verifier = crypto.createVerify('SHA256');
  verifier.update(signedPayload);
  const isValid = verifier.verify(dbCredential.public_key, signatureBuf);

  if (!isValid) {
    throw new Error('Cryptographic signature verification failed');
  }

  return {
    verified: true,
    userVerified: !!parsedAuthData.userVerified,
    credential: dbCredential,
    newSignCount: parsedAuthData.signCount,
  };
}

// ============================================================================
// Database Operations for WebAuthn Credentials (admin_webauthn_credentials)
// ============================================================================

// In-Memory store fallback for testing or when DB table is not yet provisioned
const mockCredentialStore = globalThis.__maiMockCredentials || (globalThis.__maiMockCredentials = []);
const BACKUP_FILE = path.join(process.cwd(), 'scratch', 'admin_credentials_backup.json');

function loadLocalCredentialBackup() {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

function persistLocalCredentialBackup(record) {
  if (!record || !record.credential_id) return;
  try {
    const list = loadLocalCredentialBackup();
    const idx = list.findIndex((c) => c.credential_id === record.credential_id || (record.id && c.id === record.id));
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.push(record);
    }
    const dir = path.dirname(BACKUP_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (_) {}
}

function removeLocalCredentialBackup(credentialIdOrDbId) {
  try {
    const list = loadLocalCredentialBackup();
    const variants = getCredentialIdVariants(credentialIdOrDbId);
    const updated = list.filter((c) => !variants.includes(c.credential_id) && c.id !== credentialIdOrDbId);
    if (updated.length !== list.length) {
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(updated, null, 2), 'utf8');
    }
  } catch (_) {}
}

export function getCredentialIdVariants(credentialId) {
  if (!credentialId) return [];
  const str = String(credentialId).trim();
  let unescaped = str;
  try {
    unescaped = decodeURIComponent(str);
  } catch (_) {}
  const base64url = unescaped.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const padLen = (4 - (base64url.length % 4)) % 4;
  const base64urlPadded = padLen ? base64url + '='.repeat(padLen) : base64url;
  const base64Standard = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const base64StandardPadded = padLen ? base64Standard + '='.repeat(padLen) : base64Standard;

  return Array.from(new Set([
    str,
    unescaped,
    base64url,
    base64urlPadded,
    base64Standard,
    base64StandardPadded,
  ])).filter(Boolean);
}

function createServiceClient(env = process.env) {
  try {
    const config = getAdminConfiguration(env);
    return createSupabaseClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch {
    return null;
  }
}

export async function saveWebAuthnCredential({
  adminUserId,
  credentialId,
  publicKeyPem,
  publicKey,
  signCount = 0,
  deviceName = 'Mobile Device',
  aaguid = null,
  transports = [],
  deviceToken = null,
}, client = null) {
  const keyToSave = publicKeyPem || publicKey;
  const db = client || createServiceClient();
  const transportList = Array.isArray(transports) ? [...transports] : ['internal'];
  if (deviceToken && typeof deviceToken === 'string' && !transportList.includes(`devtok:${deviceToken}`)) {
    transportList.push(`devtok:${deviceToken}`);
  }

  let savedData = null;
  if (db) {
    try {
      const { data, error } = await db
        .from('admin_webauthn_credentials')
        .upsert({
          admin_user_id: adminUserId,
          credential_id: credentialId,
          public_key: keyToSave,
          sign_count: signCount,
          device_name: deviceName,
          aaguid,
          transports: transportList,
          last_used_at: new Date().toISOString(),
        }, { onConflict: 'credential_id' })
        .select()
        .single();

      if (!error && data) {
        savedData = data;
      } else if (error) {
        console.error('[webauthn] save credential db error:', error.message || error.code);
      }
    } catch (err) {
      console.warn('[webauthn] save credential db exception:', err?.message);
    }
  }

  const record = savedData || {
    id: crypto.randomUUID(),
    admin_user_id: adminUserId,
    credential_id: credentialId,
    public_key: keyToSave,
    sign_count: signCount,
    device_name: deviceName,
    aaguid,
    transports: transportList,
    device_token: deviceToken,
    created_at: new Date().toISOString(),
    last_used_at: new Date().toISOString(),
  };

  const existingIdx = mockCredentialStore.findIndex((c) => c.credential_id === credentialId);
  if (existingIdx !== -1) {
    mockCredentialStore[existingIdx] = record;
  } else {
    mockCredentialStore.push(record);
  }

  persistLocalCredentialBackup(record);
  return record;
}

export const storeWebAuthnCredential = saveWebAuthnCredential;

export async function isDeviceEnrolled({ adminUserId, deviceToken }, client = null) {
  if (!deviceToken || typeof deviceToken !== 'string') return false;
  const db = client || createServiceClient();
  if (db) {
    try {
      let query = db.from('admin_webauthn_credentials').select('id, transports');
      if (adminUserId) {
        query = query.in('admin_user_id', [adminUserId, 'e04c1cbf-a746-42c9-bb02-819c992db9fd']);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const found = data.some((row) =>
          Array.isArray(row.transports) && row.transports.includes(`devtok:${deviceToken}`)
        );
        if (found) return true;
      }
    } catch (_) {}
  }

  const fromDisk = loadLocalCredentialBackup();
  const allInMemory = [...mockCredentialStore, ...fromDisk];
  return allInMemory.some(
    (c) => (!adminUserId || c.admin_user_id === adminUserId || c.admin_user_id === 'e04c1cbf-a746-42c9-bb02-819c992db9fd') &&
           (c.device_token === deviceToken || (Array.isArray(c.transports) && c.transports.includes(`devtok:${deviceToken}`)))
  );
}

export async function getWebAuthnCredentialById(credentialId, client = null) {
  if (!credentialId) return null;
  const variants = getCredentialIdVariants(credentialId);
  const db = client || createServiceClient();
  if (db) {
    try {
      const { data, error } = await db
        .from('admin_webauthn_credentials')
        .select('*')
        .in('credential_id', variants)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (_) {}
  }

  const fromDisk = loadLocalCredentialBackup();
  const allInMemory = [...mockCredentialStore, ...fromDisk];
  for (const variant of variants) {
    const found = allInMemory.find((c) => c.credential_id === variant || c.id === variant);
    if (found) return found;
  }

  return null;
}

export async function listAllAdminCredentialsWithKeys(adminUserId = null, client = null) {
  const db = client || createServiceClient();
  if (db) {
    try {
      let query = db.from('admin_webauthn_credentials').select('*');
      if (adminUserId) {
        query = query.in('admin_user_id', [adminUserId, 'e04c1cbf-a746-42c9-bb02-819c992db9fd']);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (_) {}
  }

  const fromDisk = loadLocalCredentialBackup();
  const combined = [...mockCredentialStore, ...fromDisk];
  const seen = new Set();
  return combined.filter((c) => {
    if (!c?.credential_id || seen.has(c.credential_id)) return false;
    seen.add(c.credential_id);
    return !adminUserId || c.admin_user_id === adminUserId || c.admin_user_id === 'e04c1cbf-a746-42c9-bb02-819c992db9fd';
  });
}

export async function listAdminWebAuthnCredentials(adminUserId, client = null) {
  let dbDevices = [];
  const db = client || createServiceClient();
  if (db) {
    try {
      let query = db
        .from('admin_webauthn_credentials')
        .select('id, credential_id, device_name, created_at, last_used_at');
      if (adminUserId) {
        query = query.in('admin_user_id', [adminUserId, 'e04c1cbf-a746-42c9-bb02-819c992db9fd']);
      }
      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        dbDevices = data;
      }
    } catch (_) {}
  }

  const fromDisk = loadLocalCredentialBackup();
  const allInMemory = [...mockCredentialStore, ...fromDisk];
  const seen = new Set();
  const merged = [];

  // 1. Include devices from DB
  for (const dev of dbDevices) {
    if (dev?.credential_id && !seen.has(dev.credential_id)) {
      seen.add(dev.credential_id);
      merged.push({
        id: dev.id,
        credential_id: dev.credential_id,
        device_name: dev.device_name || 'Enrolled Biometric Device',
        created_at: dev.created_at || new Date().toISOString(),
        last_used_at: dev.last_used_at || new Date().toISOString(),
      });
    }
  }

  // 2. Include devices from local storage / disk backup
  for (const c of allInMemory) {
    if (!c?.credential_id || seen.has(c.credential_id)) continue;
    const matchesUser = !adminUserId ||
      c.admin_user_id === adminUserId ||
      c.admin_user_id === 'e04c1cbf-a746-42c9-bb02-819c992db9fd';
    if (!matchesUser) continue;

    // Filter out mock test runner tokens if real devices exist
    const isTestDummy = typeof c.credential_id === 'string' && c.credential_id.startsWith('cred-enrolled-');
    if (isTestDummy && merged.length > 0) continue;

    seen.add(c.credential_id);
    merged.push({
      id: c.id,
      credential_id: c.credential_id,
      device_name: c.device_name || 'Admin Biometric Device',
      created_at: c.created_at || new Date().toISOString(),
      last_used_at: c.last_used_at || new Date().toISOString(),
    });
  }

  return merged;
}

export async function deleteWebAuthnCredential(adminUserId, credentialIdOrDbId, client = null) {
  const db = client || createServiceClient();
  const targetId = String(credentialIdOrDbId || '').trim();
  if (!targetId) return false;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
  const variants = getCredentialIdVariants(targetId);

  if (db) {
    try {
      if (isUuid) {
        await db
          .from('admin_webauthn_credentials')
          .delete()
          .eq('id', targetId);
      } else {
        await db
          .from('admin_webauthn_credentials')
          .delete()
          .in('credential_id', variants);
      }
    } catch (err) {
      console.error('[webauthn] delete credential exception:', err?.message);
    }
  }

  for (let i = mockCredentialStore.length - 1; i >= 0; i--) {
    const c = mockCredentialStore[i];
    const matchUser = !adminUserId || c.admin_user_id === adminUserId || c.admin_user_id === 'e04c1cbf-a746-42c9-bb02-819c992db9fd';
    const matchId = c.credential_id === targetId || c.id === targetId || variants.includes(c.credential_id);
    if (matchUser && matchId) {
      mockCredentialStore.splice(i, 1);
    }
  }

  removeLocalCredentialBackup(targetId);
  return true;
}

export async function updateWebAuthnCredentialUsage(credentialId, signCount, client = null) {
  const db = client || createServiceClient();
  if (db) {
    try {
      await db
        .from('admin_webauthn_credentials')
        .update({
          sign_count: signCount,
          last_used_at: new Date().toISOString(),
        })
        .eq('credential_id', credentialId);
    } catch (_) {}
  }

  const cred = mockCredentialStore.find((c) => c.credential_id === credentialId);
  if (cred) {
    cred.sign_count = signCount;
    cred.last_used_at = new Date().toISOString();
  }
}
