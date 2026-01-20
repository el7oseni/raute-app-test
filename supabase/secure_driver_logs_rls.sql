-- ========================================================
-- 🔒 SECURE RLS POLICIES FOR DRIVER LOGS (Production Ready)
-- ========================================================
-- This script enables strict security: A user can ONLY view logs 
-- that belong to their own company.

-- 1. Helper Function: safely get current user's company_id
-- We use SECURITY DEFINER to bypass RLS on the users table itself
-- to ensure this check always succeeds.
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- 2. Reset Policies on driver_activity_logs
ALTER TABLE public.driver_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view driver logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Authenticated users can view driver logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Users can update own logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Managers can delete logs" ON public.driver_activity_logs;

-- 3. Create Strict Policies

-- VIEW: Managers/Dispatchers can view ALL logs for their company
-- Drivers can only view their OWN logs (or all company logs if preferred, usually own)
CREATE POLICY "Company members can view driver logs" ON public.driver_activity_logs
    FOR SELECT
    USING (
        company_id = public.get_my_company_id()
    );

-- INSERT: Authenticated users can insert logs (company_id is handled by trigger or backend)
CREATE POLICY "Users can insert logs" ON public.driver_activity_logs
    FOR INSERT
    WITH CHECK (
        -- Enforce that they can only insert for their own company
        company_id = public.get_my_company_id()
    );

-- UPDATE: Users can update their OWN logs (e.g. going offline)
CREATE POLICY "Users can update own logs" ON public.driver_activity_logs
    FOR UPDATE
    USING (
        user_id = auth.uid()
    );

-- DELETE: Only Managers/Admins can delete logs for their company
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

-- 4. Verify Function works
SELECT public.get_my_company_id() as my_company_id;
