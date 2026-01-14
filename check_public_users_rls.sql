-- Check RLS Policies on public.users
-- This might be blocking drivers from reading their own data

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- 2. List all policies on public.users
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
WHERE schemaname = 'public' AND tablename = 'users';

-- 3. Test if a driver can read their own data
-- This simulates what happens after login
SET ROLE authenticated;
SET request.jwt.claims.sub = (SELECT id::text FROM public.users WHERE email = 'loloz@gmail.com');
SELECT * FROM public.users WHERE email = 'loloz@gmail.com';
RESET ROLE;
