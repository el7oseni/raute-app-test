-- FULL DIAGNOSTIC REPORT
-- Run this and send me ALL the results

-- 1. Check Extensions (especially pgcrypto)
SELECT * FROM pg_extension WHERE extname IN ('pgcrypto', 'pgjwt', 'uuid-ossp');

-- 2. Check User Role
SELECT id, email, role, aud, email_confirmed_at, raw_app_meta_data, raw_user_meta_data
FROM auth.users 
WHERE email = 'loloz@gmail.com';

-- 3. Check if user exists in public.users
SELECT id, email, role, status 
FROM public.users 
WHERE email = 'loloz@gmail.com';

-- 4. Check RLS on auth.users
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'auth' AND tablename = 'users';

-- 5. Check Triggers on auth.users
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- 6. Check Role Permissions
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE grantee IN ('authenticated', 'authenticator', 'anon')
AND table_schema = 'auth'
AND table_name = 'users';
