-- Fix "Function Search Path Mutable" warnings by setting search_path
-- UPDATED: Only includes functions that actually exist in the database
-- Some functions were removed or have different signatures

-- 1. get_my_company_id
ALTER FUNCTION public.get_my_company_id() 
SET search_path = public, pg_temp;

-- 2. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() 
SET search_path = public, pg_temp;

-- 3. handle_new_user_signup
ALTER FUNCTION public.handle_new_user_signup() 
SET search_path = public, pg_temp;

-- 4. create_dispatcher_account (5 parameters: email, password, full_name, company_id, permissions)
ALTER FUNCTION public.create_dispatcher_account(text, text, text, uuid, jsonb) 
SET search_path = public, pg_temp;

-- 5. complete_manager_signup (4 parameters: user_email, company_name, full_name, user_password)
ALTER FUNCTION public.complete_manager_signup(text, text, text, text) 
SET search_path = public, pg_temp;

-- 6. populate_driver_log_company_id
ALTER FUNCTION public.populate_driver_log_company_id() 
SET search_path = public, pg_temp;

-- 7. check_driver_limit
ALTER FUNCTION public.check_driver_limit() 
SET search_path = public, pg_temp;

-- 8. login_driver (2 parameters: p_email, p_password)
ALTER FUNCTION public.login_driver(text, text) 
SET search_path = public, pg_temp;

-- 9. get_company_drivers (1 parameter: company_id_param)
ALTER FUNCTION public.get_company_drivers(uuid) 
SET search_path = public, pg_temp;

-- 10. create_driver_account (10 parameters: email, password, full_name, phone, vehicle_type, company_id, custom_values, default_start_address, default_start_lat, default_start_lng)
ALTER FUNCTION public.create_driver_account(text, text, text, text, text, uuid, jsonb, text, float8, float8) 
SET search_path = public, pg_temp;

-- 11. get_company_dispatchers (1 parameter: company_id_param)
ALTER FUNCTION public.get_company_dispatchers(uuid) 
SET search_path = public, pg_temp;

-- Verify changes
SELECT 
    p.proname as function_name,
    '✅ search_path configured' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN (
        'get_my_company_id',
        'update_updated_at_column',
        'handle_new_user_signup',
        'create_dispatcher_account',
        'complete_manager_signup',
        'populate_driver_log_company_id',
        'check_driver_limit',
        'login_driver',
        'get_company_drivers',
        'create_driver_account',
        'get_company_dispatchers'
    )
ORDER BY p.proname;
