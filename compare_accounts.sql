-- Compare Working vs Broken Accounts
-- This will show us EXACTLY what's different

-- 1. Get a working Manager account
SELECT 
    'MANAGER (WORKING)' as account_type,
    email, 
    role, 
    aud,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE role = 'authenticated' 
AND id IN (SELECT id FROM public.users WHERE role = 'manager')
LIMIT 1;

-- 2. Get a broken Driver account  
SELECT 
    'DRIVER (BROKEN)' as account_type,
    email,
    role,
    aud, 
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    encrypted_password IS NOT NULL as has_password
FROM auth.users
WHERE email = 'loloz@gmail.com';
