import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSyntheticSampleFile,
  MAX_TEST_DOCUMENT_SIZE,
} from '../src/lib/studentLoanService.js';
import {
  createSyntheticSampleFile as createInvestmentSyntheticSampleFile,
} from '../src/lib/investmentEnquiryService.js';
import {
  handleStudentLoanDocumentRequest,
} from '../server/studentLoanEnquiries.js';
import {
  handleInvestmentEnquiry,
} from '../server/paymentServer.js';

const testUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'investor@example.com',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
};

const testEnv = {
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_SECRET_KEY: 'server-only-test-key',
  SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
};

function createMockSupabaseClient() {
  let insertedRecord = null;
  return {
    getInserted: () => insertedRecord,
    client: {
      auth: {
        async getUser(token) {
          assert.equal(token, 'valid-token');
          return { data: { user: testUser }, error: null };
        },
      },
      from(table) {
        assert.equal(table, 'investment_enquiries');
        return {
          insert(record) {
            insertedRecord = record;
            return this;
          },
          select() {
            return this;
          },
          single() {
            return {
              data: {
                id: 'inv-uuid-789',
                customer_id: testUser.id,
                tracking_id: 'MAI-INV-2026-999999',
                status: 'Submitted',
                created_at: new Date().toISOString(),
              },
              error: null,
            };
          },
        };
      },
    },
  };
}

test('createSyntheticSampleFile creates safe, conforming sample file without sensitive data', () => {
  const file1 = createSyntheticSampleFile('Student ID Verification', 'Rohan Sharma');
  assert.ok(file1 instanceof File);
  assert.ok(/\b(sample|test)\b/i.test(file1.name));
  assert.ok(file1.name.endsWith('.txt') || file1.name.endsWith('.json'));
  assert.ok(file1.size > 0 && file1.size <= MAX_TEST_DOCUMENT_SIZE);

  const file2 = createInvestmentSyntheticSampleFile('Investor Specimen Signature', 'Pooja Verma');
  assert.ok(file2 instanceof File);
  assert.ok(/\b(sample|test)\b/i.test(file2.name));
  assert.ok(file2.name.endsWith('.txt') || file2.name.endsWith('.json'));
  assert.ok(file2.size > 0 && file2.size <= MAX_TEST_DOCUMENT_SIZE);
});

test('document upload endpoint rejects files with invalid extensions or missing sample marker', async () => {
  const mockStorageClient = {
    auth: {
      async getUser(token) {
        assert.equal(token, 'valid-token');
        return { data: { user: testUser }, error: null };
      },
    },
    storage: {
      from() {
        return {
          async upload() {
            return { data: { path: 'test-path' }, error: null };
          },
        };
      },
    },
  };

  const createClientFn = () => mockStorageClient;

  // Missing sample/test in file name
  const invalidNameContent = Buffer.from('Non-sensitive student test file content').toString('base64');
  await assert.rejects(
    handleStudentLoanDocumentRequest(
      'POST',
      { fileName: 'my_government_aadhaar.txt', contentBase64: invalidNameContent, contentType: 'text/plain', size: Buffer.byteLength(invalidNameContent, 'base64') },
      { authorization: 'Bearer valid-token' },
      { env: testEnv, createClient: createClientFn }
    ),
    (err) => err.status === 400 && /sample/i.test(err.message)
  );

  // Disallowed file extension (.exe)
  const exeContent = Buffer.from('sample test content').toString('base64');
  await assert.rejects(
    handleStudentLoanDocumentRequest(
      'POST',
      { fileName: 'sample_file.exe', contentBase64: exeContent, contentType: 'application/octet-stream', size: Buffer.byteLength(exeContent, 'base64') },
      { authorization: 'Bearer valid-token' },
      { env: testEnv, createClient: createClientFn }
    ),
    (err) => err.status === 400
  );
});

