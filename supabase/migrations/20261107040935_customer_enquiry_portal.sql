-- Add account-owned enquiry fields without removing or rewriting existing records.
BEGIN;

ALTER TABLE public.student_loan_demo_applications
  ALTER COLUMN loan_amount DROP NOT NULL,
  ALTER COLUMN repayment_date DROP NOT NULL,
  ALTER COLUMN student_status DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS applicant_age integer
    CHECK (applicant_age IS NULL OR applicant_age BETWEEN 1 AND 120),
  ADD COLUMN IF NOT EXISTS course_name text;

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
  p_institution_source text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_application public.student_loan_demo_applications%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_applicant_age IS NULL
     OR p_applicant_age NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'A valid customer account and age are required.';
  END IF;
  IF p_privacy_consent IS DISTINCT FROM true OR p_demo_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Both enquiry and privacy acknowledgements are required.';
  END IF;
  IF p_applicant_age < 18 AND (
    p_guardian_consent IS DISTINCT FROM true
    OR p_guardian_name IS NULL OR length(trim(p_guardian_name)) < 2
    OR p_guardian_phone IS NULL OR length(trim(p_guardian_phone)) < 7
    OR p_guardian_relationship IS NULL OR length(trim(p_guardian_relationship)) < 2
  ) THEN
    RAISE EXCEPTION 'A parent or legal guardian must assist with this enquiry.';
  END IF;

  INSERT INTO public.student_loan_demo_applications (
    reference, user_id, applicant_name, applicant_email, applicant_phone,
    applicant_age, student_status, course_name, enquiry_purpose,
    guardian_name, guardian_phone, guardian_relationship, guardian_consent,
    institution_id, institution_name, institution_state, institution_district,
    institution_city, institution_pin_code, institution_type,
    institution_category, institution_source, is_test, is_minor,
    privacy_acknowledged, terms_acknowledged, status
  )
  VALUES (
    p_reference, p_user_id, p_applicant_name, lower(p_applicant_email),
    p_applicant_phone, p_applicant_age, p_student_status, p_course_name,
    p_enquiry_purpose, p_guardian_name, p_guardian_phone,
    p_guardian_relationship, p_guardian_consent, p_institution_id,
    p_institution_name, p_institution_state, p_institution_district,
    p_institution_city, p_institution_pin_code, p_institution_type,
    p_institution_category, p_institution_source, true, p_applicant_age < 18,
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
  text, text, text, boolean, text, text, text, text, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_loan_enquiry(
  text, uuid, text, text, text, integer, text, text, text, boolean, boolean,
  text, text, text, boolean, text, text, text, text, text, text, text, text, text
) TO service_role;

GRANT SELECT (
  applicant_name, applicant_email, applicant_phone, applicant_age,
  course_name, guardian_name, guardian_phone, guardian_relationship,
  guardian_consent, is_minor
) ON public.student_loan_demo_applications TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_minor_student_loan_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.is_minor AND NEW.status = 'Approved' THEN
    RAISE EXCEPTION 'Minor enquiries cannot be independently approved.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_minor_student_loan_approval
  ON public.student_loan_demo_applications;
CREATE TRIGGER prevent_minor_student_loan_approval
  BEFORE INSERT OR UPDATE ON public.student_loan_demo_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_minor_student_loan_approval();

ALTER TABLE public.investment_enquiries
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS investment_enquiries_user_created_idx
  ON public.investment_enquiries (user_id, created_at DESC);
ALTER TABLE public.investment_enquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers can view own investment enquiries"
  ON public.investment_enquiries;
CREATE POLICY "Customers can view own investment enquiries"
  ON public.investment_enquiries
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

NOTIFY pgrst, 'reload schema';
COMMIT;