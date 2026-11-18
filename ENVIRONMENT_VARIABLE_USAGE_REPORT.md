# ENVIRONMENT VARIABLE USAGE REPORT
**Company:** Mehanda Army Investments  
**Official Domain:** `https://mehandaarmy.net`  
**Inspection Target:** Currently Configured Netlify Environment Variables (`nehandaarmy`, `VITE_GEMINI_API_KEY`)  
**Date:** 17 November 2026  

---

## 1. Executive Summary

An exhaustive, non-destructive inspection of the entire **Mehanda Army Investments** codebase was performed to map the exact usage, dependencies, and lifecycle of the environment variables currently configured in the Netlify hosting environment:

1. **`nehandaarmy`**
2. **`VITE_GEMINI_API_KEY`**

No keys were modified, renamed, rotated, deleted, or exposed. No project code was altered.

---

## 2. In-Depth Inspection: Variable 1 — `nehandaarmy`

### 2.1 Codebase References & File Locations
A recursive scan across all frontend components (`src/`), server logic (`server/`), API routes (`api/`), Netlify Functions (`netlify/functions/`), SQL migrations, build scripts, and test suites was executed:
* **References in Code:** **0 occurrences.**
* **Files where used:** None.
* **Functions where used:** None.

### 2.2 Feature Powered
* `nehandaarmy` currently **powers 0 active website features** in the codebase.
* It is an orphaned or placeholder variable within the Netlify dashboard (e.g., created during site registration, domain assignment, or administrative record-keeping).

### 2.3 Layer Identification (Frontend / Netlify Functions / Backend)
* It is **not** present in frontend client code (`import.meta.env.nehandaarmy`).
* It is **not** read in Netlify Functions (`process.env.nehandaarmy`).
* It is **not** read in backend services.

### 2.4 Netlify Dependencies
* None. No Netlify build hook, redirect, or serverless function references this variable name.

### 2.5 Impact of GitHub Pages Migration
* **Zero negative impact.** Removing or omitting `nehandaarmy` from GitHub Pages frontend builds will not break any functionality, visual element, calculation, or database flow on `mehandaarmy.net`.

### 2.6 Migration Strategy & Secret Isolation
* Per safety protocol, **do not delete or modify this variable in Netlify**.
* If its value contains an administrative credential or private token, ensure it is documented in your private offline vault.
* **Do NOT** add `nehandaarmy` to GitHub Pages repository variables or public build actions.

---

## 3. In-Depth Inspection: Variable 2 — `VITE_GEMINI_API_KEY`

### 3.1 Codebase References & File Locations
The variable is actively referenced and handled in the following files and functions:

| File Path | Line | Function / Context | Code Snippet Context |
| :--- | :--- | :--- | :--- |
| `server/supportChat.js` | Line 75 | `askGemini(promptText)` | `const apiKey = config.apiKey \|\| (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) \|\| '';` |
| `server/supportChat.js` | Line 21 | `getProviderConfig()` | Reads `process.env.GEMINI_API_KEY` (primary server standard) |
| `server/adminDashboard.js` | Line 385 | `getAdminDashboardData()` | Telemetry check: `ai: { configured: Boolean(env.GEMINI_API_KEY) }` |
| `netlify/functions/support-chat.mjs` | Lines 1–34 | `handler(event)` | Netlify serverless entry point that executes `server/supportChat.js` |
| `api/support-chat.js` | Lines 1–28 | `handler(req, res)` | Standalone Node.js server endpoint executing `server/supportChat.js` |
| `src/components/AICustomerSupport.jsx` | Line 38 & 163 | Client Chat UI | Issues `fetch('/api/support-chat')` to the serverless function |

### 3.2 Feature Powered
`VITE_GEMINI_API_KEY` powers the **AI Customer Support Assistant** (the interactive floating chatbot on `https://mehandaarmy.net`):
1. **Live Conversational Intelligence:** Connects to Google Generative AI (Gemini Flash) to answer real-time customer questions regarding Student Loans (₹1,000 verification desk), Agriculture/Farming Loans (Dairy, Sheep, Goat), investment portfolios, and office contact information.
2. **Contextual Grounding:** Sanitizes customer prompts, protects user privacy, enforces per-IP rate limits, and provides instant financial assistance.
3. **Admin Telemetry:** Informs the Admin Portal whether the AI assistant is active and operational.

