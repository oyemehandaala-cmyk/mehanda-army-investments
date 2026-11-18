-- =======================================================
-- MEHANDA ARMY INVESTMENTS — DATABASE SCHEMA & RLS SETUP
-- Run this in your Supabase SQL Editor: https://app.supabase.com
-- =======================================================

-- 1. Create profiles table (Real customer personal records)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  account_status TEXT DEFAULT 'pending_verification' CHECK (account_status IN ('pending_verification', 'active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can only view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Policy: Customers can update only their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. Create portfolios table (Real authorized portfolio records)
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  account_number TEXT NOT NULL UNIQUE,
  risk_profile TEXT DEFAULT 'Moderate Balanced',
  total_invested NUMERIC(15, 2) DEFAULT 0.00,
  current_valuation NUMERIC(15, 2) DEFAULT 0.00,
  monthly_sip NUMERIC(15, 2) DEFAULT 0.00,
  last_rebalanced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on portfolios
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can only view their own portfolio
CREATE POLICY "Users can view own portfolio" 
ON public.portfolios FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Create transactions table (Real authorized transaction ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('sip_contribution', 'lumpsum_investment', 'redemption', 'rebalance', 'dividend')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can only read their own transactions
CREATE POLICY "Users can view own transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Trigger to automatically create a profile upon email registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Client Investor'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =======================================================
-- 4a. AUTHENTICATION & PRIVATE PROFILE HARDENING
-- Re-run this section safely when applying auth updates.
-- =======================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_case_insensitive_unique
  ON public.profiles (LOWER(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_verified_phone_unique
  ON public.profiles (phone)
  WHERE phone_verified = TRUE AND phone IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_current_user_email_verified()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND email_confirmed_at IS NOT NULL
  );
$$;
REVOKE ALL ON FUNCTION public.is_current_user_email_verified() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_email_verified() TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.service_payments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own payments" ON public.service_payments';
    EXECUTE 'CREATE POLICY "Verified users can view own payments" ON public.service_payments
      FOR SELECT TO authenticated
      USING (public.is_current_user_email_verified()
        AND (auth.uid() = user_id OR auth.jwt() ->> ''email'' = customer_email))';
  END IF;

  IF to_regclass('public.investment_enquiries') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own enquiries" ON public.investment_enquiries';
    EXECUTE 'CREATE POLICY "Verified users can view own enquiries" ON public.investment_enquiries
      FOR SELECT TO authenticated
      USING (public.is_current_user_email_verified()
        AND auth.jwt() ->> ''email'' = email)';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Verified users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id AND public.is_current_user_email_verified());
CREATE POLICY "Verified users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id AND public.is_current_user_email_verified())
  WITH CHECK (auth.uid() = id AND public.is_current_user_email_verified());

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    NEW.phone_verified = FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_update();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Client Investor'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Users can view own portfolio" ON public.portfolios;
CREATE POLICY "Verified users can view own portfolio"
  ON public.portfolios FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_current_user_email_verified());

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Verified users can view own transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_current_user_email_verified());

-- Uploads are private and quarantined at <auth.uid()>/upload. Only the server
-- validates and converts them before creating the signed, normalized avatar.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Users can upload own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can replace own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own profile photo upload" ON storage.objects;
CREATE POLICY "Users can view own profile photo upload"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND storage.filename(name) = 'upload'
    AND public.is_current_user_email_verified()
  );
CREATE POLICY "Users can upload own profile photo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND storage.filename(name) = 'upload'
    AND public.is_current_user_email_verified()
  );
CREATE POLICY "Users can replace own profile photo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND storage.filename(name) = 'upload'
    AND public.is_current_user_email_verified()
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND storage.filename(name) = 'upload'
    AND public.is_current_user_email_verified()
  );

-- =======================================================
-- 4b. SINGLE-USE ACCOUNT RECOVERY KEYS & RATE LIMITS
-- Recovery keys are hashed; direct browser access is denied.
-- =======================================================
CREATE TABLE IF NOT EXISTS public.account_recovery_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ
);
ALTER TABLE public.account_recovery_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_recovery_keys FROM anon, authenticated;
GRANT ALL ON public.account_recovery_keys TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS account_recovery_keys_hash_unique
  ON public.account_recovery_keys (key_hash);

