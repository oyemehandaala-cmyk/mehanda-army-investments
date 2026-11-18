-- =======================================================
-- MEHANDA ARMY INVESTMENTS: ACCOUNT RECOVERY SETUP
-- Run this in Supabase SQL Editor if you want to enable
-- account recovery keys in your Supabase database.
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
  action TEXT NOT NULL,
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

NOTIFY pgrst, 'reload schema';

