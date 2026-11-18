# GITHUB PAGES DEPLOYMENT GUIDE
**Company:** Mehanda Army Investments  
**Official Domain:** `https://mehandaarmy.net`  
**Registrar:** Northwest Registered Agent  
**Date:** 17 November 2026  

---

## 1. Overview

This document provides complete, actionable instructions for deploying the **Mehanda Army Investments** frontend to **GitHub Pages** with official GitHub Actions workflows and the custom apex domain `mehandaarmy.net`.

---

## 2. GitHub Pages Architecture & Files

The deployment leverages three key integration components:

### 2.1 The Domain Binding (`public/CNAME`)
Located at `public/CNAME`, contains:
```
mehandaarmy.net
```
When Vite runs `npm run build`, everything in `public/` is copied verbatim into `dist/`. GitHub Pages detects `CNAME` in the deployment root and automatically binds the custom domain.

### 2.2 SPA Deep Link Routing Handler (`public/404.html`)
GitHub Pages serves standard HTTP 404 pages when users reload routes such as `/admin`, `/login`, or `/dashboard`.
To ensure 100% seamless Single Page Application (SPA) routing, `public/404.html` captures the requested URL path and queries, encodes them into a redirect to `index.html`, where a companion inline script instantly restores the route in React Router.

### 2.3 Automated Workflow (`.github/workflows/deploy.yml`)
Runs automatically on every push to the `main` branch:
1. Clones the repository.
2. Sets up Node.js 20.
3. Installs dependencies (`npm ci`).
4. Executes `npm run build` using the environment variables.
5. Uploads `dist` via `actions/upload-pages-artifact@v3`.
6. Deploys to GitHub Pages via `actions/deploy-pages@v4`.

---

## 3. GitHub Actions Workflow Configuration

Save this file as `.github/workflows/deploy.yml`:

```yaml
name: Deploy Mehanda Army Investments to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment, skipping runs queued between the run in-progress and latest queued.
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Production Bundle
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL || 'https://kqjchrgdxpydmklbcyib.supabase.co' }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY || secrets.VITE_SUPABASE_ANON_KEY || vars.VITE_SUPABASE_PUBLISHABLE_KEY }}
          VITE_GOOGLE_CLIENT_ID: ${{ vars.VITE_GOOGLE_CLIENT_ID }}
          VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
          VITE_COMPANY_PHONE: ${{ vars.VITE_COMPANY_PHONE || '+91 9812947813' }}
          VITE_COMPANY_WHATSAPP: ${{ vars.VITE_COMPANY_WHATSAPP || '919812947813' }}
          VITE_COMPANY_EMAIL: ${{ vars.VITE_COMPANY_EMAIL || 'info@mehandaarmy.net' }}
        run: npm run build

      - name: Upload Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 4. GitHub Repository Settings Activation

1. Open your repository on GitHub: `https://github.com/<your-username>/<repo-name>`.
2. Click **Settings** (top navigation tab).
3. In the left sidebar, click **Pages** (under "Code and automation").
4. Under **Build and deployment**:
   * **Source:** Select **GitHub Actions** (NOT "Deploy from a branch").
5. Under **Custom domain**:
   * Enter: `mehandaarmy.net`
   * Click **Save**.
   * Check the box: **Enforce HTTPS** (activated once DNS is verified).

---

## 5. Northwest Registered Agent DNS Setup

Log in to your **Northwest Registered Agent** account:
1. Navigate to **Domain Management** ➔ **DNS Settings / Zone Editor** for `mehandaarmy.net`.
2. Remove old Netlify DNS records (e.g. A record pointing to `75.2.60.5`).
3. Add the following records:

### 5.1 Apex Domain A Records:
| Record Type | Host | Points To / IPv4 | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `185.199.108.153` | 1 Hour (3600s) |
| **A** | `@` | `185.199.109.153` | 1 Hour (3600s) |
| **A** | `@` | `185.199.110.153` | 1 Hour (3600s) |
| **A** | `@` | `185.199.111.153` | 1 Hour (3600s) |

### 5.2 WWW Subdomain CNAME Record:
| Record Type | Host | Points To | TTL |
| :--- | :--- | :--- | :--- |
| **CNAME** | `www` | `<your-github-username>.github.io.` | 1 Hour (3600s) |

---

## 6. Verification Checklist

- [ ] `public/CNAME` contains `mehandaarmy.net`.
- [ ] `public/404.html` is present for SPA route refresh handling.
- [ ] `.github/workflows/deploy.yml` committed to repository.
- [ ] GitHub Pages source set to **GitHub Actions**.
- [ ] Northwest DNS records populated and verified via `nslookup mehandaarmy.net`.
- [ ] **Enforce HTTPS** enabled in GitHub Pages settings.
- [ ] Direct URL refresh on `https://mehandaarmy.net/admin` resolves without 404.