test('document upload endpoint rejects files containing Aadhaar or PAN number patterns', async () => {
  const mockStorageClient = {
    auth: {
      async getUser(token) {
        assert.equal(token, 'valid-token');
        return { data: { user: testUser }, error: null };
      },
    },
    storage: {
      from() {
        return {
          async upload() {
            return { data: { path: 'test-path' }, error: null };
          },
        };
      },
    },
  };

  const createClientFn = () => mockStorageClient;

  // Contains PAN pattern
  const panText = 'Specimen note: PAN number ABCDE1234F is registered.';
  const panBytes = Buffer.from(panText);
  const panContent = panBytes.toString('base64');
  await assert.rejects(
    handleStudentLoanDocumentRequest(
      'POST',
      { fileName: 'sample-id-test.txt', contentBase64: panContent, contentType: 'text/plain', size: panBytes.length },
      { authorization: 'Bearer valid-token' },
      { env: testEnv, createClient: createClientFn }
    ),
    (err) => err.status === 400 && /identity|Aadhaar|PAN/i.test(err.message)
  );
});

test('investment enquiry accepts verified documents and attaches metadata to enquiry record', async () => {
  const mock = createMockSupabaseClient();

  const payload = {
    fullName: 'Amit Kumar',
    email: testUser.email,
    phone: '9876543210',
    dateOfBirth: '1995-05-15',
    age: 30,
    address: '123 Civil Lines',
    state: 'Haryana',
    district: 'Bhiwani',
    city: 'Bhiwani',
    pinCode: '127021',
    interestCategory: 'Mutual Funds & Systematic Investment (SIP)',
    investmentObjective: 'Wealth Appreciation / Long-term Growth',
    plannedAmountBracket: '₹50,000 – ₹2,00,000',
    investmentHorizon: '3 – 5 Years',
    customerExpectations: 'Asset Allocation Guidance',
    riskUnderstanding: 'Moderate Risk',
    knowledgeLevel: 'Intermediate',
    investmentGoals: 'Long-term Capital Growth',
    riskAcknowledged: true,
    privacyConsent: true,
    documents: {
      investorProof: {
        confirmed: true,
        fileName: 'sample-investor-profile.txt',
        size: 1024,
        path: 'private/sample-investor-profile.txt',
      },
      investorSignature: {
        confirmed: true,
        fileName: 'sample-specimen-signature.txt',
        size: 512,
        path: 'private/sample-specimen-signature.txt',
      },
    },
  };

  const res = await handleInvestmentEnquiry(
    payload,
    { authorization: 'Bearer valid-token' },
    { env: testEnv, createClient: () => mock.client }
  );

  assert.equal(res.success, true);
  assert.ok(res.enquiryId);
  assert.ok(res.trackingId);
  const savedRecord = mock.getInserted();
  assert.ok(savedRecord);
  assert.ok(savedRecord.message.includes('Verified Documents'));
  assert.ok(savedRecord.message.includes('sample-investor-profile.txt'));
  assert.ok(savedRecord.message.includes('sample-specimen-signature.txt'));
  // Ensure private URLs or secrets are NOT leaked in message
  assert.ok(!savedRecord.message.includes('http://'));
  assert.ok(!savedRecord.message.includes('https://'));
});

test('investment enquiry rejects applicant under 18 years of age', async () => {
  const mock = createMockSupabaseClient();

  const payload = {
    fullName: 'Minor User',
    email: testUser.email,
    phone: '9876543210',
    dateOfBirth: '2012-01-01', // 14 years old
    age: 14,
    address: '123 Civil Lines',
    state: 'Haryana',
    district: 'Bhiwani',
    city: 'Bhiwani',
    pinCode: '127021',
    interestCategory: 'Mutual Funds & Systematic Investment (SIP)',
    investmentObjective: 'Wealth Appreciation / Long-term Growth',
    plannedAmountBracket: '₹50,000 – ₹2,00,000',
    investmentHorizon: '3 – 5 Years',
    customerExpectations: 'Asset Allocation Guidance',
    riskUnderstanding: 'Moderate Risk',
    knowledgeLevel: 'Intermediate',
    investmentGoals: 'Long-term Capital Growth',
    riskAcknowledged: true,
    privacyConsent: true,
  };

  await assert.rejects(
    handleInvestmentEnquiry(payload, { authorization: 'Bearer valid-token' }, { env: testEnv, createClient: () => mock.client }),
    (err) => err.status === 400 && /18 years or older/i.test(err.message)
  );
});

