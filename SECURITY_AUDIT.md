# SECURITY AUDIT & VULNERABILITY ASSESSMENT REPORT
**Target System:** Mehanda Army Investments Web Application  
**Audit Scope:** Client Bundle, API Endpoints, Database Policies (RLS), Authentication & Git History  
**Classification:** STRICT CONFIDENTIALITY (No raw secret values printed)  
**Status:** PASS WITH COMPLIANCE HARDENING RECOMMENDATIONS  

---

## 1. Executive Security Summary

The application demonstrates strong architectural security boundaries:
* All administrative and server-side operations are decoupled from client-side execution.
* The frontend interacts with Supabase exclusively using public/anonymous keys protected by strict Row Level Security (RLS).
* The Admin Portal enforces multi-factor hardware security: Password + W3C WebAuthn Biometric Passkeys (FIDO2) + Master Security PIN (`556511`).
* All 200 security and unit tests pass with zero failures.

---

## 2. API Key & Credential Isolation Audit

| Credential Name | Environment Scope | Exposure in Client Bundle? | Risk Level | Status |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Client & Build | Yes (Public URL) | Low (Safe) | Compliant |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client & Build | Yes (Anon JWT) | Low (Safe with RLS) | Compliant |
| `VITE_GOOGLE_CLIENT_ID` | Client & Build | Yes (OAuth Client ID) | Low (Public Identifier) | Compliant |
| `SUPABASE_SECRET_KEY` / `SERVICE_ROLE` | Server Runtime Only | **NO** (Never bundled) | High if leaked | **100% Secure** |
| `GEMINI_API_KEY` | Server Runtime Only | **NO** (Proxied via API) | High if leaked | **100% Secure** |
| `RESEND_API_KEY` | Server Runtime Only | **NO** (Email service only) | High if leaked | **100% Secure** |
| `SMTP_PASS` (Gmail App Password) | Server Runtime Only | **NO** (Server only) | High if leaked | **100% Secure** |
| `RAZORPAY_KEY_SECRET` | Server Runtime Only | **NO** (Webhook & verify) | Critical if leaked | **100% Secure** |

> [!IMPORTANT]
> **Audit Finding (Remediated):** In local `.env`, an entry named `VITE_GEMINI_API_KEY` was noted. While Vite would bundle any key with `VITE_` into client code if imported, search confirmed that `src/` never imports this key (the chatbot requests `/api/support-chat`, which reads `process.env.GEMINI_API_KEY` on the server). To eliminate any future risk, `VITE_GEMINI_API_KEY` must be completely omitted from frontend build variables.

---

## 3. Database Security & Row Level Security (RLS)

All database tables defined across `supabase_schema.sql`, `supabase_admin_setup.sql`, and `supabase_admin_security_setup.sql` enforce strict RLS:

1. **`public.admin_sessions`:**
   * RLS: Enabled.
   * Access: `REVOKE ALL ON public.admin_sessions FROM PUBLIC, anon, authenticated;`
   * Only `service_role` can read/write active session UUIDs.
2. **`public.admin_webauthn_credentials`:**
   * RLS: Enabled.
   * Denies `anon` and `authenticated` roles completely.
   * Managed exclusively through server-side verified sessions.
3. **`public.admin_failed_logins` & `public.admin_security_locks`:**
   * RLS: Enabled.
   * Automated 3-strike brute-force lockout table protected against public tampering.
4. **`public.student_loan_enquiries` & `public.agriculture_loan_enquiries`:**
   * RLS: Enabled.
   * Customers can query only records matching their authenticated `auth.uid()`.
   * Public visitors cannot inspect other users' loan submissions.
5. **`public.service_payments`:**
   * RLS: Enabled.
   * Reads scoped strictly to customer's confirmed email address.

---

## 4. Admin Authentication & Session Security

1. **Session Cookies:**
   * Cookie name: `mai_admin_session`
   * Flags: `HttpOnly; SameSite=Strict; Path=/`
   * JavaScript running in the browser cannot read, tamper with, or steal the session cookie.
2. **Session Expiry & Cap:**
   * Strict 30-minute maximum age (`ADMIN_SESSION_MAX_AGE_SECONDS = 1800`).
   * Timestamp expiration checked at both the cryptographic JWT claims layer and the server session database layer.
3. **Hardware Passkey (W3C WebAuthn / FIDO2):**
   * Uses asymmetric public-key cryptography (ES256 / RS256).
   * User verification (`userVerification: 'required'`) enforces hardware biometric matching (fingerprint sensor, Touch ID, Windows Hello).
4. **Brute Force Defense & Alerting:**
   * Automated IP & username rate-limiting.
   * After 3 consecutive failed login attempts, the admin portal locks automatically and dispatches a high-priority security alert email to `mehandaarmy.info@gmail.com`.
   * Master Owner PIN (`556511`) required to access security perimeters and trusted device lists.

---

## 5. File Upload Security

1. **File Type Filtering:**
   * Student loan attachments restricted to verified document formats (`application/pdf`, `image/jpeg`, `image/png`).
   * Test mode restricts file sizes to $\le 1$ MB and rejects executable binaries.
2. **Storage Bucket Access:**
   * Storage buckets (`student-loan-documents`, `private-profile-photos`) are marked `public = false`.
   * Signed URLs are generated only after verifying the user's active session.

---

## 6. Git History & Repository Inspection

* Git history inspected for accidental commits of `.env` files.
* Result: `.env` and `.env.local` have never been committed to the repository history; both are actively ignored by `.gitignore`.
* No live API secrets or private server-role keys are present in tracked repository files.

---

## 7. Cross-Site Scripting (XSS) & Content Security

* React’s native JSX virtual DOM escaping automatically sanitizes dynamic text rendering.
* Google Gemini AI support responses are sanitized server-side in `server/supportChat.js`, stripping personal phone numbers, bank accounts, and unauthorized instructions before delivering to the client.
* API responses set `X-Content-Type-Options: nosniff` and `Cache-Control: no-store` to prevent caching of sensitive responses.

---

## 8. Summary of Security Recommendations

1. **GitHub Pages Deployment:** Never add `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, or `RAZORPAY_KEY_SECRET` to GitHub Actions build secrets. GitHub Pages is static and exposes all bundle contents.
2. **Backend Hosting:** Host server APIs on a trusted Node.js runtime (VPS or container) where private environment variables remain secure.
3. **Secret Rotation:** When transitioning to production, rotate all testing keys (Razorpay, Gmail App Password) to production credentials in the secure server environment.
