-- ============================================
-- FIX: Remove Auto-Driver Creation
-- This script ensures NO automatic driver creation happens
-- ============================================

-- 1. Check for any triggers on companies table that might create drivers
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger 
WHERE tgrelid = 'public.companies'::regclass
AND tgname NOT IN ('update_companies_updated_at');  -- Keep only the timestamp update trigger

-- 2. Drop ANY suspicious triggers on companies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'public.companies'::regclass
        AND tgname NOT IN ('update_companies_updated_at')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.companies', r.tgname);
        RAISE NOTICE 'Dropped trigger: %', r.tgname;
    END LOOP;
END $$;

-- 3. Check complete_manager_signup function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'complete_manager_signup'
AND pronamespace = 'public'::regnamespace;

-- 4. Verify: List ALL functions that insert into drivers
SELECT 
    p.proname AS function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%INSERT INTO%drivers%' THEN 'YES - Inserts Drivers'
        ELSE 'NO'
    END AS inserts_drivers
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'handle_new_user_signup',
    'complete_manager_signup',
    'create_dispatcher_account',
    'handle_new_company'
)
ORDER BY p.proname;

-- 5. FINAL DIAGNOSTIC: Show recent companies and their driver counts
SELECT 
    c.id,
    c.name AS company_name,
    c.created_at,
    COUNT(d.id) AS driver_count,
    STRING_AGG(d.name, ', ' ORDER BY d.created_at) AS driver_names
FROM public.companies c
LEFT JOIN public.drivers d ON d.company_id = c.id
WHERE c.created_at > NOW() - INTERVAL '7 days'  -- Last 7 days
GROUP BY c.id, c.name, c.created_at
ORDER BY c.created_at DESC;