### 3.3 Layer Identification (Frontend / Netlify Functions / Backend)
* **Crucial Architectural Detail:** Even though this key carries the `VITE_` prefix, **it is NOT used directly in frontend client code**.
* `src/components/AICustomerSupport.jsx` does **NOT** read `import.meta.env.VITE_GEMINI_API_KEY`.
* Instead, Netlify automatically injects all configured dashboard variables into `process.env` during serverless function execution.
* The Netlify Function (`netlify/functions/support-chat.mjs`) reads the key on the **server side**, queries the Google Gemini API, and returns only the generated text response to the client.

### 3.4 Netlify Dependencies
* The AI chatbot currently relies on **Netlify Functions** (`netlify/functions/support-chat.mjs`) to act as the server-side proxy.
* It relies on Netlify's environment variable injection into the serverless Node.js container (`process.env.VITE_GEMINI_API_KEY` / `process.env.GEMINI_API_KEY`).

### 3.5 What Will Stop Working on GitHub Pages (If Migrated Without Backend)
If the frontend is moved to GitHub Pages **without** a companion backend:
1. GitHub Pages is a static host and **cannot execute `netlify/functions/support-chat.mjs`**.
2. When a user opens the chat and sends a message, `fetch('/api/support-chat')` will fail with an HTTP 404 (Not Found).
3. The chatbot will gracefully fall back to local offline keyword matching (via `getSmartFallbackResponse`), but **live Google Gemini AI generative answers will be disabled**.
4. **CRITICAL WARNING:** Attempting to call Google Gemini directly from the browser on GitHub Pages by putting `VITE_GEMINI_API_KEY` into client JavaScript would **leak the private Gemini API key to the entire internet**. Anyone could steal your API key and exhaust your Google Cloud quota.

### 3.6 Secure Migration Strategy (Preserving 100% Live Functionality)
To ensure the AI chatbot continues working seamlessly with live Google Gemini generation after migrating the frontend to GitHub Pages:

```
[ User on GitHub Pages ] 
  https://mehandaarmy.net
            │
            │  fetch('https://api.mehandaarmy.net/api/support-chat')
            ▼
[ Secure Node.js Backend / Render / Supabase Edge Function ]
  - Environment: GEMINI_API_KEY (strictly private)
  - Executes server/supportChat.js
            │
            │  Internal API Call (Key Never Leaves Backend)
            ▼
[ Google Gemini API (generativelanguage.googleapis.com) ]
```

1. **Deploy the Existing Backend Entry Point:**
   * The project already contains the complete backend handler in `server/supportChat.js` and `api/support-chat.js`.
   * Host this endpoint on a free or low-cost secure Node.js runtime (e.g. Render, Railway, DigitalOcean, or native Supabase Edge Functions).
2. **Configure Backend Environment Variable:**
   * In your backend hosting provider, set:
     ```
     GEMINI_API_KEY=<your_google_gemini_api_key>
     GEMINI_MODEL=gemini-1.5-flash
     ```
3. **Frontend Connection:**
   * In GitHub Pages repository build variables, configure:
     ```
     VITE_API_BASE_URL=https://api.mehandaarmy.net
     ```
   * The frontend chat widget (`AICustomerSupport.jsx`) will communicate with `https://api.mehandaarmy.net/api/support-chat` over HTTPS with CORS protection.
   * **Result:** 100% of the live AI conversational intelligence is preserved, and the API key remains 100% secure.

---

## 4. Summary Matrix

| Variable Name | Present in Netlify | Used in Code? | Layer | Sensitivity | Action for GitHub Pages |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`nehandaarmy`** | Yes | No (0 files) | None (Orphaned) | Low | Leave untouched in Netlify; do not copy to GitHub Pages. |
| **`VITE_GEMINI_API_KEY`** | Yes | Yes (5 files) | Netlify Function / Server | **High Secret** | Migrate to backend environment (`GEMINI_API_KEY`). **NEVER** expose in frontend client bundles. |

---

## 5. Strict Compliance Statement

* No files were modified in the project directory.
* No environment keys were deleted, rotated, or altered.
* Actual secret values were not displayed or recorded.
* Existing functionality remains 100% intact.
