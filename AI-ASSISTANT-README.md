# Mehanda Army AI Customer Support

This is an integration package for the existing Mehanda Army Investments
website. It does not replace the site, its pages, or its routing.

## Included files

- `src/components/AICustomerSupport.jsx` — responsive chat widget, message
  controls, timestamps, live provider status, and privacy notice.
- `src/data/supportKnowledgeBase.js` — editable facts, FAQ topics, bilingual
  answers, quick replies, and suggested follow-ups.
- `src/index.css` — branded responsive chat-window and launcher styles.
- `src/App.jsx` — mounts the assistant on the homepage and existing app views.
- `server/supportChat.js` — server-only provider integration, validation,
  sensitive-data filtering, and basic per-IP rate limiting.
- `api/support-chat.js` — Vercel/serverless API adapter.
- `netlify/functions/support-chat.mjs` and `netlify.toml` — Netlify adapter and
  route.
- `vite.config.js` — local development API route.

Merge the files into the matching folders in the existing website. Preserve
other project files and existing route integrations.
The website's `.env.example` lists the optional Google AI environment variable
names; it is deliberately not included in this package.

## Live Google Gemini with Google Search

Every typed question and quick reply is sent to the server-side AI endpoint.
There are no canned FAQ answers or demo fallback: without the server key, the
widget clearly reports that live AI is unavailable and directs visitors to
official support.

Create a Gemini API key in
[Google AI Studio](https://aistudio.google.com/apikey) and configure these
**server-side environment variables** in your hosting provider (or in a local,
uncommitted `.env.local` file for development):

```text
GEMINI_API_KEY=<set privately in the server environment>
GEMINI_MODEL=gemini-flash-latest
```

The backend uses Google's Gemini Interactions API with the `google_search` tool
and displays source citations and Google Search suggestions returned with the
answer. The model may decide a search is unnecessary for a question. Google
may charge for API and Search grounding usage; check current Gemini API pricing
and usage terms before enabling it. Configure the key and restart/redeploy the
server. `GEMINI_MODEL` is optional and defaults to
`gemini-flash-latest`. Never add an API key to a `VITE_` variable, frontend
source, public file, or version control.

Each request includes up to eight recent chat messages for follow-up context
and sets `store=false` for stateless provider requests. The server removes
detected email addresses, phone numbers, payment-card/identity numbers, and
account numbers, and rejects current messages containing credential values.
Credential-bearing prior messages are excluded. This filtering is best effort,
not a guarantee that all sensitive information is removed. Do not send
sensitive, confidential, or personal information. Review the current
[Gemini API terms](https://ai.google.dev/gemini-api/terms) and
[data-handling documentation](https://ai.google.dev/gemini-api/docs/interactions-overview)
before enabling the feature for customers, and confirm the provider's current
age and application eligibility requirements.

The assistant is instructed to speak about the company in a courteous,
constructive, positively professional tone, while not inventing praise or
concealing verified facts. General questions can use Google Search grounding;
company-specific answers prioritize the website's verified information. No
search-backed AI can guarantee a correct answer to every possible question.

The server validates question/history size, enforces a 12-second upstream
timeout, and limits each client IP to 20 requests per 10 minutes per server
process. Serverless deployments can use multiple processes, so configure an
edge/platform-wide rate limit as an additional production control.

### Hosting configuration

- **Netlify:** add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) under Site
  configuration → Environment variables. The existing function route is
  configured in `netlify.toml`. Redeploy after setting variables.
- **Vercel:** add the same server-only variables under Project → Settings →
  Environment Variables. `api/support-chat.js` serves `/api/support-chat`.
- **Local Vite:** put the variables in ignored `.env.local` and restart
  `npm run dev`. The Vite server-side middleware handles `/api/support-chat`.

The local `.env`, `.env.local`, and process environment do not currently define
`GEMINI_API_KEY`, so a real provider request cannot be verified until a key is
configured. The code and automated tests verify the server request path,
validation, privacy filtering, provider error handling, and response parsing
using mocked provider responses; these tests do not prove that a live Google
request succeeds.

After deployment, check `GET /api/support-chat`: it must return JSON with
`provider: "google-gemini"` and `configured: true` when the secret is present,
or `configured: false` when it is absent. It must not return the website HTML or
a demo-mode response. The production site must be redeployed with the current
Netlify function and redirect configuration before testing the real provider.

## Safety and verification

The assistant does not access customer accounts, payment records, or loan
applications and does not submit support requests. It does not accept
applications or payments. Student Small Loan is described as Coming Soon.
Customers are warned not to submit passwords, OTPs, PINs, banking credentials,
Aadhaar/PAN, or identity documents.

Run `npm run build` to build the website. Existing project payment/auth routing
and the Student Loan announcement are retained.
