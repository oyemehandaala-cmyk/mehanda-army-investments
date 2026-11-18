# ENVIRONMENT VARIABLE MAPPING REPORT
**Company:** Mehanda Army Investments  
**Target Domain:** `https://mehandaarmy.net`  
**Date:** 17 November 2026  

---

## 1. Classification & Scope Principles

In modern Jamstack & React Vite architecture, environment variables must be rigorously segregated into two distinct domains:

1. **Frontend Client Variables (`VITE_` prefix):**
   * These variables are **baked directly into the compiled JavaScript bundle** during `npm run build`.
   * **Any user can view them** by inspecting network responses or bundle source code.
   * Only public identifiers (e.g. Supabase project URL, Supabase publishable/anon key, Google OAuth Client ID, public support phone/email) may carry the `VITE_` prefix.
   * Can be stored in GitHub Repository Variables / GitHub Actions Secrets for build-time compilation.

2. **Backend Server Secrets (NO `VITE_` prefix):**
   * **STRICTLY PRIVATE.** They grant elevated access to database tables, payment gateway bank settlements, email delivery, administrative bypass, and AI endpoints.
   * **MUST NEVER be injected into Vite or committed to Git.**
   * These belong exclusively in the environment of the dynamic backend server runtime (e.g. Node.js backend server / Render / Railway / Supabase Edge Functions).

---

## 2. Complete Environment Variable Inventory & Destination Mapping

| Variable Name | Netlify Usage | GitHub Pages (Frontend) | Backend Runtime | Sensitivity Level | Destination / Storage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Used | **Yes (Build)** | Optional | Public | GitHub Repository Variable |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Used | **Yes (Build)** | No | Public (Protected by RLS) | GitHub Repository Variable |
| `VITE_SUPABASE_ANON_KEY` | Legacy | **Yes (Build, if used)**| No | Public (Protected by RLS) | GitHub Repository Variable |
| `VITE_GOOGLE_CLIENT_ID` | Used | **Yes (Build)** | No | Public | GitHub Repository Variable |
| `VITE_API_BASE_URL` | New | **Yes (Build)** | No | Public (Points to API) | GitHub Repository Variable |
| `VITE_COMPANY_PHONE` | Used | **Yes (Build)** | No | Public | GitHub Repository Variable |
| `VITE_COMPANY_WHATSAPP` | Used | **Yes (Build)** | No | Public | GitHub Repository Variable |
| `VITE_COMPANY_EMAIL` | Used | **Yes (Build)** | No | Public | GitHub Repository Variable |
| `SUPABASE_URL` | Used | **NEVER** | **REQUIRED** | System URL | Backend Environment |
| `SUPABASE_SECRET_KEY` | Used | **NEVER** | **REQUIRED** | **CRITICAL SECRET** | Backend Environment |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy | **NEVER** | **REQUIRED (if legacy)** | **CRITICAL SECRET** | Backend Environment |
| `ADMIN_LOGIN_EMAIL` | Used | **NEVER** | **REQUIRED** | Private Admin Spec | Backend Environment |
| `ADMIN_USER_ID` | Used | **NEVER** | **REQUIRED** | Private Admin UUID | Backend Environment |
| `ADMIN_SECURITY_ALERT_EMAIL` | Used | **NEVER** | **REQUIRED** | Private Email | Backend Environment |
| `GMAIL_USER` | Used | **NEVER** | **REQUIRED** | Private Email | Backend Environment |
| `GMAIL_APP_PASSWORD` | Used | **NEVER** | **REQUIRED** | **CRITICAL SECRET** | Backend Environment |
| `WEBAUTHN_RP_ID` | Used | **NEVER** | **REQUIRED** | Server Domain Config | Backend Environment (`mehandaarmy.net`) |
| `WEBAUTHN_RP_NAME` | Used | **NEVER** | **REQUIRED** | Brand Name Config | Backend Environment (`Mehanda Army Investments`) |
| `WEBAUTHN_ORIGIN` | Used | **NEVER** | **REQUIRED** | Security Origin | Backend Environment (`https://mehandaarmy.net`) |
| `GEMINI_API_KEY` | Used | **NEVER** | **REQUIRED** | **CRITICAL SECRET** | Backend Environment |
| `GEMINI_MODEL` | Used | **NEVER** | **REQUIRED** | AI Model Config | Backend Environment (`gemini-flash-latest`) |
| `RAZORPAY_KEY_ID` | Used | Optional (if checkout) | **REQUIRED** | Public Gateway Key | Backend Environment |
| `RAZORPAY_KEY_SECRET` | Used | **NEVER** | **REQUIRED** | **CRITICAL SECRET** | Backend Environment |
| `RAZORPAY_WEBHOOK_SECRET` | Used | **NEVER** | **REQUIRED** | **CRITICAL SECRET** | Backend Environment |
| `PRIVATE_RECEIVING_UPI_ID` | Used | **NEVER** | **REQUIRED** | **FINANCIAL SECRET** | Backend Environment |
| `RESEND_API_KEY` | Used | **NEVER** | **REQUIRED** | **CRITICAL SECRET** | Backend Environment |
| `EMAIL_FROM` | Used | **NEVER** | **REQUIRED** | Sender Identity | Backend Environment |
| `EMAIL_OTP_SECRET` | Used | **NEVER** | **REQUIRED** | **CRITICAL SECRET** | Backend Environment |
| `SMS_API_KEY` | Used | **NEVER** | **REQUIRED** | **CRITICAL SECRET** | Backend Environment |
| `SMS_SENDER_ID` | Used | **NEVER** | **REQUIRED** | Provider ID | Backend Environment |
| `OWNER_ALERT_PHONE` | Used | **NEVER** | **REQUIRED** | Private Phone | Backend Environment |

---

## 3. GitHub Actions Configuration Instructions

To deploy via GitHub Actions, navigate to:  
**Your GitHub Repository ➔ Settings ➔ Secrets and variables ➔ Actions**

### 3.1 Repository Variables (Tab: "Variables")
Add these public configuration variables:
1. `VITE_SUPABASE_URL` = `https://kqjchrgdxpydmklbcyib.supabase.co`
2. `VITE_SUPABASE_PUBLISHABLE_KEY` = `<your-supabase-publishable-or-anon-key>`
3. `VITE_GOOGLE_CLIENT_ID` = `<your-google-client-id>`
4. `VITE_API_BASE_URL` = `<your-backend-api-url>` (e.g. `https://api.mehandaarmy.net` or backend proxy)
5. `VITE_COMPANY_PHONE` = `+91 9812947813`
6. `VITE_COMPANY_WHATSAPP` = `919812947813`
7. `VITE_COMPANY_EMAIL` = `info@mehandaarmy.net`

> [!CAUTION]
> **DO NOT** add `SUPABASE_SECRET_KEY`, `RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY`, or `GMAIL_APP_PASSWORD` to GitHub Actions variables or secrets as `VITE_` variables. Frontend builds expose all `VITE_` variables in the generated JavaScript bundle!
