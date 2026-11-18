# ROLLBACK & RECOVERY GUIDE
**Company:** Mehanda Army Investments  
**Official Domain:** `https://mehandaarmy.net`  
**Date:** 17 November 2026  

---

## 1. Executive Summary

This guide outlines the precise steps to rapidly rollback the **Mehanda Army Investments** website to its previous Netlify hosting environment or restore any system component in case of unforeseen production issues.

---

## 2. Zero-Loss Guarantee: What Remains Untouched

Throughout this migration process:
* **Production Database Records:** All customer accounts, loan applications, KYC documents, and admin tables in Supabase remain untouched and safely hosted in Supabase PostgreSQL.
* **Netlify Configuration Preserved:** `netlify.toml`, `_redirects`, and all functions in `netlify/functions/` remain intact in the repository. Netlify builds will continue to function immediately if redeployed.
* **Git Version History:** Every change is committed to Git with granular, reversible commit points.

---

## 3. Instant Rollback to Netlify (5-Minute Procedure)

If you ever decide to switch back from GitHub Pages to Netlify, follow these steps:

### Step 1: Revert DNS Records at Northwest Registered Agent
1. Log in to your **Northwest Registered Agent** account.
2. Go to **Domain Management** ➔ **DNS Zone Editor** for `mehandaarmy.net`.
3. Delete the 4 GitHub Pages A records (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`).
4. Re-add the Netlify A record:
   * **Type:** `A`
   * **Host:** `@`
   * **Points To:** `75.2.60.5` (Netlify Load Balancer IP)
   * **TTL:** `3600`
5. Update the `www` CNAME record:
   * **Type:** `CNAME`
   * **Host:** `www`
   * **Points To:** `<your-netlify-site-name>.netlify.app.`
   * **TTL:** `3600`

### Step 2: Trigger Netlify Deployment
1. Log in to your **Netlify Dashboard**.
2. Select your site.
3. Under **Deploys**, click **Trigger deploy** ➔ **Deploy site**.
4. Within 2 to 5 minutes, global DNS caches will point back to Netlify with zero customer downtime.

---

## 4. Frontend Codebase Rollback

To revert local or GitHub repository changes to an earlier state:

### Revert to Previous Git Commit:
```bash
# Check recent commit history
git log --oneline -n 10

# Revert to a specific commit cleanly
git revert <commit-hash>

# Push the reverted state to GitHub main
git push origin main
```

---

## 5. Database Schema & Data Safety

### 5.1 Exporting a Supabase Backup
Before making any major administrative or database changes:
1. Open the **Supabase Dashboard**: `https://supabase.com/dashboard/project/kqjchrgdxpydmklbcyib`.
2. Go to **Project Settings** ➔ **Database** ➔ **Backups**.
3. Download the latest daily scheduled backup or create a manual dump using `pg_dump`:
   ```bash
   # Optional manual dump (if direct DB connection is enabled)
   pg_dump "postgres://postgres:[YOUR-PASSWORD]@db.kqjchrgdxpydmklbcyib.supabase.co:5432/postgres" > mehanda_army_backup.sql
   ```

### 5.2 Emergency Admin Session Restore
If local admin sessions in development are ever corrupted or cleared:
* The session persistence file is located at `scratch/admin_sessions_backup.json`.
* The WebAuthn credential backup is located at `scratch/admin_credentials_backup.json`.
* Both files are automatically loaded by `server/adminAuth.js` and `server/webauthnService.js` on boot.
