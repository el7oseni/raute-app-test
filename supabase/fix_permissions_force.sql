-- ========================================================
-- 🚀 CLEANUP & FIX: DRIVER LOGS PERMISSIONS (FINAL)
-- ========================================================

-- 1. DROP EVERYTHING FIRST (To avoid "already exists" errors)
DROP POLICY IF EXISTS "Company members can view driver logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Authenticated users can view driver logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Users can insert logs" ON public.driver_activity_logs; -- This was the missing culprit
DROP POLICY IF EXISTS "Users can update own logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Managers can delete logs" ON public.driver_activity_logs;

-- 2. GRANT ACCESS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_activity_logs TO service_role;

-- 3. HELPER FUNCTION (Idempotent)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- 4. CREATE POLICIES (Now safe because we dropped them above)
ALTER TABLE public.driver_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view driver logs" ON public.driver_activity_logs
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY "Users can insert logs" ON public.driver_activity_logs
    FOR INSERT WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Users can update own logs" ON public.driver_activity_logs
    FOR UPDATE USING (user_id = auth.uid());
    
CREATE POLICY "Managers can delete logs" ON public.driver_activity_logs
    FOR DELETE USING (company_id = public.get_my_company_id() AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('manager', 'admin', 'company_admin')));

-- Done!
SELECT 'Success' as status;
