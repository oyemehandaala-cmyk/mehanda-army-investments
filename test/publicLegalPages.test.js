import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getViewFromLocation, getHrefForView, requiresCustomerSession } from '../src/lib/navigation.js';

test('SPA redirect configuration guarantees /* -> /index.html 200 on Netlify', async () => {
  const netlifyTomlPath = fileURLToPath(new URL('../netlify.toml', import.meta.url));
  const tomlContent = await readFile(netlifyTomlPath, 'utf8');

  assert.ok(tomlContent.includes('from = "/*"'), 'netlify.toml must have wildcard redirect');
  assert.ok(tomlContent.includes('to = "/index.html"'), 'netlify.toml must redirect wildcard to /index.html');
  assert.ok(tomlContent.includes('status = 200'), 'wildcard redirect must return 200 rewrite');

  const publicRedirectsPath = fileURLToPath(new URL('../public/_redirects', import.meta.url));
  const publicRedirects = await readFile(publicRedirectsPath, 'utf8');
  assert.ok(publicRedirects.includes('/*    /index.html   200'), 'public/_redirects must contain SPA 200 rewrite rule');

  const distRedirectsPath = fileURLToPath(new URL('../dist/_redirects', import.meta.url));
  const distRedirects = await readFile(distRedirectsPath, 'utf8');
  assert.ok(distRedirects.includes('/*    /index.html   200'), 'dist/_redirects must be built with SPA 200 rewrite rule');
});

test('public legal URLs resolve directly to their views with no login requirement', () => {
  const privacyLocation = { pathname: '/privacy-policy', search: '' };
  assert.equal(getViewFromLocation(privacyLocation), 'privacy-policy');
  assert.equal(requiresCustomerSession('privacy-policy'), false, 'Privacy Policy must not require login');
  assert.equal(getHrefForView('privacy-policy', 'https://mehandaarmy.net/'), '/privacy-policy');

  const termsLocation = { pathname: '/terms-and-conditions', search: '' };
  assert.equal(getViewFromLocation(termsLocation), 'terms-and-conditions');
  assert.equal(requiresCustomerSession('terms-and-conditions'), false, 'Terms & Conditions must not require login');
  assert.equal(getHrefForView('terms-and-conditions', 'https://mehandaarmy.net/'), '/terms-and-conditions');
});

test('PrivacyPolicy and TermsAndConditions components preserve complete official content', async () => {
  const privacyPath = fileURLToPath(new URL('../src/components/PrivacyPolicy.jsx', import.meta.url));
  const privacyContent = await readFile(privacyPath, 'utf8');

  // Verify core policy clauses from original LegalModal are intact
  assert.ok(privacyContent.includes('Data Collection'), 'Must have Data Collection section');
  assert.ok(privacyContent.includes('Usage of Information'), 'Must have Usage of Information section');
  assert.ok(privacyContent.includes('No Third-Party Sales'), 'Must have No Third-Party Sales section');
  assert.ok(privacyContent.includes('Security Protocols'), 'Must have Security Protocols section');
  assert.ok(privacyContent.includes('+91 9812947813'), 'Must have official phone');
  assert.ok(privacyContent.includes('info@mehandaarmy.net') || privacyContent.includes('Info@mehandaarmy.net'), 'Must have official email');
  assert.ok(privacyContent.includes('/terms-and-conditions'), 'Must cross-link to Terms');

  const termsPath = fileURLToPath(new URL('../src/components/TermsAndConditions.jsx', import.meta.url));
  const termsContent = await readFile(termsPath, 'utf8');

  // Verify core terms clauses from original LegalModal are intact
  assert.ok(termsContent.includes('Scope of Engagement'), 'Must have Scope of Engagement section');
  assert.ok(termsContent.includes('User Obligations'), 'Must have User Obligations section');
  assert.ok(termsContent.includes('Regulatory Compliance'), 'Must have Regulatory Compliance section');
  assert.ok(termsContent.includes('Statutory Risk & Market Disclosure'), 'Must have Risk Disclosure section');
  assert.ok(termsContent.includes('Grievance Redressal Desk'), 'Must have Grievance desk');
  assert.ok(termsContent.includes('/privacy-policy'), 'Must cross-link to Privacy Policy');
});

