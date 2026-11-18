-- =====================================================================
-- ADMIN PORTAL SETUP SCRIPT
-- Adds rate limiting, revocable sessions, and audit logs.
-- Safe to apply: uses IF NOT EXISTS and preserves all customer records.
-- =====================================================================

BEGIN;

-- 1. Rate limiting table for admin sign-in and account recovery
CREATE TABLE IF NOT EXISTS public.account_recovery_rate_limits (
  subject_hash TEXT NOT NULL CHECK (subject_hash ~ '^[a-f0-9]{64}$'),
  action TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  PRIMARY KEY (subject_hash, action)
);

ALTER TABLE public.account_recovery_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_recovery_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.account_recovery_rate_limits TO service_role;

ALTER TABLE public.account_recovery_rate_limits
  DROP CONSTRAINT IF EXISTS account_recovery_rate_limits_action_check;
ALTER TABLE public.account_recovery_rate_limits
  ADD CONSTRAINT account_recovery_rate_limits_action_check
  CHECK (action IN ('issue', 'complete', 'rotate', 'admin_login'));

-- 2. Rate limit consumption function
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

REVOKE ALL ON FUNCTION public.consume_account_recovery_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_account_recovery_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- 3. Admin revocable sessions table
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

-- 4. Admin activity logs table
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

COMMIT;
