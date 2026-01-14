-- Check for hooks or functions that might be called during login
-- Supabase might have database hooks configured

-- 1. Check for any UPDATE triggers on auth.users (login updates last_sign_in_at)
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users'
AND event_manipulation = 'UPDATE';

-- 2. Check for webhooks/hooks in Supabase
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'auth';

-- 3. List all functions that might be called by auth
SELECT 
    routine_name,
    routine_schema
FROM information_schema.routines
WHERE routine_schema IN ('auth', 'public')
AND (
    routine_name LIKE '%sign%'
    OR routine_name LIKE '%login%'
    OR routine_name LIKE '%session%'
    OR routine_name LIKE '%token%'
)
ORDER BY routine_schema, routine_name;
