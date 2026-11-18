-- =====================================================================
-- MEHANDA ARMY INVESTMENTS
-- CENTRALIZED FORM SUBMISSION MANAGEMENT — DATABASE MIGRATION
--
-- File: supabase_centralized_submissions.sql
-- Purpose:
--   1. Creates contact_enquiries table for Contact form submissions.
--   2. Creates submission_status_history table for all form types.
--   3. Fixes investment_enquiries status constraint to allow all statuses.
--   4. Adds indexes for fast admin search/filter.
--   5. Applies RLS: customers see only their own records; service_role
--      (used only server-side) sees all records.
--
-- INSTRUCTIONS:
--   Open: https://supabase.com/dashboard/project/epjjsuousttlvlpjtnvs/sql/new
--   Paste this entire file and click Run.
--
-- SAFE: Idempotent — can be re-run without data loss.
-- =====================================================================

BEGIN;

-- ============================================================
-- 1. CONTACT ENQUIRIES TABLE
--    Stores contact/callback form submissions from Contact.jsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contact_enquiries (
  id          TEXT PRIMARY KEY DEFAULT ('MAI-CON-' || to_char(NOW(), 'YYYY') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  service_interest TEXT,
  message     TEXT,
  consent     BOOLEAN NOT NULL DEFAULT FALSE,
  status      TEXT NOT NULL DEFAULT 'Submitted'
              CHECK (status IN ('Submitted', 'Under Review', 'Contacted', 'Completed', 'Closed')),
  admin_notes TEXT,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for admin search and reporting
CREATE INDEX IF NOT EXISTS idx_contact_enquiries_created
  ON public.contact_enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_enquiries_status
  ON public.contact_enquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_enquiries_name
  ON public.contact_enquiries (lower(full_name));
CREATE INDEX IF NOT EXISTS idx_contact_enquiries_user_id
  ON public.contact_enquiries (user_id);

-- RLS
ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_enquiries_customer_select" ON public.contact_enquiries;
CREATE POLICY "contact_enquiries_customer_select"
  ON public.contact_enquiries FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR lower(email) = lower(auth.jwt()->>'email')
  );

DROP POLICY IF EXISTS "contact_enquiries_public_insert" ON public.contact_enquiries;
CREATE POLICY "contact_enquiries_public_insert"
  ON public.contact_enquiries FOR INSERT TO authenticated, anon
  WITH CHECK (true);

GRANT ALL ON public.contact_enquiries TO service_role;
GRANT SELECT, INSERT ON public.contact_enquiries TO authenticated;
GRANT INSERT ON public.contact_enquiries TO anon;

-- ============================================================
-- 2. UNIFIED SUBMISSION STATUS HISTORY TABLE
--    Tracks every status change across all form types
-- ============================================================
CREATE TABLE IF NOT EXISTS public.submission_status_history (
  id            BIGSERIAL PRIMARY KEY,
  form_type     TEXT NOT NULL CHECK (form_type IN ('contact', 'investment', 'student_loan')),
  submission_id TEXT NOT NULL,
  previous_status TEXT,
  new_status    TEXT NOT NULL,
  admin_notes   TEXT,
  changed_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_status_history_submission
  ON public.submission_status_history (form_type, submission_id, created_at DESC);

ALTER TABLE public.submission_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submission_status_history_service_role" ON public.submission_status_history;
-- Service role (server-only) has full access via GRANT; RLS set to deny customers by default
-- Customers do NOT need to read status history via this table (they use the per-table status)

GRANT ALL ON public.submission_status_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.submission_status_history_id_seq TO service_role;

-- ============================================================
-- 3. FIX INVESTMENT ENQUIRIES STATUS CONSTRAINT
--    Old constraint only had legacy values; widen it safely.
-- ============================================================
ALTER TABLE public.investment_enquiries
  DROP CONSTRAINT IF EXISTS investment_enquiries_status_check;

ALTER TABLE public.investment_enquiries
  ADD CONSTRAINT investment_enquiries_status_check
  CHECK (status IN (
    'new', 'Submitted', 'Under Review', 'Contacted',
    'Information Provided', 'Completed', 'Closed',
    'contacted', 'consultation_scheduled', 'closed'
  ));

-- Set default for new rows to 'Submitted'
ALTER TABLE public.investment_enquiries
  ALTER COLUMN status SET DEFAULT 'Submitted';

-- Auto-set id if not provided
ALTER TABLE public.investment_enquiries
  ALTER COLUMN id SET DEFAULT (
    'enq_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 12)
  );

-- ============================================================
-- 4. INVESTMENT ENQUIRIES — ensure admin_notes column exists
-- ============================================================
ALTER TABLE public.investment_enquiries
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- ============================================================
-- 5. CONTACT ENQUIRIES — auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contact_enquiries_set_updated_at ON public.contact_enquiries;
CREATE TRIGGER contact_enquiries_set_updated_at
  BEFORE UPDATE ON public.contact_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. INVESTMENT ENQUIRIES — ensure updated_at trigger exists
-- ============================================================
DROP TRIGGER IF EXISTS investment_enquiries_set_updated_at ON public.investment_enquiries;
CREATE TRIGGER investment_enquiries_set_updated_at
  BEFORE UPDATE ON public.investment_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7. STUDENT LOAN APPLICATIONS — ensure columns and documents JSONB exist
-- ============================================================
ALTER TABLE public.student_loan_demo_applications
  ADD COLUMN IF NOT EXISTS documents JSONB,
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS passing_year TEXT,
  ADD COLUMN IF NOT EXISTS pin_code TEXT;

-- ============================================================
-- 8. STORAGE BUCKET FOR VERIFICATION DOCUMENTS (JPG, PNG, PDF UP TO 5 MB)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('student-loan-id-proofs', 'student-loan-id-proofs', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('student-loan-test-files', 'student-loan-test-files', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'application/json'])
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 5242880,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies: authenticated customer can upload their own folder
DROP POLICY IF EXISTS "Customers upload own verification files" ON storage.objects;
CREATE POLICY "Customers upload own verification files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('student-loan-id-proofs', 'student-loan-test-files')
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

DROP POLICY IF EXISTS "Customers delete own verification files" ON storage.objects;
CREATE POLICY "Customers delete own verification files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('student-loan-id-proofs', 'student-loan-test-files')
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

DROP POLICY IF EXISTS "Customers read own verification files" ON storage.objects;
CREATE POLICY "Customers read own verification files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('student-loan-id-proofs', 'student-loan-test-files')
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

-- ============================================================
-- 9. MANDATORY EMAIL OTP VERIFICATION COLUMNS & AUDIT
-- ============================================================
ALTER TABLE public.contact_enquiries
  ADD COLUMN IF NOT EXISTS verified_email TEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

ALTER TABLE public.investment_enquiries
  ADD COLUMN IF NOT EXISTS verified_email TEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

ALTER TABLE public.student_loan_demo_applications
  ADD COLUMN IF NOT EXISTS verified_email TEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Fix missing metadata column in customer_notifications if table already existed
ALTER TABLE IF EXISTS public.customer_notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE TABLE IF NOT EXISTS public.email_otp_verifications (
  id           BIGSERIAL PRIMARY KEY,
  email        TEXT NOT NULL,
  otp_hash     TEXT NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ NOT NULL,
  verified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_email ON public.email_otp_verifications(lower(email), created_at DESC);
ALTER TABLE public.email_otp_verifications ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.email_otp_verifications TO service_role;

-- ============================================================
-- 10. AUTOMATIC APPLICATION EMAIL NOTIFICATIONS TABLE
--     Tracks every status update notification email sent to applicants
-- ============================================================
CREATE TABLE IF NOT EXISTS public.application_email_notifications (
  id                BIGSERIAL PRIMARY KEY,
  application_id    TEXT NOT NULL,
  form_type         TEXT NOT NULL DEFAULT 'student_loan',
  recipient_email   TEXT NOT NULL,
  recipient_name    TEXT,
  previous_status   TEXT,
  new_status        TEXT NOT NULL,
  subject           TEXT NOT NULL,
  admin_remark      TEXT,
  delivery_status   TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed')),
  delivery_provider TEXT,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_email_notif_app_id
  ON public.application_email_notifications (application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_email_notif_recipient
  ON public.application_email_notifications (lower(recipient_email));

ALTER TABLE public.application_email_notifications ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.application_email_notifications TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.application_email_notifications_id_seq TO service_role;

COMMIT;

-- =====================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- Run these separately to verify everything was created correctly:
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'contact_enquiries' ORDER BY ordinal_position;
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'submission_status_history' ORDER BY ordinal_position;
--
-- SELECT COUNT(*) FROM public.contact_enquiries;
-- SELECT COUNT(*) FROM public.submission_status_history;
-- =====================================================================

