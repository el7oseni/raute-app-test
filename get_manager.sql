-- Get Manager Account Details (Working Account)
SELECT 
    'MANAGER' as account_type,
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
WHERE id IN (SELECT id FROM public.users WHERE role = 'manager')
LIMIT 1;