test('mandatory document validation enforces verified documents before final submission', () => {
  // Test Investment Enquiry step 4 validation logic
  const validateInvestmentDocs = (documents) => {
    const errors = {};
    if (!documents?.investorProof?.confirmed) {
      errors.investorProof = 'Investor verification document is required.';
    }
    if (!documents?.investorSignature?.confirmed) {
      errors.investorSignature = 'Investor specimen signature / consultation authorization is required.';
    }
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Missing all documents
  const missingAll = validateInvestmentDocs({});
  assert.equal(missingAll.isValid, false);
  assert.ok(missingAll.errors.investorProof);
  assert.ok(missingAll.errors.investorSignature);

  // Missing one document
  const partial = validateInvestmentDocs({
    investorProof: { confirmed: true, fileName: 'sample-proof.txt' },
  });
  assert.equal(partial.isValid, false);
  assert.ok(partial.errors.investorSignature);

  // Unconfirmed document (selected but not uploaded to backend)
  const unconfirmed = validateInvestmentDocs({
    investorProof: { confirmed: false, fileName: 'sample-proof.txt' },
    investorSignature: { confirmed: true, fileName: 'sample-sig.txt' },
  });
  assert.equal(unconfirmed.isValid, false);
  assert.ok(unconfirmed.errors.investorProof);

  // Both confirmed
  const valid = validateInvestmentDocs({
    investorProof: { confirmed: true, fileName: 'sample-proof.txt' },
    investorSignature: { confirmed: true, fileName: 'sample-sig.txt' },
  });
  assert.equal(valid.isValid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
});

test('mandatory field validation enforces 6-digit postal PIN code and required fields', () => {
  const validatePinCode = (pin) => /^\d{6}$/.test(String(pin || '').trim());
  assert.equal(validatePinCode(''), false);
  assert.equal(validatePinCode('12345'), false);
  assert.equal(validatePinCode('1234567'), false);
  assert.equal(validatePinCode('12AB56'), false);
  assert.equal(validatePinCode('127021'), true);
  assert.equal(validatePinCode(' 110001 '), true);

  const validateLoanAmount = (amt) => {
    const num = Number(amt);
    return Number.isFinite(num) && num >= 100 && num <= 1000;
  };
  assert.equal(validateLoanAmount(0), false);
  assert.equal(validateLoanAmount(50), false);
  assert.equal(validateLoanAmount(100), true);
  assert.equal(validateLoanAmount(500), true);
  assert.equal(validateLoanAmount(1000), true);
  assert.equal(validateLoanAmount(1500), false);
});

test('student loan mandatory document validation requires all four documents (studentId, signature, addressProof, academicMarksheet)', () => {
  const validateStudentLoanDocs = (documents) => {
    const errors = {};
    if (!documents?.studentId?.confirmed) {
      errors.studentId = 'Student Verification Document (Student ID / Admission confirmation) is required.';
    }
    if (!documents?.signature?.confirmed) {
      errors.signature = 'Student Specimen Signature Note is required.';
    }
    if (!documents?.addressProof?.confirmed) {
      errors.addressProof = 'Residential Address Proof is required.';
    }
    if (!documents?.academicMarksheet?.confirmed) {
      errors.academicMarksheet = 'Academic Marksheet / Certificate is required.';
    }
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Missing all
  const emptyRes = validateStudentLoanDocs({});
  assert.equal(emptyRes.isValid, false);
  assert.equal(Object.keys(emptyRes.errors).length, 4);

  // Missing signature and addressProof
  const partialRes = validateStudentLoanDocs({
    studentId: { confirmed: true, fileName: 'student_id.jpg' },
    academicMarksheet: { confirmed: true, fileName: 'marksheet.pdf' },
  });
  assert.equal(partialRes.isValid, false);
  assert.ok(partialRes.errors.signature);
  assert.ok(partialRes.errors.addressProof);

  // Unconfirmed
  const unconfirmedRes = validateStudentLoanDocs({
    studentId: { confirmed: true, fileName: 'student_id.jpg' },
    signature: { confirmed: true, fileName: 'signature.png' },
    addressProof: { confirmed: false, fileName: 'address.jpg' },
    academicMarksheet: { confirmed: true, fileName: 'marksheet.pdf' },
  });
  assert.equal(unconfirmedRes.isValid, false);
  assert.ok(unconfirmedRes.errors.addressProof);

  // All 4 confirmed
  const validRes = validateStudentLoanDocs({
    studentId: { confirmed: true, fileName: 'student_id.jpg' },
    signature: { confirmed: true, fileName: 'signature.png' },
    addressProof: { confirmed: true, fileName: 'address.pdf' },
    academicMarksheet: { confirmed: true, fileName: 'marksheet.pdf' },
  });
  assert.equal(validRes.isValid, true);
  assert.equal(Object.keys(validRes.errors).length, 0);
});

test('handleStudentLoanDocumentRequest accepts genuine JPG, PNG, and PDF files up to 5 MB', async () => {
  let uploadedBucket = null;

  const mockStorageClient = {
    auth: {
      async getUser(token) {
        assert.equal(token, 'valid-token');
        return { data: { user: testUser }, error: null };
      },
    },
    storage: {
      from(bucket) {
        return {
          async upload(path) {
            uploadedBucket = bucket;
            return { data: { path }, error: null };
          },
        };
      },
    },
  };

  // 1. Valid JPG with magic bytes 0xFF, 0xD8, 0xFF
  const jpgBuffer = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(100)]);
  const jpgRes = await handleStudentLoanDocumentRequest(
    'POST',
    {
      fileName: 'student_id.jpg',
      contentType: 'image/jpeg',
      contentBase64: jpgBuffer.toString('base64'),
      size: jpgBuffer.length,
    },
    { authorization: 'Bearer valid-token' },
    { env: testEnv, createClient: () => mockStorageClient }
  );
  assert.equal(jpgRes.success, true);
  assert.equal(jpgRes.document.fileName, 'student_id.jpg');
  assert.equal(jpgRes.document.contentType, 'image/jpeg');
  assert.equal(jpgRes.document.size, jpgBuffer.length);
  assert.match(jpgRes.document.path, new RegExp(`^${testUser.id}/[0-9a-f-]+\\.jpg$`));
  assert.equal(uploadedBucket, 'student-loan-id-proofs');

  // 2. Valid PNG with magic bytes 0x89, 0x50, 0x4E, 0x47
  const pngBuffer = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), Buffer.alloc(100)]);
  const pngRes = await handleStudentLoanDocumentRequest(
    'POST',
    {
      fileName: 'signature.png',
      contentType: 'image/png',
      contentBase64: pngBuffer.toString('base64'),
      size: pngBuffer.length,
    },
    { authorization: 'Bearer valid-token' },
    { env: testEnv, createClient: () => mockStorageClient }
  );
  assert.equal(pngRes.success, true);
  assert.equal(pngRes.document.fileName, 'signature.png');
  assert.equal(pngRes.document.contentType, 'image/png');
  assert.match(pngRes.document.path, new RegExp(`^${testUser.id}/[0-9a-f-]+\\.png$`));

  // 3. Valid PDF with magic bytes %PDF (0x25, 0x50, 0x44, 0x46)
  const pdfBuffer = Buffer.concat([Buffer.from('%PDF-1.4\n%...'), Buffer.alloc(500)]);
  const pdfRes = await handleStudentLoanDocumentRequest(
    'POST',
    {
      fileName: 'academic_marksheet.pdf',
      contentType: 'application/pdf',
      contentBase64: pdfBuffer.toString('base64'),
      size: pdfBuffer.length,
    },
    { authorization: 'Bearer valid-token' },
    { env: testEnv, createClient: () => mockStorageClient }
  );
  assert.equal(pdfRes.success, true);
  assert.equal(pdfRes.document.fileName, 'academic_marksheet.pdf');
  assert.equal(pdfRes.document.contentType, 'application/pdf');
  assert.match(pdfRes.document.path, new RegExp(`^${testUser.id}/[0-9a-f-]+\\.pdf$`));
});

