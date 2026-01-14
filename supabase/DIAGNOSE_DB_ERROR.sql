-- DIAGNOSE DB ERROR
-- Run this to see what triggers and policies might be breaking Login/Signup

-- 1. List all Triggers on auth.users (Login often updates this table)
SELECT 
    event_object_schema as schema_name,
    event_object_table as table_name,
    trigger_name,
    action_statement as trigger_action
FROM information_schema.triggers
WHERE event_object_table = 'users' 
AND event_object_schema IN ('auth', 'public');

-- 2. List all RLS Policies on public.users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users';

-- 3. Check Grants/Permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'users' AND table_schema = 'public';

-- 4. Check if we can simple SELECT (Permissions check)
DO $$
BEGIN
    PERFORM count(*) FROM public.users;
    RAISE NOTICE '✅ public.users is readable';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ public.users READ ERROR: %', SQLERRM;
END $$;
