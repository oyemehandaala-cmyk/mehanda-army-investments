import { authService } from './supabaseClient.js';

export const LOAN_AMOUNTS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
export const MAX_LOAN_AMOUNT = 1000;
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
export const MAX_TEST_DOCUMENT_SIZE = MAX_DOCUMENT_SIZE;
export const STUDENT_LOAN_DOCUMENT_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
  ['text/plain', 'txt'],
  ['application/json', 'json'],
]);

export const APPLICATION_STATUS = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ADDITIONAL_INFORMATION_REQUIRED: 'Additional Information Required',
  VERIFICATION_PENDING: 'Verification Pending',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  ENQUIRY_COMPLETED: 'Enquiry Completed',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};

export const LOAN_TERMS = {
  maxAmount: '₹1,000',
  minAge: '18 years',
  repaymentDays: 'Proposed 30-day term; subject to compliance review',
  serviceFee: 'Zero application fee for student loan enquiries.',
  processingTime: 'Enquiry review turnaround is typically 2–3 business days.',
  eligibility: [
    'Applicants must be at least 18 years old for independent enquiries',
    'Applicants under 18 must have parent or legal guardian consent',
    'Currently enrolled students in recognized school, college, or university',
    'Subject to institutional verification and regulatory approvals',
  ],
};

async function request(path, options = {}, requiresCustomerSession = false) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };
  if (requiresCustomerSession) {
    const { accessToken, error } = await authService.getAccessToken();
    if (error || !accessToken) {
      throw new Error('Sign in again to access your student loan test enquiries.');
    }
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers,
    cache: 'no-store',
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The loan demo service returned an invalid response.');
  }

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'The loan demo request could not be completed.');
  }

  return result;
}

