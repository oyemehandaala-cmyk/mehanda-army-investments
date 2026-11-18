-- Student-loan demo and institution-search setup only.
-- Run this file by itself in the Supabase SQL Editor.
-- It does not create or alter profiles, auth policies, or unrelated tables.

BEGIN;

-- Student-loan demo applications
CREATE TABLE IF NOT EXISTS public.student_loan_demo_applications (
  reference TEXT PRIMARY KEY
    CHECK (reference ~ '^MAI-SL-[0-9]{4}-[A-F0-9]{32}$'),
  loan_amount INTEGER NOT NULL CHECK (loan_amount IN (500, 750, 1000)),
  student_status TEXT NOT NULL CHECK (
    student_status IN ('school', 'undergraduate', 'postgraduate', 'diploma', 'professional', 'vocational')
  ),
  repayment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted'
    CHECK (status IN ('Submitted', 'Under Review', 'Approved', 'Rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_loan_demo_submitted
  ON public.student_loan_demo_applications(submitted_at DESC);

ALTER TABLE public.student_loan_demo_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_loan_demo_applications FROM anon, authenticated;
GRANT ALL ON public.student_loan_demo_applications TO service_role;

-- Institution search catalog. Import only verified UDISE+/AISHE records.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.student_loan_institutions (
  institution_id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('UDISE+', 'AISHE')),
  source_record_id TEXT NOT NULL,
  official_name TEXT NOT NULL CHECK (length(trim(official_name)) BETWEEN 3 AND 200),
  state TEXT NOT NULL CHECK (length(trim(state)) BETWEEN 2 AND 100),
  district TEXT NOT NULL CHECK (length(trim(district)) BETWEEN 2 AND 100),
  city TEXT,
  pin_code TEXT CHECK (pin_code IS NULL OR pin_code ~ '^[0-9]{6}$'),
  institution_type TEXT NOT NULL
    CHECK (institution_type IN ('school', 'college', 'university', 'other')),
  management TEXT NOT NULL CHECK (management IN ('Government', 'Private')),
  source_updated_at DATE,
  UNIQUE (source, source_record_id)
);

ALTER TABLE public.student_loan_demo_applications
  ADD COLUMN IF NOT EXISTS institution_id TEXT,
  ADD COLUMN IF NOT EXISTS institution_name TEXT,
  ADD COLUMN IF NOT EXISTS institution_state TEXT,
  ADD COLUMN IF NOT EXISTS institution_district TEXT,
  ADD COLUMN IF NOT EXISTS institution_city TEXT,
  ADD COLUMN IF NOT EXISTS institution_pin_code TEXT,
  ADD COLUMN IF NOT EXISTS institution_type TEXT
    CHECK (institution_type IS NULL OR institution_type IN ('school', 'college', 'university', 'other')),
  ADD COLUMN IF NOT EXISTS institution_category TEXT
    CHECK (institution_category IS NULL OR institution_category IN ('Government', 'Private')),
  ADD COLUMN IF NOT EXISTS institution_source TEXT
    CHECK (institution_source IS NULL OR institution_source IN ('UDISE+', 'AISHE', 'manual'));

SET search_path = public, extensions;

CREATE INDEX IF NOT EXISTS idx_student_loan_institutions_name_trgm
  ON public.student_loan_institutions USING GIN (official_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_student_loan_institutions_state_trgm
  ON public.student_loan_institutions USING GIN (state gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_student_loan_institutions_district_trgm
  ON public.student_loan_institutions USING GIN (district gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_student_loan_institutions_city_trgm
  ON public.student_loan_institutions USING GIN (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_student_loan_institutions_pin_trgm
  ON public.student_loan_institutions USING GIN (pin_code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_student_loan_institutions_state_district_category
  ON public.student_loan_institutions (state, district, management, official_name, institution_id);

RESET search_path;

ALTER TABLE public.student_loan_institutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_loan_institutions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_loan_institutions TO service_role;

CREATE OR REPLACE FUNCTION public.search_student_loan_institutions(
  p_query TEXT,
  p_state TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL,
  p_management TEXT DEFAULT NULL,
  p_after_name TEXT DEFAULT NULL,
  p_after_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  institution_id TEXT,
  official_name TEXT,
  state TEXT,
  district TEXT,
  city TEXT,
  pin_code TEXT,
  institution_type TEXT,
  management TEXT
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $function$
DECLARE
  v_query TEXT := trim(coalesce(p_query, ''));
BEGIN
  IF length(v_query) < 3 OR length(v_query) > 100 THEN
    RAISE EXCEPTION 'Institution searches must contain 3 to 100 characters.';
  END IF;
  IF (p_after_name IS NULL) <> (p_after_id IS NULL) THEN
    RAISE EXCEPTION 'Both institution page cursor values are required.';
  END IF;
  IF p_management IS NOT NULL AND p_management NOT IN ('Government', 'Private') THEN
    RAISE EXCEPTION 'Invalid institution management filter.';
  END IF;

  RETURN QUERY
  SELECT
    i.institution_id,
    i.official_name,
    i.state,
    i.district,
    i.city,
    i.pin_code,
    i.institution_type,
    i.management
  FROM public.student_loan_institutions AS i
  WHERE (
    i.official_name ILIKE '%' || v_query || '%'
    OR i.official_name % v_query
    OR i.state ILIKE '%' || v_query || '%'
    OR i.state % v_query
    OR i.district ILIKE '%' || v_query || '%'
    OR i.district % v_query
    OR i.city ILIKE '%' || v_query || '%'
    OR i.city % v_query
    OR i.pin_code ILIKE '%' || v_query || '%'
  )
    AND (p_state IS NULL OR lower(i.state) = lower(trim(p_state)))
    AND (p_district IS NULL OR lower(i.district) = lower(trim(p_district)))
    AND (p_management IS NULL OR i.management = p_management)
    AND (
      p_after_name IS NULL
      OR (i.official_name, i.institution_id) > (p_after_name, p_after_id)
    )
  ORDER BY i.official_name, i.institution_id
  LIMIT LEAST(GREATEST(coalesce(p_limit, 20), 1), 20) + 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.search_student_loan_institutions(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_student_loan_institutions(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER)
  TO service_role;

COMMIT;

-- Verify the objects were created.
SELECT
  to_regclass('public.student_loan_demo_applications') AS demo_applications,
  to_regclass('public.student_loan_institutions') AS institutions,
  to_regprocedure('public.search_student_loan_institutions(text,text,text,text,text,text,integer)') AS search_function,
  to_regclass('public.student_loan_status_history') AS status_history,
  to_regprocedure('public.create_student_loan_test_enquiry(text,uuid,text,text,text,text,integer,date,text,date,boolean,boolean,text,text,text,text,text,text,text,text,text)') AS submit_enquiry_function,
  to_regprocedure('public.update_student_loan_test_status(text,uuid,text,text,text)') AS update_status_function;
