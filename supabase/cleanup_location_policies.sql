-- ============================================
-- CLEANUP DUPLICATE LOCATION TRACKING POLICIES
-- ============================================
-- This script removes all old/duplicate policies and keeps only
-- the correct company-based policies for security.

-- ============================================
-- 1. DROP ALL OLD POLICIES - driver_activity_logs
-- ============================================

DROP POLICY IF EXISTS "Anyone authenticated can delete logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Anyone authenticated can insert logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Anyone authenticated can update logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Anyone authenticated can view logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Company members can view driver logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Drivers can insert their own activity logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Managers can delete logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Users can insert logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Users can update own logs" ON public.driver_activity_logs;
DROP POLICY IF EXISTS "Users can view activity logs in their company" ON public.driver_activity_logs;

-- Keep only these two:
-- - driver_activity_logs_insert_own (already exists)
-- - driver_activity_logs_select_company (already exists)

-- ============================================
-- 2. VERIFY FINAL STATE
-- ============================================

-- Should show only 2 policies per table
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN policyname IN ('driver_activity_logs_insert_own', 'driver_activity_logs_select_company', 
                           'driver_locations_insert_own', 'driver_locations_select_company') 
        THEN '✅ Correct'
        ELSE '❌ Should be removed'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('driver_locations', 'driver_activity_logs')
ORDER BY tablename, policyname;

-- ============================================
-- 3. TEST QUERIES
-- ============================================

-- Test insert (should work for authenticated driver)
-- INSERT INTO driver_locations (driver_id, company_id, latitude, longitude, accuracy)
-- VALUES ('[your-driver-id]', '[your-company-id]', 30.0444, 31.2357, 10.5);

-- Test select (should only see your company's data)
-- SELECT * FROM driver_locations ORDER BY timestamp DESC LIMIT 5;
-- SELECT * FROM driver_activity_logs ORDER BY timestamp DESC LIMIT 5;
