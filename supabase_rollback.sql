-- =====================================================================
-- MEHANDA ARMY INVESTMENTS
-- SAFE ROLLBACK SCRIPT (IF NEEDED)
--
-- This script reverses only the objects created by supabase_complete_migration.sql.
-- It NEVER touches pre-existing tables (admin_sessions, admin_activity_logs, account_recovery_rate_limits).
-- =====================================================================

BEGIN;

-- Drop in reverse dependency order
DROP TABLE IF EXISTS public.support_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP SEQUENCE IF EXISTS public.support_ticket_seq CASCADE;

DROP TABLE IF EXISTS public.customer_notifications CASCADE;
DROP TABLE IF EXISTS public.customer_documents CASCADE;

DROP TABLE IF EXISTS public.application_status_history CASCADE;
DROP TABLE IF EXISTS public.loan_applications CASCADE;
DROP SEQUENCE IF EXISTS public.loan_application_tracking_seq CASCADE;
DROP FUNCTION IF EXISTS public.generate_loan_tracking_id() CASCADE;

DROP FUNCTION IF EXISTS public.search_student_loan_institutions(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) CASCADE;
DROP TABLE IF EXISTS public.student_loan_institutions CASCADE;

DROP TABLE IF EXISTS public.investment_enquiries CASCADE;
DROP TABLE IF EXISTS public.service_payments CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.portfolios CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_profile_changed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_profile_update() CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Storage buckets rollback
DELETE FROM storage.buckets WHERE id IN ('profile-photos', 'customer-documents');

COMMIT;

