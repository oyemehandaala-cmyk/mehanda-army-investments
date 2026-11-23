import { supabase, authService, isSupabaseConfigured } from './supabaseClient.js';
import { getApiUrl } from './apiConfig.js';

export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
export const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|pdf)$/i;

/**
 * Validates file format and size for loan documents
 */
export function validateLoanFile(file) {
  if (!(file instanceof File)) {
    throw new Error('Please select a valid document file.');
  }

  const matchesMime = ALLOWED_MIME_TYPES.includes(file.type);
  const matchesExt = ALLOWED_EXTENSIONS.test(file.name);

  if (!matchesMime && !matchesExt) {
    throw new Error('Supported document formats are JPG, JPEG, PNG, and PDF.');
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File size (${sizeMb} MB) exceeds the maximum allowed limit of 5 MB.`);
  }

  let effectiveContentType = file.type;
  if (!effectiveContentType || effectiveContentType === 'application/octet-stream') {
    if (/\.jpe?g$/i.test(file.name)) effectiveContentType = 'image/jpeg';
    else if (/\.png$/i.test(file.name)) effectiveContentType = 'image/png';
    else if (/\.webp$/i.test(file.name)) effectiveContentType = 'image/webp';
    else if (/\.pdf$/i.test(file.name)) effectiveContentType = 'application/pdf';
  }

  return { isValid: true, contentType: effectiveContentType };
}

/**
 * Converts file to Base64 string for API upload fallback
 */
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The selected document file could not be read.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const separator = dataUrl.indexOf(',');
      if (separator < 0) {
        reject(new Error('The selected document file could not be encoded.'));
        return;
      }
      resolve(dataUrl.slice(separator + 1));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a document to Supabase Storage (with fallback to serverless API)
 */
export async function uploadLoanDocument({
  file,
  docKey = 'doc',
  loanType = 'student',
  onProgress,
}) {
  const { contentType } = validateLoanFile(file);

  onProgress?.(15);

  // Authenticate user session
  let userId = null;
  let accessToken = null;
  try {
    const sessionRes = await authService.getAccessToken();
    accessToken = sessionRes?.accessToken;
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData?.session?.user?.id || null;
      if (!accessToken && sessionData?.session?.access_token) {
        accessToken = sessionData.session.access_token;
      }
    } catch {}
  }

  if (!userId && !accessToken) {
    throw new Error('Please sign in to your account before uploading documents.');
  }

  const rawExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(rawExt) ? rawExt : 'jpg';
  const cleanKey = String(docKey).replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `${userId || 'guest'}/${loanType}_${cleanKey}_${Date.now()}.${cleanExt}`;

  // 1. Try direct Supabase Storage upload if configured
  if (isSupabaseConfigured() && userId) {
    onProgress?.(40);
    const bucketsToTry = ['student-loan-id-proofs', 'loan-documents'];
    for (const bucket of bucketsToTry) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
            contentType,
          });

        if (!error && data?.path) {
          onProgress?.(100);
          return {
            path: data.path,
            fileName: file.name,
            contentType,
            size: file.size,
            confirmed: true,
            uploadedAt: new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn(`[loanDocumentService] Bucket ${bucket} upload error:`, err?.message || err);
      }
    }
  }

  // 2. Fallback to server API endpoint (/api/student-loan-documents)
  onProgress?.(60);
  try {
    const contentBase64 = await fileToBase64(file);
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const res = await fetch(getApiUrl('/api/student-loan-documents'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileName: file.name,
        contentType,
        size: file.size,
        contentBase64,
      }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok || !resData.success || !resData.document) {
      throw new Error(resData?.error || 'Document upload failed. Please verify file format and try again.');
    }

    onProgress?.(100);
    return {
      path: resData.document.path,
      fileName: file.name,
      contentType,
      size: file.size,
      confirmed: true,
      uploadedAt: new Date().toISOString(),
    };
  } catch (apiErr) {
    console.error('[loanDocumentService] API upload fallback failed:', apiErr);
    throw new Error(apiErr.message || 'Document upload failed. Please check your network connection.');
  }
}

/**
 * Removes an uploaded document
 */
export async function removeLoanDocument(path) {
  if (!path) return { success: true };

  // Try removing from Supabase Storage
  if (isSupabaseConfigured()) {
    try {
      await supabase.storage.from('student-loan-id-proofs').remove([path]);
    } catch {}
    try {
      await supabase.storage.from('loan-documents').remove([path]);
    } catch {}
  }

  // Try removing via API endpoint
  try {
    const { accessToken } = await authService.getAccessToken();
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    await fetch(getApiUrl('/api/student-loan-documents'), {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ path }),
    });
  } catch {}

  return { success: true, path };
}

/**
 * Gets a secure signed URL for viewing the document
 */
export async function getLoanDocumentSignedUrl(path) {
  if (!path) throw new Error('Document path is required.');

  // Try client-side signed URL
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.storage
        .from('student-loan-id-proofs')
        .createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {}
    try {
      const { data, error } = await supabase.storage
        .from('loan-documents')
        .createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {}
  }

  // Fallback to API signed URL endpoint
  const headers = {};
  try {
    const { accessToken } = await authService.getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  } catch {}

  const response = await fetch(getApiUrl(`/api/student-loan-documents?path=${encodeURIComponent(path)}`), {
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success || !result.signedUrl) {
    throw new Error(result?.error || 'Document preview is currently unavailable.');
  }
  return result.signedUrl;
}

/**
 * Helpers for persisting draft documents in sessionStorage across page refreshes
 */
export function saveDraftDocuments(storageKey, docsMap) {
  if (typeof window === 'undefined' || !storageKey || !docsMap) return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(docsMap));
  } catch {}
}

export function loadDraftDocuments(storageKey) {
  if (typeof window === 'undefined' || !storageKey) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraftDocuments(storageKey) {
  if (typeof window === 'undefined' || !storageKey) return;
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {}
}
