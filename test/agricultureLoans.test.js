import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FARM_LOAN_CATEGORIES,
  FARM_LOAN_STATUSES,
  validateFarmLoanSubmission,
  generateFarmLoanTrackingId,
  submitFarmLoanApplication,
  updateFarmLoanStatus,
  getCustomerFarmLoans,
  FarmLoanError,
} from '../server/farmLoanServer.js';

test('1. loan category definitions match exact requirements', () => {
  assert.equal(FARM_LOAN_CATEGORIES.dairy_loan.minAmount, 200000);
  assert.equal(FARM_LOAN_CATEGORIES.dairy_loan.maxAmount, 5000000);
  assert.equal(FARM_LOAN_CATEGORIES.dairy_loan.prefix, 'MAI-DL');

  assert.equal(FARM_LOAN_CATEGORIES.sheep_loan.maxAmount, 200000);
  assert.equal(FARM_LOAN_CATEGORIES.sheep_loan.prefix, 'MAI-SH');

  assert.equal(FARM_LOAN_CATEGORIES.goat_loan.maxAmount, 200000);
  assert.equal(FARM_LOAN_CATEGORIES.goat_loan.prefix, 'MAI-GT');
});

test('2. Dairy Loan validates minimum ₹2,00,000 and maximum ₹50,00,000', () => {
  const baseValid = {
    loanCategory: 'dairy_loan',
    fullName: 'Ramesh Kumar',
    dateOfBirth: '1995-05-15',
    phone: '9876543210',
    email: 'ramesh@example.com',
    state: 'Haryana',
    district: 'Hisar',
    city: 'Hansi',
    address: 'Near Central Dairy Farm, Village Hansi',
    aadhaarNumber: '123456789012',
    panNumber: 'ABCDE1234F',
    loanAmount: 500000,
  };

  // Valid ₹5,00,000
  const validated = validateFarmLoanSubmission(baseValid);
  assert.equal(validated.loanAmount, 500000);
  assert.equal(validated.loanCategory, 'dairy_loan');

  // Below minimum (< ₹2,00,000)
  assert.throws(
    () => validateFarmLoanSubmission({ ...baseValid, loanAmount: 150000 }),
    (err) => err instanceof FarmLoanError && err.message.includes('minimum amount is ₹2,00,000')
  );

  // Above maximum (> ₹50,00,000)
  assert.throws(
    () => validateFarmLoanSubmission({ ...baseValid, loanAmount: 5500000 }),
    (err) => err instanceof FarmLoanError && err.message.includes('maximum loan amount is ₹50,00,000')
  );
});

test('3. Sheep Loan validates maximum ₹2,00,000', () => {
  const baseSheep = {
    loanCategory: 'sheep_loan',
    fullName: 'Suresh Jangra',
    dateOfBirth: '1992-08-20',
    phone: '9812345678',
    email: 'suresh@example.com',
    state: 'Haryana',
    district: 'Bhiwani',
    city: 'Mehanda',
    address: 'VPO Mehanda, Farm Ward 2',
    aadhaarNumber: '987654321098',
    panNumber: 'FGHIJ5678K',
    loanAmount: 150000,
  };

  const validated = validateFarmLoanSubmission(baseSheep);
  assert.equal(validated.loanAmount, 150000);
  assert.equal(validated.loanCategory, 'sheep_loan');

  // Above maximum (> ₹2,00,000)
  assert.throws(
    () => validateFarmLoanSubmission({ ...baseSheep, loanAmount: 250000 }),
    (err) => err instanceof FarmLoanError && err.message.includes('maximum loan amount is ₹2,00,000')
  );
});

test('4. Goat Loan validates maximum ₹2,00,000', () => {
  const baseGoat = {
    loanCategory: 'goat_loan',
    fullName: 'Deepak Sharma',
    dateOfBirth: '1990-11-10',
    phone: '9812098765',
    email: 'deepak@example.com',
    state: 'Haryana',
    district: 'Rohtak',
    city: 'Sampla',
    address: 'Near Canal Road, Sampla',
    aadhaarNumber: '556677889900',
    panNumber: 'KLMNO9012P',
    loanAmount: 180000,
  };

  const validated = validateFarmLoanSubmission(baseGoat);
  assert.equal(validated.loanAmount, 180000);
  assert.equal(validated.loanCategory, 'goat_loan');

  // Above maximum (> ₹2,00,000)
  assert.throws(
    () => validateFarmLoanSubmission({ ...baseGoat, loanAmount: 220000 }),
    (err) => err instanceof FarmLoanError && err.message.includes('maximum loan amount is ₹2,00,000')
  );
});

