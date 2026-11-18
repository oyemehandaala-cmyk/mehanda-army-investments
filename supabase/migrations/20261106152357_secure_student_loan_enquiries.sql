BEGIN;

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

CREATE TABLE IF NOT EXISTS public.student_loan_demo_applications (
  reference text PRIMARY KEY
    CHECK (reference ~ '^MAI-SL-[0-9]{4}-[A-F0-9]{32}$'),
  loan_amount integer NOT NULL CHECK (loan_amount IN (500, 750, 1000)),
  student_status text NOT NULL
    CHECK (student_status IN ('school', 'undergraduate', 'postgraduate', 'diploma', 'professional', 'vocational')),
  repayment_date date NOT NULL,
  status text NOT NULL DEFAULT 'Submitted',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_loan_demo_applications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tracking_id text,
  ADD COLUMN IF NOT EXISTS applicant_name text,
  ADD COLUMN IF NOT EXISTS applicant_email text,
  ADD COLUMN IF NOT EXISTS applicant_phone text,
  ADD COLUMN IF NOT EXISTS enquiry_purpose text,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_minor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS guardian_relationship text,
  ADD COLUMN IF NOT EXISTS guardian_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS latest_customer_remark text,
  ADD COLUMN IF NOT EXISTS institution_id text,
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS institution_state text,
  ADD COLUMN IF NOT EXISTS institution_district text,
  ADD COLUMN IF NOT EXISTS institution_city text,
  ADD COLUMN IF NOT EXISTS institution_pin_code text,
  ADD COLUMN IF NOT EXISTS institution_type text,
  ADD COLUMN IF NOT EXISTS institution_category text,
  ADD COLUMN IF NOT EXISTS institution_source text;

ALTER TABLE public.student_loan_demo_applications
  ALTER COLUMN tracking_id SET DEFAULT public.generate_student_loan_tracking_id();

CREATE UNIQUE INDEX IF NOT EXISTS student_loan_demo_tracking_id_unique
  ON public.student_loan_demo_applications (tracking_id)
  WHERE tracking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS student_loan_demo_user_submitted_idx
  ON public.student_loan_demo_applications (user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_loan_demo_submitted
  ON public.student_loan_demo_applications (submitted_at DESC);

ALTER TABLE public.student_loan_demo_applications
  DROP CONSTRAINT IF EXISTS student_loan_demo_applications_status_check;
ALTER TABLE public.student_loan_demo_applications
  ADD CONSTRAINT student_loan_demo_applications_status_check
  CHECK (status IN (
    'Submitted',
    'Pending Review',
    'Under Review',
    'Additional Information Required',
    'Approved',
    'Rejected',
    'Closed'
  )) NOT VALID;

CREATE TABLE IF NOT EXISTS public.student_loan_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL REFERENCES public.student_loan_demo_applications(reference) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_remark text,
  internal_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_loan_status_history_reference_created_idx
  ON public.student_loan_status_history (reference, created_at);

CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN (
    'application_submitted',
    'status_updated',
    'info_requested',
    'payment_confirmed',
    'document_reviewed',
    'support_reply',
    'announcement'
  )),
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_user
  ON public.customer_notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.student_loan_demo_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_loan_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own student loan demo applications"
  ON public.student_loan_demo_applications;
CREATE POLICY "Customers can view own student loan demo applications"
  ON public.student_loan_demo_applications
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Enforce student loan application ownership"
  ON public.student_loan_demo_applications;
CREATE POLICY "Enforce student loan application ownership"
  ON public.student_loan_demo_applications
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Customers can view own student loan status history"
  ON public.student_loan_status_history;
CREATE POLICY "Customers can view own student loan status history"
  ON public.student_loan_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.student_loan_demo_applications AS application
    WHERE application.reference = student_loan_status_history.reference
      AND application.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Enforce student loan status history ownership"
  ON public.student_loan_status_history;
CREATE POLICY "Enforce student loan status history ownership"
  ON public.student_loan_status_history
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.student_loan_demo_applications AS application
    WHERE application.reference = student_loan_status_history.reference
      AND application.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Customers can view own notifications"
  ON public.customer_notifications;
CREATE POLICY "Customers can view own notifications"
  ON public.customer_notifications
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Customers can update own notification read status"
  ON public.customer_notifications;
DROP POLICY IF EXISTS "Customers can update read status of own notifications"
  ON public.customer_notifications;
CREATE POLICY "Customers can update read status of own notifications"
  ON public.customer_notifications
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Enforce customer notification ownership"
  ON public.customer_notifications;
CREATE POLICY "Enforce customer notification ownership"
  ON public.customer_notifications
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.student_loan_demo_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  reference, tracking_id, user_id, loan_amount, student_status, repayment_date,
  status, submitted_at, updated_at, enquiry_purpose, is_test,
  institution_id, institution_name, institution_state, institution_district,
  institution_city, institution_pin_code, institution_type, institution_category,
  institution_source, latest_customer_remark
) ON public.student_loan_demo_applications TO authenticated;

