-- ============================================
-- FIX RLS POLICIES FOR DRIVER_ACTIVITY_LOGS
-- ============================================
-- The original policies were too restrictive
-- This update allows all authenticated users to query logs

-- 1. DROP EXISTING RESTRICTIVE POLICIES
DROP POLICY IF EXISTS "Company members can view driver logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Drivers can insert own logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Managers can insert driver logs" ON public.driver_activity_logs;

-- 2. CREATE MORE PERMISSIVE POLICIES

-- Allow all authenticated users to view driver logs (for now)
-- TODO: Restrict to company_id once user management is stable
CREATE POLICY "Authenticated users can view driver logs" ON public.driver_activity_logs
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert logs
CREATE POLICY "Authenticated users can insert logs" ON public.driver_activity_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own logs
CREATE POLICY "Users can update own logs" ON public.driver_activity_logs
    FOR UPDATE
    USING (user_id = auth.uid());

-- Allow managers/admins to delete logs
CREATE POLICY "Managers can delete logs" ON public.driver_activity_logs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('manager', 'admin', 'company_admin')
        )
    );

-- 3. VERIFY POLICIES
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'driver_activity_logs'
ORDER BY policyname;
