-- ==============================================================================
-- MEHANDA ARMY INVESTMENTS PRIVATE LIMITED
-- File: supabase_loan_repair_migration.sql
-- Instructions: Copy and paste this entire script into your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/epjjsuousttlvlpjtnvs/sql/new) and click "Run".
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. STORAGE BUCKETS CONFIGURATION (Private, 5 MB limit, Image + PDF types)
-- ------------------------------------------------------------------------------

-- Ensure student-loan-id-proofs bucket is active with proper MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-loan-id-proofs',
  'student-loan-id-proofs',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Ensure loan-documents bucket is active with proper MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'loan-documents',
  'loan-documents',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- ------------------------------------------------------------------------------
-- 2. STORAGE RLS POLICIES FOR LOAN DOCUMENTS
-- ------------------------------------------------------------------------------

-- Allow authenticated users to upload documents into their own folder ({user_id}/*)
DROP POLICY IF EXISTS "Customers upload own student loan documents" ON storage.objects;
CREATE POLICY "Customers upload own student loan documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('student-loan-id-proofs', 'loan-documents')
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR (storage.foldername(name))[1] = 'guest'
  )
);

-- Allow authenticated users to read their own documents
DROP POLICY IF EXISTS "Customers view own loan documents" ON storage.objects;
CREATE POLICY "Customers view own loan documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN ('student-loan-id-proofs', 'loan-documents')
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Allow authenticated users to delete/replace their own documents
DROP POLICY IF EXISTS "Customers delete own loan documents" ON storage.objects;
CREATE POLICY "Customers delete own loan documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('student-loan-id-proofs', 'loan-documents')
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

-- ------------------------------------------------------------------------------
-- 3. FARM & DAIRY LOAN APPLICATIONS TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.farm_loan_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  tracking_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  loan_category text NOT NULL CHECK (loan_category IN ('student_loan', 'dairy_loan', 'sheep_loan', 'goat_loan')),
  applicant_name text NOT NULL,
  applicant_dob date NOT NULL,
  applicant_phone text NOT NULL,
  applicant_email text NOT NULL,
  applicant_state text NOT NULL,
  applicant_district text NOT NULL,
  applicant_city text NOT NULL,
  applicant_address text NOT NULL,
  applicant_pincode text,
  aadhaar_number text NOT NULL,
  pan_number text NOT NULL,
  voter_id_number text,
  loan_amount numeric(12, 2) NOT NULL CHECK (loan_amount > 0),
  loan_purpose text NOT NULL,
  farming_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  documents jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'Submitted' CHECK (
    status IN ('Submitted', 'Pending', 'Under Review', 'Approved', 'Rejected', 'Completed')
  ),
  admin_notes text,
  submitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS farm_loan_applications_user_id_idx
  ON public.farm_loan_applications (user_id);

CREATE INDEX IF NOT EXISTS farm_loan_applications_email_idx
  ON public.farm_loan_applications (lower(applicant_email));

CREATE INDEX IF NOT EXISTS farm_loan_applications_tracking_idx
  ON public.farm_loan_applications (tracking_id);

CREATE INDEX IF NOT EXISTS farm_loan_applications_category_status_idx
  ON public.farm_loan_applications (loan_category, status, submitted_at DESC);

-- ------------------------------------------------------------------------------
-- 4. RLS POLICIES FOR farm_loan_applications
-- ------------------------------------------------------------------------------

ALTER TABLE public.farm_loan_applications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own loan applications
DROP POLICY IF EXISTS "Customers view own farm loan applications" ON public.farm_loan_applications;
CREATE POLICY "Customers view own farm loan applications"
ON public.farm_loan_applications
FOR SELECT
TO authenticated
USING (
  user_id = (select auth.uid())
  OR lower(applicant_email) = lower((select auth.jwt()->>'email'))
);

-- Allow authenticated users to submit applications
DROP POLICY IF EXISTS "Customers insert farm loan applications" ON public.farm_loan_applications;
CREATE POLICY "Customers insert farm loan applications"
ON public.farm_loan_applications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (select auth.uid())
  OR user_id IS NULL
);

-- Service role has full access automatically; also allow anon insert if using API token
DROP POLICY IF EXISTS "Anon insert farm loan applications" ON public.farm_loan_applications;
CREATE POLICY "Anon insert farm loan applications"
ON public.farm_loan_applications
FOR INSERT
TO anon
WITH CHECK (true);

COMMIT;
