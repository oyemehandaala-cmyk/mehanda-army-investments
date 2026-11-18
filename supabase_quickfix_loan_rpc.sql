-- =====================================================================
-- MEHANDA ARMY INVESTMENTS — STUDENT LOAN QUICK FIX
-- Run this in Supabase SQL Editor on project: epjjsuousttlvlpjtnvs
-- URL: https://supabase.com/dashboard/project/epjjsuousttlvlpjtnvs/sql/new
--
-- This script runs in SAFE separate steps (no single transaction)
-- so a failure in one step does NOT roll back the others.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- STEP 1: Required Extensions
-- ─────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────
-- STEP 2: Tracking ID Sequence & Generator
-- ─────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.student_loan_tracking_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_student_loan_tracking_id()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
  SELECT 'MAI-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
    lpad(nextval('public.student_loan_tracking_seq'::regclass)::text, 6, '0');
$$;

REVOKE ALL ON FUNCTION public.generate_student_loan_tracking_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_student_loan_tracking_id() TO service_role;
REVOKE ALL ON SEQUENCE public.student_loan_tracking_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.student_loan_tracking_seq TO service_role;

-- ─────────────────────────────────────────────────────────────────────
-- STEP 3: Main Applications Table
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_loan_demo_applications (
  reference TEXT PRIMARY KEY,
  tracking_id TEXT DEFAULT public.generate_student_loan_tracking_id(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  applicant_age INTEGER,
  applicant_dob DATE,
  applicant_state TEXT,
  applicant_district TEXT,
  applicant_city TEXT,
  applicant_address TEXT,
  verification_name TEXT,
  school_name TEXT,
  course_name TEXT,
  loan_amount INTEGER,
  student_status TEXT,
  repayment_date DATE,
  enquiry_purpose TEXT,
  voter_id_number TEXT,
  pan_card_number TEXT,
  identity_document_path TEXT,
  test_document_path TEXT,
  test_document_name TEXT,
  test_document_type TEXT,
  test_document_size INTEGER,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_relationship TEXT,
  guardian_consent BOOLEAN NOT NULL DEFAULT FALSE,
  is_test BOOLEAN NOT NULL DEFAULT TRUE,
  is_minor BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  terms_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'Submitted',
  enquiry_status TEXT NOT NULL DEFAULT 'Submitted',
  latest_customer_remark TEXT,
  institution_id TEXT,
  institution_name TEXT,
  institution_state TEXT,
  institution_district TEXT,
  institution_city TEXT,
  institution_pin_code TEXT,
  institution_type TEXT,
  institution_category TEXT,
  institution_source TEXT,
  idempotency_key UUID,
  status_updated_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns that may be missing (safe, never fails)
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS tracking_id TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS applicant_name TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS applicant_email TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS applicant_phone TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS applicant_age INTEGER;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS applicant_dob DATE;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS applicant_state TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS applicant_district TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS applicant_city TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS applicant_address TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS verification_name TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS school_name TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS course_name TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS guardian_relationship TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS institution_name TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS institution_state TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS institution_district TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS institution_city TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS institution_pin_code TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS institution_type TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS institution_category TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS institution_source TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS enquiry_purpose TEXT;
ALTER TABLE public.student_loan_demo_applications ADD COLUMN IF NOT EXISTS latest_customer_remark TEXT;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS student_loan_demo_tracking_id_unique
  ON public.student_loan_demo_applications (tracking_id)
  WHERE tracking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS student_loan_demo_idempotency_unique
  ON public.student_loan_demo_applications (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_loan_demo_user_id
  ON public.student_loan_demo_applications (user_id);

CREATE INDEX IF NOT EXISTS idx_student_loan_demo_submitted
  ON public.student_loan_demo_applications (submitted_at DESC);

-- RLS
ALTER TABLE public.student_loan_demo_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_loan_demo_applications FROM anon, authenticated;
GRANT ALL ON public.student_loan_demo_applications TO service_role;
GRANT SELECT ON public.student_loan_demo_applications TO authenticated;

-- Customer can view only their own records
DROP POLICY IF EXISTS "Customers view own applications" ON public.student_loan_demo_applications;
CREATE POLICY "Customers view own applications"
  ON public.student_loan_demo_applications FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- STEP 4: Status History Table
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_loan_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL REFERENCES public.student_loan_demo_applications(reference) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_admin_id UUID,
  customer_remark TEXT,
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_loan_history_reference
  ON public.student_loan_status_history (reference, created_at ASC);

ALTER TABLE public.student_loan_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_loan_status_history FROM anon, authenticated;
GRANT ALL ON public.student_loan_status_history TO service_role;
GRANT SELECT ON public.student_loan_status_history TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- STEP 5: Customer Notifications Table
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_user
  ON public.customer_notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own notifications" ON public.customer_notifications;
CREATE POLICY "Customers can view own notifications"
  ON public.customer_notifications FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, UPDATE (is_read) ON public.customer_notifications TO authenticated;
GRANT ALL ON public.customer_notifications TO service_role;

-- ─────────────────────────────────────────────────────────────────────
-- STEP 6: Storage Buckets
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('student-loan-test-files', 'student-loan-test-files', FALSE, 2097152,
   ARRAY['text/plain', 'application/json', 'image/jpeg', 'image/png', 'application/pdf']),
  ('student-loan-id-proofs', 'student-loan-id-proofs', FALSE, 5242880,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('student-loan-documents', 'student-loan-documents', FALSE, 5242880,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = FALSE,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Customers upload own test files" ON storage.objects;
CREATE POLICY "Customers upload own test files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-loan-test-files'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

DROP POLICY IF EXISTS "Customers read own test files" ON storage.objects;
CREATE POLICY "Customers read own test files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-loan-test-files'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

DROP POLICY IF EXISTS "Customers delete own test files" ON storage.objects;
CREATE POLICY "Customers delete own test files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-loan-test-files'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

-- ─────────────────────────────────────────────────────────────────────
-- STEP 7: THE KEY RPC FUNCTION (This is what Final Submit uses)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_student_loan_enquiry_test_v2(
  p_reference text,
  p_user_id uuid,
  p_applicant_name text,
  p_applicant_email text,
  p_applicant_phone text,
  p_applicant_age integer,
  p_applicant_dob date,
  p_verification_name text,
  p_applicant_state text,
  p_applicant_district text,
  p_applicant_city text,
  p_applicant_address text,
  p_school_name text,
  p_course_name text,
  p_idempotency_key uuid,
  p_document_path text,
  p_document_name text,
  p_document_type text,
  p_document_size integer,
  p_privacy_consent boolean,
  p_demo_consent boolean,
  p_guardian_name text,
  p_guardian_phone text,
  p_guardian_relationship text,
  p_guardian_consent boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_application public.student_loan_demo_applications%ROWTYPE;
  v_calculated_age integer;
BEGIN
  IF p_user_id IS NULL OR p_applicant_dob IS NULL
     OR p_applicant_dob > CURRENT_DATE
     OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'A valid account, date of birth, and submission token are required.';
  END IF;

  v_calculated_age := date_part('year', age(CURRENT_DATE, p_applicant_dob));
  IF v_calculated_age < 1 OR v_calculated_age > 120
     OR p_applicant_age IS DISTINCT FROM v_calculated_age THEN
    RAISE EXCEPTION 'The submitted date of birth is invalid.';
  END IF;

  IF p_applicant_name IS NULL OR length(btrim(p_applicant_name)) NOT BETWEEN 3 AND 150
     OR p_applicant_email IS NULL OR length(btrim(p_applicant_email)) > 254
     OR p_applicant_phone IS NULL
     OR p_applicant_state IS NULL OR length(btrim(p_applicant_state)) = 0
     OR p_applicant_district IS NULL OR length(btrim(p_applicant_district)) = 0
     OR p_applicant_city IS NULL OR length(btrim(p_applicant_city)) = 0
     OR p_applicant_address IS NULL OR length(btrim(p_applicant_address)) NOT BETWEEN 5 AND 500
     OR p_school_name IS NULL OR length(btrim(p_school_name)) NOT BETWEEN 2 AND 200
     OR p_course_name IS NULL OR length(btrim(p_course_name)) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'Complete all required enquiry details.';
  END IF;

  IF p_privacy_consent IS DISTINCT FROM true OR p_demo_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Consent is required before submitting this test enquiry.';
  END IF;

  IF v_calculated_age < 18 AND (
    p_guardian_consent IS DISTINCT FROM true
    OR p_guardian_name IS NULL OR length(btrim(p_guardian_name)) NOT BETWEEN 2 AND 150
    OR p_guardian_phone IS NULL
    OR p_guardian_relationship IS NULL
    OR length(btrim(p_guardian_relationship)) NOT BETWEEN 2 AND 80
  ) THEN
    RAISE EXCEPTION 'A parent or legal guardian must assist with this enquiry.';
  END IF;

  INSERT INTO public.student_loan_demo_applications (
    reference, user_id, applicant_name, applicant_email, applicant_phone,
    applicant_age, applicant_dob, applicant_state, applicant_district,
    applicant_city, applicant_address, verification_name, school_name,
    course_name, idempotency_key, test_document_path, test_document_name,
    test_document_type, test_document_size, guardian_name, guardian_phone,
    guardian_relationship, guardian_consent, is_test, is_minor,
    privacy_acknowledged, terms_acknowledged, status, enquiry_status,
    status_updated_at
  )
  VALUES (
    p_reference, p_user_id, btrim(p_applicant_name), lower(btrim(p_applicant_email)),
    btrim(p_applicant_phone), v_calculated_age, p_applicant_dob,
    btrim(p_applicant_state), btrim(p_applicant_district), btrim(p_applicant_city),
    btrim(p_applicant_address), nullif(btrim(p_verification_name), ''),
    btrim(p_school_name), btrim(p_course_name), p_idempotency_key,
    p_document_path, p_document_name, p_document_type, p_document_size,
    nullif(btrim(p_guardian_name), ''), nullif(btrim(p_guardian_phone), ''),
    nullif(btrim(p_guardian_relationship), ''), COALESCE(p_guardian_consent, false),
    true, v_calculated_age < 18, true, true, 'Submitted', 'Submitted', now()
  )
  ON CONFLICT (user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING * INTO v_application;

  IF NOT FOUND THEN
    SELECT * INTO v_application
    FROM public.student_loan_demo_applications
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
    RETURN to_jsonb(v_application);
  END IF;

  BEGIN
    INSERT INTO public.student_loan_status_history (
      reference, previous_status, new_status, customer_remark
    )
    VALUES (
      v_application.reference, NULL, 'Submitted',
      'Your enquiry was received. This is not a loan approval or offer.'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Status history is optional; do not fail submission if it errors
  END;

  BEGIN
    INSERT INTO public.customer_notifications (
      user_id, title, message, notification_type, action_url, metadata
    )
    VALUES (
      p_user_id,
      'Student enquiry received',
      'Your enquiry was saved. This is not a loan approval or offer.',
      'application_submitted',
      '/dashboard',
      jsonb_build_object('tracking_id', v_application.tracking_id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Notification failure should not block submission
  END;

  RETURN to_jsonb(v_application);
END;
$function$;

-- Grant execute to service_role only
REVOKE ALL ON FUNCTION public.create_student_loan_enquiry_test_v2(
  text, uuid, text, text, text, integer, date, text, text, text, text, text,
  text, text, uuid, text, text, text, integer, boolean, boolean, text, text,
  text, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_student_loan_enquiry_test_v2(
  text, uuid, text, text, text, integer, date, text, text, text, text, text,
  text, text, uuid, text, text, text, integer, boolean, boolean, text, text,
  text, boolean
) TO service_role;

-- ─────────────────────────────────────────────────────────────────────
-- STEP 8: PostgREST Schema Cache Reload
-- ─────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────
-- DONE! Verify by running:
-- SELECT proname FROM pg_proc WHERE proname = 'create_student_loan_enquiry_test_v2';
-- Expected: 1 row returned
-- ─────────────────────────────────────────────────────────────────────

