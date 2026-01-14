-- Direct SQL Test: Try to manually verify user exists with correct data
-- This will help us understand if the issue is in the database or auth API

SELECT 
    u.id,
    u.email,
    u.encrypted_password IS NOT NULL as has_password,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    u.role as auth_role,
    u.banned_until,
    u.deleted_at,
    pu.id as public_user_exists,
    pu.role as public_role,
    pu.status as public_status,
    pu.company_id
FROM auth.users u
LEFT JOIN public.users pu ON pu.id = u.id
WHERE u.email = 'loloz@gmail.com';
