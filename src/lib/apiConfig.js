/**
 * Central API Configuration for Mehanda Army Investments
 * 
 * Ensures seamless, secure API connectivity across all hosting environments:
 * 1. Vercel deployment (same-origin relative /api)
 * 2. GitHub Pages / Custom domain mehandaarmy.net (routes to production Vercel backend)
 * 3. Local development (relative /api with Vite dev proxy)
 */

export const PRODUCTION_BACKEND_URL = 'https://mehanda-army-investments.vercel.app';

export function getApiBaseUrl() {
  // 1. Explicit VITE_API_BASE_URL env override takes top priority
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '');
  }

  // 2. Client-side origin detection
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Local development or running directly on Vercel deployment: relative /api works natively
    if (host.includes('vercel.app') || host === 'localhost' || host === '127.0.0.1') {
      return '';
    }
    // If running on GitHub Pages (github.io) or mehandaarmy.net while DNS still routes via GitHub Pages:
    // Route backend requests to Vercel production serverless API
    return PRODUCTION_BACKEND_URL;
  }

  return '';
}

export function getApiUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getApiBaseUrl();
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
}
