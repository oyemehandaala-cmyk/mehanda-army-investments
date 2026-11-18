const PUBLISHABLE_KEY_PATTERN = /^sb_publishable_[A-Za-z0-9_-]+$/;
const PLACEHOLDER_VALUE_PATTERN = /(?:placeholder|your[-_]|replace[-_]|example\.com|\.invalid\b|<[^>]*>)/i;

function isPlaceholderValue(value) {
  return typeof value !== 'string' || !value || PLACEHOLDER_VALUE_PATTERN.test(value);
}

export function isPublicSupabaseKey(key) {
  if (typeof key !== 'string') return false;
  if (isPlaceholderValue(key)) return false;
  if (PUBLISHABLE_KEY_PATTERN.test(key)) return true;
  if (key.startsWith('sb_secret_')) return false;

  const parts = key.split('.');
  if (parts.length !== 3 || !parts[1]) return false;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return payload.role === 'anon';
  } catch {
    return false;
  }
}

export function isValidSupabaseUrl(value) {
  if (isPlaceholderValue(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && Boolean(url.hostname)
      && !url.username
      && !url.password
      && (url.pathname === '/' || url.pathname === '')
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function getSupabaseConfigurationIssue(url, key) {
  if (!url) return 'missing_url';
  if (!isValidSupabaseUrl(url)) return 'invalid_url';
  if (!key) return 'missing_public_key';
  if (!isPublicSupabaseKey(key)) return 'invalid_public_key';
  return null;
}