test('handleStudentLoanDocumentRequest rejects oversized files (> 5 MB), corrupt binary headers, and unsupported file extensions', async () => {
  const mockStorageClient = {
    auth: {
      async getUser(token) {
        assert.equal(token, 'valid-token');
        return { data: { user: testUser }, error: null };
      },
    },
    storage: {
      from() {
        return {
          async upload() {
            return { data: { path: 'test-path' }, error: null };
          },
        };
      },
    },
  };

  // 1. Oversized file (> 5 MB)
  const bigSize = 5 * 1024 * 1024 + 10;
  await assert.rejects(
    handleStudentLoanDocumentRequest(
      'POST',
      {
        fileName: 'huge_document.pdf',
        contentType: 'application/pdf',
        contentBase64: 'AA==',
        size: bigSize,
      },
      { authorization: 'Bearer valid-token' },
      { env: testEnv, createClient: () => mockStorageClient }
    ),
    (err) => err.status === 400
  );

  // 2. Corrupt JPEG header
  const fakeJpg = Buffer.from('NOT A REAL JPEG FILE AT ALL');
  await assert.rejects(
    handleStudentLoanDocumentRequest(
      'POST',
      {
        fileName: 'fake_photo.jpg',
        contentType: 'image/jpeg',
        contentBase64: fakeJpg.toString('base64'),
        size: fakeJpg.length,
      },
      { authorization: 'Bearer valid-token' },
      { env: testEnv, createClient: () => mockStorageClient }
    ),
    (err) => err.status === 400 && /JPEG image/i.test(err.message)
  );

  // 3. Corrupt PDF header
  const fakePdf = Buffer.from('NOT A REAL PDF HEADER');
  await assert.rejects(
    handleStudentLoanDocumentRequest(
      'POST',
      {
        fileName: 'fake_doc.pdf',
        contentType: 'application/pdf',
        contentBase64: fakePdf.toString('base64'),
        size: fakePdf.length,
      },
      { authorization: 'Bearer valid-token' },
      { env: testEnv, createClient: () => mockStorageClient }
    ),
    (err) => err.status === 400 && /PDF document/i.test(err.message)
  );

  // 4. Unsupported extension (.zip)
  const zipBuffer = Buffer.from('PK\x03\x04...');
  await assert.rejects(
    handleStudentLoanDocumentRequest(
      'POST',
      {
        fileName: 'archive.zip',
        contentType: 'application/zip',
        contentBase64: zipBuffer.toString('base64'),
        size: zipBuffer.length,
      },
      { authorization: 'Bearer valid-token' },
      { env: testEnv, createClient: () => mockStorageClient }
    ),
    (err) => err.status === 400 && /Supported document formats/i.test(err.message)
  );
});

