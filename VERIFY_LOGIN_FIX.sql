-- VERIFY LOGIN FIX
-- Run this AFTER running FIX_LOGIN_ERROR_FINAL.sql

-- 1. Check if the user exists and we can read it
SELECT 'User Check' as step, id, email, role, last_sign_in_at 
FROM auth.users 
WHERE email = 'loloz@gmail.com';

-- 2. Check if the public.users row exists and we can see it (as a system admin here)
SELECT 'Public Profile Check' as step, id, email, role, status 
FROM public.users 
WHERE email = 'loloz@gmail.com';

-- 3. Simulate RLS Check for the user
-- We pretend to be the user and see if we can read our own row.
-- (This might fail in the SQL Editor if you are not running as superuser, but it's a good test)

/*
set local role authenticated;
set local "request.jwt.claim.sub" to 'USER_UUID_HERE'; -- You'd need the real UUID from step 1
SELECT * FROM public.users WHERE email = 'loloz@gmail.com';
*/