export async function submitDemoApplication(payload) {
  const result = await request('/api/student-loans', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
  return result.application;
}

export function createSyntheticSampleFile(docTitle, applicantName = 'Student Applicant') {
  const content = JSON.stringify({
    documentType: docTitle,
    applicantName: (applicantName || 'Student Applicant').trim(),
    generatedAt: new Date().toISOString(),
    documentStatus: 'SYNTHETIC_TEST_SAMPLE',
    safetyNotice: 'Non-sensitive synthetic test document for Mehanda Army Investments verification testing.',
  }, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const sanitizedTitle = docTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return new File([blob], `sample-${sanitizedTitle}.json`, { type: 'application/json' });
}

export async function uploadStudentLoanDocument(file, onProgress) {
  if (!(file instanceof File)) {
    throw new Error('Please select a valid document file.');
  }

  const isImageOrPdf = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ].includes(file.type) || /\.(jpe?g|png|webp|pdf)$/i.test(file.name);

  const isTextOrJson = [
    'text/plain',
    'application/json',
  ].includes(file.type) || /\.(txt|json)$/i.test(file.name);

  if (!isImageOrPdf && !isTextOrJson) {
    throw new Error('Supported document formats are JPG, JPEG, PNG, and PDF (up to 5 MB per file).');
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 5 MB.`);
  }

  let effectiveContentType = file.type;
  if (!effectiveContentType || effectiveContentType === 'application/octet-stream') {
    if (/\.jpe?g$/i.test(file.name)) effectiveContentType = 'image/jpeg';
    else if (/\.png$/i.test(file.name)) effectiveContentType = 'image/png';
    else if (/\.webp$/i.test(file.name)) effectiveContentType = 'image/webp';
    else if (/\.pdf$/i.test(file.name)) effectiveContentType = 'application/pdf';
    else if (/\.txt$/i.test(file.name)) effectiveContentType = 'text/plain';
    else if (/\.json$/i.test(file.name)) effectiveContentType = 'application/json';
  }

  const contentBase64 = await new Promise((resolve, reject) => {
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

  return uploadStudentLoanTestFile({
    fileName: file.name,
    contentType: effectiveContentType,
    size: file.size,
    contentBase64,
  }, onProgress);
}

export async function getDocumentSignedUrl(path) {
  if (!path) throw new Error('Document path is required.');
  const headers = {};
  try {
    const { accessToken } = await authService.getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  } catch {}

  const response = await fetch(`/api/student-loan-documents?path=${encodeURIComponent(path)}`, {
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Document preview could not be loaded.');
  }

  if (!response.ok || !result.success || !result.signedUrl) {
    throw new Error(result?.error || 'Document preview is currently unavailable.');
  }

  return result.signedUrl;
}

export async function uploadStudentLoanTestFile(payload, onProgress) {
  const { accessToken, error } = await authService.getAccessToken();
  if (error || !accessToken) {
    throw new Error('Sign in again before uploading a sample file.');
  }

  return new Promise((resolve, reject) => {
    const upload = new XMLHttpRequest();
    upload.open('POST', '/api/student-loan-documents');
    upload.setRequestHeader('Content-Type', 'application/json');
    upload.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    upload.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    upload.onerror = () => reject(new Error('The sample file could not be uploaded.'));
    upload.onload = () => {
      let result;
      try {
        result = JSON.parse(upload.responseText);
      } catch {
        reject(new Error('The sample file service returned an invalid response.'));
        return;
      }
      if (upload.status < 200 || upload.status >= 300 || !result.success) {
        reject(new Error(result.error || 'The sample file could not be uploaded.'));
        return;
      }
      onProgress?.(100);
      resolve(result.document);
    };
    upload.send(JSON.stringify(payload));
  });
}

export async function removeStudentLoanDocument(path) {
  const result = await request('/api/student-loan-documents', {
    method: 'DELETE',
    body: JSON.stringify({ path }),
  }, true);
  return result.document;
}

export async function getStudentLoanCities(state, district, { signal } = {}) {
  const parameters = new URLSearchParams({ cities: 'true', state, district });
  return request(`/api/student-loans?${parameters.toString()}`, { signal });
}

export async function searchStudentLoanInstitutions({
  query,
  state = '',
  district = '',
  management = '',
  cursor,
  signal
}) {
  const parameters = new URLSearchParams({
    institutions: 'search',
    q: query
  });
  if (state) parameters.set('state', state);
  if (district) parameters.set('district', district);
  if (management) parameters.set('management', management);
  if (cursor?.name && cursor?.id) {
    parameters.set('afterName', cursor.name);
    parameters.set('afterId', cursor.id);
  }

  return request(`/api/student-loans?${parameters.toString()}`, { signal });
}

export async function getDemoApplication(reference) {
  const result = await request(
    `/api/student-loans?trackingId=${encodeURIComponent(reference)}`,
    {},
    true
  );
  return result.application;
}

export async function getCustomerApplications() {
  const result = await request('/api/student-loans?mine=true', {}, true);
  return result.applications;
}

export async function getStudentLoanApplications() {
  const result = await request('/api/student-loans');
  return result.applications;
}

export async function getStudentLoanTestApplications(filters = {}) {
  const parameters = new URLSearchParams();
  if (filters.status) parameters.set('status', filters.status);
  if (filters.from) parameters.set('from', filters.from);
  if (filters.to) parameters.set('to', filters.to);
  if (filters.trackingId) parameters.set('trackingId', filters.trackingId);
  const query = parameters.toString();
  const result = await request(`/api/student-loans${query ? `?${query}` : ''}`);
  return result.applications;
}

export async function updateStudentLoanStatus(reference, status, remarks = {}) {
  const result = await request('/api/student-loans', {
    method: 'PATCH',
    body: JSON.stringify({
      reference,
      status,
      customerRemark: remarks.customerRemark || null,
      internalNote: remarks.internalNote || null,
    }),
  });
  const app = result.application || {};
  app.emailNotification = result.emailNotification || null;
  return app;
}
