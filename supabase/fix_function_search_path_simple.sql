-- Simplified Fix: Only fix functions we know exist
-- Some functions may have been deleted or never created in production

-- Try each function separately, skip if it fails

-- 1. get_my_company_id
DO $$
BEGIN
    ALTER FUNCTION public.get_my_company_id() SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: get_my_company_id';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: get_my_company_id (not found)';
END $$;

-- 2. update_updated_at_column
DO $$
BEGIN
    ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: update_updated_at_column';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: update_updated_at_column (not found)';
END $$;

-- 3. handle_new_user_signup
DO $$
BEGIN
    ALTER FUNCTION public.handle_new_user_signup() SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: handle_new_user_signup';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: handle_new_user_signup (not found)';
END $$;

-- 4. populate_driver_log_company_id
DO $$
BEGIN
    ALTER FUNCTION public.populate_driver_log_company_id() SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: populate_driver_log_company_id';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: populate_driver_log_company_id (not found)';
END $$;

-- 5. check_driver_limit
DO $$
BEGIN
    ALTER FUNCTION public.check_driver_limit() SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: check_driver_limit';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: check_driver_limit (not found)';
END $$;

-- 6. login_driver (2 params)
DO $$
BEGIN
    ALTER FUNCTION public.login_driver(text, text) SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: login_driver';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: login_driver (not found)';
END $$;

-- 7. get_company_drivers (1 param)
DO $$
BEGIN
    ALTER FUNCTION public.get_company_drivers(uuid) SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: get_company_drivers';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: get_company_drivers (not found)';
END $$;

-- 8. get_company_dispatchers (1 param)
DO $$
BEGIN
    ALTER FUNCTION public.get_company_dispatchers(uuid) SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: get_company_dispatchers';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: get_company_dispatchers (not found)';
END $$;

-- 9. create_driver_account (10 params)
DO $$
BEGIN
    ALTER FUNCTION public.create_driver_account(text, text, text, text, text, uuid, jsonb, text, float8, float8) 
    SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: create_driver_account';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: create_driver_account (not found)';
END $$;

-- 10. create_dispatcher_account (5 params)
DO $$
BEGIN
    ALTER FUNCTION public.create_dispatcher_account(text, text, text, uuid, jsonb) 
    SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: create_dispatcher_account';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: create_dispatcher_account (not found)';
END $$;

-- 11. complete_manager_signup - Try different parameter combinations
DO $$
BEGIN
    -- Try 1 param
    ALTER FUNCTION public.complete_manager_signup(text) SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: complete_manager_signup (1 param)';
EXCEPTION WHEN undefined_function THEN
    BEGIN
        -- Try 4 params
        ALTER FUNCTION public.complete_manager_signup(text, text, text, text) SET search_path = public, pg_temp;
        RAISE NOTICE '✅ Fixed: complete_manager_signup (4 params)';
    EXCEPTION WHEN undefined_function THEN
        RAISE NOTICE '⏭️ Skipped: complete_manager_signup (not found)';
    END;
END $$;

-- Summary
SELECT 
    p.proname as "Function",
    pg_get_function_arguments(p.oid) as "Parameters",
    '✅' as "Status"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prosecdef = true  -- Only SECURITY DEFINER functions
ORDER BY p.proname;
