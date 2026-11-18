import accountDeletion from '../server/api/account-deletion.js';
import accountRecovery from '../server/api/account-recovery.js';
import adminAnnouncements from '../server/api/admin-announcements.js';
import adminAuth from '../server/api/admin-auth.js';
import adminNotification from '../server/api/admin-notification.js';
import adminPasskey from '../server/api/admin-passkey.js';
import adminSecurity from '../server/api/admin-security.js';
import admin from '../server/api/admin.js';
import contactEnquiry from '../server/api/contact-enquiry.js';
import createOrder from '../server/api/create-order.js';
import farmLoans from '../server/api/farm-loans.js';
import investmentEnquiry from '../server/api/investment-enquiry.js';
import profilePhoto from '../server/api/profile-photo.js';
import registerUser from '../server/api/register-user.js';
import sendEmailOtp from '../server/api/send-email-otp.js';
import studentLoanDocuments from '../server/api/student-loan-documents.js';
import studentLoans from '../server/api/student-loans.js';
import supportChat from '../server/api/support-chat.js';
import unsubscribe from '../server/api/unsubscribe.js';
import verifyAccountExists from '../server/api/verify-account-exists.js';
import verifyCaptcha from '../server/api/verify-captcha.js';
import verifyEmailOtp from '../server/api/verify-email-otp.js';
import verifyPayment from '../server/api/verify-payment.js';
import webhook from '../server/api/webhook.js';

const routes = {
  'account-deletion': accountDeletion,
  'account-recovery': accountRecovery,
  'admin-announcements': adminAnnouncements,
  'admin-auth': adminAuth,
  'admin-notification': adminNotification,
  'admin-passkey': adminPasskey,
  'admin-security': adminSecurity,
  'admin': admin,
  'contact-enquiry': contactEnquiry,
  'create-order': createOrder,
  'farm-loans': farmLoans,
  'investment-enquiry': investmentEnquiry,
  'profile-photo': profilePhoto,
  'register-user': registerUser,
  'send-email-otp': sendEmailOtp,
  'student-loan-documents': studentLoanDocuments,
  'student-loans': studentLoans,
  'support-chat': supportChat,
  'unsubscribe': unsubscribe,
  'verify-account-exists': verifyAccountExists,
  'verify-captcha': verifyCaptcha,
  'verify-email-otp': verifyEmailOtp,
  'verify-payment': verifyPayment,
  'webhook': webhook,
};

export default async function handler(req, res) {
  // Enterprise CORS configuration
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse target route name
  let routeName = '';
  if (req.query?.path) {
    routeName = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path);
  } else if (req.query?.route) {
    routeName = String(req.query.route);
  } else if (req.url) {
    const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    routeName = parsed.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  }

  // Handle root /api health check
  if (!routeName || routeName === '') {
    return res.status(200).json({
      success: true,
      service: 'Mehanda Army Investments API',
      status: 'active',
      endpoints: Object.keys(routes).length,
    });
  }

  const targetHandler = routes[routeName];
  if (!targetHandler) {
    return res.status(404).json({
      success: false,
      error: `API endpoint not found: /api/${routeName}`,
    });
  }

  return targetHandler(req, res);
}
