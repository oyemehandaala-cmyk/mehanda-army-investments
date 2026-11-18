# Mehanda Army Investments - Official Website

Modern, responsive web application for **Mehanda Army Investments** built with React, Vite, Tailwind CSS, and Lucide Icons.

---

## Student-loan institution catalog

The customer portal is white-background and account-linked. Public visitors can browse without signing in; Student Loan and Invest Money routes require Google sign-in and return authenticated customers to the dashboard. The dashboard offers only Student Loan Enquiry and Investment Information. Investment interest submissions are enquiries only; no deposit or investment transaction is initiated.

The Student Loan Enquiry form keeps the existing account-linked customer portal and Admin Portal. State and district options are a snapshot retrieved on 7 November 2026 from the Government of India's [Local Government Directory](https://lgdirectory.gov.in/) (36 States/Union Territories and 790 districts). City suggestions are drawn from the institution catalog for the selected State and District; a manual city entry is always available. Institution suggestions use `public.student_loan_institutions`, with a manual-entry option.

The catalog intentionally contains no bundled or sample institutions. Before enabling official search results, an authorized operator must import current, verified records from the official [UDISE+ portal](https://udiseplus.gov.in/) (schools) and [AISHE portal](https://aishe.gov.in/) (higher education) into `public.student_loan_institutions`, using their source IDs, official names, state, district, city/PIN where supplied, type, and Government/Private classification. A source record ID should be namespaced in `institution_id` (for example, `UDISE+:<source-id>` or `AISHE:<source-id>`). Until those official exports are imported, users can enter an institution manually; manual entries are identified as unverified. Keep the catalog refreshed from the source portals and do not infer missing values.

In TEST MODE the form does not collect Aadhaar, PAN, or Voter ID numbers or images. The Identity Verification section remains disabled pending security and compliance approval. The optional upload accepts only `.txt` and valid `.json` sample/test files up to 1 MB, whose names include `sample` or `test`; the server validates file size, UTF-8/JSON content, and common identity-number patterns before uploading to a private bucket. No public file URLs are created. Applicants under 18 must submit with parent/guardian details and consent; the submission is an enquiry only, not a loan application or approval.

### Account-linked test enquiries

The customer enquiry flow requires a signed-in account with a confirmed email. The server verifies the Supabase access token, validates the submitted values, associates the enquiry with that account, and obtains its unique Tracking ID from the database. A per-form idempotency key prevents duplicate records after retries. Customer lists and Tracking ID lookups are owner-scoped. Administrative status changes and customer-visible history/remarks are written server-side. The supported statuses are Submitted, Under Review, Additional Information Required, Verification Pending, On Hold, Completed, and Rejected.

The existing setup scripts and migrations are historical and include legacy identity-document fields. The new additive migration `supabase/migrations/20261107052953_student_loan_enquiry_test_mode.sql` adds the current enquiry fields, status workflow, idempotency, and private sample-file bucket, and disables uploads to the legacy ID-proof bucket. It does not delete old records or old identity columns. Any previously stored identity numbers/files require a separately approved retention/deletion review before production use. Do not run the entire `supabase_schema.sql` just to install this feature. Review and apply the migrations in order only after validating the live schema and taking a backup; no hosted migration was applied as part of this code change.

Server deployment requires `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`) in server-only environment variables. Never expose the secret key through a `VITE_` variable. The live database connection was unavailable when this change was prepared, so successful local builds/tests do not establish that the hosted schema is compatible.

---

## Client account security and setup

Customer login uses real Supabase Auth sessions for Google OAuth, SMS phone OTP, and the existing email/password flow. Google profile data is synchronized from the authenticated Supabase user. Phone numbers are stored as verified only after Supabase confirms an SMS OTP; contact numbers remain separate and unverified. RLS restricts private profile and portfolio reads to the authenticated account owner.

The site header shows the visitor's local date and clock. A separate 15-minute inactivity reminder warns at 14 minutes and pauses the browser interface at 15 minutes; continuing resumes browsing without signing out, revoking authentication, or changing saved records. This is not an authentication lifetime: customer credentials remain subject to Supabase Auth, and protected admin requests continue to enforce the existing server-validated 30-minute session cap.

Before enabling customer accounts:

1. In Supabase Authentication, keep the email/password provider available for existing accounts, configure the production Site URL and local/deployed redirect URLs, keep Auth rate limits enabled, and configure SMTP for email confirmations and recovery.
2. Before applying `supabase_schema.sql` to an existing database, inspect its live tables, constraints, triggers, and policies and take a backup. Apply section **8. Google + Phone Auth Profile Synchronization** after the existing profile/security sections. It makes profile email nullable for phone-only users, migrates unverified phone values to `contact_phone`, synchronizes verified auth identities, and restricts profile edits. Do not apply a full schema blindly to an existing production database.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or the legacy `VITE_SUPABASE_ANON_KEY`) for the frontend. Keep the Supabase secret/service-role key only in server-side variables; never use a `VITE_` prefix for it.
4. The private profile-photo bucket accepts JPG/PNG/WebP uploads up to 5 MB. Supabase Auth profile pictures are also synchronized to the profile record; a private user-uploaded photo takes display precedence.

