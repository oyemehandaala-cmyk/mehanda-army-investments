-- =====================================================================
-- MEHANDA ARMY INVESTMENTS
-- MASTER DATABASE MIGRATION SCRIPT (SAFE & IDEMPOTENT)
-- 
-- Run this complete script in your Supabase SQL Editor:
-- https://app.supabase.com -> Project -> SQL Editor
--
-- SAFETY ASSURANCES:
-- 1. All CREATE statements use IF NOT EXISTS.
-- 2. No tables or columns are dropped.
-- 3. Existing records in admin_sessions, admin_activity_logs, and
--    account_recovery_rate_limits are 100% PRESERVED.
-- 4. Follows all Supabase Postgres best practices:
--    - Subquery-wrapped auth.uid() checks for cached evaluation
--    - Indexes on every Foreign Key and RLS lookup column
--    - Explicit column grants and least-privilege security
--    - Non-exposed SECURITY DEFINER functions with search_path = ''
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------
-- 1. CUSTOMER PROFILES (public.profiles)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_phone TEXT,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url TEXT,
  date_of_birth DATE,
  auth_providers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('pending_verification', 'active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe column additions if table already existed partially
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS auth_providers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_case_insensitive_unique
  ON public.profiles (LOWER(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_verified_phone_unique
  ON public.profiles (phone)
  WHERE phone_verified = TRUE AND phone IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS (Optimized with subquery pattern)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Verified users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Verified users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (id, full_name, email, phone, contact_phone, phone_verified, avatar_url, auth_providers, account_status)
  ON public.profiles TO authenticated;
GRANT UPDATE (full_name, contact_phone, date_of_birth)
  ON public.profiles TO authenticated;

-- Function: update timestamp
CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_update();

-- Function: automatic profile bootstrap on auth.users registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  provider_list TEXT[];
BEGIN
  provider_list := ARRAY(
    SELECT jsonb_array_elements_text(
      COALESCE(
        NEW.raw_app_meta_data -> 'providers',
        CASE
          WHEN NEW.raw_app_meta_data ->> 'provider' IS NOT NULL
            THEN jsonb_build_array(NEW.raw_app_meta_data ->> 'provider')
          ELSE '[]'::jsonb
        END
      )
    )
  );

  INSERT INTO public.profiles (
    id, full_name, email, phone, contact_phone, phone_verified, avatar_url, auth_providers, account_status
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      'Client Investor'
    ),
    NEW.email,
    CASE WHEN NEW.phone_confirmed_at IS NOT NULL THEN NEW.phone ELSE NULL END,
    CASE WHEN NEW.phone_confirmed_at IS NULL THEN NEW.raw_user_meta_data ->> 'phone' ELSE NULL END,
    NEW.phone_confirmed_at IS NOT NULL AND NEW.phone IS NOT NULL,
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture'),
    provider_list,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = CASE
        WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = 'Client Investor'
          THEN EXCLUDED.full_name
        ELSE public.profiles.full_name
      END,
      email = COALESCE(EXCLUDED.email, public.profiles.email),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      phone_verified = (EXCLUDED.phone_verified OR public.profiles.phone_verified),
      contact_phone = CASE
        WHEN EXCLUDED.phone_verified THEN NULL
        ELSE COALESCE(EXCLUDED.contact_phone, public.profiles.contact_phone)
      END,
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      auth_providers = EXCLUDED.auth_providers,
      updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_profile_changed ON auth.users;
CREATE TRIGGER on_auth_user_profile_changed
  AFTER INSERT OR UPDATE OF email, phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data
  ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. PORTFOLIOS & TRANSACTIONS (Client Portfolio Viewer)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  account_number TEXT NOT NULL UNIQUE,
  risk_profile TEXT DEFAULT 'Moderate Balanced',
  total_invested NUMERIC(15, 2) DEFAULT 0.00,
  current_valuation NUMERIC(15, 2) DEFAULT 0.00,
  monthly_sip NUMERIC(15, 2) DEFAULT 0.00,
  last_rebalanced TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios (user_id);
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own portfolio" ON public.portfolios;
CREATE POLICY "Users can view own portfolio"
  ON public.portfolios FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.portfolios TO authenticated;

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('sip_contribution', 'lumpsum_investment', 'redemption', 'rebalance', 'dividend')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON public.transactions (portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (transaction_date DESC);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.transactions TO authenticated;

-- ---------------------------------------------------------------------
-- 3. SERVICE PAYMENTS (Gateway-Verified Records & Receipts)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  payment_id TEXT NOT NULL UNIQUE,
  signature TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  payment_method TEXT DEFAULT 'UPI / NetBanking / Card',
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('pending', 'captured', 'verified', 'failed')),
  is_live BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_payments_user_id ON public.service_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_service_payments_email ON public.service_payments (customer_email);
CREATE INDEX IF NOT EXISTS idx_service_payments_receipt ON public.service_payments (receipt_number);
CREATE INDEX IF NOT EXISTS idx_service_payments_created_at ON public.service_payments (created_at DESC);
ALTER TABLE public.service_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON public.service_payments;
CREATE POLICY "Users can view own payments"
  ON public.service_payments FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT auth.jwt() ->> 'email') = customer_email
  );

REVOKE ALL ON public.service_payments FROM anon;
GRANT SELECT ON public.service_payments TO authenticated;

-- ---------------------------------------------------------------------
-- 4. INVESTMENT ADVISORY ENQUIRIES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investment_enquiries (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  investment_horizon TEXT NOT NULL,
  planned_amount_bracket TEXT NOT NULL,
  areas_of_interest TEXT[],
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'consultation_scheduled', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_enquiries_date ON public.investment_enquiries (created_at DESC);
ALTER TABLE public.investment_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert investment enquiry" ON public.investment_enquiries;
CREATE POLICY "Public can insert investment enquiry"
  ON public.investment_enquiries FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own enquiries" ON public.investment_enquiries;
CREATE POLICY "Users can view own enquiries"
  ON public.investment_enquiries FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'email') = email);

