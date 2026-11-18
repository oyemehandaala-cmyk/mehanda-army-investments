# Mehanda Army Investments — Android app

This Expo + React Native + TypeScript app lives separately from the existing website. It reuses the company's existing Supabase Auth project, `profiles` and `transactions` tables, private `profile-photos` bucket, and authenticated `api/profile-photo` / server-side `api/support-chat` endpoints. It never uses a Supabase service-role key or a client-side AI/payment secret.

## What is implemented

- Branded splash and three-screen first-run onboarding.
- Home dashboard and the three service descriptions published by the website.
- Supabase email/password registration, login, password recovery, email verification deep links, session persistence in Expo SecureStore, and Google OAuth handoff.
- Profile read/update under the existing RLS rules, private profile-photo upload through the existing API, and sign out.
- Hindi/English/Hinglish AI chat through the existing server-side support endpoint, with recent context, loading/error/retry states, and no canned answer fallback.
- Published company information, support contacts, FAQ, policy/risk summaries, and an announcement clearly marked “Coming Soon” by the website.
- Read-only transaction history from the existing user-scoped `transactions` table. No sample transactions, checkout, payment confirmation, or downloadable receipt is fabricated.

The existing website has no live mobile notification feed or public website URL in its source configuration. The app does not claim to provide push notifications and does not invent a website address. Announcements are limited to the public information already present on the website.

## Requirements and local setup (Windows PowerShell)

Use Node.js LTS and npm. From the repository root:

```powershell
cd .\mobile-app
npm ci
Copy-Item .env.example .env
```

Edit `mobile-app\.env` and set:

- `EXPO_PUBLIC_SUPABASE_URL`: the existing Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the project's publishable key (or use the legacy anon key value in this variable if that is all the project currently has).
- `EXPO_PUBLIC_API_BASE_URL`: the origin of the deployed website that serves `/api/support-chat` and `/api/profile-photo`, with no trailing slash or `/api` path. A deployment URL is not hardcoded because no verified deployed origin is present in the repository.

## Browser preview (sample data only)

The browser preview is a separate, static page. It does not import the app's Supabase client, call any backend, create accounts, or read or write customer records. Its fictional profile and scripted AI replies are clearly labeled as preview-only.

From `mobile-app` in Windows PowerShell, start the Node.js preview server:

```powershell
node .\preview\serve.mjs
```

Open `http://127.0.0.1:4173/preview/` in a browser. Use the bottom tabs, header buttons, and in-screen links to explore Home, Login, Signup, Profile, Services, AI Chatbot, Notifications, and Settings. On a narrow browser window the preview fills the screen; on desktop it appears in a mobile-sized frame. Set `PORT` to use a different local port.

This preview is for design and navigation review only; it is not the Android app or an APK. Review and approve the design before configuring and creating an Android build.

Then start the Expo development server:

```powershell
npm start
```

Use the Expo Go app/QR only if the installed Expo Go version supports this project's Expo SDK; otherwise use an Android emulator or development build. To launch the configured Android emulator from PowerShell:

```powershell
npm run android
```

Check source types and the Expo project configuration:

```powershell
npm run typecheck
npm run doctor
```

## Supabase setup to verify before release

1. Use the existing Supabase project; do not create a duplicate user store or apply a second copy of the website schema.
2. Confirm email/password Auth, email confirmation, and the website's existing profile/transaction RLS policies are active.
3. In Supabase Auth redirect URL settings, allow the app scheme callbacks: `mehandaarmyinvestments://auth/verify-email`, `mehandaarmyinvestments://auth/reset-password`, and `mehandaarmyinvestments://auth/callback`. Google OAuth must be enabled and configured in the existing Supabase project; its Google provider client secret stays in Supabase, never in the app.
4. Confirm the deployed site's profile-photo function and AI support endpoint are reachable from the app and permit the appropriate mobile origin / native requests. The support server must have `GEMINI_API_KEY` set; the mobile app never receives this key. If the key or API origin is missing, chat explicitly reports that the AI service is unavailable.
5. Test signup, email verification, login, recovery, OAuth, profile RLS, photo upload, own-record transaction access, and error/offline behavior against the actual Supabase project and a real Android device/emulator. Builds and type checks do not prove the live service is configured.

No Supabase schema migration is required by this app. If the website's existing photo-processing backend or policies have not been deployed, photo upload will fail explicitly and must be configured on that existing backend first.
For cloud EAS builds, add the same three `EXPO_PUBLIC_` values to the EAS project's build environment (development/preview/production as applicable); all of these are public client configuration, not secrets. Keep `GEMINI_API_KEY`, Supabase service-role/secret keys, Razorpay secrets, and admin credentials exclusively in the website's server environment.

## Android APK / Play Store AAB with EAS Build

An Expo/EAS account is required for cloud builds; this repository does not claim that a binary has been built.

```powershell
cd .\mobile-app
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Create an internal testing APK:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Create a Play Store Android App Bundle:

```powershell
npx eas-cli@latest build --platform android --profile production
```

EAS will prompt for Android signing credentials or create/manage them with your approval. Download the artifact only after the remote build reports success. Keep signing credentials and all server-side API keys out of source control.

## Known limitations

- A live Google OAuth provider, deployed server API origin, and Android device credentials are project-owner configuration and were not available to verify here.
- No payment flow, investment deposit, admin console, personal push notification, loan application, or receipt download is implemented in this app.
- Transaction history is queried only after verified sign-in; database RLS remains authoritative. If the existing schema/policies are not applied, an explicit database error is shown.
- The project folder contains generated Expo icon/favicon assets from the scaffold; the configured Android icon and splash use the custom company mark in `assets/`.
