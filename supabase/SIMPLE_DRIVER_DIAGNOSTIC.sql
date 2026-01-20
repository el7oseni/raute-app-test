-- ============================================
-- SIMPLE DIAGNOSTIC: Find Driver Auto-Creation Source
-- ============================================

-- 1. Show recent companies and their drivers
SELECT 
    'Recent Signups (Last 7 Days)' as report_section;

SELECT 
    c.id,
    c.name AS company_name,
    c.email,
    c.created_at,
    COUNT(d.id) AS driver_count,
    array_agg(d.name ORDER BY d.created_at) FILTER (WHERE d.name IS NOT NULL) AS driver_names,
    array_agg(d.vehicle_type ORDER BY d.created_at) FILTER (WHERE d.vehicle_type IS NOT NULL) AS vehicle_types
FROM public.companies c
LEFT JOIN public.drivers d ON d.company_id = c.id
WHERE c.created_at > NOW() - INTERVAL '7 days'
GROUP BY c.id, c.name, c.email, c.created_at
ORDER BY c.created_at DESC
LIMIT 10;

-- 2. Check handle_new_user_signup trigger function
SELECT 
    'Checking handle_new_user_signup Function' as report_section;

SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'handle_new_user_signup'
AND pronamespace = 'public'::regnamespace;

-- 3. Check complete_manager_signup function  
SELECT 
    'Checking complete_manager_signup Function' as report_section;

SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'complete_manager_signup'
AND pronamespace = 'public'::regnamespace;

-- 4. Look for ANY function that creates multiple drivers
SELECT 
    'Functions that INSERT INTO drivers' as report_section;

SELECT 
    p.proname AS function_name,
    substring(pg_get_functiondef(p.oid) from 'INSERT INTO.*drivers.*') as insert_statement
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) ILIKE '%INSERT INTO%drivers%'
ORDER BY p.proname;

-- 5. Check for webhooks or edge functions
SELECT 
    'Database Hooks/Triggers' as report_section;

SELECT 
    schemaname,
    tablename, 
    triggers
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('companies', 'users')
AND triggers IS NOT NULL;
