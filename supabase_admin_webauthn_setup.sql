-- ============================================================================
-- MEHANDA ARMY INVESTMENTS — ADMIN WEBAUTHN / PASSKEY SETUP
-- Table and security policies for hardware biometric / fingerprint credentials
-- ============================================================================

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

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id 
    ON public.admin_webauthn_credentials (credential_id);

CREATE INDEX IF NOT EXISTS idx_webauthn_admin_user_id 
    ON public.admin_webauthn_credentials (admin_user_id);

-- Enable Row Level Security
ALTER TABLE public.admin_webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Strict Service Role Only Policy (No public/customer access)
DROP POLICY IF EXISTS "Service role full access on admin_webauthn_credentials" ON public.admin_webauthn_credentials;
CREATE POLICY "Service role full access on admin_webauthn_credentials"
    ON public.admin_webauthn_credentials
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Disallow public / anon access completely
DROP POLICY IF EXISTS "Deny anon access on admin_webauthn_credentials" ON public.admin_webauthn_credentials;
CREATE POLICY "Deny anon access on admin_webauthn_credentials"
    ON public.admin_webauthn_credentials
    FOR ALL
    TO anon
    USING (false);

DROP POLICY IF EXISTS "Deny authenticated customer access on admin_webauthn_credentials" ON public.admin_webauthn_credentials;
CREATE POLICY "Deny authenticated customer access on admin_webauthn_credentials"
    ON public.admin_webauthn_credentials
    FOR ALL
    TO authenticated
    USING (false);
