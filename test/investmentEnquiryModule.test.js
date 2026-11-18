import assert from 'node:assert/strict';
import test from 'node:test';
import {
  handleInvestmentEnquiry,
  handleUpdateInvestmentEnquiry,
} from '../server/paymentServer.js';

const testEnv = {
  SUPABASE_URL: 'https://auth-test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
  ADMIN_USER_ID: 'admin-uuid-1234',
  ADMIN_LOGIN_EMAIL: 'admin@mehandaarmy.in',
};

function createMockSupabaseClient(overrides = {}) {
  let insertedRecord = null;
  let updatedRecord = null;
  return {
    getInserted: () => insertedRecord,
    getUpdated: () => updatedRecord,
    client: {
      auth: {
        async getUser(token) {
          if (overrides.authUser) return { data: { user: overrides.authUser }, error: null };
          if (token === 'valid-customer-token') {
            return {
              data: {
                user: {
                  id: 'customer-uuid-001',
                  email: 'investor@example.com',
                  email_confirmed_at: '2026-01-01T00:00:00Z',
                },
              },
              error: null,
            };
          }
          if (token === 'valid-admin-token') {
            return {
              data: {
                user: {
                  id: 'admin-uuid-1234',
                  email: 'admin@mehandaarmy.in',
                  email_confirmed_at: '2026-01-01T00:00:00Z',
                },
              },
              error: null,
            };
          }
          return { data: { user: null }, error: new Error('Invalid token') };
        },
      },
      from(table) {
        assert.equal(table, 'investment_enquiries');
        return {
          insert(record) {
            insertedRecord = record;
            return this;
          },
          update(record) {
            updatedRecord = record;
            return this;
          },
          select() {
            return this;
          },
          or() {
            return { error: null };
          },
          async single() {
            return { data: { id: insertedRecord?.id || 'enq_12345' }, error: null };
          },
        };
      },
    },
  };
}

test('investment enquiry rejects applicant below 18 years old', async () => {
  const minorPayload = {
    fullName: 'Minor Applicant',
    email: 'minor@example.com',
    phone: '+919876543210',
    dateOfBirth: '2015-05-10', // 11 years old
    age: 11,
    city: 'Bhiwani',
  };

  await assert.rejects(
    handleInvestmentEnquiry(minorPayload, {}, { env: testEnv, createClient: () => createMockSupabaseClient().client }),
    (error) => {
      assert.equal(error.status, 400);
      assert.match(error.message, /18 years or older/);
      return true;
    }
  );
});

test('investment enquiry accepts complete 5-step payload and returns formatted tracking ID', async () => {
  const mock = createMockSupabaseClient();
  const validPayload = {
    fullName: 'Rajesh Sharma',
    email: 'investor@example.com',
    phone: '+919812947813',
    dateOfBirth: '1995-08-15',
    age: 30,
    address: 'H No 123, Model Town',
    state: 'Haryana',
    district: 'Bhiwani',
    city: 'Mehanda',
    pinCode: '127021',
    interestCategory: 'Portfolio Planning & Asset Allocation',
    investmentObjective: 'Long-Term Wealth Creation',
    plannedAmountBracket: '₹25,000–₹50,000',
    investmentHorizon: '5–10 Years (Long Term)',
    customerExpectations: 'Information & Strategy Consultation',
    riskUnderstanding: 'Moderate / Balanced Risk',
    knowledgeLevel: 'Intermediate',
    investmentGoals: 'Balanced Long-Term Growth',
    riskAcknowledged: true,
    privacyConsent: true,
    additionalQuestions: 'Would like advice on multi-asset diversification.',
  };

  const result = await handleInvestmentEnquiry(
    validPayload,
    { authorization: 'Bearer valid-customer-token' },
    { env: testEnv, createClient: () => mock.client }
  );

  assert.equal(result.success, true);
  assert.ok(result.trackingId.startsWith('MAI-INV-'));
  assert.equal(result.enquiry.status, 'Submitted');

  const saved = mock.getInserted();
  assert.ok(saved);
  assert.equal(saved.full_name, 'Rajesh Sharma');
  assert.equal(saved.email, 'investor@example.com');
  assert.equal(saved.age, 31);
  assert.equal(saved.user_id, 'customer-uuid-001');
  assert.equal(saved.state, 'Haryana');
  assert.equal(saved.district, 'Bhiwani');
  assert.equal(saved.pin_code, '127021');
  assert.equal(saved.interest_category, 'Portfolio Planning & Asset Allocation');
  assert.equal(saved.investment_objective, 'Long-Term Wealth Creation');
  assert.equal(saved.risk_acknowledged, true);
  assert.equal(saved.privacy_consent, true);
  assert.equal(saved.status, 'Submitted');
});

test('investment enquiry status update requires admin credentials and validates status', async () => {
  // Missing admin credentials
  await assert.rejects(
    handleUpdateInvestmentEnquiry({ id: 'enq_123', status: 'Under Review' }, {}, { env: testEnv }),
    (error) => error.status === 401
  );

  // Invalid status
  const mock = createMockSupabaseClient();
  await assert.rejects(
    handleUpdateInvestmentEnquiry(
      { id: 'enq_123', status: 'NonExistentStatus' },
      { authorization: 'Bearer admin-token' },
      {
        env: testEnv,
        createClient: () => mock.client,
        requireAdmin: async () => ({ id: 'admin-uuid-1234' }),
      }
    ),
    (error) => error.status === 400
  );

  // Valid status update
  const updateResult = await handleUpdateInvestmentEnquiry(
    { id: 'enq_123', status: 'Contacted', adminNotes: 'Spoke with client on phone' },
    { authorization: 'Bearer admin-token' },
    {
      env: testEnv,
      createClient: () => mock.client,
      requireAdmin: async () => ({ id: 'admin-uuid-1234' }),
    }
  );
  assert.equal(updateResult.success, true);
  assert.equal(updateResult.status, 'Contacted');
  const updated = mock.getUpdated();
  assert.equal(updated.status, 'Contacted');
  assert.equal(updated.admin_notes, 'Spoke with client on phone');
});
