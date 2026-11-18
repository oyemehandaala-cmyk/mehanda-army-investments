import React from 'react';
import AuthPortal from './AuthPortal';

/**
 * LoginRequiredScreen
 * Reusable full-page authentication gate for any protected service
 * (Student Loan Enquiry, Investment Info, Customer Dashboard, etc.).
 * Renders the exact same scenic mountain/lake illustrated background and
 * centered glassmorphic login card, and smoothly redirects to targetView upon sign-in.
 */
export default function LoginRequiredScreen({
  setCurrentView,
  setAuthenticatedUser,
  targetViewTitle = 'Customer service',
  targetView,
}) {
  return (
    <AuthPortal
      initialMode="login"
      setCurrentView={setCurrentView}
      setAuthenticatedUser={setAuthenticatedUser}
      targetView={targetView}
      targetViewTitle={targetViewTitle}
    />
  );
}
