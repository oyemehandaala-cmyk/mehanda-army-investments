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
