import { createAdminServiceClient, AdminAuthError } from './adminAuth.js';

function maskEmail(email) {
  if (typeof email !== 'string') return '';
  const [name, domain] = email.split('@');
  if (!name || !domain) return '';
  return `${name.slice(0, 1)}***@${domain}`;
}

function requireRows(result, tableName) {
  if (result.error) {
    console.error('[admin-dashboard] data query failed', {
      table: tableName,
      code: result.error.code || 'unknown',
    });
    throw new AdminAuthError(503, 'Dashboard data is temporarily unavailable. Confirm the Supabase schema is applied.');
  }
  return result.data || [];
}

// Soft-fail: returns empty array + logs warning (table may not exist yet)
function softRows(result, tableName) {
  if (result.error) {
    console.warn('[admin-dashboard] optional table unavailable', {
      table: tableName,
      code: result.error.code || 'unknown',
    });
    return [];
  }
  return result.data || [];
}

export async function getAdminDashboardData(
  env = process.env,
  createClient,
  client = createAdminServiceClient(env, createClient)
) {
  const [
    profileResult,
    paymentResult,
    enquiryResult,
    contactResult,
    studentLoanResult,
    farmLoanResult,
    activityResult,
  ] = await Promise.all([
    client.from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(500),
    client.from('service_payments')
      .select('id,receipt_number,service_name,amount,currency,status,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(500),
    client.from('investment_enquiries')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(500),
    // contact_enquiries is optional — table created by migration
    client.from('contact_enquiries')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(500),
    // student_loan_demo_applications is optional / soft
    client.from('student_loan_demo_applications')
      .select('*', { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .limit(500),
    // farm_loan_applications is optional / soft
    client.from('farm_loan_applications')
      .select('*', { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .limit(500),
    client.from('admin_activity_logs')
      .select('action,metadata,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  // Retrieve auth.users if admin auth service client is available
  let authUsers = [];
  try {
    if (client.auth?.admin?.listUsers && typeof client.auth.admin.listUsers === 'function') {
      const listRes = await client.auth.admin.listUsers().catch(() => null);
      if (Array.isArray(listRes?.data?.users)) {
        authUsers = listRes.data.users;
      }
    }
  } catch (authUsersErr) {
    console.warn('[admin-dashboard] listUsers warning:', authUsersErr?.message);
  }

  const profiles = requireRows(profileResult, 'profiles');
  const payments = requireRows(paymentResult, 'service_payments');
  const enquiries = requireRows(enquiryResult, 'investment_enquiries');
  const contactEnquiries = softRows(contactResult, 'contact_enquiries');
  const studentLoans = softRows(studentLoanResult, 'student_loan_demo_applications');
  const farmLoans = softRows(farmLoanResult, 'farm_loan_applications');
  const activity = requireRows(activityResult, 'admin_activity_logs');
  const verifiedPayments = payments.filter((payment) =>
    ['verified', 'captured'].includes(String(payment.status || '').toLowerCase())
  );

  // Unified All Submissions view — merges all form types with common shape
  const allSubmissions = [
    ...enquiries.map((e) => ({
      id: e.id,
      formType: 'investment',
      formTypeLabel: 'Investment Enquiry',
      trackingRef: e.tracking_id || e.id,
      customerName: e.full_name,
      email: e.email,
      verifiedEmail: e.verified_email || e.email,
      emailVerifiedAt: e.email_verified_at || null,
      isEmailVerified: Boolean(e.email_verified_at || e.verified_email),
      phone: e.phone,
      status: e.status || 'Submitted',
      createdAt: e.created_at,
      updatedAt: e.updated_at || e.created_at,
      rawRecord: e,
    })),
    ...contactEnquiries.map((c) => ({
      id: c.id,
      formType: 'contact',
      formTypeLabel: 'Contact / Callback',
      trackingRef: c.id,
      customerName: c.full_name,
      email: c.email,
      verifiedEmail: c.verified_email || c.email,
      emailVerifiedAt: c.email_verified_at || null,
      isEmailVerified: Boolean(c.email_verified_at || c.verified_email),
      phone: c.phone,
      status: c.status || 'Submitted',
      createdAt: c.created_at,
      updatedAt: c.updated_at || c.created_at,
      rawRecord: c,
    })),
    ...studentLoans.map((s) => {
      let docs = s.documents;
      let verifiedEmail = s.verified_email || s.applicant_email;
      let emailVerifiedAt = s.email_verified_at || null;
      if (typeof s.enquiry_purpose === 'string' && s.enquiry_purpose.startsWith('{')) {
        try {
          const ep = JSON.parse(s.enquiry_purpose);
          if (!docs) docs = ep.documents || null;
          if (ep.verifiedEmail) verifiedEmail = ep.verifiedEmail;
          if (ep.emailVerifiedAt) emailVerifiedAt = ep.emailVerifiedAt;
        } catch {}
      }
      return {
        id: s.reference || s.tracking_id,
        formType: 'student_loan',
        formTypeLabel: 'Student Loan Application',
        trackingRef: s.tracking_id || s.reference,
        customerName: s.applicant_name,
        email: s.applicant_email,
        verifiedEmail,
        emailVerifiedAt,
        isEmailVerified: Boolean(emailVerifiedAt || s.verified_email || (typeof s.enquiry_purpose === 'string' && s.enquiry_purpose.includes('"verifiedEmail"'))),
        phone: s.applicant_phone,
        status: s.enquiry_status || s.status || 'Submitted',
        loanAmount: s.loan_amount,
        documents: docs,
        documentMetadata: s.test_document_path ? {
          path: s.test_document_path,
          fileName: s.test_document_name,
          contentType: s.test_document_type,
          size: s.test_document_size,
        } : null,
        createdAt: s.submitted_at || s.created_at,
        updatedAt: s.status_updated_at || s.updated_at || s.submitted_at,
        rawRecord: s,
      };
    }),
    ...farmLoans.map((f) => {
      const categoryLabel = f.loan_category === 'dairy_loan'
        ? 'Dairy Loan Application'
        : f.loan_category === 'sheep_loan'
          ? 'Sheep Loan Application'
          : f.loan_category === 'goat_loan'
            ? 'Goat Loan Application'
            : 'Farm Loan Application';
      return {
        id: f.reference || f.tracking_id || f.id,
        formType: f.loan_category,
        loanCategory: f.loan_category,
        formTypeLabel: categoryLabel,
        trackingRef: f.tracking_id || f.reference,
        customerName: f.applicant_name,
        email: f.applicant_email,
        verifiedEmail: f.applicant_email,
        emailVerifiedAt: f.submitted_at || null,
        isEmailVerified: true,
        phone: f.applicant_phone,
        status: f.status || 'Submitted',
        loanAmount: Number(f.loan_amount || 0),
        documents: f.documents || null,
        farmingDetails: f.farming_details || null,
        createdAt: f.submitted_at || f.created_at,
        updatedAt: f.status_updated_at || f.updated_at || f.submitted_at,
        rawRecord: f,
      };
    }),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Submission stats
  const submissionStats = {
    total: allSubmissions.length,
    investment: enquiries.length,
    contact: contactEnquiries.length,
    studentLoan: studentLoans.length,
    dairyLoan: farmLoans.filter((f) => f.loan_category === 'dairy_loan').length,
    sheepLoan: farmLoans.filter((f) => f.loan_category === 'sheep_loan').length,
    goatLoan: farmLoans.filter((f) => f.loan_category === 'goat_loan').length,
    totalLoans: studentLoans.length + farmLoans.length,
    byStatus: {
      submitted: allSubmissions.filter((s) => ['Submitted', 'new'].includes(s.status)).length,
      underReview: allSubmissions.filter((s) => s.status === 'Under Review').length,
      contacted: allSubmissions.filter((s) => s.status === 'Contacted').length,
      completed: allSubmissions.filter((s) => ['Completed', 'Information Provided', 'Enquiry Completed'].includes(s.status)).length,
      closed: allSubmissions.filter((s) => ['Closed', 'Rejected'].includes(s.status)).length,
    },
  };

  // Merge customer accounts from authUsers and profiles with activity & form details
  const customerList = [];
  const processedUserIds = new Set();

  authUsers.forEach((u) => {
    processedUserIds.add(u.id);
    const prof = profiles.find((p) => p.id === u.id || (p.email && u.email && p.email.toLowerCase() === u.email.toLowerCase()));
    const customerEmail = u.email || prof?.email || '';
    const name = prof?.full_name || u.user_metadata?.full_name || u.user_metadata?.name || 'Customer';
    const phone = prof?.contact_phone || prof?.phone || u.phone || u.user_metadata?.phone || '';
    const provider = u.app_metadata?.provider || (prof?.auth_providers?.[0]) || 'email';
    const providerLabel = provider === 'google' ? 'Google Sign-In' : 'Email & OTP';
    const createdAt = u.created_at || prof?.created_at;
    const lastSignInAt = u.last_sign_in_at || null;
    const accountStatus = prof?.account_status || (u.confirmed_at ? 'active' : 'unconfirmed');

    // Find all forms applied by this user
    const userForms = allSubmissions.filter((sub) => {
      const subEmail = String(sub.email || sub.verifiedEmail || '').trim().toLowerCase();
      const subUserId = sub.userId || sub.rawRecord?.user_id;
      return (u.id && subUserId === u.id) || (customerEmail && subEmail === customerEmail.toLowerCase());
    });

    customerList.push({
      id: u.id,
      name,
      contactEmail: customerEmail,
      emailMasked: maskEmail(customerEmail),
      phone,
      provider,
      providerLabel,
      accountStatus,
      createdAt,
      lastSignInAt,
      formsCount: userForms.length,
      appliedForms: userForms.map((f) => ({
        id: f.id,
        trackingRef: f.trackingRef,
        formType: f.formType,
        formTypeLabel: f.formTypeLabel,
        status: f.status,
        amount: f.amount || f.loanAmount,
        createdAt: f.createdAt,
      })),
    });
  });

  profiles.forEach((p) => {
    if (!processedUserIds.has(p.id)) {
      processedUserIds.add(p.id);
      const customerEmail = p.email || '';
      const name = p.full_name || 'Customer';
      const phone = p.contact_phone || p.phone || '';
      const provider = (p.auth_providers?.[0]) || 'email';
      const providerLabel = provider === 'google' ? 'Google Sign-In' : 'Email & OTP';
      const createdAt = p.created_at;
      const lastSignInAt = null;
      const accountStatus = p.account_status || 'active';

      const userForms = allSubmissions.filter((sub) => {
        const subEmail = String(sub.email || sub.verifiedEmail || '').trim().toLowerCase();
        const subUserId = sub.userId || sub.rawRecord?.user_id;
        return (p.id && subUserId === p.id) || (customerEmail && subEmail === customerEmail.toLowerCase());
      });

      customerList.push({
        id: p.id,
        name,
        contactEmail: customerEmail,
        emailMasked: maskEmail(customerEmail),
        phone,
        provider,
        providerLabel,
        accountStatus,
        createdAt,
        lastSignInAt,
        formsCount: userForms.length,
        appliedForms: userForms.map((f) => ({
          id: f.id,
          trackingRef: f.trackingRef,
          formType: f.formType,
          formTypeLabel: f.formTypeLabel,
          status: f.status,
          amount: f.amount || f.loanAmount,
          createdAt: f.createdAt,
        })),
      });
    }
  });

  customerList.sort((a, b) => {
    const timeA = new Date(a.lastSignInAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.lastSignInAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return {
    overview: {
      customerCount: profileResult.count ?? (customerList.length || profiles.length),
      serviceFeeRecordCount: paymentResult.count ?? payments.length,
      verifiedServiceFeeTotal: verifiedPayments.reduce((total, payment) => total + Number(payment.amount || 0), 0),
      investmentEnquiryCount: enquiryResult.count ?? enquiries.length,
      contactEnquiryCount: contactResult.count ?? contactEnquiries.length,
      studentLoanCount: studentLoans.length,
      dairyLoanCount: farmLoans.filter((f) => f.loan_category === 'dairy_loan').length,
      sheepLoanCount: farmLoans.filter((f) => f.loan_category === 'sheep_loan').length,
      goatLoanCount: farmLoans.filter((f) => f.loan_category === 'goat_loan').length,
      totalLoanCount: studentLoans.length + farmLoans.length,
      totalSubmissions: allSubmissions.length,
    },
    displayedRecordLimit: 500,
    submissionStats,
    allSubmissions,
    customers: customerList,
    payments: payments.map((payment) => ({
      id: payment.id,
      receiptNumber: payment.receipt_number,
      serviceName: payment.service_name,
      amount: Number(payment.amount),
      currency: payment.currency || 'INR',
      status: payment.status,
      createdAt: payment.created_at,
    })),
    investmentRecords: enquiries.map((enquiry) => ({
      id: enquiry.id,
      trackingId: enquiry.tracking_id || enquiry.id,
      name: enquiry.full_name,
      email: enquiry.email,
      verifiedEmail: enquiry.verified_email || enquiry.email,
      emailVerifiedAt: enquiry.email_verified_at || null,
      isEmailVerified: Boolean(enquiry.email_verified_at || enquiry.verified_email),
      phone: enquiry.phone,
      city: enquiry.city || '',
      state: enquiry.state || '',
      district: enquiry.district || '',
      address: enquiry.address || '',
      pinCode: enquiry.pin_code || '',
      dateOfBirth: enquiry.date_of_birth || '',
      age: enquiry.age || null,
      interestCategory: enquiry.interest_category || '',
      investmentObjective: enquiry.investment_objective || '',
      customerExpectations: enquiry.customer_expectations || '',
      riskUnderstanding: enquiry.risk_understanding || '',
      knowledgeLevel: enquiry.knowledge_level || '',
      investmentGoals: enquiry.investment_goals || '',
      riskAcknowledged: enquiry.risk_acknowledged === true,
      privacyConsent: enquiry.privacy_consent === true,
      horizon: enquiry.investment_horizon,
      plannedAmount: enquiry.planned_amount_bracket,
      areasOfInterest: enquiry.areas_of_interest || [],
      message: enquiry.message || '',
      userId: enquiry.user_id,
      status: enquiry.status || 'Submitted',
      adminNotes: enquiry.admin_notes || '',
      createdAt: enquiry.created_at,
      updatedAt: enquiry.updated_at || enquiry.created_at,
    })),
    contactRecords: contactEnquiries.map((c) => ({
      id: c.id,
      name: c.full_name,
      phone: c.phone,
      email: c.email || '',
      verifiedEmail: c.verified_email || c.email || '',
      emailVerifiedAt: c.email_verified_at || null,
      isEmailVerified: Boolean(c.email_verified_at || c.verified_email),
      serviceInterest: c.service_interest || '',
      message: c.message || '',
      consent: c.consent === true,
      userId: c.user_id,
      status: c.status || 'Submitted',
      adminNotes: c.admin_notes || '',
      createdAt: c.created_at,
      updatedAt: c.updated_at || c.created_at,
    })),
    studentLoanRecords: studentLoans.map((s) => {
      let docs = s.documents;
      let verifiedEmail = s.verified_email || s.applicant_email;
      let emailVerifiedAt = s.email_verified_at || null;
      if (typeof s.enquiry_purpose === 'string' && s.enquiry_purpose.startsWith('{')) {
        try {
          const ep = JSON.parse(s.enquiry_purpose);
          if (!docs) docs = ep.documents || null;
          if (ep.verifiedEmail) verifiedEmail = ep.verifiedEmail;
          if (ep.emailVerifiedAt) emailVerifiedAt = ep.emailVerifiedAt;
        } catch {}
      }
      return {
        refNumber: s.reference,
        trackingId: s.tracking_id,
        loanAmount: s.loan_amount,
        status: s.enquiry_status || s.status || 'Submitted',
        applicantName: s.applicant_name,
        applicantEmail: s.applicant_email,
        verifiedEmail,
        emailVerifiedAt,
        isEmailVerified: Boolean(emailVerifiedAt || s.verified_email || (typeof s.enquiry_purpose === 'string' && s.enquiry_purpose.includes('"verifiedEmail"'))),
        applicantPhone: s.applicant_phone,
        applicantAge: s.applicant_age,
        applicantDob: s.applicant_dob,
        applicantState: s.applicant_state,
        applicantDistrict: s.applicant_district,
        applicantCity: s.applicant_city,
        applicantAddress: s.applicant_address,
        institutionName: s.school_name || s.institution_name,
        courseName: s.course_name,
        isMinor: s.is_minor === true,
        guardianName: s.guardian_name,
        guardianPhone: s.guardian_phone,
        guardianRelationship: s.guardian_relationship,
        guardianConsent: s.guardian_consent === true,
        documentMetadata: s.test_document_path ? {
          path: s.test_document_path,
          fileName: s.test_document_name,
          contentType: s.test_document_type,
          size: s.test_document_size,
        } : null,
        documents: docs,
        submittedAt: s.submitted_at || s.created_at,
        updatedAt: s.status_updated_at || s.updated_at || s.submitted_at,
        latestCustomerRemark: s.latest_customer_remark || null,
        internalNote: s.internal_note || null,
      };
    }),
    farmLoanRecords: farmLoans.map((f) => ({
      id: f.id || f.reference,
      refNumber: f.reference,
      trackingId: f.tracking_id,
      loanCategory: f.loan_category,
      categoryLabel: f.loan_category === 'dairy_loan' ? 'Dairy Loan' : f.loan_category === 'sheep_loan' ? 'Sheep Loan' : 'Goat Loan',
      loanAmount: Number(f.loan_amount || 0),
      status: f.status || 'Submitted',
      applicantName: f.applicant_name,
      applicantEmail: f.applicant_email,
      verifiedEmail: f.applicant_email,
      emailVerifiedAt: f.submitted_at || null,
      isEmailVerified: true,
      applicantPhone: f.applicant_phone,
      applicantDob: f.applicant_dob,
      applicantState: f.applicant_state,
      applicantDistrict: f.applicant_district,
      applicantCity: f.applicant_city,
      applicantAddress: f.applicant_address,
      applicantPincode: f.applicant_pincode,
      aadhaarNumber: f.aadhaar_number,
      panNumber: f.pan_number,
      voterIdNumber: f.voter_id_number,
      loanPurpose: f.loan_purpose,
      farmingDetails: f.farming_details || {},
      documents: f.documents || {},
      adminNotes: f.admin_notes || '',
      rejectionReason: f.rejection_reason || '',
      submittedAt: f.submitted_at || f.created_at,
      updatedAt: f.status_updated_at || f.updated_at || f.submitted_at,
    })),
    supportMessages: {
      available: false,
      reason: 'The current website does not persist support chat or contact messages.',
    },
    contentManagement: {
      available: false,
      reason: 'Website content is source-controlled; no database-backed content manager is configured.',
    },
    ai: {
      configured: Boolean(env.GEMINI_API_KEY),
      model: env.GEMINI_MODEL || 'gemini-flash-latest',
    },
    activity: activity.map((entry) => ({
      action: entry.action,
      metadata: entry.metadata || {},
      createdAt: entry.created_at,
    })),
    dataNotes: {
      payments: 'Only records saved in Supabase are shown.',
      investmentRecords: 'Only records saved in Supabase are shown.',
      contactRecords: contactResult.error
        ? 'Contact enquiries table not yet created. Run supabase_centralized_submissions.sql in SQL Editor.'
        : 'Only records saved in Supabase are shown.',
    },
  };
}
