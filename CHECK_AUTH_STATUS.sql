-- Check current authentication status
-- Run this to see if there's a logged-in user

-- 1. Check if there are any users in the system
SELECT 
    id,
    email,
    role,
    company_id
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check auth.users (Supabase Auth table)
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if there's a company_id mismatch causing RLS to block data
SELECT 
    u.email,
    u.role,
    u.company_id as user_company,
    COUNT(DISTINCT o.id) as orders_count,
    COUNT(DISTINCT d.id) as drivers_count
FROM users u
LEFT JOIN orders o ON o.company_id = u.company_id
LEFT JOIN drivers d ON d.company_id = u.company_id
GROUP BY u.id, u.email, u.role, u.company_id;

-- 4. SOLUTION: If you're not logged in, create a test manager user
-- Uncomment and modify to run:
/*
-- First, get your company_id:
SELECT id, name FROM companies LIMIT 1;

-- Then create a manager user (replace email and company_id):
INSERT INTO public.users (id, company_id, email, full_name, role, status)
VALUES (
    gen_random_uuid(),
    'YOUR_COMPANY_ID_HERE', -- Replace with actual company_id
    'manager@test.com',
    'Test Manager',
    'manager',
    'active'
);
*/

-- 5. ALTERNATIVE: Update existing user's role to manager
/*
UPDATE users
SET role = 'manager'
WHERE email = 'YOUR_EMAIL_HERE';
*/
