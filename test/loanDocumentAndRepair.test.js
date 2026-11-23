import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLoanFile,
  MAX_DOCUMENT_SIZE,
  ALLOWED_MIME_TYPES,
  saveDraftDocuments,
  loadDraftDocuments,
  clearDraftDocuments,
} from '../src/lib/loanDocumentService.js';
import { getApiBaseUrl, getApiUrl } from '../src/lib/apiConfig.js';
import { isAllowedOrigin } from '../api/index.js';
import { assertSameOrigin } from '../server/adminAuth.js';
import { buildPasswordResetEmailHtml, buildPasswordResetEmailText } from '../server/accountLookup.js';

test('validateLoanFile accepts valid JPG, PNG, and PDF files under 5 MB', () => {
  const dummyJpg = new File(['test-image-bytes'], 'aadhaar.jpg', { type: 'image/jpeg' });
  const jpgResult = validateLoanFile(dummyJpg);
  assert.equal(jpgResult.isValid, true);
  assert.equal(jpgResult.contentType, 'image/jpeg');

  const dummyPdf = new File(['%PDF-1.4-test-bytes'], 'marksheet.pdf', { type: 'application/pdf' });
  const pdfResult = validateLoanFile(dummyPdf);
  assert.equal(pdfResult.isValid, true);
  assert.equal(pdfResult.contentType, 'application/pdf');

  const dummyPng = new File(['test-png-bytes'], 'signature.png', { type: 'image/png' });
  const pngResult = validateLoanFile(dummyPng);
  assert.equal(pngResult.isValid, true);
  assert.equal(pngResult.contentType, 'image/png');
});

test('validateLoanFile rejects unsupported file formats', () => {
  const dummyTxt = new File(['sample text'], 'notes.txt', { type: 'text/plain' });
  assert.throws(() => validateLoanFile(dummyTxt), /Supported document formats are JPG, JPEG, PNG, and PDF/);

  const dummyExe = new File(['malicious'], 'app.exe', { type: 'application/x-msdownload' });
  assert.throws(() => validateLoanFile(dummyExe), /Supported document formats are JPG, JPEG, PNG, and PDF/);
});

test('validateLoanFile rejects files exceeding 5 MB limit', () => {
  const oversizedBuffer = new Uint8Array(5 * 1024 * 1024 + 1024);
  const oversizedFile = new File([oversizedBuffer], 'large_document.pdf', { type: 'application/pdf' });
  assert.throws(() => validateLoanFile(oversizedFile), /exceeds the maximum allowed limit of 5 MB/);
});

test('apiConfig uses same-origin relative /api on netlify.app domains', () => {
  const netlifyUrl = getApiUrl('/api/farm-loans', 'https://mehandaarmy.netlify.app');
  assert.equal(netlifyUrl, '/api/farm-loans');

  const netlifyDocsUrl = getApiUrl('/api/student-loan-documents', 'https://mehandaarmy.netlify.app');
  assert.equal(netlifyDocsUrl, '/api/student-loan-documents');
});

test('isAllowedOrigin permits mehandaarmy.netlify.app without CORS errors', () => {
  assert.equal(isAllowedOrigin('https://mehandaarmy.netlify.app'), true);
  assert.equal(isAllowedOrigin('https://deploy-preview-12--mehandaarmy.netlify.app'), true);
  assert.equal(isAllowedOrigin('https://mehandaarmy.net'), true);
  assert.equal(isAllowedOrigin('https://www.mehandaarmy.net'), true);
  assert.equal(isAllowedOrigin('https://evil-hacker.com'), false);
});

test('assertSameOrigin permits Netlify host headers in adminAuth', () => {
  assert.doesNotThrow(() => {
    assertSameOrigin({ origin: 'https://mehandaarmy.netlify.app', host: 'mehanda-army-investments.vercel.app' });
  });
  assert.doesNotThrow(() => {
    assertSameOrigin({ origin: 'https://mehandaarmy.net', host: 'mehanda-army-investments.vercel.app' });
  });
  assert.throws(() => {
    assertSameOrigin({ origin: 'https://malicious-site.com', host: 'mehanda-army-investments.vercel.app' });
  }, /This request is not allowed/);
});

test('Password reset email templates never render localhost or 127.0.0.1 links', () => {
  const cleanLink = 'https://mehandaarmy.net/?auth=reset-password&token_hash=abc123token&type=recovery';
  const html = buildPasswordResetEmailHtml({ email: 'client@example.com', actionLink: cleanLink, emailOtp: '987654' });
  const text = buildPasswordResetEmailText({ email: 'client@example.com', actionLink: cleanLink, emailOtp: '987654' });

  assert.equal(html.includes('localhost'), false);
  assert.equal(html.includes('127.0.0.1'), false);
  assert.equal(html.includes(cleanLink), true);
  assert.equal(html.includes('987654'), true);

  assert.equal(text.includes('localhost'), false);
  assert.equal(text.includes('127.0.0.1'), false);
  assert.equal(text.includes(cleanLink), true);
  assert.equal(text.includes('987654'), true);
});
