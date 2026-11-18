BEGIN;

ALTER TABLE public.student_loan_demo_applications
  ADD COLUMN IF NOT EXISTS applicant_address text,
  ADD COLUMN IF NOT EXISTS verification_name text,
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS enquiry_status text NOT NULL DEFAULT 'Submitted'
    CHECK (enquiry_status IN (
      'Submitted',
      'Under Review',
      'Additional Information Required',
      'Verification Pending',
      'On Hold',
      'Completed',
      'Rejected'
    )),
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS test_document_path text,
  ADD COLUMN IF NOT EXISTS test_document_name text,
  ADD COLUMN IF NOT EXISTS test_document_type text,
  ADD COLUMN IF NOT EXISTS test_document_size integer;

CREATE UNIQUE INDEX IF NOT EXISTS student_loan_demo_idempotency_unique
  ON public.student_loan_demo_applications (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS student_loan_demo_enquiry_status_submitted_idx
  ON public.student_loan_demo_applications (enquiry_status, submitted_at DESC);

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'student-loan-test-files',
  'student-loan-test-files',
  false,
  1048576,
  ARRAY['text/plain', 'application/json']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET public = false,
    allowed_mime_types = ARRAY['application/x-mai-disabled']
WHERE id = 'student-loan-id-proofs';

DROP POLICY IF EXISTS "Customers upload own student loan ID proofs"
  ON storage.objects;
DROP POLICY IF EXISTS "Customers remove own student loan ID proofs"
  ON storage.objects;

REVOKE ALL ON FUNCTION public.create_student_loan_enquiry(
  text, uuid, text, text, text, integer, text, text, text, boolean, boolean,
  text, text, text, boolean,
  text, text, text, text, text, text, text, text, text,
  date, text, text, text, text, text, text, integer, date
) FROM service_role;

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
  IF p_document_path IS NULL THEN
    IF p_document_name IS NOT NULL OR p_document_type IS NOT NULL OR p_document_size IS NOT NULL THEN
      RAISE EXCEPTION 'Sample-file metadata is incomplete.';
    END IF;
  ELSIF p_document_path !~* (
    '^' || p_user_id::text || '/[0-9a-f-]{36}\.(txt|json)$'
  ) OR p_document_name IS NULL
     OR p_document_name !~* '\b(sample|test)\b'
     OR p_document_type NOT IN ('text/plain', 'application/json')
     OR p_document_size IS NULL OR p_document_size NOT BETWEEN 1 AND 1048576 THEN
    RAISE EXCEPTION 'Only permitted sample/test files up to 1 MB are accepted.';
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
  IF p_customer_remark IS NOT NULL AND length(p_customer_remark) > 1000 THEN
    RAISE EXCEPTION 'Customer-facing remarks must be 1000 characters or fewer.';
  END IF;
  IF p_internal_note IS NOT NULL AND length(p_internal_note) > 2000 THEN
    RAISE EXCEPTION 'Internal notes must be 2000 characters or fewer.';
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