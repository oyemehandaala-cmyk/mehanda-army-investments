import assert from 'node:assert/strict';
import test from 'node:test';
import {
  handleStudentLoanDocumentRequest,
  handleStudentLoanEnquiryRequest,
} from '../server/studentLoanEnquiries.js';

const user = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'customer@example.com',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
};
const env = {
  SUPABASE_URL: 'https://project-test.supabase.co',
  SUPABASE_SECRET_KEY: 'server-only-test-key',
};
const headers = { authorization: 'Bearer valid-access-token' };

function createClient(authUser = user, storage = null) {
  return {
    auth: {
      async getUser(token) {
        assert.equal(token, 'valid-access-token');
        return { data: { user: authUser }, error: null };
      },
    },
    storage,
  };
}

function getSubmissionPayload(overrides = {}) {
  return {
    fullName: 'Test Applicant',
    verificationName: ' test   applicant ',
    email: user.email,
    mobileNumber: '9876543210',
    dateOfBirth: '2000-01-01',
    applicantState: 'Haryana',
    applicantDistrict: 'Bhiwani',
    applicantCity: 'Mehanda',
    applicantAddress: 'Test address, Mehandipur',
    institutionName: 'Test College',
    courseName: 'Computer Science',
    privacyConsent: true,
    idempotencyKey: '123e4567-e89b-42d3-a456-426614174001',
    guardianConsent: false,
    ...overrides,
  };
}

test('student loan enquiry requires a bearer session', async () => {
  await assert.rejects(
    handleStudentLoanEnquiryRequest('POST', getSubmissionPayload(), {}, {}, { env }),
    (error) => error.status === 401
  );
});

test('student loan enquiry rejects unverified account email and email mismatch', async () => {
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      getSubmissionPayload(),
      {},
      headers,
      { env, createClient: () => createClient({ ...user, email_confirmed_at: null }) }
    ),
    (error) => error.status === 403
  );
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      getSubmissionPayload({ email: 'other@example.com' }),
      {},
      headers,
      { env, createClient: () => createClient() }
    ),
    (error) => error.status === 403
  );
});

test('student loan enquiry sends validated details and returns the database tracking ID', async () => {
  const requests = [];
  const record = {
    reference: 'MAI-SL-2026-0123456789ABCDEF0123456789ABCDEF',
    tracking_id: 'MAI-2026-000001',
    user_id: user.id,
    applicant_name: 'Test Applicant',
    applicant_email: user.email,
    applicant_phone: '9876543210',
    applicant_age: 26,
    applicant_dob: '2000-01-01',
    applicant_state: 'Haryana',
    applicant_district: 'Bhiwani',
    applicant_city: 'Mehanda',
    applicant_address: 'Test address, Mehandipur',
    verification_name: 'test applicant',
    school_name: 'Test College',
    course_name: 'Computer Science',
    status: 'Submitted',
    enquiry_status: 'Submitted',
    submitted_at: '2026-11-06T12:00:00.000Z',
    status_updated_at: '2026-11-06T12:00:00.000Z',
    is_test: true,
    guardian_consent: false,
    is_minor: false,
  };
  const result = await handleStudentLoanEnquiryRequest(
    'POST',
    getSubmissionPayload(),
    {},
    headers,
    {
      env,
      createClient: () => createClient(),
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return new Response(JSON.stringify(record), { status: 200 });
      },
    }
  );

  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url,
    `${env.SUPABASE_URL}/rest/v1/rpc/create_student_loan_enquiry_test_v2`
  );
  const payload = JSON.parse(requests[0].options.body);
  assert.equal(payload.p_user_id, user.id);
  assert.equal(payload.p_applicant_age, 26);
  assert.equal(payload.p_applicant_district, 'Bhiwani');
  assert.equal(payload.p_applicant_city, 'Mehanda');
  assert.equal(payload.p_applicant_address, 'Test address, Mehandipur');
  assert.equal(payload.p_verification_name, 'test   applicant');
  assert.equal(payload.p_school_name, 'Test College');
  assert.equal(payload.p_idempotency_key, getSubmissionPayload().idempotencyKey);
  assert.equal(Object.hasOwn(payload, 'p_pan_card_number'), false);
  assert.equal(Object.hasOwn(payload, 'p_voter_id_number'), false);
  assert.equal(result.application.trackingId, record.tracking_id);
  assert.equal(result.application.applicantAddress, record.applicant_address);
  assert.equal(result.application.isTest, true);
});

