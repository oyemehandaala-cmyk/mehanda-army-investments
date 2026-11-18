# BACKEND COMPATIBILITY REPORT
**Company:** Mehanda Army Investments  
**Official Domain:** `https://mehandaarmy.net`  
**Date:** 17 November 2026  

---

## 1. Executive Summary

GitHub Pages is an edge-based **static file host**. It serves pre-compiled HTML, JavaScript, CSS, and media files, but has **no Node.js execution runtime, no serverless functions, and no server-side filesystem**.

This report outlines how the dynamic capabilities of **Mehanda Army Investments** operate in conjunction with GitHub Pages frontend hosting.

---

## 2. Capability Matrix: Frontend vs. Backend Execution

| Feature / Module | Can Run on GitHub Pages Client? | Execution Architecture / Solution |
| :--- | :--- | :--- |
| **Public Website Pages** (Home, About, Services, Contact, Terms, Privacy) | **YES** | Built statically via Vite (`dist/`), served instantly via Fastly CDN. |
| **Supabase Authentication** (Email/Password, Google OAuth, Magic Link) | **YES** | Browser-to-Supabase direct SSL connection using `@supabase/supabase-js`. |
| **Supabase Database Reads/Writes** (Customer Profiles, Applications, Loan Status) | **YES** | Browser communicates directly with Supabase PostgreSQL secured by **Row Level Security (RLS)**. |
| **KYC Document Uploads** (Aadhaar, PAN, Bank Statements) | **YES** | Uploaded directly from browser to private Supabase Storage buckets via authenticated RLS tokens. |
| **Google Gemini AI Chatbot** | **NO** (Backend Required) | Requires proxying via backend server to protect `GEMINI_API_KEY` from public extraction. |
| **Razorpay Payment Creation & Verification** | **NO** (Backend Required) | Creating orders and verifying cryptographic HMAC SHA256 signatures requires `RAZORPAY_KEY_SECRET`. |
| **Admin WebAuthn (Passkeys / Fingerprint)** | **NO** (Backend Required) | Generating cryptographic challenges and verifying FIDO2 credentials requires private server logic. |
| **Admin Authentication & Session Management** | **NO** (Backend Required) | Issues secure `HttpOnly` `SameSite=Strict` cookies and validates admin master credentials. |
| **Transactional Email OTP Delivery** | **NO** (Backend Required) | Communicates with SMTP / Resend using private credentials (`GMAIL_APP_PASSWORD`, `RESEND_API_KEY`). |

---

## 3. Server-Side Endpoints Breakdown (24 APIs in `api/`)

All 24 endpoints in `api/` perform critical server-side operations:
1. `admin-auth.js` / `admin-auth-login.js` / `admin-auth-verify.js` / `admin-auth-logout.js`: Admin multi-factor authentication.
2. `admin-passkey.js`: WebAuthn registration and authentication verification.
3. `admin-portal.js` / `admin-security.js`: Secure admin actions, audit telemetry, and emergency lockout recovery.
4. `ai-chat.js`: Google Gemini API server-side bridge.
5. `razorpay-order.js` / `razorpay-verify.js`: Payment gateway lifecycle.
6. `send-otp.js` / `verify-otp.js`: 6-digit OTP generation, rate limiting, and email dispatch.
7. `customer-profile.js` / `customer-loan-application.js`: Server-side application validation and status tracking.
8. `profile-photo.js` / `upload-kyc.js`: Server-side validation of file mime-types and virus scanning before storage.

---

## 4. Backend Hosting Architecture Options

To provide the backend runtime for the above 24 endpoints while the frontend is hosted on GitHub Pages:

### Option A: Dedicated Node.js Backend Server (Recommended)
* **Platforms:** Render, Railway, DigitalOcean, or AWS Lightsail (Zero or low-cost tier).
* **Implementation:** The existing project includes a standalone server entry point (`server/index.js` or Express bridge) that exposes all 24 APIs under `/api/*`.
* **Setup:**
  1. Deploy the backend code to the server platform.
  2. Set the private environment variables (`SUPABASE_SECRET_KEY`, `RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY`, etc.) in the server's environment.
  3. Bind a subdomain like `api.mehandaarmy.net` via Northwest DNS (CNAME pointing to the server).
  4. In GitHub Actions, set `VITE_API_BASE_URL=https://api.mehandaarmy.net`.
  5. The frontend on GitHub Pages will call `https://api.mehandaarmy.net/api/...` with full CORS security.

### Option B: Supabase Edge Functions
* **Platforms:** Native Supabase Edge Functions (Deno runtime).
* **Implementation:** Migrate the 24 functions from `api/` into `supabase/functions/`.
* **Setup:**
  1. Directly utilizes existing Supabase project infrastructure.
  2. Secrets are managed natively via `supabase secrets set`.
  3. Accessible under `https://<project-ref>.supabase.co/functions/v1/...`.

---

## 5. Security & Isolation Guarantee

* Moving the frontend to GitHub Pages **does not degrade security** when paired with a secure backend.
* In fact, static hosting on GitHub Pages reduces the attack surface of the web server itself: there is no PHP/Node server to exploit on the frontend hosting layer.
* All customer financial and identity records remain safeguarded by Supabase PostgreSQL RLS and server-side cryptographic signatures.