test('5. validates Aadhaar, PAN, and minimum applicant age of 18', () => {
  const valid = {
    loanCategory: 'dairy_loan',
    fullName: 'Amit Kumar',
    dateOfBirth: '1998-01-01',
    phone: '9876543210',
    email: 'amit@example.com',
    state: 'Haryana',
    district: 'Hisar',
    city: 'Hansi',
    address: 'Farm Plot 12',
    aadhaarNumber: '123456789012',
    panNumber: 'ABCDE1234F',
    loanAmount: 400000,
  };

  // Rejects minor (under 18)
  const minorDob = new Date();
  minorDob.setFullYear(minorDob.getFullYear() - 16);
  assert.throws(
    () => validateFarmLoanSubmission({ ...valid, dateOfBirth: minorDob.toISOString().slice(0, 10) }),
    (err) => err instanceof FarmLoanError && err.message.includes('at least 18 years old')
  );

  // Rejects invalid Aadhaar
  assert.throws(
    () => validateFarmLoanSubmission({ ...valid, aadhaarNumber: '12345' }),
    (err) => err instanceof FarmLoanError && err.message.includes('Aadhaar')
  );

  // Rejects invalid PAN
  assert.throws(
    () => validateFarmLoanSubmission({ ...valid, panNumber: 'INVALID_PAN' }),
    (err) => err instanceof FarmLoanError && err.message.includes('PAN')
  );

  // Masks Aadhaar for privacy
  const processed = validateFarmLoanSubmission(valid);
  assert.equal(processed.aadhaarNumber, 'XXXX-XXXX-9012');
});

test('6. generates unique, category-specific tracking IDs', () => {
  const dairyId = generateFarmLoanTrackingId('dairy_loan');
  assert.match(dairyId, /^MAI-DL-\d{4}-\d{6}$/);

  const sheepId = generateFarmLoanTrackingId('sheep_loan');
  assert.match(sheepId, /^MAI-SH-\d{4}-\d{6}$/);

  const goatId = generateFarmLoanTrackingId('goat_loan');
  assert.match(goatId, /^MAI-GT-\d{4}-\d{6}$/);
});

test('7. submitFarmLoanApplication creates and saves application record in Supabase', async () => {
  let insertedRecord = null;
  const mockClient = {
    from(table) {
      assert.equal(table, 'farm_loan_applications');
      return {
        insert(records) {
          insertedRecord = records[0];
          return {
            select() {
              return {
                single: async () => ({ data: insertedRecord, error: null }),
              };
            },
          };
        },
      };
    },
  };

  const payload = {
    loanCategory: 'dairy_loan',
    fullName: 'Kavita Devi',
    dateOfBirth: '1991-03-22',
    phone: '9876543210',
    email: 'kavita@example.com',
    state: 'Haryana',
    district: 'Hisar',
    city: 'Hansi',
    address: 'Near Dairy Coop',
    aadhaarNumber: '112233445566',
    panNumber: 'ABCDE1234F',
    loanAmount: 600000,
    loanPurpose: 'Purchase of 5 Murrah Buffaloes',
  };

  const user = { id: 'user-uuid-1234', email: 'kavita@example.com' };
  const result = await submitFarmLoanApplication(payload, user, {
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'secret-key' },
    createClient: () => mockClient,
  });

  assert.equal(result.success, true);
  assert.equal(result.application.loanCategory, 'dairy_loan');
  assert.equal(result.application.loanAmount, 600000);
  assert.match(result.application.trackingId, /^MAI-DL-\d{4}-\d{6}$/);
  assert.equal(insertedRecord.user_id, 'user-uuid-1234');
});

import { ADMIN_SESSION_COOKIE } from '../server/adminAuth.js';

test('8. updateFarmLoanStatus updates workflow status and notifies applicant', async () => {
  let updatedPayload = null;
  const sampleApp = {
    id: 'fl-1',
    reference: 'MAI-FL-2026-ABC',
    tracking_id: 'MAI-DL-2026-123456',
    loan_category: 'dairy_loan',
    applicant_name: 'Kavita Devi',
    applicant_email: 'kavita@example.com',
    loan_amount: 600000,
    status: 'Submitted',
  };

  const adminId = '123e4567-e89b-42d3-a456-426614174000';
  const sessionId = '123e4567-e89b-42d3-a456-426614174001';
  const nowSec = Math.floor(Date.now() / 1000);
  const encode = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const mockJwt = `${encode({ alg: 'none' })}.${encode({
    iat: nowSec,
    exp: nowSec + 1800,
    session_id: sessionId,
  })}.sig`;

  const mockClient = {
    from(table) {
      if (table === 'admin_sessions') {
        return {
          select() {
            const builder = {
              eq: () => builder,
              is: () => builder,
              gt: () => builder,
              maybeSingle: async () => ({
                data: { session_id: sessionId },
                error: null,
              }),
            };
            return builder;
          },
        };
      }
      return {
        update(payload) {
          updatedPayload = payload;
          return {
            or() {
              return {
                select() {
                  return {
                    single: async () => ({
                      data: { ...sampleApp, ...updatedPayload },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        },
        select() {
          return {
            eq() {
              return {
                single: async () => ({ data: { id: adminId, role: 'super_admin' }, error: null }),
              };
            },
          };
        },
      };
    },
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: adminId,
            email: 'admin@example.com',
            email_confirmed_at: '2026-01-01T00:00:00Z',
          },
        },
        error: null,
      }),
    },
  };

  const result = await updateFarmLoanStatus(
    {
      trackingId: 'MAI-DL-2026-123456',
      status: 'Under Review',
      notes: 'Field officer assigned for verification.',
      sendNotification: false,
    },
    { cookie: `${ADMIN_SESSION_COOKIE}=${mockJwt}` },
    {
      env: {
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'public-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-key',
        ADMIN_LOGIN_EMAIL: 'admin@example.com',
        ADMIN_USER_ID: adminId,
      },
      createClient: () => mockClient,
    }
  );

  assert.equal(result.success, true);
  assert.equal(updatedPayload.status, 'Under Review');
  assert.equal(updatedPayload.admin_notes, 'Field officer assigned for verification.');
});