CREATE TABLE IF NOT EXISTS public.account_recovery_challenges (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  recovery_sent_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.account_recovery_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_recovery_challenges FROM anon, authenticated;
GRANT ALL ON public.account_recovery_challenges TO service_role;

CREATE TABLE IF NOT EXISTS public.account_recovery_rate_limits (
  subject_hash TEXT NOT NULL CHECK (subject_hash ~ '^[a-f0-9]{64}$'),
  action TEXT NOT NULL CHECK (action IN ('issue', 'complete', 'admin_login')),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  PRIMARY KEY (subject_hash, action)
);
ALTER TABLE public.account_recovery_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_recovery_rate_limits FROM anon, authenticated;
GRANT ALL ON public.account_recovery_rate_limits TO service_role;
ALTER TABLE public.account_recovery_rate_limits
  DROP CONSTRAINT IF EXISTS account_recovery_rate_limits_action_check;
ALTER TABLE public.account_recovery_rate_limits
  ADD CONSTRAINT account_recovery_rate_limits_action_check
  CHECK (action IN ('issue', 'complete', 'rotate', 'admin_login'));

CREATE OR REPLACE FUNCTION public.create_account_recovery_key(p_user_id UUID, p_key_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.account_recovery_keys (user_id, key_hash)
  VALUES (p_user_id, p_key_hash);
  RETURN TRUE;
EXCEPTION WHEN unique_violation THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_account_recovery_key(p_user_id UUID, p_key_hash TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH claimed AS (
    UPDATE public.account_recovery_keys
    SET consumed_at = NOW()
    WHERE user_id = p_user_id
      AND key_hash = p_key_hash
      AND consumed_at IS NULL
    RETURNING user_id
  )
  SELECT EXISTS (SELECT 1 FROM claimed);
$$;

CREATE OR REPLACE FUNCTION public.replace_account_recovery_key(
  p_user_id UUID,
  p_old_key_hash TEXT,
  p_new_key_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH replaced AS (
    UPDATE public.account_recovery_keys
    SET key_hash = p_new_key_hash, created_at = NOW(), consumed_at = NULL
    WHERE user_id = p_user_id
      AND key_hash = p_old_key_hash
      AND consumed_at IS NOT NULL
    RETURNING user_id
  )
  SELECT EXISTS (SELECT 1 FROM replaced);
$$;

CREATE OR REPLACE FUNCTION public.rotate_account_recovery_key(p_user_id UUID, p_new_key_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.account_recovery_keys (user_id, key_hash)
  VALUES (p_user_id, p_new_key_hash)
  ON CONFLICT (user_id) DO UPDATE
  SET key_hash = EXCLUDED.key_hash, created_at = NOW(), consumed_at = NULL;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_account_recovery_key_claim(p_user_id UUID, p_key_hash TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH released AS (
    UPDATE public.account_recovery_keys
    SET consumed_at = NULL
    WHERE user_id = p_user_id
      AND key_hash = p_key_hash
      AND consumed_at IS NOT NULL
    RETURNING user_id
  )
  SELECT EXISTS (SELECT 1 FROM released);
$$;

CREATE OR REPLACE FUNCTION public.claim_account_recovery_challenge(
  p_user_id UUID,
  p_recovery_sent_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH claimed AS (
    INSERT INTO public.account_recovery_challenges (user_id, recovery_sent_at)
    VALUES (p_user_id, p_recovery_sent_at)
    ON CONFLICT (user_id) DO UPDATE
    SET recovery_sent_at = EXCLUDED.recovery_sent_at, consumed_at = NOW()
    WHERE public.account_recovery_challenges.recovery_sent_at IS DISTINCT FROM EXCLUDED.recovery_sent_at
       OR public.account_recovery_challenges.consumed_at IS NULL
    RETURNING user_id
  )
  SELECT EXISTS (SELECT 1 FROM claimed);
$$;

CREATE OR REPLACE FUNCTION public.release_account_recovery_challenge(
  p_user_id UUID,
  p_recovery_sent_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH released AS (
    UPDATE public.account_recovery_challenges
    SET consumed_at = NULL
    WHERE user_id = p_user_id
      AND recovery_sent_at = p_recovery_sent_at
      AND consumed_at IS NOT NULL
    RETURNING user_id
  )
  SELECT EXISTS (SELECT 1 FROM released);
$$;

CREATE OR REPLACE FUNCTION public.consume_account_recovery_rate_limit(
  p_subject_hash TEXT,
  p_action TEXT,
  p_max_attempts INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_limit public.account_recovery_rate_limits%ROWTYPE;
BEGIN
  INSERT INTO public.account_recovery_rate_limits (subject_hash, action)
  VALUES (p_subject_hash, p_action)
  ON CONFLICT (subject_hash, action) DO NOTHING;

  SELECT * INTO current_limit
  FROM public.account_recovery_rate_limits
  WHERE subject_hash = p_subject_hash AND action = p_action
  FOR UPDATE;

  IF current_limit.blocked_until > NOW() THEN
    RETURN FALSE;
  END IF;

  IF current_limit.window_started_at <= NOW() - make_interval(secs => p_window_seconds) THEN
    UPDATE public.account_recovery_rate_limits
    SET window_started_at = NOW(), attempt_count = 1, blocked_until = NULL
    WHERE subject_hash = p_subject_hash AND action = p_action;
    RETURN TRUE;
  END IF;

  IF current_limit.attempt_count >= p_max_attempts THEN
    UPDATE public.account_recovery_rate_limits
    SET blocked_until = NOW() + make_interval(secs => p_window_seconds)
    WHERE subject_hash = p_subject_hash AND action = p_action;
    RETURN FALSE;
  END IF;

  UPDATE public.account_recovery_rate_limits
  SET attempt_count = attempt_count + 1,
      blocked_until = CASE
        WHEN attempt_count + 1 >= p_max_attempts
        THEN NOW() + make_interval(secs => p_window_seconds)
        ELSE NULL
      END
  WHERE subject_hash = p_subject_hash AND action = p_action;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_account_recovery_key(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_account_recovery_key(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replace_account_recovery_key(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rotate_account_recovery_key(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_account_recovery_key_claim(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_account_recovery_challenge(UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_account_recovery_challenge(UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_account_recovery_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_account_recovery_key(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_account_recovery_key(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_account_recovery_key(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rotate_account_recovery_key(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_account_recovery_key_claim(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_account_recovery_challenge(UUID, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_account_recovery_challenge(UUID, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_account_recovery_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- =======================================================
-- 5. SERVICE FEE PAYMENTS TABLE (Gateway Verified Records)
-- Strictly for transparent advisory, planning, & review fees.
-- =======================================================
CREATE TABLE IF NOT EXISTS public.service_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  payment_id TEXT NOT NULL UNIQUE,
  signature TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  payment_method TEXT DEFAULT 'UPI / NetBanking / Card',
  status TEXT DEFAULT 'verified' CHECK (status IN ('pending', 'captured', 'verified', 'failed')),
  is_live BOOLEAN DEFAULT FALSE,
  notes TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for rapid receipt & customer lookup
CREATE INDEX IF NOT EXISTS idx_service_payments_email ON public.service_payments(customer_email);
CREATE INDEX IF NOT EXISTS idx_service_payments_receipt ON public.service_payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_service_payments_user ON public.service_payments(user_id);

-- Enable RLS on service_payments
ALTER TABLE public.service_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own service fee payments
CREATE POLICY "Users can view own payments"
ON public.service_payments FOR SELECT
TO authenticated
USING (public.is_current_user_email_verified()
  AND (auth.uid() = user_id OR auth.jwt()->>'email' = customer_email));

-- Policy: Service role or authorized backend can insert verified payments
DROP POLICY IF EXISTS "Service role can insert payments" ON public.service_payments;

REVOKE ALL ON public.service_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, user_id, receipt_number, order_id, payment_id, amount, currency,
  service_id, service_name, customer_name, customer_email, customer_phone,
  payment_method, status, is_live, verified_at, created_at
) ON public.service_payments TO authenticated;

-- =======================================================
-- 6. INVESTMENT ENQUIRIES TABLE
-- Strictly for client advisory consultation requests.
-- Does not accept or manage investment deposits.
-- =======================================================
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
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'consultation_scheduled', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for admin desk inquiries
CREATE INDEX IF NOT EXISTS idx_investment_enquiries_date ON public.investment_enquiries(created_at DESC);

-- Enable RLS on investment_enquiries
ALTER TABLE public.investment_enquiries ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can submit an investment enquiry
CREATE POLICY "Public can insert investment enquiry"
ON public.investment_enquiries FOR INSERT
WITH CHECK (true);

-- Policy: Authenticated users can view enquiries they submitted
CREATE POLICY "Users can view own enquiries"
ON public.investment_enquiries FOR SELECT TO authenticated
USING (public.is_current_user_email_verified() AND auth.jwt()->>'email' = email);

-- =======================================================
-- 7. STUDENT LOAN DEMO APPLICATIONS
-- Stores demo metadata and institution details. No names,
-- contact details, dates of birth, KYC data, or documents.
-- Date of birth is checked transiently and never persisted.
-- Server-side service-role access only; never expose the
-- service-role key in frontend code.
-- =======================================================
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

-- =======================================================
-- 7b. OFFICIAL INSTITUTION SEARCH AND APPLICATION SNAPSHOT
-- Import only verified exports from UDISE+ and AISHE. This
-- table intentionally has no sample rows.
-- =======================================================
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

-- =======================================================
-- 8. GOOGLE + PHONE AUTH PROFILE SYNCHRONIZATION
-- Apply after the existing profile and security sections.
-- =======================================================
ALTER TABLE public.profiles
  ALTER COLUMN email DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS auth_providers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Preserve previously collected, unverified phone values as contact details.
UPDATE public.profiles
SET contact_phone = COALESCE(contact_phone, phone),
    phone = NULL,
    phone_verified = FALSE
WHERE phone IS NOT NULL AND phone_verified = FALSE;

CREATE OR REPLACE FUNCTION public.is_current_user_email_verified()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND (email_confirmed_at IS NOT NULL OR phone_confirmed_at IS NOT NULL)
  );
$$;
REVOKE ALL ON FUNCTION public.is_current_user_email_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_email_verified() TO authenticated;

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
    id, full_name, email, phone, contact_phone, phone_verified, avatar_url, auth_providers
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
    provider_list
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = CASE
        WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = 'Client Investor'
          THEN EXCLUDED.full_name
        ELSE public.profiles.full_name
      END,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      phone_verified = EXCLUDED.phone_verified,
      contact_phone = CASE
        WHEN EXCLUDED.phone_verified THEN NULL
        ELSE public.profiles.contact_phone
      END,
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      auth_providers = EXCLUDED.auth_providers,
      updated_at = NOW();

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_profile_changed ON auth.users;
CREATE TRIGGER on_auth_user_profile_changed
  AFTER INSERT OR UPDATE OF email, phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data
  ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE UPDATE ON public.profiles FROM anon, authenticated;
REVOKE UPDATE (phone, email, phone_verified, avatar_url, auth_providers)
  ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, contact_phone, date_of_birth) ON public.profiles TO authenticated;

-- =======================================================
-- 9. PRIVATE ADMIN SESSION AND AUDIT TABLES
-- No browser role can read or write this table.
-- =======================================================
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  session_id UUID PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS admin_sessions_user_expiry_idx
  ON public.admin_sessions (admin_user_id, expires_at);
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_sessions TO service_role;

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'admin_login',
    'admin_logout',
    'dashboard_view',
    'student_loan_demo_status_change_requested',
    'student_loan_demo_delete_requested'
  )),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_activity_logs_created_at_idx
  ON public.admin_activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_logs_admin_user_id_idx
  ON public.admin_activity_logs (admin_user_id);
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_activity_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.admin_activity_logs TO service_role;

-- =======================================================
-- 10. CUSTOMER ACCOUNT-DELETION REQUESTS
-- Authenticated identity is verified server-side. Browser
-- roles cannot read or create requests directly.
-- =======================================================
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'in_review', 'completed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_user_created_idx
  ON public.account_deletion_requests (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_one_open_per_user_idx
  ON public.account_deletion_requests (user_id)
  WHERE status IN ('requested', 'in_review');

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.account_deletion_requests TO service_role;
