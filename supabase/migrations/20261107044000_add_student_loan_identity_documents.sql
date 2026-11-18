BEGIN;

ALTER TABLE public.student_loan_demo_applications
  ADD COLUMN IF NOT EXISTS applicant_dob date,
  ADD COLUMN IF NOT EXISTS applicant_state text,
  ADD COLUMN IF NOT EXISTS applicant_district text,
  ADD COLUMN IF NOT EXISTS applicant_city text,
  ADD COLUMN IF NOT EXISTS voter_id_number text,
  ADD COLUMN IF NOT EXISTS pan_card_number text,
  ADD COLUMN IF NOT EXISTS identity_document_path text;

ALTER TABLE public.student_loan_demo_applications
  DROP CONSTRAINT IF EXISTS student_loan_demo_applications_voter_id_number_check,
  DROP CONSTRAINT IF EXISTS student_loan_demo_applications_pan_card_number_check,
  DROP CONSTRAINT IF EXISTS student_loan_demo_applications_applicant_state_check;

ALTER TABLE public.student_loan_demo_applications
  ADD CONSTRAINT student_loan_demo_applications_voter_id_number_check
    CHECK (voter_id_number IS NULL OR voter_id_number ~ '^[A-Z]{3}[0-9]{7}$') NOT VALID,
  ADD CONSTRAINT student_loan_demo_applications_pan_card_number_check
    CHECK (pan_card_number IS NULL OR pan_card_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$') NOT VALID,
  ADD CONSTRAINT student_loan_demo_applications_applicant_state_check
    CHECK (applicant_state IS NULL OR applicant_state IN (
      'Haryana', 'Punjab', 'Delhi', 'Rajasthan',
      'Uttar Pradesh', 'Himachal Pradesh'
    )) NOT VALID;

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'student-loan-id-proofs',
  'student-loan-id-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Customers upload own student loan ID proofs"
  ON storage.objects;
CREATE POLICY "Customers upload own student loan ID proofs"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-loan-id-proofs'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Customers remove own student loan ID proofs"
  ON storage.objects;
CREATE POLICY "Customers remove own student loan ID proofs"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-loan-id-proofs'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE OR REPLACE FUNCTION public.create_student_loan_enquiry(
  p_reference text,
  p_user_id uuid,
  p_applicant_name text,
  p_applicant_email text,
  p_applicant_phone text,
  p_applicant_age integer,
  p_student_status text,
  p_course_name text,
  p_enquiry_purpose text,
  p_privacy_consent boolean,
  p_demo_consent boolean,
  p_guardian_name text,
  p_guardian_phone text,
  p_guardian_relationship text,
  p_guardian_consent boolean,
  p_institution_id text,
  p_institution_name text,
  p_institution_state text,
  p_institution_district text,
  p_institution_city text,
  p_institution_pin_code text,
  p_institution_type text,
  p_institution_category text,
  p_institution_source text,
  p_applicant_dob date,
  p_applicant_state text,
  p_applicant_district text,
  p_applicant_city text,
  p_voter_id_number text,
  p_pan_card_number text,
  p_identity_document_path text,
  p_loan_amount integer,
  p_repayment_date date
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
     OR p_applicant_dob > CURRENT_DATE THEN
    RAISE EXCEPTION 'A valid customer account and date of birth are required.';
  END IF;

  v_calculated_age := date_part('year', age(CURRENT_DATE, p_applicant_dob));
  IF v_calculated_age < 1 OR v_calculated_age > 120
     OR p_applicant_age IS DISTINCT FROM v_calculated_age THEN
    RAISE EXCEPTION 'The submitted date of birth is invalid.';
  END IF;
  IF p_privacy_consent IS DISTINCT FROM true OR p_demo_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Both enquiry and privacy acknowledgements are required.';
  END IF;
  IF p_loan_amount IS NULL OR p_loan_amount NOT IN (500, 750, 1000)
     OR p_repayment_date IS NULL OR p_repayment_date < CURRENT_DATE + 7 THEN
    RAISE EXCEPTION 'Enter a valid demo amount and repayment date.';
  END IF;
  IF v_calculated_age < 18 AND (
    p_guardian_consent IS DISTINCT FROM true
    OR p_guardian_name IS NULL OR length(trim(p_guardian_name)) < 2
    OR p_guardian_phone IS NULL OR length(trim(p_guardian_phone)) < 7
    OR p_guardian_relationship IS NULL OR length(trim(p_guardian_relationship)) < 2
  ) THEN
    RAISE EXCEPTION 'A parent or legal guardian must assist with this enquiry.';
  END IF;
  IF p_applicant_state IS NULL OR p_applicant_district IS NULL
     OR length(trim(p_applicant_district)) < 1
     OR p_applicant_city IS NULL OR length(trim(p_applicant_city)) < 1
     OR p_applicant_state NOT IN (
    'Haryana', 'Punjab', 'Delhi', 'Rajasthan', 'Uttar Pradesh', 'Himachal Pradesh'
  ) THEN
    RAISE EXCEPTION 'Select a supported applicant state.';
  END IF;
  IF p_voter_id_number IS NULL OR p_pan_card_number IS NULL
     OR p_voter_id_number !~ '^[A-Z]{3}[0-9]{7}$'
     OR p_pan_card_number !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' THEN
    RAISE EXCEPTION 'Enter valid Voter ID and PAN card numbers.';
  END IF;
  IF p_identity_document_path IS NOT NULL AND (
    p_identity_document_path !~* (
      '^' || p_user_id::text || '/[0-9a-f-]{36}\.(pdf|jpe?g|png|webp)$'
    )
  ) THEN
    RAISE EXCEPTION 'The identity document must belong to the signed-in customer.';
  END IF;

  INSERT INTO public.student_loan_demo_applications (
    reference, user_id, applicant_name, applicant_email, applicant_phone,
    applicant_age, applicant_dob, applicant_state, applicant_district,
    applicant_city, voter_id_number, pan_card_number, identity_document_path,
    student_status, course_name, enquiry_purpose, loan_amount, repayment_date,
    guardian_name, guardian_phone, guardian_relationship, guardian_consent,
    institution_id, institution_name, institution_state, institution_district,
    institution_city, institution_pin_code, institution_type,
    institution_category, institution_source, is_test, is_minor,
    privacy_acknowledged, terms_acknowledged, status
  )
  VALUES (
    p_reference, p_user_id, p_applicant_name, lower(p_applicant_email),
    p_applicant_phone, v_calculated_age, p_applicant_dob, p_applicant_state,
    p_applicant_district, p_applicant_city, p_voter_id_number, p_pan_card_number,
    p_identity_document_path, p_student_status, p_course_name,
    p_enquiry_purpose, p_loan_amount, p_repayment_date,
    p_guardian_name, p_guardian_phone,
    p_guardian_relationship, p_guardian_consent, p_institution_id,
    p_institution_name, p_institution_state, p_institution_district,
    p_institution_city, p_institution_pin_code, p_institution_type,
    p_institution_category, p_institution_source, true, v_calculated_age < 18,
    p_privacy_consent, p_demo_consent, 'Submitted'
  )
  RETURNING * INTO v_application;

  INSERT INTO public.student_loan_status_history (
    reference, previous_status, new_status, customer_remark
  )
  VALUES (
    v_application.reference, NULL, v_application.status,
    'Your enquiry was received. This is not a loan approval or offer.'
  );

  INSERT INTO public.customer_notifications (
    user_id, title, message, notification_type, action_url, metadata
  )
  VALUES (
    p_user_id,
    'Student enquiry received',
    'Your student enquiry was saved. This is not a loan approval or offer.',
    'application_submitted',
    '/dashboard',
    jsonb_build_object('tracking_id', v_application.tracking_id)
  );

  RETURN to_jsonb(v_application);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_student_loan_enquiry(
  text, uuid, text, text, text, integer, text, text, text, boolean, boolean,
  text, text, text, boolean,
  text, text, text, text, text, text, text, text, text,
  date, text, text, text, text, text, text, integer, date
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_loan_enquiry(
  text, uuid, text, text, text, integer, text, text, text, boolean, boolean,
  text, text, text, boolean,
  text, text, text, text, text, text, text, text, text,
  date, text, text, text, text, text, text, integer, date
) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;