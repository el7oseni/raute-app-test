-- FINAL FIX FOR LOGIN
-- The error happens during LOGIN (not signup), which means there's a trigger 
-- or function that fires when Supabase Auth tries to verify the password.

-- 1. Check what triggers exist on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- 2. List all functions in public schema (to find potential crashers)
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%'
OR routine_name LIKE '%auth%'
OR routine_name LIKE '%login%';
