-- SEARCH FOR HIDDEN HOOKS & FUNCTIONS
-- The error is likely inside a custom function that runs during Login.

-- 1. Check for Custom Claims Hooks (Postgres Settings)
-- Supabase sometimes stores the hook function name in this setting
SHOW "pgrst.db_pre_request";
SELECT name, setting, source FROM pg_settings WHERE name LIKE '%hook%';

-- 2. List ALL functions in 'public' schema
-- Look for names like 'handle_login', 'custom_claims', 'jwt', 'sync', etc.
SELECT 
    routine_name, 
    data_type as return_type,
    external_language
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 3. Check Triggers on public.drivers (since drivers are failing)
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
AND event_object_table = 'drivers';

-- 4. Check references to auth.users
-- Does any table have a Foreign Key to auth.users that might be restrictive?
SELECT
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' 
AND ccu.table_schema = 'auth'
AND ccu.table_name = 'users';