### Google OAuth configuration

1. In Google Cloud Console, select or create a project and open **Google Auth Platform**. Configure Branding with the app name, support email, and authorized domain. Under **Audience**, choose **External** and publish the app when it is ready for all Google accounts; Google test mode restricts sign-in to listed test users.
2. Under **Data Access**, request only the basic `openid`, `email`, and `profile` scopes. Create an OAuth client with application type **Web application**.
3. Add these **Authorized JavaScript origins** to the Google client:
   - `https://mehandaarmy.net`
   - `https://mehandaarmy.netlify.app`
   - `http://localhost:3000`
4. In Supabase **Authentication → Sign In / Providers → Google**, copy the displayed callback URL (format: `https://<project-ref>.supabase.co/auth/v1/callback`). Add that exact value as an **Authorized redirect URI** in Google Cloud. Copy the Google client ID and client secret into the Supabase Google provider settings and enable the provider. Neither Google credential belongs in frontend environment variables.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to `https://mehandaarmy.net` and allow these exact redirect URLs (replace the production origin if Netlify assigns a different live URL):
   - `https://mehandaarmy.net`
   - `https://mehandaarmy.net/?auth=verify-email`
   - `https://mehandaarmy.net/?auth=reset-password`
   - `https://mehandaarmy.netlify.app`
   - `https://mehandaarmy.netlify.app/?auth=verify-email`
   - `https://mehandaarmy.netlify.app/?auth=reset-password`
   - `http://localhost:3000`
   - `http://localhost:3000/?auth=verify-email`
   - `http://localhost:3000/?auth=reset-password`
6. Enable Supabase **manual identity linking** in Auth provider/security settings for the dashboard's signed-in **Link Google account** flow. Supabase can automatically link identities only after a provider verifies a matching email; phone numbers are linked explicitly from an authenticated session after OTP verification. A phone conflict returns an error and does not merge accounts.

### SMS phone OTP configuration

1. Create a billing-enabled account with an SMS provider. Twilio is supported by Supabase; for Twilio Verify, create a Verify service and use its Service SID, Account SID, and Auth Token.
2. In Supabase **Authentication → Sign In / Providers → Phone**, enable phone sign-in and configure the SMS provider with those credentials. Configure the OTP lifetime as **300 seconds** to match the UI countdown. The UI enforces a 60-second resend cooldown; keep Supabase's server-side Auth rate limits enabled as well.
3. Keep Supabase's server-enforced OTP and IP rate limits enabled (the UI also enforces a 60-second resend cooldown), configure provider-side fraud/usage controls, and restrict SMS geography to the countries you serve. Do not enable Supabase Auth CAPTCHA unless a CAPTCHA widget/token flow is also configured in the app. Complete the applicable Indian TRAI/DLT entity, sender/header, and message-template registrations with your SMS provider before sending production OTPs to Indian numbers.
4. Test with real, authorized phone numbers only. Supabase's test phone numbers/fixed OTPs are not used by this application.

### Expected costs (checked 1 November 2026)

