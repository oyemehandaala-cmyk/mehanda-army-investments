-- ============================================================================
-- MEHANDA ARMY INVESTMENTS — COMPLETE ADMIN SECURITY SYSTEM SETUP
-- Tables, Indexes, and Strict RLS Policies for Admin Security & Lockout
-- ============================================================================

-- 1. FAILED LOGIN ATTEMPTS TRACKING
CREATE TABLE IF NOT EXISTS public.admin_failed_logins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempted_username TEXT NOT NULL,
    client_ip TEXT NOT NULL,
    user_agent TEXT,
    device_type TEXT,
    browser_info TEXT,
    os_info TEXT,
    location_info TEXT DEFAULT 'India / Network Gateway',
    status TEXT NOT NULL DEFAULT 'failed',
    attempt_number INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_failed_logins_ip ON public.admin_failed_logins (client_ip);
CREATE INDEX IF NOT EXISTS idx_failed_logins_user ON public.admin_failed_logins (attempted_username);
CREATE INDEX IF NOT EXISTS idx_failed_logins_created ON public.admin_failed_logins (created_at DESC);

-- 2. SECURITY LOCKS (ACCOUNT, IP & DEVICE LOCKOUT)
CREATE TABLE IF NOT EXISTS public.admin_security_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lock_type TEXT NOT NULL DEFAULT 'account', -- 'account' | 'ip' | 'device'
    target_identifier TEXT NOT NULL,          -- username, IP, or device fingerprint
    reason TEXT NOT NULL DEFAULT '3 consecutive failed login attempts',
    consecutive_failures INT NOT NULL DEFAULT 3,
    is_locked BOOLEAN NOT NULL DEFAULT true,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    unlocked_at TIMESTAMPTZ,
    unlocked_by TEXT,
    unlock_method TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_lock 
    ON public.admin_security_locks (target_identifier, lock_type) 
    WHERE is_locked = true;

CREATE INDEX IF NOT EXISTS idx_security_locks_target ON public.admin_security_locks (target_identifier);

-- 3. SECURITY ALERTS LOG
CREATE TABLE IF NOT EXISTS public.admin_security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'failed_login', 'account_locked', 'account_unlocked', 'passkey_registered', 'passkey_removed', 'successful_login'
    severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_ip TEXT,
    device_info TEXT,
    email_sent BOOLEAN NOT NULL DEFAULT false,
    email_delivery_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON public.admin_security_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_event ON public.admin_security_alerts (event_type);

-- 4. SECURITY AUDIT LOGS (WHO ACCESSED / UNLOCKED WHAT)
CREATE TABLE IF NOT EXISTS public.admin_security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL DEFAULT 'Deepak Jangra (Super Admin)',
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    client_ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_security_audit_created ON public.admin_security_audit_logs (created_at DESC);

-- 5. OWNER EMERGENCY RECOVERY CODES
CREATE TABLE IF NOT EXISTS public.admin_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash TEXT NOT NULL UNIQUE,
    label TEXT DEFAULT 'Emergency Backup Code',
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMPTZ,
    used_by_ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. WEBAUTHN / PASSKEY CREDENTIALS (IF NOT ALREADY CREATED)
CREATE TABLE IF NOT EXISTS public.admin_webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    sign_count BIGINT NOT NULL DEFAULT 0,
    device_name TEXT NOT NULL,
    aaguid TEXT,
    transports TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_webauthn_cred_id ON public.admin_webauthn_credentials (credential_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_admin_id ON public.admin_webauthn_credentials (admin_user_id);

-- ============================================================================
-- STRICT ROW LEVEL SECURITY (RLS) POLICIES
-- Service Role Only Access (Zero Public or Customer Access)
-- ============================================================================

ALTER TABLE public.admin_failed_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_security_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- 1. admin_failed_logins
DROP POLICY IF EXISTS "Service role access on admin_failed_logins" ON public.admin_failed_logins;
CREATE POLICY "Service role access on admin_failed_logins" ON public.admin_failed_logins FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Deny anon on admin_failed_logins" ON public.admin_failed_logins;
CREATE POLICY "Deny anon on admin_failed_logins" ON public.admin_failed_logins FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "Deny authenticated on admin_failed_logins" ON public.admin_failed_logins;
CREATE POLICY "Deny authenticated on admin_failed_logins" ON public.admin_failed_logins FOR ALL TO authenticated USING (false);

-- 2. admin_security_locks
DROP POLICY IF EXISTS "Service role access on admin_security_locks" ON public.admin_security_locks;
CREATE POLICY "Service role access on admin_security_locks" ON public.admin_security_locks FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Deny anon on admin_security_locks" ON public.admin_security_locks;
CREATE POLICY "Deny anon on admin_security_locks" ON public.admin_security_locks FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "Deny authenticated on admin_security_locks" ON public.admin_security_locks;
CREATE POLICY "Deny authenticated on admin_security_locks" ON public.admin_security_locks FOR ALL TO authenticated USING (false);

-- 3. admin_security_alerts
DROP POLICY IF EXISTS "Service role access on admin_security_alerts" ON public.admin_security_alerts;
CREATE POLICY "Service role access on admin_security_alerts" ON public.admin_security_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Deny anon on admin_security_alerts" ON public.admin_security_alerts;
CREATE POLICY "Deny anon on admin_security_alerts" ON public.admin_security_alerts FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "Deny authenticated on admin_security_alerts" ON public.admin_security_alerts;
CREATE POLICY "Deny authenticated on admin_security_alerts" ON public.admin_security_alerts FOR ALL TO authenticated USING (false);

-- 4. admin_security_audit_logs
DROP POLICY IF EXISTS "Service role access on admin_security_audit_logs" ON public.admin_security_audit_logs;
CREATE POLICY "Service role access on admin_security_audit_logs" ON public.admin_security_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Deny anon on admin_security_audit_logs" ON public.admin_security_audit_logs;
CREATE POLICY "Deny anon on admin_security_audit_logs" ON public.admin_security_audit_logs FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "Deny authenticated on admin_security_audit_logs" ON public.admin_security_audit_logs;
CREATE POLICY "Deny authenticated on admin_security_audit_logs" ON public.admin_security_audit_logs FOR ALL TO authenticated USING (false);

-- 5. admin_recovery_codes
DROP POLICY IF EXISTS "Service role access on admin_recovery_codes" ON public.admin_recovery_codes;
CREATE POLICY "Service role access on admin_recovery_codes" ON public.admin_recovery_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Deny anon on admin_recovery_codes" ON public.admin_recovery_codes;
CREATE POLICY "Deny anon on admin_recovery_codes" ON public.admin_recovery_codes FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "Deny authenticated on admin_recovery_codes" ON public.admin_recovery_codes;
CREATE POLICY "Deny authenticated on admin_recovery_codes" ON public.admin_recovery_codes FOR ALL TO authenticated USING (false);

-- 6. admin_webauthn_credentials
DROP POLICY IF EXISTS "Service role access on admin_webauthn_credentials" ON public.admin_webauthn_credentials;
CREATE POLICY "Service role access on admin_webauthn_credentials" ON public.admin_webauthn_credentials FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Deny anon on admin_webauthn_credentials" ON public.admin_webauthn_credentials;
CREATE POLICY "Deny anon on admin_webauthn_credentials" ON public.admin_webauthn_credentials FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "Deny authenticated on admin_webauthn_credentials" ON public.admin_webauthn_credentials;
CREATE POLICY "Deny authenticated on admin_webauthn_credentials" ON public.admin_webauthn_credentials FOR ALL TO authenticated USING (false);