test('student loan enquiry rejects name mismatches and identity fields', async () => {
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      getSubmissionPayload({ verificationName: 'Test Applicant Jr' }),
      {},
      headers,
      { env, createClient: () => createClient() }
    ),
    (error) => error.status === 400 && /names must match/i.test(error.message)
  );
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      getSubmissionPayload({ panCardNumber: 'ABCDE1234F' }),
      {},
      headers,
      { env, createClient: () => createClient() }
    ),
    (error) => error.status === 400 && /unsupported information/i.test(error.message)
  );
});

test('student loan enquiry validates state and district pairing', async () => {
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      getSubmissionPayload({ applicantDistrict: 'Pune' }),
      {},
      headers,
      { env, createClient: () => createClient() }
    ),
    (error) => error.status === 400 && /district belonging/i.test(error.message)
  );
});

test('student loan enquiry requires all core fields and explicit consent', async () => {
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      getSubmissionPayload({ courseName: '' }),
      {},
      headers,
      { env, createClient: () => createClient() }
    ),
    (error) => error.status === 400 && /course name/i.test(error.message)
  );
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      getSubmissionPayload({ privacyConsent: false }),
      {},
      headers,
      { env, createClient: () => createClient() }
    ),
    (error) => error.status === 400 && /consent/i.test(error.message)
  );
});

test('minor enquiries require guardian details and pass guardian consent to the database', async () => {
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      getSubmissionPayload({ dateOfBirth: '2009-01-01' }),
      {},
      headers,
      { env, createClient: () => createClient() }
    ),
    (error) => error.status === 400 && /guardian/i.test(error.message)
  );

  let payload;
  const result = await handleStudentLoanEnquiryRequest(
    'POST',
    getSubmissionPayload({
      dateOfBirth: '2009-01-01',
      guardianName: 'Parent Guardian',
      guardianPhone: '9876543211',
      guardianRelationship: 'Parent',
      guardianConsent: true,
    }),
    {},
    headers,
    {
      env,
      createClient: () => createClient(),
      fetchImpl: async (_url, options) => {
        payload = JSON.parse(options.body);
        return new Response(JSON.stringify({
          reference: 'MAI-SL-2026-0123456789ABCDEF0123456789ABCDEF',
          tracking_id: 'MAI-2026-000002',
          applicant_age: 17,
          is_minor: true,
          guardian_name: 'Parent Guardian',
          guardian_phone: '9876543211',
          guardian_relationship: 'Parent',
          guardian_consent: true,
          status: 'Submitted',
        }), { status: 200 });
      },
    }
  );
  assert.equal(payload.p_guardian_name, 'Parent Guardian');
  assert.equal(payload.p_guardian_consent, true);
  assert.equal(result.application.isMinor, true);
});

test('tracking queries are scoped to the signed-in customer and tracking ID', async () => {
  const urls = [];
  const record = {
    reference: 'MAI-SL-2026-0123456789ABCDEF0123456789ABCDEF',
    tracking_id: 'MAI-2026-000001',
    user_id: user.id,
    enquiry_status: 'Under Review',
    submitted_at: '2026-11-06T12:00:00.000Z',
    status_updated_at: '2026-11-07T12:00:00.000Z',
    latest_customer_remark: 'Reviewing your enquiry.',
  };
  const result = await handleStudentLoanEnquiryRequest(
    'GET',
    {},
    { trackingId: 'MAI-2026-000001' },
    headers,
    {
      env,
      createClient: () => createClient(),
      fetchImpl: async (url) => {
        urls.push(url);
        return new Response(JSON.stringify(
          url.includes('student_loan_status_history') ? [] : [record]
        ), { status: 200 });
      },
    }
  );
  assert.match(urls[0], /tracking_id=eq\.MAI-2026-000001/);
  assert.match(urls[0], /user_id=eq\.123e4567-e89b-12d3-a456-426614174000/);
  assert.equal(result.application.status, 'Under Review');
  assert.equal(result.application.latestCustomerRemark, 'Reviewing your enquiry.');
  assert.deepEqual(result.application.statusHistory, []);
});

