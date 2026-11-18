-- =====================================================================
-- MEHANDA ARMY INVESTMENTS
-- Agriculture & Livestock Loan Categories Setup:
-- 1. Dairy Loan (₹2,00,000 - ₹50,00,000)
-- 2. Sheep Loan (Up to ₹2,00,000)
-- 3. Goat Loan (Up to ₹2,00,000)
--
-- Preserves existing public.student_loan_demo_applications unchanged!
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.farm_loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  tracking_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  loan_category TEXT NOT NULL CHECK (loan_category IN ('dairy_loan', 'sheep_loan', 'goat_loan')),
  applicant_name TEXT NOT NULL,
  applicant_dob DATE NOT NULL,
  applicant_phone TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_state TEXT NOT NULL,
  applicant_district TEXT NOT NULL,
  applicant_city TEXT NOT NULL,
  applicant_address TEXT NOT NULL,
  applicant_pincode TEXT,
  aadhaar_number TEXT NOT NULL,
  pan_number TEXT NOT NULL,
  voter_id_number TEXT,
  loan_amount NUMERIC NOT NULL,
  loan_purpose TEXT NOT NULL,
  farming_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  documents JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Pending', 'Under Review', 'Approved', 'Rejected', 'Completed')),
  admin_notes TEXT,
  rejection_reason TEXT,
  status_updated_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast queries and lookups
CREATE INDEX IF NOT EXISTS idx_farm_loans_user_id ON public.farm_loan_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_farm_loans_category ON public.farm_loan_applications (loan_category);
CREATE INDEX IF NOT EXISTS idx_farm_loans_tracking_id ON public.farm_loan_applications (tracking_id);
CREATE INDEX IF NOT EXISTS idx_farm_loans_status ON public.farm_loan_applications (status);
CREATE INDEX IF NOT EXISTS idx_farm_loans_submitted_at ON public.farm_loan_applications (submitted_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.farm_loan_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own applications
DROP POLICY IF EXISTS "Customers can view their own farm loan applications" ON public.farm_loan_applications;
CREATE POLICY "Customers can view their own farm loan applications"
  ON public.farm_loan_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Customers can submit farm loan applications
DROP POLICY IF EXISTS "Customers can submit farm loan applications" ON public.farm_loan_applications;
CREATE POLICY "Customers can submit farm loan applications"
  ON public.farm_loan_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full administrative access
DROP POLICY IF EXISTS "Admins have full access to farm loan applications" ON public.farm_loan_applications;
CREATE POLICY "Admins have full access to farm loan applications"
  ON public.farm_loan_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

 