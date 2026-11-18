import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  createPaymentOrder,
  submitInvestmentEnquiry,
  verifyPaymentSignature
} from '../src/lib/paymentService.js';
import {
  handleCreateOrder,
  handleInvestmentEnquiry,
  handleWebhook,
  handleVerifyPayment
} from '../server/paymentServer.js';

async function withFetch(fetchImplementation, action) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImplementation;
  try {
    return await action();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function paymentAuthOptions(extraEnv = {}) {
  const env = {
    SUPABASE_URL: 'https://auth-test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
    ...extraEnv,
  };
  const savedPayments = [];
  return {
    env,
    savedPayments,
    createClient: () => ({
      auth: {
        admin: {
          async getUserById(userId) {
            assert.equal(userId, 'customer-1');
            return {
              data: {
                user: {
                  id: 'customer-1',
                  email: 'customer@example.com',
                  email_confirmed_at: '2026-01-01T00:00:00.000Z',
                },
              },
              error: null,
            };
          },
        },
        async getUser(token) {
          assert.equal(token, 'valid-token');
          return {
            data: {
              user: {
                id: 'customer-1',
                email: 'customer@example.com',
                email_confirmed_at: '2026-01-01T00:00:00.000Z',
              },
            },
            error: null,
          };
        },
      },
      from(table) {
        assert.equal(table, 'service_payments');
        let insertedRecord;
        const query = {
          insert(values) {
            insertedRecord = values;
            savedPayments.push(values);
            return query;
          },
          select() {
            return query;
          },
          async single() {
            return {
              data: {
                ...insertedRecord,
                receipt_number: insertedRecord.receipt_number,
                order_id: insertedRecord.order_id,
                payment_id: insertedRecord.payment_id,
                amount: insertedRecord.amount,
                currency: insertedRecord.currency,
                service_id: insertedRecord.service_id,
                service_name: insertedRecord.service_name,
                customer_name: insertedRecord.customer_name,
                customer_email: insertedRecord.customer_email,
                customer_phone: insertedRecord.customer_phone,
                payment_method: insertedRecord.payment_method,
                status: insertedRecord.status,
                is_live: insertedRecord.is_live,
                verified_at: insertedRecord.verified_at,
              },
              error: null,
            };
          },
        };
        return query;
      },
    }),
  };
}

test('payment order creation reports API failures instead of generating a client test order', async () => {
  await withFetch(async () => {
    throw new Error('Payment API unavailable');
  }, async () => {
    await assert.rejects(
      createPaymentOrder({ serviceId: 'srv_custom_consultation', accessToken: 'valid-token' }),
      /Payment API unavailable/
    );
  });
});

test('payment verification rejects an unverified response without creating a receipt', async () => {
  const identifier = randomUUID();
  await withFetch(async () => jsonResponse({ success: true, verified: false }), async () => {
    await assert.rejects(
      verifyPaymentSignature({
        razorpay_order_id: `order_${identifier}`,
        razorpay_payment_id: `payment_${identifier}`,
        razorpay_signature: `signature_${identifier}`,
        customer: {},
        service: {},
        accessToken: 'valid-token'
      }),
      /did not verify/
    );
  });
});

test('investment enquiry reports API failures without registering a local success', async () => {
  await withFetch(async () => jsonResponse({ error: 'Enquiry service unavailable' }, 503), async () => {
    await assert.rejects(
      submitInvestmentEnquiry({}),
      /Enquiry service unavailable/
    );
  });
});

test('investment enquiry returns success only after Supabase persists the submitted record', async () => {
  let inserted;
  const result = await handleInvestmentEnquiry({
    fullName: 'Test Customer',
    email: 'CUSTOMER@example.com',
    phone: '+919999999999',
    city: '',
    investmentHorizon: '',
    plannedAmountBracket: '',
    areasOfInterest: [],
    message: '',
  }, {}, {
    env: {
      SUPABASE_URL: 'https://auth-test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
    },
    createClient: () => ({
      from(table) {
        assert.equal(table, 'investment_enquiries');
        return {
          insert(record) {
            inserted = record;
            return this;
          },
          select() {
            return this;
          },
          async single() {
            return { data: { id: inserted.id }, error: null };
          },
        };
      },
    }),
  });

  assert.equal(result.success, true);
  assert.equal(result.enquiryId, inserted.id);
  assert.equal(inserted.email, 'customer@example.com');
  assert.equal(inserted.city, null);
  assert.equal(inserted.investment_horizon, '');
  assert.deepEqual(inserted.areas_of_interest, []);
});

test('signed-in investment enquiry verifies the account and stores its owner ID', async () => {
  let inserted;
  const enquiry = {
    fullName: 'Test Customer',
    email: 'customer@example.com',
    phone: '+919999999999',
    city: '',
    investmentHorizon: '',
    plannedAmountBracket: '',
    areasOfInterest: [],
    message: '',
  };
  await handleInvestmentEnquiry(enquiry, { authorization: 'Bearer valid-token' }, {
    env: {
      SUPABASE_URL: 'https://auth-test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
    },
    createClient: () => ({
      auth: {
        async getUser(token) {
          assert.equal(token, 'valid-token');
          return {
            data: { user: { id: 'customer-123', email: 'customer@example.com', email_confirmed_at: '2026-01-01' } },
            error: null,
          };
        },
      },
      from(table) {
        assert.equal(table, 'investment_enquiries');
        return {
          insert(record) {
            inserted = record;
            return this;
          },
          select() {
            return this;
          },
          async single() {
            return { data: { id: inserted.id }, error: null };
          },
        };
      },
    }),
  });
  assert.equal(inserted.user_id, 'customer-123');
});

test('live order creation does not silently fall back to a test order when Razorpay fails', async () => {
  const options = paymentAuthOptions({
    PAYMENT_GATEWAY_MODE: 'live',
    RAZORPAY_KEY_ID: 'rzp_live_test_key',
    RAZORPAY_KEY_SECRET: 'test-secret',
  });
  const identifier = randomUUID();

  await withFetch(async () => jsonResponse({
      error: { description: 'Razorpay unavailable' }
    }, 503), async () => {
      await assert.rejects(
        handleCreateOrder({
          serviceId: 'srv_custom_consultation',
          customAmount: 999,
          customerName: 'Test Customer',
          customerEmail: `${identifier}@example.com`,
          customerPhone: '+919999999999'
        }, { authorization: 'Bearer valid-token' }, options),
        /Razorpay unavailable/
      );
    });
});

test('payment orders are unavailable instead of using fabricated test credentials', async () => {
  const options = paymentAuthOptions({ PAYMENT_GATEWAY_MODE: 'test' });

  await assert.rejects(
    handleCreateOrder({
      serviceId: 'srv_custom_consultation',
      customAmount: 999,
      customerName: 'Test Customer',
      customerEmail: 'customer@example.com',
      customerPhone: '+919999999999'
    }, { authorization: 'Bearer valid-token' }, options),
    (error) => error.status === 503 && /credentials are configured/.test(error.message)
  );
});

test('test-mode orders are created by the configured Razorpay gateway', async () => {
  const options = paymentAuthOptions({
    PAYMENT_GATEWAY_MODE: 'test',
    RAZORPAY_KEY_ID: 'rzp_test_real_gateway',
    RAZORPAY_KEY_SECRET: 'server-only-test-secret',
  });
  let requestBody;

  const result = await withFetch(async (url, requestOptions) => {
    assert.equal(url, 'https://api.razorpay.com/v1/orders');
    requestBody = JSON.parse(requestOptions.body);
    return jsonResponse({
      id: 'order_test123',
      amount: 149900,
      currency: 'INR'
    });
  }, () => handleCreateOrder({
      serviceId: 'srv_portfolio_review',
      customAmount: 1,
      customerName: 'Test Customer',
      customerEmail: 'customer@example.com',
      customerPhone: '+919999999999'
    }, { authorization: 'Bearer valid-token' }, options));

  assert.equal(result.orderId, 'order_test123');
  assert.equal(result.amount, 1499);
  assert.equal(result.mode, 'test');
  assert.equal(requestBody.amount, 149900);
  assert.equal(requestBody.notes.serviceId, 'srv_portfolio_review');
});

test('payment verification rejects fabricated sandbox signatures before gateway lookup', async () => {
  const envKeys = ['PAYMENT_GATEWAY_MODE', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.PAYMENT_GATEWAY_MODE = 'test';
  process.env.RAZORPAY_KEY_ID = 'rzp_test_real_gateway';
  process.env.RAZORPAY_KEY_SECRET = 'server-only-test-secret';

  try {
    await withFetch(async () => {
      throw new Error('Gateway lookup must not run for an invalid signature.');
    }, async () => {
      await assert.rejects(
        handleVerifyPayment({
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test123',
          razorpay_signature: 'sig_test_fabricated',
          customer: {},
          service: {}
        }),
        /Incomplete payment response/
      );
    });

    test('payment verification confirms gateway capture and saves the receipt to the authenticated account', async () => {
      const orderId = 'order_test987';
      const paymentId = 'pay_test654';
      const secret = 'gateway-test-secret';
      const options = paymentAuthOptions({
        PAYMENT_GATEWAY_MODE: 'test',
        RAZORPAY_KEY_ID: 'rzp_test_real_gateway',
        RAZORPAY_KEY_SECRET: secret,
      });
      const signature = createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      const order = {
        id: orderId,
        status: 'paid',
        amount: 149900,
        currency: 'INR',
        notes: {
          serviceId: 'srv_portfolio_review',
          serviceName: 'Personal Portfolio Planning & Asset Allocation Review',
          amount: '1499',
          customerName: 'Test Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '+919999999999',
          userId: 'customer-1',
        },
      };
      const payment = {
        id: paymentId,
        order_id: orderId,
        status: 'captured',
        captured: true,
        amount: 149900,
        currency: 'INR',
        method: 'upi',
        created_at: 1767323045,
      };

      const result = await withFetch(async (url) => {
        if (url.endsWith(`/orders/${orderId}`)) return jsonResponse(order);
        if (url.endsWith(`/payments/${paymentId}`)) return jsonResponse(payment);
        throw new Error(`Unexpected payment gateway request: ${url}`);
      }, () => handleVerifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        customer: {},
        service: {},
      }, { authorization: 'Bearer valid-token' }, options));

      assert.equal(result.verified, true);
      assert.equal(result.receipt.amount, 1499);
      assert.equal(result.receipt.paymentId, paymentId);
      assert.equal(options.savedPayments.length, 1);
      assert.equal(options.savedPayments[0].user_id, 'customer-1');
      assert.equal(options.savedPayments[0].payment_method, 'upi');
    });

    test('captured Razorpay webhooks are signature-checked and persist the verified receipt', async () => {
      const orderId = 'order_webhook987';
      const paymentId = 'pay_webhook654';
      const webhookSecret = 'server-webhook-secret';
      const options = paymentAuthOptions({
        PAYMENT_GATEWAY_MODE: 'test',
        RAZORPAY_KEY_ID: 'rzp_test_real_gateway',
        RAZORPAY_KEY_SECRET: 'server-only-test-secret',
        RAZORPAY_WEBHOOK_SECRET: webhookSecret,
      });
      const order = {
        id: orderId,
        status: 'paid',
        amount: 149900,
        currency: 'INR',
        notes: {
          serviceId: 'srv_portfolio_review',
          serviceName: 'Personal Portfolio Planning & Asset Allocation Review',
          amount: '1499',
          customerName: 'Test Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '+919999999999',
          userId: 'customer-1',
        },
      };
      const payment = {
        id: paymentId,
        order_id: orderId,
        status: 'captured',
        captured: true,
        amount: 149900,
        currency: 'INR',
        method: 'upi',
        created_at: 1767323045,
      };
      const body = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: payment } },
      });
      const signature = createHmac('sha256', webhookSecret).update(body).digest('hex');

      await withFetch(async (url) => {
        if (url.endsWith(`/orders/${orderId}`)) return jsonResponse(order);
        if (url.endsWith(`/payments/${paymentId}`)) return jsonResponse(payment);
        throw new Error(`Unexpected payment gateway request: ${url}`);
      }, async () => {
        const result = await handleWebhook(body, signature, options);
        assert.equal(result.received, true);
        assert.equal(result.event, 'payment.captured');
      });

      assert.equal(options.savedPayments.length, 1);
      assert.equal(options.savedPayments[0].payment_id, paymentId);
      assert.equal(options.savedPayments[0].user_id, 'customer-1');
    });
  } finally {
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
});