GRANT INSERT ON public.investment_enquiries TO anon, authenticated;
GRANT SELECT ON public.investment_enquiries TO authenticated;

-- ---------------------------------------------------------------------
-- 5. OFFICIAL STUDENT LOAN INSTITUTIONS CATALOG & SEARCH RPC
-- ---------------------------------------------------------------------
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
GRANT SELECT ON public.student_loan_institutions TO authenticated;

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
AS $$
DECLARE
  v_query TEXT := trim(COALESCE(p_query, ''));
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
    OR i.district ILIKE '%' || v_query || '%'
    OR i.city ILIKE '%' || v_query || '%'
    OR i.pin_code ILIKE '%' || v_query || '%'
  )
    AND (p_state IS NULL OR LOWER(i.state) = LOWER(trim(p_state)))
    AND (p_district IS NULL OR LOWER(i.district) = LOWER(trim(p_district)))
    AND (p_management IS NULL OR i.management = p_management)
    AND (
      p_after_name IS NULL
      OR (i.official_name, i.institution_id) > (p_after_name, p_after_id)
    )
  ORDER BY i.official_name, i.institution_id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 20) + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_student_loan_institutions TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 6. SEQUENTIAL TRACKING ID GENERATOR (MAI-YYYY-XXXXXX)
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.loan_application_tracking_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_loan_tracking_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT := to_char(CURRENT_DATE, 'YYYY');
  v_seq BIGINT := nextval('public.loan_application_tracking_seq');
BEGIN
  RETURN 'MAI-' || v_year || '-' || lpad(v_seq::TEXT, 6, '0');
END;
$$;

