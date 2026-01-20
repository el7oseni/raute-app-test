-- ========================================================
-- 🚀 PRODUCTION FIX: PERMISSIONS & RLS FOR DRIVER LOGS
-- ========================================================
-- This script fixes the 403 Forbidden error while keeping data safe.
-- It works with your existing data (Account, Drivers, Orders).

-- PART 1: GRANT BASIC ACCESS (The "Missing Key")
-- Without this, no Policy matters because the table is locked.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_activity_logs TO service_role;

-- PART 2: HELPER FUNCTION
-- Ensures we get the correct company_id without infinite loops
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- PART 3: SECURE ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS
ALTER TABLE public.driver_activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop all old/conflicting policies to start fresh
DROP POLICY IF EXISTS "Company members can view driver logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Authenticated users can view driver logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Users can update own logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Managers can delete logs" ON public.driver_activity_logs;

-- CREATE NEW POLICIES compatible with your existing data

-- 1. View: See logs ONLY for your company
CREATE POLICY "Company members can view driver logs" ON public.driver_activity_logs
    FOR SELECT
    USING (
        -- Simple check: Company ID matches
        company_id = public.get_my_company_id()
    );

-- 2. Insert: Create logs ONLY for your company
CREATE POLICY "Users can insert logs" ON public.driver_activity_logs
    FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
    );

-- 3. Update: Driver can update their OWN log (e.g. status change)
CREATE POLICY "Users can update own logs" ON public.driver_activity_logs
    FOR UPDATE
    USING (
        user_id = auth.uid()
    );

-- 4. Delete: Only Managers can delete logs
CREATE POLICY "Managers can delete logs" ON public.driver_activity_logs
    FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() 
            AND role IN ('manager', 'admin', 'company_admin')
        )
    );

-- Verification: Check valid user
SELECT count(*) as total_users FROM public.users;