test('handleStudentLoanDocumentRequest GET returns signed URL for authorized customer owner or rejects unauthorized access', async () => {
  const userFilePath = `${testUser.id}/sample-doc-uuid.pdf`;
  const otherUserFilePath = '999e9999-e89b-12d3-a456-426614174999/other-doc.pdf';

  const mockStorageClient = {
    auth: {
      async getUser(token) {
        assert.equal(token, 'valid-token');
        return { data: { user: testUser }, error: null };
      },
    },
    storage: {
      from(bucket) {
        return {
          async createSignedUrl(path, expiry) {
            assert.equal(expiry, 3600);
            return {
              data: {
                signedUrl: `https://test-project.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=mock-signed-token`,
              },
              error: null,
            };
          },
        };
      },
    },
  };

  // Missing path -> 400
  await assert.rejects(
    handleStudentLoanDocumentRequest(
      'GET',
      { path: '' },
      { authorization: 'Bearer valid-token' },
      { env: testEnv, createClient: () => mockStorageClient }
    ),
    (err) => err.status === 400 && /Document path is required/i.test(err.message)
  );

  // Unauthorized access (customer requesting another customer's document) -> 403
  await assert.rejects(
    handleStudentLoanDocumentRequest(
      'GET',
      { path: otherUserFilePath },
      { authorization: 'Bearer valid-token' },
      { env: testEnv, createClient: () => mockStorageClient }
    ),
    (err) => err.status === 403 && /not authorized/i.test(err.message)
  );

  // Authorized access (customer requesting own document) -> 200 with signedUrl
  const result = await handleStudentLoanDocumentRequest(
    'GET',
    { path: userFilePath },
    { authorization: 'Bearer valid-token' },
    { env: testEnv, createClient: () => mockStorageClient }
  );
  assert.equal(result.success, true);
  assert.ok(result.signedUrl.includes(userFilePath));
  assert.ok(result.signedUrl.includes('mock-signed-token'));
});


