import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminDashboardData } from '../server/adminDashboard.js';
import { AdminAuthError } from '../server/adminAuth.js';

function createDashboardClient({ queryError = null } = {}) {
  const records = {
    profiles: [{
      id: '123e4567-e89b-42d3-a456-426614174000',
      full_name: 'Customer Example',
      email: 'customer@example.com',
      account_status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
    }],
    service_payments: [{
      id: 'payment-1',
      receipt_number: 'receipt-1',
      service_name: 'Consultation',
      amount: '1499.00',
      currency: 'INR',
      status: 'verified',
      signature: 'must-not-be-selected',
      customer_email: 'private@example.com',
      created_at: '2026-02-01T00:00:00.000Z',
    }],
    investment_enquiries: [{
      id: 'enquiry-1',
      full_name: 'Prospect Example',
      city: 'Pune',
      investment_horizon: '3-5 Years',
      planned_amount_bracket: '₹1,00,000 - ₹5,00,000',
      status: 'new',
      email: 'private@example.com',
      phone: '+911234567890',
      message: 'private enquiry text',
      created_at: '2026-03-01T00:00:00.000Z',
    }],
    admin_activity_logs: [{
      action: 'admin_login',
      metadata: {},
      created_at: '2026-04-01T00:00:00.000Z',
    }],
  };
  const counts = { profiles: 601, service_payments: 1, investment_enquiries: 1 };
  return {
    from(table) {
      return {
        select() {
          const query = {
            order() {
              return query;
            },
            limit: async () => ({
              data: records[table],
              count: counts[table],
              error: queryError,
            }),
          };
          return query;
        },
      };
    },
  };
}

test('admin dashboard reports saved data and exposes enquiry contact details only in the admin view', async () => {
  const dashboard = await getAdminDashboardData(
    { GEMINI_API_KEY: 'server-only-key', GEMINI_MODEL: 'gemini-test-model' },
    undefined,
    createDashboardClient()
  );

  assert.equal(dashboard.overview.customerCount, 601);
  assert.equal(dashboard.overview.verifiedServiceFeeTotal, 1499);
  assert.equal(dashboard.customers[0].emailMasked, 'c***@example.com');
  assert.equal('email' in dashboard.customers[0], false);
  assert.equal('signature' in dashboard.payments[0], false);
  assert.equal('customer_email' in dashboard.payments[0], false);
  assert.equal(dashboard.investmentRecords[0].email, 'private@example.com');
  assert.equal(dashboard.investmentRecords[0].phone, '+911234567890');
  assert.equal(dashboard.investmentRecords[0].message, 'private enquiry text');
  assert.deepEqual(dashboard.supportMessages, {
    available: false,
    reason: 'The current website does not persist support chat or contact messages.',
  });
  assert.equal(dashboard.contentManagement.available, false);
  assert.deepEqual(dashboard.ai, { configured: true, model: 'gemini-test-model' });
  assert.equal(JSON.stringify(dashboard).includes('server-only-key'), false);
});

test('dashboard does not turn database errors into success-shaped empty data', async () => {
  await assert.rejects(
    getAdminDashboardData({}, undefined, createDashboardClient({
      queryError: { code: '42P01' },
    })),
    (error) => error instanceof AdminAuthError && error.status === 503
  );
});
