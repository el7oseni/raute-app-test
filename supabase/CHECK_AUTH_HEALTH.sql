-- Check extensions and auth schema health
-- Sometimes pgcrypto or other extensions cause auth failures

-- 1. Check installed extensions
SELECT 
    extname,
    extversion,
    extnamespace::regnamespace as schema
FROM pg_extension
ORDER BY extname;

-- 2. Check if auth schema functions are accessible
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'auth'
AND routine_name LIKE '%password%'
ORDER BY routine_name;

-- 3. Test direct password verification (to isolate the issue)
-- This simulates what Supabase Auth does internally
SELECT 
    id,
    email,
    encrypted_password IS NOT NULL as has_encrypted_password,
    role as auth_role
FROM auth.users
WHERE email = 'loloz@gmail.com';
