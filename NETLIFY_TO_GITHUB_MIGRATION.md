# NETLIFY TO GITHUB PAGES MIGRATION REPORT
**Company:** Mehanda Army Investments  
**Target Domain:** `https://mehandaarmy.net` (Registrar: Northwest Registered Agent)  
**Current Hosting:** Netlify  
**Target Frontend Hosting:** GitHub Pages (Official GitHub Actions)  
**Date:** 17 November 2026  

---

## 1. Migration Overview & Strategic Architecture

Mehanda Army Investments is transitioning its public website frontend from Netlify hosting to GitHub Pages, binding directly to the custom apex domain `mehandaarmy.net`.

### The Fundamental Architectural Division
* **GitHub Pages (Static Client Layer):**
  - Serves static assets: HTML, CSS, JavaScript bundles, images, fonts, and client-side single page routing (SPA).
  - High performance, distributed global CDN provided by GitHub's Fastly edge infrastructure.
  - Zero hosting cost, direct Git branch integration (`main` branch automated builds).
* **Dynamic Backend Layer (APIs, Database, Auth & Payments):**
  - GitHub Pages does **not** execute server-side Node.js code or serverless functions.
  - The project contains 24 serverless API endpoints in `api/` and 19 core backend services in `server/` (Razorpay order creation/verification, WebAuthn FIDO2 attestation, Admin session tokens with HttpOnly cookies, Gemini AI queries, and OTP emails via SMTP).
  - These dynamic endpoints cannot run on GitHub Pages; they are hosted on a dedicated secure backend runtime (e.g., Node.js server, Render/Railway, or Supabase Edge Functions) and called via `VITE_API_BASE_URL`.
  - Supabase client-side queries (with Row Level Security) run directly from the browser to Supabase without requiring intermediary servers.

---

## 2. Netlify Configuration Audit & Inventory

The existing Netlify setup was analyzed across `netlify.toml`, `_redirects`, and `netlify/functions/`:

### 2.1 Build & Routing Settings
| Netlify Parameter | Netlify Current Value | GitHub Pages Equivalent |
| :--- | :--- | :--- |
| **Build Command** | `npm run build` | `npm run build` (via GitHub Actions workflow) |
| **Publish Directory** | `dist` | `dist` (uploaded via `actions/upload-pages-artifact@v3`) |
| **Node Version** | Node 20.x | Node 20.x (`actions/setup-node@v4`) |
| **SPA Fallback** | `/* /index.html 200` in `_redirects` | `public/404.html` SPA redirect script |
| **Custom Domain** | `mehandaarmy.net` | `public/CNAME` + Northwest DNS A/CNAME records |
| **HTTPS Certificate** | Netlify Let's Encrypt | GitHub Pages Automatic Enforced HTTPS |

### 2.2 Netlify Functions Audit (24 Serverless APIs)
Every endpoint in `netlify/functions/` was mapped to identify backend operational requirements:
1. `admin-auth.js` / `admin-auth-login.js` / `admin-auth-verify.js`: Generates cryptographic session cookies and verifies admin credentials.
2. `admin-passkey.js`: WebAuthn FIDO2 fingerprint/face recognition challenge generation and signature verification.
3. `admin-portal.js` / `admin-security.js`: Secure management of customer loans, KYC documents, and security telemetry.
4. `ai-chat.js`: Protected proxy to Google Gemini API (prevents frontend exposure of `GEMINI_API_KEY`).
5. `razorpay-order.js` / `razorpay-verify.js`: Creates HMAC SHA256 payment signatures with `RAZORPAY_KEY_SECRET`.
6. `send-otp.js` / `verify-otp.js`: Communicates with Gmail SMTP / Resend to send OTP verification emails.
7. `customer-profile.js` / `customer-loan-application.js`: Server-validated loan workflow processing.

---

## 3. Step-by-Step Migration Execution Plan

```
[ Git Repository: main branch ]
              |
              v
[ GitHub Actions: deploy.yml ]
   ├── Checkout Code
   ├── Setup Node.js 20
   ├── npm ci & npm run build
   ├── Copy CNAME & 404.html to dist/
   └── actions/deploy-pages@v4
              |
              v
[ GitHub Pages Edge CDN ] <====== DNS (Northwest Registered Agent)
   https://mehandaarmy.net
              |
              | API Calls (CORS Enabled)
              v
[ Backend API Server / Supabase ]
   ├── Authentication & Database (Supabase PostgreSQL)
   └── Secure Server APIs (WebAuthn, Razorpay, Admin Auth, AI)
```

### Phase 1: SPA Routing Configuration on GitHub Pages
Because GitHub Pages is a static file server, refreshing a route like `https://mehandaarmy.net/admin` would normally produce an HTTP 404 error.
* **Solution:** Provide a lightweight `public/404.html` that encodes the requested path and query into a URL parameter and redirects to `index.html`, where `index.html` instantly restores the URL state in `react-router-dom`.

### Phase 2: Domain Binding (`public/CNAME`)
* Create `public/CNAME` containing solely:
  ```
  mehandaarmy.net
  ```
* When Vite builds the project, files in `public/` are copied directly into `dist/CNAME`, telling GitHub Pages to bind the apex domain.

### Phase 3: Automated GitHub Actions Workflow
* Create `.github/workflows/deploy.yml` with permissions `pages: write` and `id-token: write`.
* Builds cleanly upon push to `main` and deploys `dist/` directly to GitHub Pages.

---

## 4. Northwest Registered Agent DNS Configuration

The domain `mehandaarmy.net` is registered through Northwest Registered Agent. Update the DNS zone file with these exact records:

### 4.1 Apex Domain Records (for `mehandaarmy.net`)
Delete any existing Netlify A records (e.g. `75.2.60.5`) and add four GitHub Pages A records:

| Type | Host / Name | Value / Destination | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` (or leave empty) | `185.199.108.153` | 3600 |
| **A** | `@` (or leave empty) | `185.199.109.153` | 3600 |
| **A** | `@` (or leave empty) | `185.199.110.153` | 3600 |
| **A** | `@` (or leave empty) | `185.199.111.153` | 3600 |

### 4.2 Subdomain Record (for `www.mehandaarmy.net`)
Delete any existing Netlify CNAME records and point `www` to your GitHub repository username:

| Type | Host / Name | Value / Destination | TTL |
| :--- | :--- | :--- | :--- |
| **CNAME** | `www` | `<your-github-username>.github.io.` | 3600 |

*(Note: Replace `<your-github-username>` with your actual GitHub username or organization).*

---

## 5. Security & Isolation Safeguards

1. **No Frontend Leaks:** Private backend keys (`SUPABASE_SECRET_KEY`, `RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY`, `SMTP_PASS`) are strictly excluded from GitHub Pages frontend builds.
2. **CORS Hardening:** Backend server endpoints will only accept cross-origin requests from `https://mehandaarmy.net` and authorized local development ports.
3. **Rollback Safety:** Netlify configuration files (`netlify.toml`, `_redirects`) remain preserved in the repository so that instant rollback is possible by reverting DNS records if ever required.
