-- =====================================================================
-- MEHANDA ARMY INVESTMENTS
-- INVESTMENT INFORMATION ENQUIRY UPGRADE & SCHEMA MIGRATION
--
-- File: supabase_investment_enquiry_upgrade.sql
-- Description:
-- Idempotent, non-destructive database upgrade script.
-- Adds supporting columns for the 5-step Investment Enquiry wizard,
-- sets up tracking index, and verifies Row-Level Security (RLS) customer isolation.
--
-- Instructions:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/epjjsuousttlvlpjtnvs/sql/new
-- 2. Paste and run this script in the SQL Editor.
-- =====================================================================

BEGIN;

-- 1. Create table if not already created
CREATE TABLE IF NOT EXISTS public.investment_enquiries (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  investment_horizon TEXT,
  planned_amount_bracket TEXT,
  areas_of_interest TEXT[],
  message TEXT,
  status TEXT DEFAULT 'Submitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns for the complete 5-Step Investment Wizard
ALTER TABLE public.investment_enquiries
  ADD COLUMN IF NOT EXISTS tracking_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS pin_code TEXT,
  ADD COLUMN IF NOT EXISTS interest_category TEXT,
  ADD COLUMN IF NOT EXISTS investment_objective TEXT,
  ADD COLUMN IF NOT EXISTS customer_expectations TEXT,
  ADD COLUMN IF NOT EXISTS risk_understanding TEXT,
  ADD COLUMN IF NOT EXISTS knowledge_level TEXT,
  ADD COLUMN IF NOT EXISTS investment_goals TEXT,
  ADD COLUMN IF NOT EXISTS risk_acknowledged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2a. Update status constraint & default ID generation
ALTER TABLE public.investment_enquiries
  ALTER COLUMN id SET DEFAULT ('enq_' || substr(md5(random()::text), 1, 16));

ALTER TABLE public.investment_enquiries
  ALTER COLUMN status SET DEFAULT 'Submitted';

ALTER TABLE public.investment_enquiries
  DROP CONSTRAINT IF EXISTS investment_enquiries_status_check;

ALTER TABLE public.investment_enquiries
  ADD CONSTRAINT investment_enquiries_status_check
  CHECK (status IN ('new', 'Submitted', 'Under Review', 'Contacted', 'Information Provided', 'Closed', 'contacted', 'consultation_scheduled', 'closed'));

-- 3. Performance & Tracking Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_enquiries_tracking
  ON public.investment_enquiries (tracking_id)
  WHERE tracking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_investment_enquiries_user_id
  ON public.investment_enquiries (user_id);

CREATE INDEX IF NOT EXISTS idx_investment_enquiries_created
  ON public.investment_enquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_investment_enquiries_status
  ON public.investment_enquiries (status, created_at DESC);

-- 4. Row-Level Security (RLS) Customer Isolation
ALTER TABLE public.investment_enquiries ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view only their own records
DROP POLICY IF EXISTS "Customers view own investment enquiries" ON public.investment_enquiries;
CREATE POLICY "Customers view own investment enquiries"
  ON public.investment_enquiries FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR email = (SELECT auth.jwt()->>'email')
  );

-- Allow authenticated and service role inserts
DROP POLICY IF EXISTS "Allow enquiry insertion" ON public.investment_enquiries;
CREATE POLICY "Allow enquiry insertion"
  ON public.investment_enquiries FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- Ensure service_role has full administration rights
GRANT ALL ON public.investment_enquiries TO service_role;
GRANT SELECT, INSERT ON public.investment_enquiries TO authenticated;

COMMIT;