test('private test-file upload accepts only safe, named sample files', async () => {
  let uploaded;
  const storage = {
    from(bucket) {
      assert.equal(bucket, 'student-loan-test-files');
      return {
        async upload(path, bytes, options) {
          uploaded = { path, bytes: bytes.toString('utf8'), options };
          return { data: { path }, error: null };
        },
      };
    },
  };
  const bytes = Buffer.from('harmless sample file');
  const result = await handleStudentLoanDocumentRequest(
    'POST',
    {
      fileName: 'sample.txt',
      contentType: 'text/plain',
      size: bytes.length,
      contentBase64: bytes.toString('base64'),
    },
    headers,
    { env, createClient: () => createClient(user, storage) }
  );
  assert.match(uploaded.path, new RegExp(`^${user.id}/[0-9a-f-]+\\.txt$`));
  assert.equal(uploaded.bytes, 'harmless sample file');
  assert.equal(uploaded.options.upsert, false);
  assert.equal(result.document.path, uploaded.path);

  await assert.rejects(
    handleStudentLoanDocumentRequest(
      'POST',
      {
        fileName: 'sample.txt',
        contentType: 'text/plain',
        size: Buffer.byteLength('Aadhaar: 1234 5678 9012'),
        contentBase64: Buffer.from('Aadhaar: 1234 5678 9012').toString('base64'),
      },
      headers,
      { env, createClient: () => createClient(user, storage) }
    ),
    (error) => error.status === 400 && /identity numbers/i.test(error.message)
  );
});

test('database failures do not produce a successful enquiry response', async () => {
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      getSubmissionPayload(),
      {},
      headers,
      {
        env,
        createClient: () => createClient(),
        fetchImpl: async () => new Response(JSON.stringify({ message: 'database unavailable' }), {
          status: 500,
        }),
      }
    ),
    (error) => error.status === 503
  );
});

test('student loan enquiry validates requested amount between ₹100 and ₹1,000', async () => {
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      getSubmissionPayload({ loanAmount: 50 }),
      {},
      headers,
      { env, createClient: () => createClient() }
    ),
    (error) => error.status === 400 && /between ₹100 and ₹1,000/i.test(error.message)
  );
  await assert.rejects(
    handleStudentLoanEnquiryRequest(
      'POST',
      getSubmissionPayload({ loanAmount: 1500 }),
      {},
      headers,
      { env, createClient: () => createClient() }
    ),
    (error) => error.status === 400 && /between ₹100 and ₹1,000/i.test(error.message)
  );

  const record = {
    reference: 'MAI-SL-2026-0123456789ABCDEF0123456789ABCDEF',
    tracking_id: 'MAI-2026-000002',
    user_id: user.id,
    applicant_name: 'Test Applicant',
    applicant_email: user.email,
    applicant_phone: '9876543210',
    applicant_age: 26,
    applicant_dob: '2000-01-01',
    applicant_state: 'Haryana',
    applicant_district: 'Bhiwani',
    applicant_city: 'Mehanda',
    applicant_address: 'Test address, Mehandipur',
    school_name: 'Test College',
    course_name: 'Computer Science',
    status: 'Submitted',
    loan_amount: 700,
    submitted_at: '2026-11-06T12:00:00.000Z',
    status_updated_at: '2026-11-06T12:00:00.000Z',
    is_test: true,
  };
  const result = await handleStudentLoanEnquiryRequest(
    'POST',
    getSubmissionPayload({ loanAmount: 700 }),
    {},
    headers,
    {
      env,
      createClient: () => createClient(),
      fetchImpl: async () => {
        return new Response(JSON.stringify(record), { status: 200 });
      },
    }
  );
  assert.equal(result.application.loanAmount, 700);
});
