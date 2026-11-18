-- =====================================================================
-- MEHANDA ARMY INVESTMENTS
-- STUDENT LOAN ENQUIRY V3 UPGRADE & SCHEMA MIGRATION
--
-- File: supabase_student_loan_v3_upgrade.sql
-- Description:
-- Idempotent, non-destructive database upgrade script.
-- Adds supporting columns for the 5-step application wizard,
-- updates status domain values, verifies private document storage buckets,
-- and ensures strict Row-Level Security (RLS) customer isolation.
--
-- Instructions:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Paste and run this script in the SQL Editor.
-- =====================================================================

BEGIN;

-- 1. Extend Core Applications Table with 5-Step Form Supporting Columns
ALTER TABLE IF EXISTS public.student_loan_demo_applications
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS passing_year TEXT,
  ADD COLUMN IF NOT EXISTS pin_code TEXT,
  ADD COLUMN IF NOT EXISTS education_notes TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- 2. Ensure Performance Indexes
CREATE INDEX IF NOT EXISTS idx_student_loan_apps_user_id
  ON public.student_loan_demo_applications (user_id);

CREATE INDEX IF NOT EXISTS idx_student_loan_apps_submitted_at
  ON public.student_loan_demo_applications (submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_loan_apps_status_submitted
  ON public.student_loan_demo_applications (enquiry_status, submitted_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_loan_apps_tracking_unique
  ON public.student_loan_demo_applications (tracking_id)
  WHERE tracking_id IS NOT NULL;

-- 3. Row-Level Security (RLS) Verification
ALTER TABLE public.student_loan_demo_applications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated customers to view strictly their own submitted records
DROP POLICY IF EXISTS "Customers view own applications" ON public.student_loan_demo_applications;
CREATE POLICY "Customers view own applications"
  ON public.student_loan_demo_applications FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Ensure service role has full access for backend API operations
GRANT ALL ON public.student_loan_demo_applications TO service_role;
GRANT SELECT ON public.student_loan_demo_applications TO authenticated;

-- 4. Status History Table & Policies Verification
CREATE TABLE IF NOT EXISTS public.student_loan_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL REFERENCES public.student_loan_demo_applications(reference) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_remark TEXT,
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_loan_history_ref_created
  ON public.student_loan_status_history (reference, created_at ASC);

ALTER TABLE public.student_loan_status_history ENABLE ROW LEVEL SECURITY;

-- Allow customers to view status history remarks for their own applications
DROP POLICY IF EXISTS "Customers view own application history" ON public.student_loan_status_history;
CREATE POLICY "Customers view own application history"
  ON public.student_loan_status_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_loan_demo_applications a
      WHERE a.reference = student_loan_status_history.reference
        AND a.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON public.student_loan_status_history TO authenticated;
GRANT ALL ON public.student_loan_status_history TO service_role;

-- 5. Secure Private Storage Buckets for Documents & Photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('student-loan-documents', 'student-loan-documents', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('student-loan-id-proofs', 'student-loan-id-proofs', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('student-loan-test-files', 'student-loan-test-files', FALSE, 2097152, ARRAY['text/plain', 'application/json', 'image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: Ensure customers can only upload and read within their own user_id directory
DROP POLICY IF EXISTS "Customers manage own documents" ON storage.objects;
CREATE POLICY "Customers manage own documents"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id IN ('student-loan-documents', 'student-loan-id-proofs', 'student-loan-test-files')
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  )
  WITH CHECK (
    bucket_id IN ('student-loan-documents', 'student-loan-id-proofs', 'student-loan-test-files')
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

COMMIT;

