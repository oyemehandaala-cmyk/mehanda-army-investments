const SIGNUP_ERRORS = {
  email_address_invalid: 'Enter a valid email address and try again.',
  email_address_not_authorized: 'Email registration is not enabled for this service. Please contact support.',
  email_exists: 'We could not create this account. If you have registered before, try signing in or resetting your password.',
  invalid_api_key: 'Account services need attention. Please contact support and try again later.',
  signup_disabled: 'New account registration is currently unavailable. Please contact support.',
  user_already_exists: 'We could not create this account. If you have registered before, try signing in or resetting your password.',
  user_already_registered: 'We could not create this account. If you have registered before, try signing in or resetting your password.',
  weak_password: 'Choose a stronger password with at least 8 characters.',
  over_email_send_rate_limit: 'Too many confirmation requests. Wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Wait a few minutes and try again.',
};

const LOGIN_ERRORS = {
  invalid_credentials: 'Email or password is incorrect. If you have not verified your email, use the confirmation link first.',
  email_not_confirmed: 'Please verify your email address before signing in.',
  over_request_rate_limit: 'Too many login attempts. Wait a few minutes and try again.',
};

const RECOVERY_ERRORS = {
  user_not_found: 'No account found with this email address. Please check your email or create a new account.',
  email_not_found: 'No account found with this email address. Please check your email or create a new account.',
  account_not_found: 'No account found with this email address. Please check your email or create a new account.',
  email_address_invalid: 'Enter a valid email address.',
  over_email_send_rate_limit: 'Too many recovery requests. Wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Wait a few minutes and try again.',
};

const PHONE_ERRORS = {
  invalid_phone: 'Enter a valid phone number in international format.',
  phone_exists: 'That number is already linked to another account. Sign in with that number or verify a different phone; accounts are never merged automatically.',
  phone_not_confirmed: 'Verify the phone number with the SMS code before continuing.',
  otp_expired: 'That verification code has expired. Request a new code.',
  over_sms_send_rate_limit: 'Too many SMS requests. Wait a few minutes before requesting another code.',
  over_request_rate_limit: 'Too many attempts. Wait a few minutes and try again.',
};

function knownErrorCode(error) {
  return typeof error?.code === 'string' ? error.code : '';
}

export function getAuthErrorMessage(error, operation) {
  if (error?.isAccountNotFound || (typeof error?.message === 'string' && error.message.toLowerCase().includes('no account found'))) {
    return error.message || 'No account found with this email address. Please check your email or create a new account.';
  }

  if (typeof error?.message === 'string' && (error.message.toLowerCase().includes('already exists') || error.message.toLowerCase().includes('already registered'))) {
    return error.message;
  }

  const code = knownErrorCode(error);
  if (operation === 'signup' && SIGNUP_ERRORS[code]) return SIGNUP_ERRORS[code];
  if (operation === 'login' && LOGIN_ERRORS[code]) return LOGIN_ERRORS[code];
  if (operation === 'recovery' && RECOVERY_ERRORS[code]) return RECOVERY_ERRORS[code];
  if (operation === 'phone' && PHONE_ERRORS[code]) return PHONE_ERRORS[code];

  if (error?.status === 429) {
    return 'Too many attempts. Wait a few minutes and try again.';
  }

  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) {
    return 'We could not reach the account service. Check your connection and try again.';
  }

  if (operation === 'signup') {
    return 'We could not create your account right now. Please try again later.';
  }
  if (operation === 'login') {
    return 'Email or password is incorrect. If you have not verified your email, use the confirmation link first.';
  }
  if (operation === 'oauth') {
    return 'Google sign-in could not be completed. Try again or use phone or email sign-in.';
  }
  if (operation === 'recovery') {
    return 'We could not send a verification email right now. Please wait a few minutes and try again.';
  }
  if (operation === 'phone') {
    return 'We could not complete phone verification. Check the number and try again.';
  }
  return 'The account request could not be completed. Please try again later.';
}
