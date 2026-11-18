import assert from 'node:assert/strict';
import test from 'node:test';
import { handleContactEnquiry, handleUpdateContactEnquiry } from '../server/contactEnquiryHandler.js';
import { AdminAuthError } from '../server/adminAuth.js';

function createMockSupabase(insertedRows = []) {
  return {
    auth: {
      async getUser(token) {
        if (token === 'valid-user-token') {
          return { data: { user: { id: 'usr-123', email: 'customer@example.com' } }, error: null };
        }
        return { data: { user: null }, error: new Error('Invalid token') };
      },
    },
    from(table) {
      return {
        insert(record) {
          const row = {
            id: 'MAI-CON-2026-TEST01',
            created_at: new Date().toISOString(),
            ...record,
          };
          insertedRows.push({ table, row });
          return {
            select() {
              return {
                single: async () => ({ data: row, error: null }),
              };
            },
          };
        },
        update(updatePayload) {
          return {
            eq(col, val) {
              return Promise.resolve({ error: null });
            },
          };
        },
        select() {
          return {
            eq() {
              return {
                single: async () => ({
                  data: { id: 'MAI-CON-2026-TEST01', status: 'Submitted' },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  };
}

const testEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'test-secret-key',
  ADMIN_LOGIN_EMAIL: 'admin@mehandaarmy.in',
};

test('contact enquiry rejects invalid payload or missing consent', async () => {
  await assert.rejects(
    handleContactEnquiry({}, {}, { env: testEnv, createClient: () => createMockSupabase() }),
    { message: /Please provide a valid full name/ }
  );

  await assert.rejects(
    handleContactEnquiry({ fullName: 'Rajesh Sharma', phone: '9812947813', consent: true }, {}, { env: testEnv, createClient: () => createMockSupabase() }),
    { message: /Please provide a valid Gmail \/ email address/ }
  );

  await assert.rejects(
    handleContactEnquiry({ fullName: 'Rajesh Sharma', phone: '9812947813', email: 'rajesh@example.com', consent: false }, {}, { env: testEnv, createClient: () => createMockSupabase() }),
    { message: /Consent to contact is required/ }
  );
});

test('contact enquiry successfully saves record and returns tracking ID', async () => {
  const insertedRows = [];
  const result = await handleContactEnquiry(
    {
      fullName: 'Subedar Major Ramesh Kumar',
      phone: '+91 9876543210',
      email: 'ramesh.kumar@example.com',
      serviceInterest: 'Portfolio Planning & Blueprinting',
      message: 'Requesting consultation on pension wealth planning.',
      consent: true,
    },
    {},
    { env: testEnv, createClient: () => createMockSupabase(insertedRows) }
  );

  assert.equal(result.success, true);
  assert.equal(result.trackingId, 'MAI-CON-2026-TEST01');
  assert.equal(insertedRows.length, 1);
  assert.equal(insertedRows[0].table, 'contact_enquiries');
  assert.equal(insertedRows[0].row.full_name, 'Subedar Major Ramesh Kumar');
  assert.equal(insertedRows[0].row.phone, '+91 9876543210');
  assert.equal(insertedRows[0].row.consent, true);
  assert.equal(insertedRows[0].row.status, 'Submitted');
});

test('contact enquiry status update requires admin credentials and validates status', async () => {
  // Without admin credentials
  await assert.rejects(
    handleUpdateContactEnquiry(
      { id: 'MAI-CON-2026-TEST01', status: 'Contacted' },
      {},
      { env: testEnv }
    ),
    (err) => err instanceof AdminAuthError || err.status === 401
  );

  // With mock admin
  const mockRequireAdmin = async () => true;
  const result = await handleUpdateContactEnquiry(
    { id: 'MAI-CON-2026-TEST01', status: 'Contacted', adminNotes: 'Called applicant; agreed on meeting.' },
    {},
    {
      env: testEnv,
      createClient: () => createMockSupabase(),
      requireAdmin: mockRequireAdmin,
    }
  );

  assert.equal(result.success, true);
});

