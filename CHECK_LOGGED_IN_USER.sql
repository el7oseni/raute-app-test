-- Check the current logged-in user and compare with public.users

-- Query 1: Check public.users table
SELECT 
    id,
    email,
    role,
    company_id,
    status
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- Query 2: Find which user is currently logged in
-- The user who logged in is: sing@gmail.com (id: 028f6d5f-add5-4d64-9af2-dbc5d5302a20)

-- Check if this user exists in public.users:
SELECT *
FROM public.users
WHERE id = '028f6d5f-add5-4d64-9af2-dbc5d5302a20';

-- Query 3: If the user doesn't exist in public.users, we need to add them
-- First get a company_id:
SELECT id, name FROM companies LIMIT 1;

-- Then run this (REPLACE COMPANY_ID):
/*
INSERT INTO public.users (id, company_id, email, full_name, role, status)
VALUES (
    '028f6d5f-add5-4d64-9af2-dbc5d5302a20',
    'YOUR_COMPANY_ID_HERE',  -- Replace this!
    'sing@gmail.com',
    'Sing User',
    'manager',
    'active'
)
ON CONFLICT (id) DO UPDATE
SET role = 'manager', status = 'active';
*/

-- Query 4: Check company_id consistency
SELECT 
    'Companies' as table_name,
    id,
    name
FROM companies
UNION ALL
SELECT 
    'Users' as table_name,
    id,
    role || ' - ' || email as name
FROM public.users;