- **Google OAuth:** Google does not charge for standard Google sign-in using the basic identity scopes. Google may require consent-screen verification/publishing for public use.
- **Supabase Auth:** The current Free plan includes 50,000 monthly active users; Pro starts at **$25/month** and includes 100,000 MAUs, then **$0.00325 per MAU**. The project still needs its SMS provider; Supabase does not include free SMS delivery. The separate Advanced MFA Phone add-on is not needed for passwordless phone OTP login.
- **Twilio Verify example for India:** Twilio currently lists **$0.05 per successful verification**, plus standard channel charges. Its India SMS page lists **$0.0832 per outbound SMS segment**, before carrier fees/taxes. Budget approximately **$0.1332 per successful one-segment SMS verification plus carrier fees/taxes**; long messages, retries, country/provider changes, and failed-message charges can change the total. Check live rates before launch.
- Pricing references: [Supabase plans](https://supabase.com/pricing), [Twilio Verify](https://www.twilio.com/en-us/verify/pricing), and [Twilio India SMS](https://www.twilio.com/en-us/sms/pricing/in).

Confirm the production hostname in the existing Netlify site's **Domain management** before using it as the Google/Supabase production origin. The official live site is `https://mehandaarmy.net` (along with `https://mehandaarmy.netlify.app`); production authentication still requires a real Google sign-in test after the provider and redirect settings are saved.

### Recovery keys and password recovery

Apply section **4b. Single-use Account Recovery Keys & Rate Limits** as well. A random 256-bit key is issued only after a verified account session, and only its SHA-256 hash is stored. It is shown once in the browser; the user can copy, download, or print it. A password reset uses Supabase's configured email recovery link and additionally requires the saved key. Successful recovery changes the password and rotates the key; the previous key cannot be reused. The server limits recovery-key issuance and completion attempts to three and five attempts per 15-minute window, respectively. Supabase Auth continues to enforce its own limits for email-reset requests.

Set the Supabase email recovery-link/OTP expiration to **30 minutes or less**; the server rejects a recovery challenge older than 30 minutes. Configure SMTP and allow-list `/?auth=verify-email` and `/?auth=reset-password` on every required site origin. The normal reset requires both the verified email link and saved key. If the key is lost, the user can explicitly select the verified-email recovery alternative; the single-use provider link then replaces the key. A signed-in user can also replace a lost key after re-entering their current password. If both verified email access and the current password/key are unavailable, direct them to the official account recovery process. Vercel serves `api/account-recovery.js`; Netlify uses `netlify/functions/account-recovery.mjs`; local Vite development exposes the same endpoint.

The installed Supabase JS v2 SDK accepts the `sb_publishable_` key format. A successful build or unit test does not prove live project configuration: apply the migrations, configure Auth/SMTP, and verify RLS/storage policies against the actual Supabase project before enabling accounts.

### Customer dashboard, payments, and account deletion

The customer dashboard reads profile, portfolio, transaction, and receipt records through the signed-in Supabase session and existing owner-scoped RLS. It does not show demo portfolio data as customer data. Payment checkout requires a verified email account; the server creates an order through Razorpay, verifies the signature, confirms captured status and amount with Razorpay's API, and saves the receipt in `service_payments`. Receipt history is queried for the signed-in verified email and is no longer stored in browser local storage.

There is no simulated payment approval or hard-coded gateway secret. Both `test` and `live` modes require a real matching Razorpay key ID and server-side secret; test mode uses Razorpay's actual test checkout. Configure `PAYMENT_GATEWAY_MODE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in the server runtime. Keep all secrets server-side. The amount displayed is the amount sent to the gateway; this site does not calculate GST or claim a tax treatment. Confirm applicable tax and service-fee terms with the business before enabling live checkout. The receipt can be saved as PDF through the browser print dialog; no server-generated PDF is currently provided.

For account-deletion requests, apply the additive profile and account-request sections in `supabase_schema.sql` after reviewing the live schema, then configure the server-side Supabase service key. The customer flow submits a request for review; it does not immediately delete the Auth account. A staff processing workflow must be configured separately.

### Netlify deployment

`netlify.toml` uses `npm run build`, publishes `dist`, and deploys functions from `netlify/functions`; the explicit `/api/*` function redirects precede the SPA fallback. In Netlify **Site configuration → Environment variables**, configure `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` for the production build. Google OAuth and SMS-provider secrets are configured in Google Cloud and Supabase Auth respectively, not in frontend variables. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only for Functions runtime endpoints that require them. Keep the service-role key out of all `VITE_` variables.

For email links, set Supabase Auth's Site URL to the deployed site origin and allow-list that origin with `/?auth=verify-email` and `/?auth=reset-password`. After changing build-scoped variables or code, trigger a new Netlify production deploy; an existing deploy does not acquire new frontend build values. A currently deployed site should serve the SPA at `/` and the function routes above. See `.env.example` for additional optional server-side settings used by payments, admin, SMS alerts, and AI support.

---

## 🚀 How to Run Locally

1. Open your terminal in this directory:
   ```bash
   npm install
   npm run dev
   ```
2. Open browser: [http://localhost:3000](http://localhost:3000)

## Student Small Loan — Demo / Coming Soon

The Student Small Loan area is a demonstration only. It does not offer or approve real credit, collect identity documents, charge interest, send SMS, or disburse money. Do not enter real personal, financial, Aadhaar, or PAN information. Applicant fields remain in page memory and are not sent; the server accepts only the fictional demo amount, student category, repayment date, and a derived age value, and does not persist the age.

To enable demo submissions and administrator status changes:

1. Apply section 7 of `supabase_schema.sql` to the existing Supabase project. This creates a demo-only table with no applicant name, contact, DOB, Aadhaar/PAN, or uploaded documents. Row-level security blocks direct browser access.
2. Configure these server environment variables in local `.env` and the deployment provider:
   - `SUPABASE_URL` (or the existing `VITE_SUPABASE_URL`)
   - `SUPABASE_SERVICE_ROLE_KEY` — server-side only; never prefix it with `VITE_` or expose it in frontend code.
3. For local development, run `npm run dev`. The demo route is `/api/student-loans`; admin-only loan management requires an active server-verified Admin Portal session.
4. Vercel uses `api/student-loans.js`. Netlify uses `netlify/functions/student-loans.mjs` and the API redirect in `netlify.toml`. Configure the same server-side environment variables and apply the schema before using the feature.

Demo records contain only a random reference, demo loan amount, student category, preferred repayment date, and workflow status. Use the reference to check the demo status. Administrators can review or delete records and change the status; status changes are demonstrations, not lending decisions. A reset or deployment database setup issue may prevent requests from completing. No database password, service-role key, or admin secret is needed in the frontend.

Before any real applications, sensitive data collection, charges, or disbursements are enabled, obtain qualified legal/compliance confirmation of all applicable corporate, RBI, state money-lending, digital-lending, consumer-protection, and privacy requirements. Real student-loan application processing, KYC, SMS, and disbursements are not implemented or configured by this demo.

## Admin Portal

The separate admin pages are `/admin/login` and `/admin/dashboard`. The only accepted username is `mehandaarmy`; there is no public admin registration. Login uses Supabase Auth and a server-side allowlist of one Supabase user UUID. The password is not stored in this repository or Netlify.

Before deploying the portal:

1. In the existing Supabase project, privately create or reset the authorized admin Auth user and confirm its email. Set its password directly in the Supabase Dashboard. Never put the password in Git, source, Netlify variables, or chat; enter it only in the HTTPS Admin Login form.
2. Copy that Auth user's UUID from Supabase Auth → Users. In Netlify, set the frontend build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for customer login, and set these function variables: `ADMIN_LOGIN_EMAIL`, `ADMIN_USER_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`), and `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`). Never put a secret/service-role key in any `VITE_` variable. The admin email must match the verified Supabase Auth user and the UUID must be that same user's Auth ID. The password stays only in Supabase Auth and the HTTPS login form.
3. Ensure the existing Supabase database has the `account_recovery_rate_limits` table and `consume_account_recovery_rate_limit` RPC from the account-security sections of `supabase_schema.sql`. Then run `supabase_admin_setup.sql` if its admin-specific constraint and tables are not already present. The admin setup requires those rate-limit objects; do not apply the full schema blindly to an existing production database. It creates private `admin_sessions` and `admin_activity_logs` tables, and browser roles cannot access them.
4. Deploy the site and functions, then test login, wrong-password rejection, customer-account denial, session expiry, and logout on the deployed site. The admin session is an HttpOnly, SameSite=Strict cookie, capped at 30 minutes, and each protected API revalidates the Supabase user ID and active session record server-side.
5. After the new function is deployed, remove the obsolete `ADMIN_ACCESS_SECRET` variable from Netlify if it was previously configured; the new portal does not use it.

The dashboard only reports rows actually saved in Supabase. Payment/enquiry handlers currently do not persist new records to their corresponding tables; support conversations and editable website content are not stored by the current site. Those panels will explicitly show that they are unavailable rather than displaying fabricated records. Wire those storage flows before relying on them for operations.

---

## 🌐 How to Make It Live (Free in 2 Minutes)

### Option 1: Vercel (Recommended - Fastest)
1. Push your code to your GitHub account:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```
2. Go to [https://vercel.com](https://vercel.com) and log in with GitHub.
3. Click **"Add New Project"** -> Import this repository.
4. Click **"Deploy"**. Your website will be live in 30 seconds with a free `.vercel.app` domain and free SSL!

### Option 2: Netlify (Drag & Drop or Git)
- Run `npm run build`.
- Go to [https://app.netlify.com/drop](https://app.netlify.com/drop) and drag-and-drop the generated `dist` folder directly!

---

## 🛠️ What Was Fixed & Added
1. **Full Project Setup:** Converted raw `.txt` file into a full, production-ready Vite + React + Tailwind CSS web application.
2. **Hero Section Buttons:** Connected "Start Investing" and "Calculate Returns" to smooth-scroll to action sections.
3. **Interactive Wealth / SIP Calculator:** Added dynamic compound growth slider calculator.
4. **Interactive Client Portal:** Created a working demo Client Dashboard with portfolio metrics and asset allocation.
5. **Direct WhatsApp Integration:** Form submissions now automatically connect inquiries to your official WhatsApp (+91 9812947813).
6. **Policy Modals:** Added legal and privacy modals for clean compliance.

## Android mobile app

The separate Expo/React Native Android app and its setup, environment, Supabase, and EAS build instructions are in [mobile-app/README.md](./mobile-app/README.md). The mobile project is isolated from the existing website.
