-- =====================================================================
-- MEHANDA ARMY INVESTMENTS
-- COMPLETE ALL-IN-ONE STUDENT LOAN MIGRATION SCRIPT
--
-- Run this SINGLE script in your Supabase SQL Editor:
-- https://app.supabase.com -> Project -> SQL Editor -> New query -> Paste -> Run
--
-- This script safely and idempotently sets up everything required for:
-- 1. Student Loan Enquiry Submissions
-- 2. Customer Application Tracking
-- 3. Document / Sample File Uploads
-- 4. Status History & Notifications
-- 5. Admin Status Updates & Remarks
-- =====================================================================

BEGIN;

-- 0. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Sequential Tracking ID Generator (MAI-YYYY-XXXXXX)
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

-- 2. Student Loan Institutions Catalog Table
CREATE TABLE IF NOT EXISTS public.student_loan_institutions (
  institution_id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('UDISE+', 'AISHE')),
  source_record_id TEXT NOT NULL,
  official_name TEXT NOT NULL CHECK (length(trim(official_name)) BETWEEN 3 AND 200),
  state TEXT NOT NULL CHECK (length(trim(state)) BETWEEN 2 AND 100),
  district TEXT NOT NULL CHECK (length(trim(district)) BETWEEN 2 AND 100),
  city TEXT,
  pin_code TEXT CHECK (pin_code IS NULL OR pin_code ~ '^[0-9]{6}$'),
  institution_type TEXT NOT NULL CHECK (institution_type IN ('school', 'college', 'university', 'other')),
  management TEXT NOT NULL CHECK (management IN ('Government', 'Private')),
  source_updated_at DATE,
  UNIQUE (source, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_student_loan_inst_name_trgm
  ON public.student_loan_institutions USING GIN (official_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_student_loan_inst_state_district
  ON public.student_loan_institutions (state, district, management, official_name);

ALTER TABLE public.student_loan_institutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_loan_institutions FROM anon, authenticated;
GRANT SELECT ON public.student_loan_institutions TO authenticated, service_role;

-- 3. Student Loan Applications Table (Core Table)
CREATE TABLE IF NOT EXISTS public.student_loan_demo_applications (
  reference TEXT PRIMARY KEY
    CHECK (reference ~ '^MAI-SL-[0-9]{4}-[A-F0-9]{32}$'),
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

-- Safe column additions if table was created in an older schema
ALTER TABLE public.student_loan_demo_applications
  ALTER COLUMN loan_amount DROP NOT NULL,
  ALTER COLUMN repayment_date DROP NOT NULL,
  ALTER COLUMN student_status DROP NOT NULL;

ALTER TABLE public.student_loan_demo_applications
  ADD COLUMN IF NOT EXISTS tracking_id TEXT DEFAULT public.generate_student_loan_tracking_id(),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS applicant_name TEXT,
  ADD COLUMN IF NOT EXISTS applicant_email TEXT,
  ADD COLUMN IF NOT EXISTS applicant_phone TEXT,
  ADD COLUMN IF NOT EXISTS applicant_age INTEGER,
  ADD COLUMN IF NOT EXISTS applicant_dob DATE,
  ADD COLUMN IF NOT EXISTS applicant_state TEXT,
  ADD COLUMN IF NOT EXISTS applicant_district TEXT,
  ADD COLUMN IF NOT EXISTS applicant_city TEXT,
  ADD COLUMN IF NOT EXISTS applicant_address TEXT,
  ADD COLUMN IF NOT EXISTS verification_name TEXT,
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS course_name TEXT,
  ADD COLUMN IF NOT EXISTS enquiry_purpose TEXT,
  ADD COLUMN IF NOT EXISTS voter_id_number TEXT,
  ADD COLUMN IF NOT EXISTS pan_card_number TEXT,
  ADD COLUMN IF NOT EXISTS identity_document_path TEXT,
  ADD COLUMN IF NOT EXISTS test_document_path TEXT,
  ADD COLUMN IF NOT EXISTS test_document_name TEXT,
  ADD COLUMN IF NOT EXISTS test_document_type TEXT,
  ADD COLUMN IF NOT EXISTS test_document_size INTEGER,
  ADD COLUMN IF NOT EXISTS guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
  ADD COLUMN IF NOT EXISTS guardian_relationship TEXT,
  ADD COLUMN IF NOT EXISTS guardian_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_minor BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS privacy_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terms_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Submitted',
  ADD COLUMN IF NOT EXISTS enquiry_status TEXT NOT NULL DEFAULT 'Submitted',
  ADD COLUMN IF NOT EXISTS latest_customer_remark TEXT,
  ADD COLUMN IF NOT EXISTS institution_id TEXT,
  ADD COLUMN IF NOT EXISTS institution_name TEXT,
  ADD COLUMN IF NOT EXISTS institution_state TEXT,
  ADD COLUMN IF NOT EXISTS institution_district TEXT,
  ADD COLUMN IF NOT EXISTS institution_city TEXT,
  ADD COLUMN IF NOT EXISTS institution_pin_code TEXT,
  ADD COLUMN IF NOT EXISTS institution_type TEXT,
  ADD COLUMN IF NOT EXISTS institution_category TEXT,
  ADD COLUMN IF NOT EXISTS institution_source TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key UUID,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

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
CREATE INDEX IF NOT EXISTS student_loan_demo_enquiry_status_submitted_idx
  ON public.student_loan_demo_applications (enquiry_status, submitted_at DESC);

ALTER TABLE public.student_loan_demo_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_loan_demo_applications FROM anon, authenticated;
GRANT ALL ON public.student_loan_demo_applications TO service_role;

-- 4. Status History Table
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

CREATE INDEX IF NOT EXISTS idx_student_loan_history_reference
  ON public.student_loan_status_history (reference, created_at ASC);

ALTER TABLE public.student_loan_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_loan_status_history FROM anon, authenticated;
GRANT ALL ON public.student_loan_status_history TO service_role;

-- 5. Customer Notifications Table
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

-- 6. Storage Buckets for Documents & Sample Test Files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('student-loan-test-files', 'student-loan-test-files', FALSE, 1048576, ARRAY['text/plain', 'application/json']),
  ('student-loan-id-proofs', 'student-loan-id-proofs', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for authenticated test file uploads
DROP POLICY IF EXISTS "Customers upload own test files" ON storage.objects;
CREATE POLICY "Customers upload own test files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
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

-- 7. RPC: Create Student Loan Enquiry (v2 Test Mode)
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
SECURITY INVOKER
SET search_path = ''
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
     OR p_applicant_phone !~ '^(?:\+91[- ]?)?[6-9][0-9]{9}$'
     OR p_applicant_state IS NULL OR length(btrim(p_applicant_state)) = 0
     OR p_applicant_district IS NULL OR length(btrim(p_applicant_district)) = 0
     OR p_applicant_city IS NULL OR length(btrim(p_applicant_city)) = 0
     OR p_applicant_address IS NULL OR length(btrim(p_applicant_address)) NOT BETWEEN 5 AND 500
     OR p_school_name IS NULL OR length(btrim(p_school_name)) NOT BETWEEN 2 AND 200
     OR p_course_name IS NULL OR length(btrim(p_course_name)) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'Complete all required enquiry details.';
  END IF;

  IF p_verification_name IS NOT NULL
     AND lower(regexp_replace(btrim(p_applicant_name), '\s+', ' ', 'g'))
       <> lower(regexp_replace(btrim(p_verification_name), '\s+', ' ', 'g')) THEN
    RAISE EXCEPTION 'Applicant and supporting-document names must match after spacing and case normalization.';
  END IF;

  IF p_privacy_consent IS DISTINCT FROM true OR p_demo_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Consent is required before submitting this test enquiry.';
  END IF;

  IF v_calculated_age < 18 AND (
    p_guardian_consent IS DISTINCT FROM true
    OR p_guardian_name IS NULL OR length(btrim(p_guardian_name)) NOT BETWEEN 2 AND 150
    OR p_guardian_phone IS NULL
    OR p_guardian_phone !~ '^(?:\+91[- ]?)?[6-9][0-9]{9}$'
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
    nullif(btrim(p_guardian_relationship), ''), p_guardian_consent,
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

  INSERT INTO public.student_loan_status_history (
    reference, previous_status, new_status, customer_remark
  )
  VALUES (
    v_application.reference, NULL, 'Submitted',
    'Your enquiry was received. This is not a loan approval or offer.'
  );

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

  RETURN to_jsonb(v_application);
END;
$function$;

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

-- 8. RPC: Update Student Loan Enquiry Status (Admin Review)
CREATE OR REPLACE FUNCTION public.update_student_loan_enquiry_status(
  p_reference text,
  p_admin_user_id uuid,
  p_status text,
  p_customer_remark text DEFAULT NULL,
  p_internal_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_application public.student_loan_demo_applications%ROWTYPE;
  v_previous_status text;
BEGIN
  IF p_status NOT IN (
    'Submitted', 'Under Review', 'Additional Information Required',
    'Verification Pending', 'On Hold', 'Completed', 'Rejected'
  ) THEN
    RAISE EXCEPTION 'Invalid enquiry status.';
  END IF;

  SELECT * INTO v_application
  FROM public.student_loan_demo_applications
  WHERE reference = p_reference
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student enquiry not found.';
  END IF;

  v_previous_status := v_application.enquiry_status;
  UPDATE public.student_loan_demo_applications
  SET enquiry_status = p_status,
      latest_customer_remark = p_customer_remark,
      status_updated_at = now(),
      updated_at = now()
  WHERE reference = p_reference
  RETURNING * INTO v_application;

  INSERT INTO public.student_loan_status_history (
    reference, previous_status, new_status, changed_by_admin_id,
    customer_remark, internal_note
  )
  VALUES (
    p_reference, v_previous_status, p_status, p_admin_user_id,
    p_customer_remark, p_internal_note
  );

  IF v_application.user_id IS NOT NULL THEN
    INSERT INTO public.customer_notifications (
      user_id, title, message, notification_type, action_url, metadata
    )
    VALUES (
      v_application.user_id,
      'Enquiry status updated',
      COALESCE(p_customer_remark, 'Your student enquiry status has been updated.'),
      CASE WHEN p_status = 'Additional Information Required'
        THEN 'info_requested' ELSE 'status_updated' END,
      '/dashboard',
      jsonb_build_object('tracking_id', v_application.tracking_id, 'status', p_status)
    );
  END IF;

  RETURN to_jsonb(v_application);
END;
$function$;

REVOKE ALL ON FUNCTION public.update_student_loan_enquiry_status(
  text, uuid, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_loan_enquiry_status(
  text, uuid, text, text, text
) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