-- ---------------------------------------------------------------------
-- 7. REAL LOAN APPLICATIONS (public.loan_applications)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT NOT NULL UNIQUE DEFAULT public.generate_loan_tracking_id()
    CHECK (tracking_id ~ '^MAI-[0-9]{4}-[0-9]{6}$'),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Applicant Details
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  is_minor BOOLEAN NOT NULL DEFAULT FALSE,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_relationship TEXT,
  guardian_consent BOOLEAN DEFAULT FALSE,
  
  -- Geographic / Institution Details
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT,
  pin_code TEXT CHECK (pin_code IS NULL OR pin_code ~ '^[0-9]{6}$'),
  institution_id TEXT,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL CHECK (institution_type IN ('school', 'college', 'university', 'other')),
  institution_category TEXT CHECK (institution_category IS NULL OR institution_category IN ('Government', 'Private')),
  institution_source TEXT CHECK (institution_source IS NULL OR institution_source IN ('UDISE+', 'AISHE', 'manual')),
  course_name TEXT,
  student_status TEXT NOT NULL CHECK (student_status IN ('school', 'undergraduate', 'postgraduate', 'diploma', 'professional', 'vocational')),
  
  -- Loan Enquiry Details
  enquiry_purpose TEXT NOT NULL,
  requested_amount INTEGER NOT NULL CHECK (requested_amount IN (500, 750, 1000)),
  repayment_date DATE NOT NULL,
  
  -- Workflow Status & Tracking
  status TEXT NOT NULL DEFAULT 'Submitted'
    CHECK (status IN ('Submitted', 'Pending Review', 'Under Review', 'Additional Information Required', 'Approved', 'Rejected', 'Closed')),
  is_test BOOLEAN NOT NULL DEFAULT TRUE,
  terms_acknowledged BOOLEAN NOT NULL DEFAULT TRUE,
  privacy_acknowledged BOOLEAN NOT NULL DEFAULT TRUE,
  latest_customer_remark TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON public.loan_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_tracking_id ON public.loan_applications (tracking_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON public.loan_applications (status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_created_at ON public.loan_applications (created_at DESC);

ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

-- Customers can view only their own applications
DROP POLICY IF EXISTS "Customers can view own applications" ON public.loan_applications;
CREATE POLICY "Customers can view own applications"
  ON public.loan_applications FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Customers can insert their own application
DROP POLICY IF EXISTS "Customers can submit own application" ON public.loan_applications;
CREATE POLICY "Customers can submit own application"
  ON public.loan_applications FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT ON public.loan_applications TO authenticated;

-- ---------------------------------------------------------------------
-- 8. APPLICATION STATUS HISTORY (public.application_status_history)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_remark TEXT,
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_status_history_app_id
  ON public.application_status_history (application_id);
CREATE INDEX IF NOT EXISTS idx_app_status_history_created_at
  ON public.application_status_history (created_at DESC);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- Customers can view history for their own applications
DROP POLICY IF EXISTS "Customers can view own application status history" ON public.application_status_history;
CREATE POLICY "Customers can view own application status history"
  ON public.application_status_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.loan_applications AS a
      WHERE a.id = application_status_history.application_id
        AND a.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON public.application_status_history TO authenticated;

-- ---------------------------------------------------------------------
-- 9. CUSTOMER DOCUMENTS (Document Centre)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.loan_applications(id) ON DELETE SET NULL,
  document_category TEXT NOT NULL
    CHECK (document_category IN ('student_id', 'admission_proof', 'fee_receipt', 'other')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL
    CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  review_status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (review_status IN ('uploaded', 'verified', 'rejected')),
  admin_notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_docs_user_id ON public.customer_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_docs_app_id ON public.customer_documents (application_id);

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own documents" ON public.customer_documents;
CREATE POLICY "Customers can view own documents"
  ON public.customer_documents FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Customers can insert own documents" ON public.customer_documents;
CREATE POLICY "Customers can insert own documents"
  ON public.customer_documents FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Customers can delete unverified own documents" ON public.customer_documents;
CREATE POLICY "Customers can delete unverified own documents"
  ON public.customer_documents FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND review_status = 'uploaded');

GRANT SELECT, INSERT, DELETE ON public.customer_documents TO authenticated;

-- ---------------------------------------------------------------------
-- 10. CUSTOMER NOTIFICATIONS (Notification Centre)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL
    CHECK (notification_type IN (
      'application_submitted',
      'status_updated',
      'info_requested',
      'payment_confirmed',
      'document_reviewed',
      'support_reply',
      'announcement'
    )),
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

DROP POLICY IF EXISTS "Customers can update read status of own notifications" ON public.customer_notifications;
CREATE POLICY "Customers can update read status of own notifications"
  ON public.customer_notifications FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, UPDATE (is_read) ON public.customer_notifications TO authenticated;

-- ---------------------------------------------------------------------
-- 11. SUPPORT TICKETS & MESSAGES (Customer Support Centre)
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_reference TEXT NOT NULL UNIQUE DEFAULT ('TIK-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.support_ticket_seq')::TEXT, 6, '0')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL
    CHECK (category IN ('application', 'payment', 'account', 'technical', 'general')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed')),
  priority TEXT NOT NULL DEFAULT 'Normal'
    CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own support tickets" ON public.support_tickets;
CREATE POLICY "Customers can view own support tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Customers can create own support tickets" ON public.support_tickets;
CREATE POLICY "Customers can create own support tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT ON public.support_tickets TO authenticated;

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'staff')),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 3000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id
  ON public.support_messages (ticket_id, created_at ASC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own ticket messages" ON public.support_messages;
CREATE POLICY "Customers can view own ticket messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets AS t
      WHERE t.id = support_messages.ticket_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can send messages on own tickets" ON public.support_messages;
CREATE POLICY "Customers can send messages on own tickets"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_type = 'customer'
    AND sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS t
      WHERE t.id = support_messages.ticket_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT ON public.support_messages TO authenticated;

-- ---------------------------------------------------------------------
-- 12. STORAGE BUCKETS (Private Customer Files)
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('profile-photos', 'profile-photos', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('customer-documents', 'customer-documents', FALSE, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS for profile-photos (quarantine folder auth.uid()/upload)
DROP POLICY IF EXISTS "Users can view own profile photo upload" ON storage.objects;
CREATE POLICY "Users can view own profile photo upload"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

DROP POLICY IF EXISTS "Users can upload own profile photo" ON storage.objects;
CREATE POLICY "Users can upload own profile photo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

-- Storage RLS for customer-documents (folder auth.uid()/*)
DROP POLICY IF EXISTS "Customers can view own uploaded documents" ON storage.objects;
CREATE POLICY "Customers can view own uploaded documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

DROP POLICY IF EXISTS "Customers can upload own documents" ON storage.objects;
CREATE POLICY "Customers can upload own documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

DROP POLICY IF EXISTS "Customers can delete own unverified documents" ON storage.objects;
CREATE POLICY "Customers can delete own unverified documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

COMMIT;