REVOKE ALL ON public.student_loan_status_history FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, reference, previous_status, new_status, customer_remark, created_at
) ON public.student_loan_status_history TO authenticated;

REVOKE ALL ON public.customer_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE (is_read) ON public.customer_notifications TO authenticated;
GRANT ALL ON public.student_loan_demo_applications TO service_role;
GRANT ALL ON public.student_loan_status_history TO service_role;
GRANT ALL ON public.customer_notifications TO service_role;

CREATE OR REPLACE FUNCTION public.create_student_loan_test_enquiry(
  p_reference text,
  p_user_id uuid,
  p_applicant_name text,
  p_applicant_email text,
  p_applicant_phone text,
  p_student_status text,
  p_loan_amount integer,
  p_repayment_date date,
  p_enquiry_purpose text,
  p_date_of_birth date,
  p_privacy_consent boolean,
  p_demo_consent boolean,
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
AS $$
DECLARE
  v_application public.student_loan_demo_applications%ROWTYPE;
  v_age integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'A verified customer account is required.';
  END IF;
  IF p_date_of_birth IS NULL OR p_date_of_birth > CURRENT_DATE THEN
    RAISE EXCEPTION 'A valid date of birth is required.';
  END IF;

  v_age := date_part('year', age(CURRENT_DATE, p_date_of_birth));
  IF v_age < 18 OR v_age > 120 THEN
    RAISE EXCEPTION 'Applicants must be at least 18 years old to submit.';
  END IF;
  IF p_privacy_consent IS DISTINCT FROM true OR p_demo_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Both demo and privacy acknowledgements are required.';
  END IF;

  INSERT INTO public.student_loan_demo_applications (
    reference, user_id, applicant_name, applicant_email, applicant_phone,
    student_status, loan_amount, repayment_date, enquiry_purpose,
    institution_id, institution_name, institution_state, institution_district,
    institution_city, institution_pin_code, institution_type,
    institution_category, institution_source, is_test, is_minor,
    privacy_acknowledged, terms_acknowledged, status
  )
  VALUES (
    p_reference, p_user_id, p_applicant_name, lower(p_applicant_email),
    p_applicant_phone, p_student_status, p_loan_amount, p_repayment_date,
    p_enquiry_purpose, p_institution_id, p_institution_name, p_institution_state,
    p_institution_district, p_institution_city, p_institution_pin_code,
    p_institution_type, p_institution_category, p_institution_source, true, false,
    p_privacy_consent, p_demo_consent, 'Submitted'
  )
  RETURNING * INTO v_application;

  INSERT INTO public.student_loan_status_history (
    reference, previous_status, new_status, customer_remark
  )
  VALUES (
    v_application.reference, NULL, v_application.status,
    'Your test enquiry was submitted successfully.'
  );

  INSERT INTO public.customer_notifications (
    user_id, title, message, notification_type, action_url, metadata
  )
  VALUES (
    p_user_id,
    'Test enquiry submitted',
    'Your student loan test enquiry has been submitted.',
    'application_submitted',
    '/dashboard',
    jsonb_build_object('tracking_id', v_application.tracking_id)
  );

  RETURN to_jsonb(v_application);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_loan_test_status(
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
AS $$
DECLARE
  v_application public.student_loan_demo_applications%ROWTYPE;
  v_previous_status text;
BEGIN
  IF p_status NOT IN (
    'Submitted', 'Pending Review', 'Under Review',
    'Additional Information Required', 'Approved', 'Rejected', 'Closed'
  ) THEN
    RAISE EXCEPTION 'Invalid application status.';
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
    RAISE EXCEPTION 'Student loan test enquiry not found.';
  END IF;

  v_previous_status := v_application.status;
  UPDATE public.student_loan_demo_applications
  SET status = p_status,
      latest_customer_remark = p_customer_remark,
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
      'Test enquiry status updated',
      COALESCE(p_customer_remark, 'Your student loan test enquiry status has been updated.'),
      CASE WHEN p_status = 'Additional Information Required'
        THEN 'info_requested' ELSE 'status_updated' END,
      '/dashboard',
      jsonb_build_object('tracking_id', v_application.tracking_id, 'status', p_status)
    );
  END IF;

  RETURN to_jsonb(v_application);
END;
$$;

REVOKE ALL ON FUNCTION public.create_student_loan_test_enquiry(
  text, uuid, text, text, text, text, integer, date, text, date, boolean, boolean,
  text, text, text, text, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_student_loan_test_status(
  text, uuid, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_loan_test_enquiry(
  text, uuid, text, text, text, text, integer, date, text, date, boolean, boolean,
  text, text, text, text, text, text, text, text, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_student_loan_test_status(
  text, uuid, text, text, text
) TO service_role;

COMMIT;